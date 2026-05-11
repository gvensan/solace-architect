/**
 * Regression tests for the Event Portal provisioning gate.
 *
 * Background: /solace-ep-provision writes to a live Solace Cloud tenant via the
 * Event Portal Designer MCP (Early Access). It must be:
 *   1. Opt-in only (never auto-fired by project type or any heuristic).
 *   2. Visible everywhere the rest of the skill catalog is enumerated
 *      (dashboard, plan, routing) so it cannot be hidden from the user.
 *   3. Surfaced explicitly when blocked at runtime (MCP not loaded, token
 *      missing) — never treated as a silent skip.
 *
 * These tests pin the contract that delivers those three properties.
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(import.meta.dir, '..');

function parseYamlFile(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  // default=str so YAML dates (e.g. `refreshed: 2026-05-11`) survive json encoding.
  const out = execSync(
    `python3 -c "import sys, yaml, json; print(json.dumps(yaml.safe_load(sys.stdin.read()), default=str))"`,
    { input: content, encoding: 'utf-8' }
  );
  return JSON.parse(out);
}

describe('skill-routing.yaml: ep-provision is opt-in only', () => {
  const routing = parseYamlFile(path.join(ROOT, 'scripts', 'skill-routing.yaml'));
  const entry = (routing.skills || []).find((s: any) => s.name === 'solace-ep-provision');

  test('ep-provision entry exists in routing', () => {
    expect(entry).toBeDefined();
  });

  test('ep-provision is conditional, not always-on', () => {
    expect(entry.trigger).toBe('conditional');
  });

  test('ep-provision is gated solely on preferences.provision_event_portal == true', () => {
    expect(Array.isArray(entry.when)).toBe(true);
    expect(entry.when.length).toBe(1);
    const cond = entry.when[0];
    expect(cond.field).toBe('preferences.provision_event_portal');
    expect(cond.op).toBe('equals');
    expect(cond.value).toBe(true);
  });

  test('ep-provision does NOT auto-fire on project.type — that was the F1 footgun', () => {
    // Regression: a previous routing rule OR-ed project.type into the gate,
    // which (per the YAML header's "conditions are OR-ed" semantics) caused
    // every new_build/sam/extension project to provision even when the user
    // had not opted in. The fix removes the project.type condition entirely.
    const hasProjectType = (entry.when || []).some((c: any) => c.field === 'project.type');
    expect(hasProjectType).toBe(false);
  });
});

describe('dashboard/app.js: ep-provision is in every skill enumeration', () => {
  const app = fs.readFileSync(path.join(ROOT, 'dashboard', 'app.js'), 'utf-8');

  test('SKILL_ORDER includes solace-ep-provision', () => {
    const m = app.match(/const SKILL_ORDER = \[([\s\S]*?)\];/);
    expect(m).not.toBeNull();
    expect(m![1]).toContain("'solace-ep-provision'");
  });

  test('SKILL_LABELS maps solace-ep-provision to a human label', () => {
    const m = app.match(/const SKILL_LABELS = \{([\s\S]*?)\};/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/'solace-ep-provision':\s*'[^']+'/);
  });

  test('SKILL_PHASES places ep-provision in Design', () => {
    const m = app.match(/const SKILL_PHASES = \{([\s\S]*?)\};/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/'solace-ep-provision':\s*'Design'/);
  });

  test('SKILL_GROUPS design phase lists ep-provision', () => {
    const m = app.match(/const SKILL_GROUPS = \[([\s\S]*?)\];/);
    expect(m).not.toBeNull();
    const designLine = m![1].split('\n').find(l => l.includes("phase: 'design'"));
    expect(designLine).toBeDefined();
    expect(designLine!).toContain("'solace-ep-provision'");
  });

  test('SKIP_REASONS explains why ep-provision is absent when not opted in', () => {
    const m = app.match(/const SKIP_REASONS = \{([\s\S]*?)\};/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/'solace-ep-provision':\s*'[^']+'/);
    expect(m![1]).toMatch(/provision_event_portal/);
  });
});

describe('intake surfaces: provision_event_portal is exposed in every flow', () => {
  test('HTML intake form has a yes/no field for provision_event_portal', () => {
    const html = fs.readFileSync(path.join(ROOT, 'scripts', 'build-intake-html.py'), 'utf-8');
    expect(html).toMatch(/data-path="preferences\.provision_event_portal"/);
    expect(html).toMatch(/name="provision_event_portal"/);
  });

  test('HTML intake form coerces provision_event_portal value to a boolean', () => {
    // The routing rule compares against `value: true` (a YAML/JS boolean),
    // so the form must not store the string "true". A data-bool="1" radio
    // with explicit coercion in collectData() is the contract.
    const html = fs.readFileSync(path.join(ROOT, 'scripts', 'build-intake-html.py'), 'utf-8');
    expect(html).toMatch(/data-bool="1"/);
    expect(html).toMatch(/el\.dataset\.bool === '1'/);
  });

  test('DOCX intake template includes provision_event_portal dropdown', () => {
    const docx = fs.readFileSync(path.join(ROOT, 'scripts', 'build-intake-docx.py'), 'utf-8');
    expect(docx).toMatch(/'provision_event_portal':\s*'preferences\.provision_event_portal'/);
    expect(docx).toMatch(/PROVISION_EVENT_PORTAL_OPTIONS/);
    expect(docx).toMatch(/_add_field_dropdown\(doc, 'provision_event_portal'/);
  });

  test('DOCX parser coerces provision_event_portal "true"/"false" to a Python bool', () => {
    const parser = fs.readFileSync(path.join(ROOT, 'scripts', 'parse-intake-docx.py'), 'utf-8');
    expect(parser).toMatch(/'provision_event_portal':\s*'preferences\.provision_event_portal'/);
    expect(parser).toMatch(/_BOOL_PATHS/);
    expect(parser).toMatch(/preferences\.provision_event_portal/);
  });

  test('solace-intake template emits provision_event_portal into decisions.yaml', () => {
    const tmpl = fs.readFileSync(path.join(ROOT, 'solace-intake', 'SKILL.md.tmpl'), 'utf-8');
    expect(tmpl).toMatch(/provision_event_portal/);
    // The generated decisions.yaml block must reference the field so /solace-plan
    // can read the opt-in gate from there.
    expect(tmpl).toMatch(/provision_event_portal:\s*<true or false/);
  });
});

describe('solace-plan: BLOCKED ep-provision is surfaced, not silently completed', () => {
  const planTmpl = fs.readFileSync(path.join(ROOT, 'solace-plan', 'SKILL.md.tmpl'), 'utf-8');

  test('plan only includes ep-provision when the opt-in gate is on', () => {
    // The phrase "include only if" is what we lean on. The old text said
    // "include if... OR project.type is new_build/sam/extension AND MCP
    // configured" which leaked the unsafe auto-trigger into the planner.
    expect(planTmpl).toMatch(/include \*\*only\*\* if `decisions\.yaml` has `provision_event_portal: true`/i);
    // Negative: must explicitly say project type does NOT trigger.
    expect(planTmpl).toMatch(/[Pp]roject type does not auto-trigger/);
  });

  test('plan surfaces BLOCKED status in the final summary', () => {
    // Step 5 must read the ep-provision progress entry and either mark the
    // plan complete (status: complete), call out the blocker (status: blocked),
    // or flag a planning bug (no entry when the gate is on).
    // Note: markdown wraps long lines, so allow whitespace between key tokens.
    expect(planTmpl).toMatch(/Event\s+Portal\s+provisioning\s+did\s+not\s+complete/);
    expect(planTmpl).toMatch(/DONE_WITH_CONCERNS/);
    expect(planTmpl).toMatch(/[Dd]esign-only\s+engagement\s+—\s+no\s+tenant\s+changes/);
  });
});

describe('end-to-end: progress with provision_event_portal=true + no ep-provision entry is incomplete', () => {
  // This is the concrete state Codex flagged: a project whose decisions say
  // "yes, provision" but whose progress.yaml has no solace-ep-provision row.
  // The contract is that the plan-level completion logic must NOT call this
  // engagement complete. We assert via the planner's text contract (since the
  // dashboard's progress page derives status from the same shape).
  const planTmpl = fs.readFileSync(path.join(ROOT, 'solace-plan', 'SKILL.md.tmpl'), 'utf-8');

  test('plan flags a missing ep-provision progress entry as a planning bug', () => {
    // The planner says: "If there is no progress entry at all even though the
    // gate is on — this is a planning error; flag it and re-run the skill."
    expect(planTmpl).toMatch(/no progress entry at all even though the gate is on/);
    expect(planTmpl).toMatch(/planning error/);
  });
});
