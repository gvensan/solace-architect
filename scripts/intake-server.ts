#!/usr/bin/env bun
/**
 * Solace Architect intake — local HTTP server.
 *
 *   bun run intake
 *
 * Launches a Bun HTTP server that serves the intake HTML form and accepts
 * submissions. Submissions are written to `intake/<slug>.yaml` so the
 * architect can immediately run `/solace-intake intake/<slug>.yaml` to
 * bootstrap discovery.
 *
 * Mirrors scripts/dashboard.ts in style — same conventions, different scope.
 */

import { readFile, writeFile, stat, mkdir } from "fs/promises";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const PORT = parseInt(process.env.INTAKE_PORT || "3001", 10);
const ROOT = process.cwd();
const INTAKE_DIR = join(ROOT, "intake");
const FORM_PATH = join(INTAKE_DIR, "solace-intake-template.html");
const BUILDER = join(ROOT, "scripts", "build-intake-html.py");

// ---------------------------------------------------------------------------
// Form generation — ensure the HTML exists and is fresh on startup.
// ---------------------------------------------------------------------------
async function ensureForm(): Promise<string> {
  await mkdir(INTAKE_DIR, { recursive: true });
  const result = spawnSync("python3", [BUILDER, "--output", FORM_PATH], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    console.error("Form build failed:");
    console.error(result.stderr || result.stdout);
    throw new Error("Could not generate intake form. Ensure python3 and PyYAML are installed.");
  }
  return FORM_PATH;
}

async function readForm(): Promise<string> {
  return readFile(FORM_PATH, "utf-8");
}

// ---------------------------------------------------------------------------
// Submission handling
// ---------------------------------------------------------------------------
function slugify(input: string): string {
  return (input || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";
}

interface SubmitPayload {
  yaml: string;
  data: Record<string, any>;
}

async function handleSubmit(req: Request): Promise<Response> {
  let payload: SubmitPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  if (!payload.yaml || typeof payload.yaml !== "string") {
    return json({ error: "yaml field required" }, 400);
  }
  const projectName: string | undefined =
    payload.data?.project?.name || payload.data?.project_name;
  const slug = slugify(projectName || "intake");
  const filename = `${slug}.yaml`;
  const filepath = join("intake", filename);
  const fullpath = resolve(ROOT, filepath);

  // Refuse to escape intake/
  if (!fullpath.startsWith(INTAKE_DIR)) {
    return json({ error: "invalid filename" }, 400);
  }

  try {
    await writeFile(fullpath, payload.yaml, "utf-8");
  } catch (e: any) {
    return json({ error: `write failed: ${e?.message || e}` }, 500);
  }

  console.log(`[submit] ${new Date().toISOString()} → ${filepath} (project=${projectName || "?"})`);
  return json({ ok: true, path: filepath, slug });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

async function listSubmissions(): Promise<string[]> {
  try {
    const entries = await Array.fromAsync(new Bun.Glob("*.yaml").scan({ cwd: INTAKE_DIR }));
    return entries.filter((n) => n !== "solace-intake-template.yaml");
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
async function main() {
  await ensureForm();

  const server = Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      if (req.method === "GET" && (path === "/" || path === "/index.html")) {
        const html = await readForm();
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      if (req.method === "GET" && path === "/api/health") {
        return json({ ok: true, mode: "server" });
      }

      if (req.method === "GET" && path === "/api/submissions") {
        return json({ submissions: await listSubmissions() });
      }

      if (req.method === "POST" && path === "/api/submit") {
        return handleSubmit(req);
      }

      return new Response("Not found", { status: 404 });
    },
  });

  console.log("");
  console.log("  Solace Architect — Intake server");
  console.log("  ────────────────────────────────");
  console.log(`  Form:        http://localhost:${server.port}`);
  console.log(`  Output dir:  ./intake/`);
  console.log("  Stop:        Ctrl-C");
  console.log("");

  if (process.platform === "darwin") {
    Bun.spawn(["open", `http://localhost:${server.port}`]);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
