#!/usr/bin/env bun

import { readdir, readFile, stat } from "fs/promises";
import { join, extname, resolve } from "path";

const PORT = parseInt(process.env.PORT || "3000", 10);
const ROOT = process.cwd();
const PROJECTS_DIR = join(ROOT, "projects");
const DASHBOARD_DIR = join(ROOT, "dashboard");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".md": "text/markdown",
  ".mermaid": "text/plain",
  ".mmd": "text/plain",
};

async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function readSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

async function walkFiles(dir: string, base: string = ""): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      files.push(...(await walkFiles(join(dir, e.name), rel)));
    } else {
      files.push(rel);
    }
  }
  return files;
}

async function getProjects() {
  const slugs = await listDir(PROJECTS_DIR);
  const projects = [];
  for (const slug of slugs) {
    if (slug.startsWith(".")) continue;
    const s = await stat(join(PROJECTS_DIR, slug)).catch(() => null);
    if (!s?.isDirectory()) continue;
    const context = await readSafe(join(PROJECTS_DIR, slug, "context.yaml"));
    const progress = await readSafe(join(PROJECTS_DIR, slug, "progress.yaml"));
    const decisions = await readSafe(join(PROJECTS_DIR, slug, "decisions.yaml"));
    const openItems = await readSafe(join(PROJECTS_DIR, slug, "open-items.yaml"));
    const artifactFiles = await walkFiles(
      join(PROJECTS_DIR, slug, "artifacts")
    ).catch(() => []);
    projects.push({ slug, context, progress, decisions, openItems, artifactFiles });
  }
  const active = await readSafe(join(PROJECTS_DIR, ".active"));
  return { projects, active: active?.trim() || null };
}

async function getArtifact(slug: string, artifactPath: string) {
  const baseDir = join(PROJECTS_DIR, slug, "artifacts");
  const resolved = resolve(baseDir, artifactPath);
  if (!resolved.startsWith(baseDir)) return null; // path traversal attempt
  return readSafe(resolved);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}

async function serveStatic(path: string) {
  const full = join(DASHBOARD_DIR, path);
  const content = await readSafe(full);
  if (!content) return new Response("Not found", { status: 404 });
  const ext = extname(path);
  return new Response(content, {
    headers: { "Content-Type": MIME[ext] || "text/plain" },
  });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/api/projects") {
      return json(await getProjects());
    }

    if (path === "/api/report-packs") {
      const content = await readSafe(join(ROOT, "scripts", "report-packs.yaml"));
      if (!content) return json({ error: "report-packs.yaml not found" }, 404);
      return new Response(content, {
        headers: { "Content-Type": "text/yaml", "Cache-Control": "no-store" },
      });
    }

    if (path.startsWith("/api/projects/") && path.endsWith("/artifact")) {
      const slug = path.split("/")[3];
      const artifactPath = url.searchParams.get("path");
      if (!artifactPath) return json({ error: "path required" }, 400);
      const content = await getArtifact(slug, artifactPath);
      if (!content) return json({ error: "not found" }, 404);
      return new Response(content, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    if (path === "/" || path === "/index.html") {
      return serveStatic("index.html");
    }

    if (path.startsWith("/")) {
      const file = path.slice(1);
      if (file && !file.startsWith("api/")) {
        return serveStatic(file);
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`\n  Solace Architect Dashboard`);
console.log(`  ─────────────────────────`);
console.log(`  http://localhost:${server.port}\n`);

if (process.platform === "darwin") {
  Bun.spawn(["open", `http://localhost:${server.port}`]);
}
