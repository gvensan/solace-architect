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

import { readFile, writeFile, stat, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve, basename } from "path";
import { spawnSync } from "child_process";

const PORT = parseInt(process.env.INTAKE_PORT || "3001", 10);
const ROOT = process.cwd();
const INTAKE_DIR = join(ROOT, "intake");
const PROJECTS_DIR = join(ROOT, "projects");
const FORM_PATH = join(INTAKE_DIR, "solace-intake-template.html");
const BUILDER = join(ROOT, "scripts", "build-intake-html.py");

// ---------------------------------------------------------------------------
// YAML parsing — shell to python3 so we stay consistent with build-intake-html.py
// and avoid adding a JS YAML dependency. Each load is a one-shot user action,
// so the spawn cost is acceptable.
// ---------------------------------------------------------------------------
function parseYamlFile(absPath: string): unknown {
  // datetime values in YAML (e.g. context.yaml 'created:') aren't JSON-serializable
  // by default — stringify them with `default=str` for safe round-tripping.
  const result = spawnSync(
    "python3",
    [
      "-c",
      "import sys, yaml, json; json.dump(yaml.safe_load(open(sys.argv[1])), sys.stdout, default=str)",
      absPath,
    ],
    { encoding: "utf-8" }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || "YAML parse failed");
  }
  return JSON.parse(result.stdout || "null");
}

interface IntakableProject {
  slug: string;
  display_name: string;
  intake_file: string; // intake/-relative path
}

async function listIntakableProjects(): Promise<IntakableProject[]> {
  if (!existsSync(PROJECTS_DIR)) return [];
  const slugs = await readdir(PROJECTS_DIR).catch(() => [] as string[]);
  const out: IntakableProject[] = [];
  for (const slug of slugs) {
    if (slug.startsWith(".")) continue;
    const ctxPath = join(PROJECTS_DIR, slug, "context.yaml");
    if (!existsSync(ctxPath)) continue;
    let ctx: any;
    try {
      ctx = parseYamlFile(ctxPath);
    } catch {
      continue;
    }
    if (!ctx || ctx.source !== "intake") continue;
    // Resolve the intake file: prefer context.yaml's intake_file, else fall back to intake/<slug>.yaml
    let intakeRel: string | null = null;
    if (typeof ctx.intake_file === "string" && ctx.intake_file.startsWith("intake/")) {
      intakeRel = ctx.intake_file;
    } else {
      const fallback = `intake/${slug}.yaml`;
      if (existsSync(join(ROOT, fallback))) intakeRel = fallback;
    }
    if (!intakeRel || !existsSync(join(ROOT, intakeRel))) continue;
    out.push({
      slug,
      display_name: ctx.display_name || slug,
      intake_file: intakeRel,
    });
  }
  return out.sort((a, b) => a.display_name.localeCompare(b.display_name));
}

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

      if (req.method === "GET" && path === "/api/intakable-projects") {
        try {
          return json({ projects: await listIntakableProjects() });
        } catch (e: any) {
          return json({ error: e?.message || String(e) }, 500);
        }
      }

      if (req.method === "GET" && path.startsWith("/api/intake/")) {
        const slug = decodeURIComponent(path.slice("/api/intake/".length));
        if (!slug || /[/\\\.]{2,}/.test(slug) || slug.includes("/")) {
          return json({ error: "invalid slug" }, 400);
        }
        const projects = await listIntakableProjects().catch(() => [] as IntakableProject[]);
        const match = projects.find((p) => p.slug === slug);
        if (!match) return json({ error: "not found" }, 404);
        const absPath = resolve(ROOT, match.intake_file);
        if (!absPath.startsWith(INTAKE_DIR)) {
          return json({ error: "path escapes intake directory" }, 400);
        }
        try {
          return json({ slug: match.slug, intake_file: match.intake_file, data: parseYamlFile(absPath) });
        } catch (e: any) {
          return json({ error: e?.message || String(e) }, 500);
        }
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
