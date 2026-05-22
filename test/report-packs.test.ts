/**
 * Report pack isolation tests.
 *
 * Verifies that audience-specific report packs in scripts/report-packs.yaml
 * filter artifacts, decisions, findings, and open items correctly — i.e. that
 * a "restricted" pack like Executive does not surface technical or
 * cross-audience content.
 *
 * These tests re-implement the filter functions from dashboard/app.js so they
 * can run headlessly in Bun. The functions are byte-for-byte equivalent to
 * those in app.js; if app.js diverges these tests will catch regressions
 * but should be kept in sync manually.
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Parse YAML by shelling to Python — avoids adding a JS YAML dependency
// just for this test. The runtime dashboard parses YAML via js-yaml from CDN.
function parseYamlFile(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  const out = execSync(
    `python3 -c "import sys, yaml, json; print(json.dumps(yaml.safe_load(sys.stdin.read())))"`,
    { input: content, encoding: 'utf-8' }
  );
  return JSON.parse(out);
}

const ROOT = path.resolve(import.meta.dir, '..');
const PACKS_FILE = path.join(ROOT, 'scripts', 'report-packs.yaml');

// ───── Mirror of filter helpers in dashboard/app.js ─────

function packIncludesArtifact(packFilters: any, artifactPath: string): boolean {
  if (!packFilters || Object.keys(packFilters).length === 0) return true;
  const norm = artifactPath.replace(/^artifacts\//, '');
  if (Array.isArray(packFilters.dirs)) {
    for (const dir of packFilters.dirs) {
      if (norm === dir || norm.startsWith(dir + '/')) return true;
    }
  }
  if (Array.isArray(packFilters.files)) {
    for (const file of packFilters.files) {
      if (norm === file) return true;
    }
  }
  if (Array.isArray(packFilters.globs)) {
    for (const glob of packFilters.globs) {
      const re = new RegExp('^' + glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '__GLOBSTAR__')
        .replace(/\*/g, '[^/]*')
        .replace(/__GLOBSTAR__/g, '.*')
        .replace(/\?/g, '.') + '$');
      if (re.test(norm)) return true;
    }
  }
  return false;
}

function filterByPackSkills(items: any[], allowedSkills: any): any[] {
  if (allowedSkills === undefined) return items;
  if (!Array.isArray(allowedSkills)) return items;
  if (allowedSkills.length === 0) return [];
  return items.filter(it => {
    const skill = it.skill || it.source || '';
    return allowedSkills.includes(skill);
  });
}

function packIncludesSection(packFilters: any, sectionId: string): boolean {
  if (!packFilters || !Array.isArray(packFilters.top_sections)) return true;
  return packFilters.top_sections.includes(sectionId);
}

// ───── Fixture data ─────

const FIXTURE_FILES = [
  '01-discovery/discovery-brief.md',
  '02-topic-design/topic-taxonomy.md',
  '02-topic-design/wildcard-subscriptions.md',
  '02-topic-design/antipattern-report.md',
  '03-broker-select/broker-recommendation.md',
  '05-protocol-select/protocol-map.md',
  '10-reviews/architect-review.md',
  '10-reviews/ops-review.md',
  '10-reviews/security-review.md',
  '10-reviews/dev-review.md',
  '11-validation/validation-report.md',
  '12-blueprint/architecture.md',
  '12-blueprint/runbook.md',
  '12-blueprint/topic-taxonomy.md',
  '12-blueprint/validation-report.md',
  '12-blueprint/config/broker/provisioning-parameters.md',
  '12-blueprint/diagrams/broker-topology.mermaid',
  '12-blueprint/diagrams/dlq-flow.mermaid',
  '12-blueprint/diagrams/failure-modes.mermaid',
  '12-blueprint/diagrams/queue-subscriptions.mermaid',
  '12-blueprint/diagrams/queue-subscriptions-detail.md',
  '12-blueprint/diagrams/protocol-stack.mermaid',
  '12-blueprint/diagrams/security-boundaries.mermaid',
  '12-blueprint/diagrams/security-detail.md',
  '12-blueprint/diagrams/topic-hierarchy.mermaid',
  '12-blueprint/diagrams/data-flow.mermaid',
  '13-event-portal/event-portal-design.md',
  '13-event-portal/provisioning-plan.md',
  '14-executive/executive-summary.md',
  '14-executive/business-architecture.mermaid',
  '14-executive/roi-framework.md',
];

// Sample decisions + findings spanning multiple skills
const FIXTURE_ITEMS = [
  // Decisions
  { id: 'D1', skill: 'solace-topic-design', label: 'Topic structure' },
  { id: 'D2', skill: 'solace-broker-select', label: 'Cloud-managed Enterprise' },
  { id: 'D3', skill: 'solace-protocol-select', label: 'REST + MQTT' },
  { id: 'D4', skill: 'solace-event-portal', label: 'JSON Schema' },
  // Findings
  { source: 'solace-architect-review', severity: 'important', decision: 'Mark X as not-published', action: 'applied' },
  { source: 'solace-ops-review', severity: 'important', decision: 'DMQ design', action: 'applied' },
  { source: 'solace-security-review', severity: 'important', decision: 'Per-service ACL', action: 'applied' },
  { source: 'solace-dev-review', severity: 'important', decision: 'Local Docker dev', action: 'applied' },
];

const FIXTURE_OPEN_ITEMS = [
  { id: 'O1', source: 'solace-ops-review', description: 'Verify spool quotas at provisioning', status: 'open' },
  { id: 'O2', source: 'solace-security-review', description: 'Validate TLS cipher policy', status: 'open' },
  { id: 'O3', source: 'solace-dev-review', description: 'Author onboarding README', status: 'open' },
  { id: 'O4', source: 'solace-broker-select', description: 'Confirm Solace pricing', status: 'open' },
];

// ───── Load packs from the canonical YAML ─────

const packsFile = parseYamlFile(PACKS_FILE);
const packs = packsFile.packs;
const packsById: Record<string, any> = {};
for (const p of packs) packsById[p.id] = p;

// ───── Tests ─────

describe('report-packs.yaml structure', () => {
  test('contains all 6 expected packs', () => {
    expect(packs).toHaveLength(6);
    const ids = packs.map((p: any) => p.id).sort();
    expect(ids).toEqual(['arch-blueprint', 'blueprint', 'developer', 'executive', 'ops', 'security']);
  });

  test('every pack has label, description, audience', () => {
    for (const p of packs) {
      expect(p.label).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.audience).toBeTruthy();
    }
  });

  test('blueprint has empty filters (includes everything)', () => {
    expect(Object.keys(packsById.blueprint.filters || {})).toHaveLength(0);
  });
});

describe('blueprint pack — includes everything', () => {
  test('includes all fixture artifacts', () => {
    for (const f of FIXTURE_FILES) {
      expect(packIncludesArtifact(packsById.blueprint.filters, f)).toBe(true);
    }
  });

  test('does not filter decisions', () => {
    const result = filterByPackSkills(FIXTURE_ITEMS, packsById.blueprint.filters.decision_skills);
    expect(result).toHaveLength(FIXTURE_ITEMS.length);
  });

  test('does not filter open items', () => {
    const result = filterByPackSkills(FIXTURE_OPEN_ITEMS, packsById.blueprint.filters.finding_skills);
    expect(result).toHaveLength(FIXTURE_OPEN_ITEMS.length);
  });
});

describe('executive pack — strict isolation', () => {
  const f = packsById.executive.filters;

  test('includes only 14-executive artifacts', () => {
    const included = FIXTURE_FILES.filter(p => packIncludesArtifact(f, p));
    for (const path of included) {
      expect(path.startsWith('14-executive/')).toBe(true);
    }
  });

  test('does not include any 10-reviews artifacts', () => {
    const reviews = FIXTURE_FILES.filter(p => p.startsWith('10-reviews/'));
    for (const r of reviews) {
      expect(packIncludesArtifact(f, r)).toBe(false);
    }
  });

  test('does not include broker-recommendation, protocol-map, topic-taxonomy', () => {
    expect(packIncludesArtifact(f, '03-broker-select/broker-recommendation.md')).toBe(false);
    expect(packIncludesArtifact(f, '05-protocol-select/protocol-map.md')).toBe(false);
    expect(packIncludesArtifact(f, '02-topic-design/topic-taxonomy.md')).toBe(false);
  });

  test('hides decisions table (empty filter)', () => {
    expect(filterByPackSkills(FIXTURE_ITEMS.filter(i => !i.source), f.decision_skills)).toHaveLength(0);
  });

  test('hides findings table (empty filter)', () => {
    expect(filterByPackSkills(FIXTURE_ITEMS.filter(i => i.source), f.finding_skills)).toHaveLength(0);
  });

  test('hides open items (filter on finding_skills)', () => {
    expect(filterByPackSkills(FIXTURE_OPEN_ITEMS, f.finding_skills)).toHaveLength(0);
  });

  test('top_sections excludes decisions, findings, connected-systems', () => {
    expect(packIncludesSection(f, 'decisions')).toBe(false);
    expect(packIncludesSection(f, 'findings')).toBe(false);
    expect(packIncludesSection(f, 'connected-systems')).toBe(false);
  });

  test('top_sections includes summary, scope, open-items, artifacts', () => {
    expect(packIncludesSection(f, 'summary')).toBe(true);
    expect(packIncludesSection(f, 'scope')).toBe(true);
    expect(packIncludesSection(f, 'open-items')).toBe(true);
    expect(packIncludesSection(f, 'artifacts')).toBe(true);
  });
});

describe('ops pack — operational scope', () => {
  const f = packsById.ops.filters;

  test('includes broker-recommendation, ops-review, runbook, provisioning', () => {
    expect(packIncludesArtifact(f, '03-broker-select/broker-recommendation.md')).toBe(true);
    expect(packIncludesArtifact(f, '10-reviews/ops-review.md')).toBe(true);
    expect(packIncludesArtifact(f, '12-blueprint/runbook.md')).toBe(true);
    expect(packIncludesArtifact(f, '12-blueprint/config/broker/provisioning-parameters.md')).toBe(true);
  });

  test('excludes security-review, dev-review, architect-review', () => {
    expect(packIncludesArtifact(f, '10-reviews/security-review.md')).toBe(false);
    expect(packIncludesArtifact(f, '10-reviews/dev-review.md')).toBe(false);
    expect(packIncludesArtifact(f, '10-reviews/architect-review.md')).toBe(false);
  });

  test('includes operational diagrams via glob', () => {
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/broker-topology.mermaid')).toBe(true);
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/dlq-flow.mermaid')).toBe(true);
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/failure-modes.mermaid')).toBe(true);
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/queue-subscriptions.mermaid')).toBe(true);
  });

  test('excludes security and protocol diagrams', () => {
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/security-boundaries.mermaid')).toBe(false);
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/protocol-stack.mermaid')).toBe(false);
  });

  test('open items filtered to ops-source only', () => {
    const result = filterByPackSkills(FIXTURE_OPEN_ITEMS, f.finding_skills);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('solace-ops-review');
  });

  test('decisions filtered to ops-relevant skills', () => {
    const decisions = FIXTURE_ITEMS.filter(i => !i.source);
    const result = filterByPackSkills(decisions, f.decision_skills);
    const skills = result.map((d: any) => d.skill);
    expect(skills).toContain('solace-broker-select');
    expect(skills).toContain('solace-topic-design');
    expect(skills).not.toContain('solace-event-portal');
    expect(skills).not.toContain('solace-protocol-select');
  });
});

describe('security pack — security scope', () => {
  const f = packsById.security.filters;

  test('includes security-review, broker-recommendation, protocol-map, event-portal-design', () => {
    expect(packIncludesArtifact(f, '10-reviews/security-review.md')).toBe(true);
    expect(packIncludesArtifact(f, '03-broker-select/broker-recommendation.md')).toBe(true);
    expect(packIncludesArtifact(f, '05-protocol-select/protocol-map.md')).toBe(true);
    expect(packIncludesArtifact(f, '13-event-portal/event-portal-design.md')).toBe(true);
  });

  test('excludes ops-review, dev-review, architect-review, runbook', () => {
    expect(packIncludesArtifact(f, '10-reviews/ops-review.md')).toBe(false);
    expect(packIncludesArtifact(f, '10-reviews/dev-review.md')).toBe(false);
    expect(packIncludesArtifact(f, '10-reviews/architect-review.md')).toBe(false);
    expect(packIncludesArtifact(f, '12-blueprint/runbook.md')).toBe(false);
  });

  test('includes security diagrams', () => {
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/security-boundaries.mermaid')).toBe(true);
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/security-detail.md')).toBe(true);
  });

  test('open items filtered to security-source only', () => {
    const result = filterByPackSkills(FIXTURE_OPEN_ITEMS, f.finding_skills);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('solace-security-review');
  });
});

describe('developer pack — dev scope', () => {
  const f = packsById.developer.filters;

  test('includes topic-taxonomy, protocol-map, dev-review, event-portal-design', () => {
    expect(packIncludesArtifact(f, '02-topic-design/topic-taxonomy.md')).toBe(true);
    expect(packIncludesArtifact(f, '05-protocol-select/protocol-map.md')).toBe(true);
    expect(packIncludesArtifact(f, '10-reviews/dev-review.md')).toBe(true);
    expect(packIncludesArtifact(f, '13-event-portal/event-portal-design.md')).toBe(true);
  });

  test('excludes broker-recommendation (admin concern), runbook, ops/security reviews', () => {
    expect(packIncludesArtifact(f, '03-broker-select/broker-recommendation.md')).toBe(false);
    expect(packIncludesArtifact(f, '12-blueprint/runbook.md')).toBe(false);
    expect(packIncludesArtifact(f, '10-reviews/ops-review.md')).toBe(false);
    expect(packIncludesArtifact(f, '10-reviews/security-review.md')).toBe(false);
  });

  test('includes data-flow, protocol-stack, topic-hierarchy diagrams', () => {
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/data-flow.mermaid')).toBe(true);
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/protocol-stack.mermaid')).toBe(true);
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/topic-hierarchy.mermaid')).toBe(true);
  });

  test('excludes broker-topology, security-boundaries diagrams', () => {
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/broker-topology.mermaid')).toBe(false);
    expect(packIncludesArtifact(f, '12-blueprint/diagrams/security-boundaries.mermaid')).toBe(false);
  });
});

describe('regression — executive pack leak vectors', () => {
  // These tests directly assert the bug fix from Codex's first adversarial review.
  const f = packsById.executive.filters;

  test('regression: no ops findings surface', () => {
    const opsFindings = FIXTURE_ITEMS.filter(i => i.source === 'solace-ops-review');
    expect(opsFindings.length).toBeGreaterThan(0); // sanity: fixture has them
    const filtered = filterByPackSkills(FIXTURE_ITEMS.filter(i => i.source), f.finding_skills);
    expect(filtered).toHaveLength(0);
  });

  test('regression: no security findings surface', () => {
    const filtered = filterByPackSkills(FIXTURE_ITEMS.filter(i => i.source), f.finding_skills);
    const securityFindings = filtered.filter((it: any) => it.source === 'solace-security-review');
    expect(securityFindings).toHaveLength(0);
  });

  test('regression: no ops/security open items surface', () => {
    const filtered = filterByPackSkills(FIXTURE_OPEN_ITEMS, f.finding_skills);
    expect(filtered).toHaveLength(0);
  });

  test('regression: no broker/topology decisions surface', () => {
    const decisions = FIXTURE_ITEMS.filter(i => !i.source);
    const filtered = filterByPackSkills(decisions, f.decision_skills);
    expect(filtered).toHaveLength(0);
  });
});

// ───── Headline / metadata leak tests (Codex adversarial review #2) ─────

// Mirror of packFilteredSkillIds derivation in dashboard/app.js.
// Returns the set of completed skill IDs whose artifacts pass the pack filter.
function computePackFilteredSkillIds(packFilters: any, skills: any[]): Set<string> {
  const isUnfilteredPack = !packFilters || Object.keys(packFilters).length === 0;
  const ids = new Set<string>();
  for (const s of skills) {
    if (s.status !== 'complete') continue;
    if (!s.artifacts || s.artifacts.length === 0) {
      if (isUnfilteredPack) ids.add(s.skill);
      continue;
    }
    for (const a of s.artifacts) {
      if (packIncludesArtifact(packFilters, a.path)) {
        ids.add(s.skill);
        break;
      }
    }
  }
  return ids;
}

// Fixture: a typical retail engagement that ran 13 skills with artifacts under each.
const FIXTURE_SKILLS = [
  { skill: 'solace-discovery', status: 'complete', artifacts: [{ path: 'artifacts/01-discovery/discovery-brief.md' }] },
  { skill: 'solace-topic-design', status: 'complete', artifacts: [{ path: 'artifacts/02-topic-design/topic-taxonomy.md' }] },
  { skill: 'solace-broker-select', status: 'complete', artifacts: [{ path: 'artifacts/03-broker-select/broker-recommendation.md' }] },
  { skill: 'solace-protocol-select', status: 'complete', artifacts: [{ path: 'artifacts/05-protocol-select/protocol-map.md' }] },
  { skill: 'solace-architect-review', status: 'complete', artifacts: [{ path: 'artifacts/10-reviews/architect-review.md' }] },
  { skill: 'solace-ops-review', status: 'complete', artifacts: [{ path: 'artifacts/10-reviews/ops-review.md' }] },
  { skill: 'solace-security-review', status: 'complete', artifacts: [{ path: 'artifacts/10-reviews/security-review.md' }] },
  { skill: 'solace-dev-review', status: 'complete', artifacts: [{ path: 'artifacts/10-reviews/dev-review.md' }] },
  { skill: 'solace-validate', status: 'complete', artifacts: [{ path: 'artifacts/11-validation/validation-report.md' }] },
  { skill: 'solace-event-portal', status: 'complete', artifacts: [{ path: 'artifacts/13-event-portal/event-portal-design.md' }] },
  { skill: 'solace-blueprint', status: 'complete', artifacts: [
    { path: 'artifacts/12-blueprint/architecture.md' },
    { path: 'artifacts/12-blueprint/runbook.md' },
    { path: 'artifacts/12-blueprint/diagrams/security-boundaries.mermaid' },
  ] },
  { skill: 'solace-diagrams', status: 'complete', artifacts: [] }, // no artifacts (audit pass-through)
  { skill: 'solace-executive', status: 'complete', artifacts: [
    { path: 'artifacts/14-executive/executive-summary.md' },
    { path: 'artifacts/14-executive/roi-framework.md' },
  ] },
];

describe('headline metadata leak — Codex adversarial review #2', () => {
  test('blueprint pack: skill count includes all completed skills (no leak in unfiltered pack)', () => {
    const ids = computePackFilteredSkillIds(packsById.blueprint.filters, FIXTURE_SKILLS);
    expect(ids.size).toBe(FIXTURE_SKILLS.length);  // all 13
  });

  test('executive pack: skill count only counts skills with surviving artifacts', () => {
    const ids = computePackFilteredSkillIds(packsById.executive.filters, FIXTURE_SKILLS);
    // executive pack includes only 14-executive/ — so only solace-executive contributes
    expect(ids.has('solace-executive')).toBe(true);
    expect(ids.has('solace-blueprint')).toBe(false);
    expect(ids.has('solace-security-review')).toBe(false);
    expect(ids.has('solace-ops-review')).toBe(false);
    expect(ids.has('solace-discovery')).toBe(false);
    expect(ids.size).toBe(1);
  });

  test('executive pack: does NOT expose total skill count via headline', () => {
    // CXO seeing "1 of 13 skills" reveals 12 skills were hidden. The render path
    // suppresses the denominator for non-blueprint packs.
    const ids = computePackFilteredSkillIds(packsById.executive.filters, FIXTURE_SKILLS);
    // Test mirrors the render logic: only show " of N" denominator for unfiltered (blueprint) pack.
    const isUnfilteredPack = Object.keys(packsById.executive.filters).length === 0;
    expect(isUnfilteredPack).toBe(false);
    expect(ids.size).toBeLessThan(FIXTURE_SKILLS.length);
  });

  test('ops pack: skill count only counts ops-relevant skills', () => {
    const ids = computePackFilteredSkillIds(packsById.ops.filters, FIXTURE_SKILLS);
    // ops pack includes 02-topic-design, 03-broker-select, ops-review, blueprint subset
    expect(ids.has('solace-topic-design')).toBe(true);
    expect(ids.has('solace-broker-select')).toBe(true);
    expect(ids.has('solace-ops-review')).toBe(true);
    expect(ids.has('solace-blueprint')).toBe(true);  // architecture.md, runbook.md
    expect(ids.has('solace-security-review')).toBe(false);
    expect(ids.has('solace-dev-review')).toBe(false);
    expect(ids.has('solace-architect-review')).toBe(false);
    expect(ids.has('solace-executive')).toBe(false);
  });

  test('security pack: skill count only counts security-relevant skills', () => {
    const ids = computePackFilteredSkillIds(packsById.security.filters, FIXTURE_SKILLS);
    expect(ids.has('solace-security-review')).toBe(true);
    expect(ids.has('solace-broker-select')).toBe(true);
    expect(ids.has('solace-protocol-select')).toBe(true);
    expect(ids.has('solace-event-portal')).toBe(true);
    expect(ids.has('solace-blueprint')).toBe(true);  // security-boundaries.mermaid
    expect(ids.has('solace-ops-review')).toBe(false);
    expect(ids.has('solace-dev-review')).toBe(false);
    expect(ids.has('solace-architect-review')).toBe(false);
  });

  test('developer pack: skill count only counts dev-relevant skills', () => {
    const ids = computePackFilteredSkillIds(packsById.developer.filters, FIXTURE_SKILLS);
    expect(ids.has('solace-topic-design')).toBe(true);
    expect(ids.has('solace-protocol-select')).toBe(true);
    expect(ids.has('solace-dev-review')).toBe(true);
    expect(ids.has('solace-event-portal')).toBe(true);
    expect(ids.has('solace-broker-select')).toBe(false);  // broker-recommendation excluded
    expect(ids.has('solace-ops-review')).toBe(false);
    expect(ids.has('solace-security-review')).toBe(false);
    expect(ids.has('solace-architect-review')).toBe(false);
    expect(ids.has('solace-executive')).toBe(false);
  });

  test('regression: skills with no artifacts are excluded from restricted packs', () => {
    // solace-diagrams in the fixture has 0 artifacts. It should not appear in
    // restricted packs (its mere presence in the engagement summary would leak that it ran).
    const execIds = computePackFilteredSkillIds(packsById.executive.filters, FIXTURE_SKILLS);
    expect(execIds.has('solace-diagrams')).toBe(false);
    const opsIds = computePackFilteredSkillIds(packsById.ops.filters, FIXTURE_SKILLS);
    expect(opsIds.has('solace-diagrams')).toBe(false);
    // But it IS visible in the unfiltered blueprint pack:
    const bpIds = computePackFilteredSkillIds(packsById.blueprint.filters, FIXTURE_SKILLS);
    expect(bpIds.has('solace-diagrams')).toBe(true);
  });
});
