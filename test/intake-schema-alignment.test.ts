/**
 * Intake-schema alignment (drift guard).
 *
 * Phase 0 of the sam-solace-architect uplift persists a canonical structured
 * `intake.yaml` so downstream skills (routing, reviews, validation) evaluate the
 * intake inputs directly instead of parsing prose. That only holds if three
 * things stay in lock-step:
 *
 *   1. The `intake.yaml` schema emitted by /solace-intake (import path).
 *   2. The `intake.yaml` schema emitted by /solace-discovery (interactive path).
 *   3. The `field:` paths that scripts/skill-routing.yaml routes on.
 *
 * If any drifts, routing silently reads a field the intake never wrote. These
 * tests fail the moment that happens.
 *
 * YAML is parsed by shelling to Python (matching report-packs.test.ts) to avoid
 * adding a JS YAML dependency.
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(import.meta.dir, '..');

function parseYamlString(content: string): any {
  const out = execSync(
    `python3 -c "import sys, yaml, json; print(json.dumps(yaml.safe_load(sys.stdin.read()), default=str))"`,
    { input: content, encoding: 'utf-8' }
  );
  return JSON.parse(out);
}

/** Pull the body of a `<< 'INTAKEEOF' ... INTAKEEOF` heredoc out of a template. */
function extractIntakeHeredoc(tmplPath: string): string {
  const content = fs.readFileSync(tmplPath, 'utf-8');
  const m = content.match(/<< '(INTAKEEOF)'\n([\s\S]*?)\n\1/);
  if (!m) throw new Error(`No INTAKEEOF heredoc found in ${tmplPath}`);
  return m[2];
}

/**
 * Collect dotted key paths from a parsed object. A list of objects contributes
 * both `key` and `key[].subkey` so we can match skill-routing's `systems[].name`.
 */
function keyPaths(obj: any, prefix = ''): Set<string> {
  const out = new Set<string>();
  if (obj === null || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        for (const p of keyPaths(item, prefix + '[]')) out.add(p);
      }
    }
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    out.add(p);
    for (const sub of keyPaths(v, p)) out.add(sub);
  }
  return out;
}

const INTAKE_TMPL = path.join(ROOT, 'solace-intake', 'SKILL.md.tmpl');
const DISCOVERY_TMPL = path.join(ROOT, 'solace-discovery', 'SKILL.md.tmpl');
const ROUTING_FILE = path.join(ROOT, 'scripts', 'skill-routing.yaml');

const intakeSchema = keyPaths(parseYamlString(extractIntakeHeredoc(INTAKE_TMPL)));
const discoverySchema = keyPaths(parseYamlString(extractIntakeHeredoc(DISCOVERY_TMPL)));

describe('intake.yaml schema parity across entry points', () => {
  test('/solace-intake and /solace-discovery emit the same canonical key set', () => {
    const onlyInIntake = [...intakeSchema].filter(k => !discoverySchema.has(k));
    const onlyInDiscovery = [...discoverySchema].filter(k => !intakeSchema.has(k));
    expect({ onlyInIntake, onlyInDiscovery }).toEqual({ onlyInIntake: [], onlyInDiscovery: [] });
  });

  test('canonical schema carries the expected top-level namespaces', () => {
    for (const ns of ['project', 'landscape', 'requirements', 'goals', 'preferences']) {
      expect(intakeSchema.has(ns)).toBe(true);
    }
  });
});

describe('skill-routing.yaml fields are backed by the intake schema', () => {
  const routing = parseYamlString(fs.readFileSync(ROUTING_FILE, 'utf-8'));
  const fields = new Set<string>();
  for (const skill of routing.skills ?? []) {
    for (const cond of skill.when ?? []) {
      if (cond.field) fields.add(cond.field);
    }
  }

  test('every routed field exists in the canonical intake.yaml schema', () => {
    // Array-projection forms (`landscape.systems[].name`) match schema paths directly.
    const missing = [...fields].filter(f => !intakeSchema.has(f));
    expect(missing).toEqual([]);
  });

  test('at least the known routing fields are present (sanity)', () => {
    // Guards against the extractor silently finding nothing.
    expect(fields.size).toBeGreaterThan(0);
    expect(fields.has('requirements.topology')).toBe(true);
    expect(fields.has('landscape.systems[].name')).toBe(true);
  });
});

describe('intake HTML form fields are backed by the intake schema', () => {
  // Every scalar `data-path` in the form must land in a key the persisted
  // intake.yaml carries — otherwise a form field is collected but never written
  // to the canonical artifact, and routing/reviews can't see it.
  const FORM_FILE = path.join(ROOT, 'scripts', 'build-intake-html.py');
  const src = fs.readFileSync(FORM_FILE, 'utf-8');
  const dataPaths = new Set<string>();
  for (const m of src.matchAll(/data-path="([^"]+)"/g)) dataPaths.add(m[1]);

  // `domain.<vertical>.*` is represented generically in the schema as `domain: {}`
  // (the block written depends on landscape.vertical), so it's covered by the
  // `domain` root rather than per-leaf keys.
  const scalarPaths = [...dataPaths].filter(p => !p.startsWith('domain.'));

  test('form has data-path fields (sanity)', () => {
    expect(dataPaths.size).toBeGreaterThan(0);
    expect(scalarPaths).toContain('requirements.topology');
  });

  test('every non-domain form field maps to an intake.yaml key', () => {
    const missing = scalarPaths.filter(p => !intakeSchema.has(p));
    expect(missing).toEqual([]);
  });

  test('domain.* form fields are covered by the schema domain root', () => {
    const hasDomainFields = [...dataPaths].some(p => p.startsWith('domain.'));
    if (hasDomainFields) expect(intakeSchema.has('domain')).toBe(true);
  });
});
