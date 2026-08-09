#!/usr/bin/env bun
/**
 * Deterministic change-impact resolver for /solace-change.
 *
 * Reads scripts/skill-dependencies.yaml (declared produces/consumes graph),
 * computes the transitive downstream closure of a change owned by one skill,
 * and emits the re-run plan: what to regenerate, what to re-review, what to
 * re-decide, what is unaffected, and the topological skill sequence.
 *
 * No model in the loop. Everything mechanical lives here, not in skill prose.
 *
 * Usage:
 *   bun run change:impact --skill solace-topic-design [--project <slug>] [--json]
 *   bun run change:impact --skill solace-topic-design --artifacts topic-taxonomy
 *
 * Exit codes: 0 ok, 1 usage/unresolvable key, 2 cycle detected.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(import.meta.dir, '..');
const GRAPH_FILE = path.join(ROOT, 'scripts', 'skill-dependencies.yaml');
const PROJECTS_DIR = path.join(ROOT, 'projects');

// ─── YAML parsing (house pattern: Bun.YAML when present, python3 fallback) ──

export function parseYaml(content: string): any {
  const bunYaml = (globalThis as any).Bun?.YAML;
  if (bunYaml?.parse) return bunYaml.parse(content);
  const result = spawnSync(
    'python3',
    ['-c', 'import sys, yaml, json; print(json.dumps(yaml.safe_load(sys.stdin.read())))'],
    { input: content, encoding: 'utf-8' }
  );
  if (result.status !== 0) throw new Error(result.stderr || 'YAML parse failed');
  return JSON.parse(result.stdout);
}

// ─── Graph types ─────────────────────────────────────────────

export interface ArtifactDecl {
  dir: string;
  file: string;
  live?: boolean;
}

export interface SkillDecl {
  kind: 'design' | 'review' | 'assemble';
  consumes: string[];
  produces: string[];
}

export interface DependencyGraph {
  version: number;
  artifacts: Record<string, ArtifactDecl>;
  skills: Record<string, SkillDecl>;
}

export interface ImpactReport {
  owner: string;
  changed_artifacts: string[];
  regenerate: string[];
  re_review: string[];
  re_decide: string[];
  unaffected: string[];
  absent: string[];
  live_conflict: boolean;
  skill_sequence: string[];
}

export function loadGraph(file: string = GRAPH_FILE): DependencyGraph {
  const graph = parseYaml(fs.readFileSync(file, 'utf-8')) as DependencyGraph;
  validateGraph(graph);
  return graph;
}

export function validateGraph(graph: DependencyGraph): void {
  for (const [skill, decl] of Object.entries(graph.skills)) {
    for (const key of [...decl.consumes, ...decl.produces]) {
      if (!graph.artifacts[key]) {
        throw new Error(`Unresolvable artifact key "${key}" in skill "${skill}"`);
      }
    }
    if (!['design', 'review', 'assemble'].includes(decl.kind)) {
      throw new Error(`Skill "${skill}" has invalid kind "${decl.kind}"`);
    }
  }
  detectCycle(graph);
}

/** Throws if the artifact graph (via producing skills) has a cycle. */
export function detectCycle(graph: DependencyGraph): void {
  // Edge: artifact A -> artifact B when some skill consumes A and produces B.
  const edges = new Map<string, Set<string>>();
  for (const key of Object.keys(graph.artifacts)) edges.set(key, new Set());
  for (const decl of Object.values(graph.skills)) {
    for (const from of decl.consumes) {
      for (const to of decl.produces) {
        if (from !== to) edges.get(from)!.add(to);
      }
    }
  }
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (node: string, trail: string[]) => {
    const s = state.get(node);
    if (s === 'done') return;
    if (s === 'visiting') {
      throw new Error(`Cycle detected in artifact graph: ${[...trail, node].join(' -> ')}`);
    }
    state.set(node, 'visiting');
    for (const next of edges.get(node) ?? []) visit(next, [...trail, node]);
    state.set(node, 'done');
  };
  for (const key of Object.keys(graph.artifacts)) visit(key, []);
}

// ─── Project freshness / existence ───────────────────────────

/**
 * Resolve which declared artifacts actually exist in a project.
 * Recorded artifact paths in progress.yaml win over declared dirs, so legacy
 * numbering (e.g. 13-executive instead of 14-executive) never reclassifies an
 * existing artifact as absent.
 */
export function presentArtifacts(
  graph: DependencyGraph,
  projectDir: string
): Set<string> {
  const present = new Set<string>();
  const artifactsRoot = path.join(projectDir, 'artifacts');

  // 1. Declared dir exists and is non-empty.
  for (const [key, decl] of Object.entries(graph.artifacts)) {
    const dir = path.join(artifactsRoot, decl.dir);
    try {
      const entries = fs.readdirSync(dir).filter(e => !e.startsWith('.'));
      if (decl.file === '*' ? entries.length > 0 : entries.includes(decl.file)) {
        present.add(key);
      }
    } catch {
      /* dir missing - fall through to recorded paths */
    }
  }

  // 2. Recorded paths in progress.yaml (legacy layouts).
  const progressFile = path.join(projectDir, 'progress.yaml');
  if (fs.existsSync(progressFile)) {
    try {
      const progress = parseYaml(fs.readFileSync(progressFile, 'utf-8'));
      const recorded: string[] = [];
      for (const entry of progress?.progress ?? []) {
        for (const a of entry?.artifacts ?? []) {
          if (typeof a?.path === 'string') recorded.push(a.path);
        }
      }
      for (const [key, decl] of Object.entries(graph.artifacts)) {
        if (present.has(key)) continue;
        const match = recorded.find(p => {
          if (decl.file !== '*' && p.endsWith(`/${decl.file}`)) return true;
          if (decl.file === '*' && p.includes(`/${decl.dir}/`)) return true;
          return false;
        });
        if (match && fs.existsSync(path.join(projectDir, match))) present.add(key);
      }
    } catch {
      /* unreadable progress.yaml - dir scan already did its best */
    }
  }

  return present;
}

// ─── Impact computation ──────────────────────────────────────

export function computeImpact(
  graph: DependencyGraph,
  owner: string,
  opts: { changedArtifacts?: string[]; projectDir?: string } = {}
): ImpactReport {
  const ownerDecl = graph.skills[owner];
  if (!ownerDecl) throw new Error(`Unknown skill "${owner}" - not in skill-dependencies.yaml`);

  const changed = opts.changedArtifacts?.length
    ? opts.changedArtifacts
    : [...ownerDecl.produces];
  for (const key of changed) {
    if (!graph.artifacts[key]) throw new Error(`Unresolvable artifact key "${key}"`);
  }

  // Transitive closure: an artifact is affected when any skill that produces
  // it consumes an affected artifact.
  const affectedArtifacts = new Set<string>(changed);
  const affectedSkills = new Set<string>([owner]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [skill, decl] of Object.entries(graph.skills)) {
      if (affectedSkills.has(skill)) continue;
      if (decl.consumes.some(a => affectedArtifacts.has(a))) {
        affectedSkills.add(skill);
        for (const p of decl.produces) {
          if (!affectedArtifacts.has(p)) {
            affectedArtifacts.add(p);
            grew = true;
          }
        }
        grew = true;
      }
    }
  }

  // Project awareness: absent artifacts are reported, and their skills are
  // dropped from the schedule (nothing to refresh that never existed).
  const absent: string[] = [];
  if (opts.projectDir) {
    const present = presentArtifacts(graph, opts.projectDir);
    for (const key of Object.keys(graph.artifacts)) {
      if (!present.has(key)) absent.push(key);
    }
    for (const skill of [...affectedSkills]) {
      if (skill === owner) continue;
      const produces = graph.skills[skill].produces;
      // A skill is scheduled only if it has run in this project before,
      // judged by its canonical (first-declared) artifact. Secondary outputs
      // can pre-exist (e.g. /solace-diagrams fills 12-blueprint/diagrams
      // before the blueprint is ever assembled) and must not pull an
      // unstarted skill into the sequence.
      if (produces.length > 0 && absent.includes(produces[0])) {
        affectedSkills.delete(skill);
        for (const p of produces) {
          if (absent.includes(p)) affectedArtifacts.delete(p);
        }
      }
    }
  }

  // Buckets by declared kind.
  const re_decide: string[] = [];
  const re_review: string[] = [];
  const regenerateSet = new Set<string>();
  for (const skill of affectedSkills) {
    if (skill === owner) continue;
    const kind = graph.skills[skill].kind;
    if (kind === 'design') re_decide.push(skill);
    else if (kind === 'review') re_review.push(skill);
    else for (const p of graph.skills[skill].produces) regenerateSet.add(p);
  }
  const regenerate = [...regenerateSet];

  const unaffected = Object.keys(graph.artifacts).filter(
    a => !affectedArtifacts.has(a) && !absent.includes(a)
  );

  // A live conflict exists only when the live-backed artifact is actually
  // present in the project (e.g. provisioned.yaml exists). Without a project,
  // there is no live state to conflict with.
  const live_conflict =
    !!opts.projectDir &&
    [...affectedArtifacts].some(a => graph.artifacts[a].live && !absent.includes(a));

  return {
    owner,
    changed_artifacts: changed,
    regenerate: regenerate.sort(),
    re_review: sortByDeclOrder(graph, re_review),
    re_decide: sortByDeclOrder(graph, re_decide),
    unaffected,
    absent,
    live_conflict,
    skill_sequence: topoSequence(graph, owner, affectedSkills),
  };
}

function sortByDeclOrder(graph: DependencyGraph, skills: string[]): string[] {
  const order = Object.keys(graph.skills);
  return [...skills].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/**
 * Topological sort of the affected skill subgraph: skill A precedes skill B
 * when B consumes an artifact A produces. Ties break by declaration order in
 * the YAML, which lists design skills before reviews before assembly.
 */
export function topoSequence(
  graph: DependencyGraph,
  owner: string,
  affected: Set<string>
): string[] {
  const skills = sortByDeclOrder(graph, [...affected]);
  const producerOf = new Map<string, string[]>();
  for (const s of skills) {
    for (const p of graph.skills[s].produces) {
      producerOf.set(p, [...(producerOf.get(p) ?? []), s]);
    }
  }
  const indegree = new Map<string, number>();
  const dependents = new Map<string, Set<string>>();
  for (const s of skills) {
    indegree.set(s, 0);
    dependents.set(s, new Set());
  }
  for (const s of skills) {
    for (const consumed of graph.skills[s].consumes) {
      for (const producer of producerOf.get(consumed) ?? []) {
        if (producer !== s && !dependents.get(producer)!.has(s)) {
          dependents.get(producer)!.add(s);
          indegree.set(s, indegree.get(s)! + 1);
        }
      }
    }
  }
  const queue = skills.filter(s => indegree.get(s) === 0);
  // The owner leads: it is the root of the change.
  queue.sort((a, b) => (a === owner ? -1 : b === owner ? 1 : 0));
  const sequence: string[] = [];
  while (queue.length > 0) {
    const s = queue.shift()!;
    sequence.push(s);
    for (const dep of sortByDeclOrder(graph, [...dependents.get(s)!])) {
      indegree.set(dep, indegree.get(dep)! - 1);
      if (indegree.get(dep) === 0) queue.push(dep);
    }
  }
  if (sequence.length !== skills.length) {
    throw new Error('Cycle detected in affected skill subgraph');
  }
  return sequence;
}

// ─── CLI ─────────────────────────────────────────────────────

function usage(): never {
  console.error(
    'Usage: bun run change:impact --skill <skill-name> [--artifacts a,b] [--project <slug>] [--json]'
  );
  process.exit(1);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flagValue = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const skill = flagValue('--skill');
  if (!skill) usage();
  const project = flagValue('--project');
  const artifactsArg = flagValue('--artifacts');
  const asJson = argv.includes('--json');

  try {
    const graph = loadGraph();
    const report = computeImpact(graph, skill, {
      changedArtifacts: artifactsArg ? artifactsArg.split(',').map(s => s.trim()) : undefined,
      projectDir: project ? path.join(PROJECTS_DIR, project) : undefined,
    });
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Owner:        ${report.owner}`);
      console.log(`Changed:      ${report.changed_artifacts.join(', ')}`);
      console.log(`Re-decide:    ${report.re_decide.join(', ') || '(none)'}`);
      console.log(`Re-review:    ${report.re_review.join(', ') || '(none)'}`);
      console.log(`Regenerate:   ${report.regenerate.join(', ') || '(none)'}`);
      console.log(`Unaffected:   ${report.unaffected.join(', ') || '(none)'}`);
      if (report.absent.length) console.log(`Absent:       ${report.absent.join(', ')}`);
      console.log(`Live conflict: ${report.live_conflict ? 'YES - breaking-live path required' : 'no'}`);
      console.log(`Sequence:     ${report.skill_sequence.join(' -> ')}`);
    }
  } catch (err: any) {
    console.error(`change-impact: ${err.message}`);
    process.exit(err.message.includes('Cycle') ? 2 : 1);
  }
}
