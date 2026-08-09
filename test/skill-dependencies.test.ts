/**
 * Graph validation for scripts/skill-dependencies.yaml
 * (docs/solace-change-skill.md §13).
 *
 * - Every produces/consumes key resolves to a declared artifact.
 * - The artifact graph is acyclic.
 * - Every artifact except discovery-brief has at least one producer.
 * - .tmpl frontmatter produces/consumes mirrors the YAML for every skill.
 * - No drift against skill-routing.yaml: the two hand-maintained YAML
 *   sources of truth must be mechanically reconciled.
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { loadGraph, detectCycle, type DependencyGraph } from '../scripts/change-impact';

const ROOT = path.resolve(import.meta.dir, '..');
const GRAPH_FILE = path.join(ROOT, 'scripts', 'skill-dependencies.yaml');
const ROUTING_FILE = path.join(ROOT, 'scripts', 'skill-routing.yaml');

const graph: DependencyGraph = loadGraph(GRAPH_FILE);

// Skills that legitimately appear in the dependency graph but not in
// skill-routing.yaml: they run before /solace-plan routing exists.
const PRE_ROUTING_SKILLS = new Set(['solace-discovery', 'solace-intake']);

describe('skill-dependencies.yaml structure', () => {
  test('every produces/consumes key resolves to a declared artifact', () => {
    for (const [skill, decl] of Object.entries(graph.skills)) {
      for (const key of [...decl.produces, ...decl.consumes]) {
        expect(graph.artifacts[key], `${skill}: unknown artifact "${key}"`).toBeDefined();
      }
    }
  });

  test('every skill has a valid kind', () => {
    for (const [skill, decl] of Object.entries(graph.skills)) {
      expect(['design', 'review', 'assemble'], `${skill} kind`).toContain(decl.kind);
    }
  });

  test('the artifact graph is acyclic', () => {
    expect(() => detectCycle(graph)).not.toThrow();
  });

  test('every artifact has at least one producer', () => {
    const produced = new Set<string>();
    for (const decl of Object.values(graph.skills)) {
      for (const p of decl.produces) produced.add(p);
    }
    for (const key of Object.keys(graph.artifacts)) {
      expect(produced.has(key), `artifact "${key}" has no producer`).toBe(true);
    }
  });

  test('live artifacts are declared explicitly', () => {
    expect(graph.artifacts['ep-provisioned']?.live).toBe(true);
    const liveKeys = Object.entries(graph.artifacts)
      .filter(([, a]) => a.live)
      .map(([k]) => k);
    expect(liveKeys).toEqual(['ep-provisioned']);
  });
});

describe('frontmatter mirror', () => {
  // The YAML is what tooling reads; the frontmatter is what a human editing
  // a skill sees. They must agree.
  function frontmatterList(tmpl: string, key: 'produces' | 'consumes'): string[] | null {
    const fmEnd = tmpl.indexOf('\n---', 4);
    if (!tmpl.startsWith('---\n') || fmEnd === -1) return null;
    const fm = tmpl.slice(4, fmEnd);
    const lines = fm.split('\n');
    const start = lines.findIndex(l => l === `${key}:` || l.startsWith(`${key}: [`));
    if (start === -1) return null;
    if (lines[start].startsWith(`${key}: [`)) {
      const inner = lines[start].slice(key.length + 3).replace(/\]\s*$/, '');
      return inner.split(',').map(s => s.trim()).filter(Boolean);
    }
    const items: string[] = [];
    for (let i = start + 1; i < lines.length; i++) {
      const m = lines[i].match(/^\s+-\s+(.+)$/);
      if (m) items.push(m[1].trim());
      else if (!/^\s/.test(lines[i])) break;
    }
    return items;
  }

  for (const [skill, decl] of Object.entries(graph.skills)) {
    test(`${skill}/SKILL.md.tmpl frontmatter matches the graph`, () => {
      const tmplPath = path.join(ROOT, skill, 'SKILL.md.tmpl');
      expect(fs.existsSync(tmplPath), `${tmplPath} missing`).toBe(true);
      const tmpl = fs.readFileSync(tmplPath, 'utf-8');
      expect(frontmatterList(tmpl, 'produces'), `${skill} produces`).toEqual(decl.produces);
      expect(frontmatterList(tmpl, 'consumes'), `${skill} consumes`).toEqual(decl.consumes);
    });
  }
});

describe('no drift against skill-routing.yaml', () => {
  const routingNames = (() => {
    const routing = fs.readFileSync(ROUTING_FILE, 'utf-8');
    const names: string[] = [];
    for (const line of routing.split('\n')) {
      const m = line.match(/^\s+-\s+name:\s+(\S+)/);
      if (m) names.push(m[1]);
    }
    return names;
  })();

  test('routing file parsed', () => {
    expect(routingNames.length).toBeGreaterThanOrEqual(19);
  });

  test('every artifact-producing routed skill appears in the dependency graph', () => {
    // solace-change itself is routed as a utility with no artifacts.
    const exempt = new Set(['solace-change']);
    for (const name of routingNames) {
      if (exempt.has(name)) continue;
      expect(graph.skills[name], `routed skill "${name}" missing from graph`).toBeDefined();
    }
  });

  test('every graph skill is routed or explicitly pre-routing', () => {
    for (const skill of Object.keys(graph.skills)) {
      const ok = routingNames.includes(skill) || PRE_ROUTING_SKILLS.has(skill);
      expect(ok, `graph skill "${skill}" is neither routed nor pre-routing`).toBe(true);
    }
  });
});
