/**
 * C1: Terminology compliance tests.
 * Scans all generated SKILL.md files for forbidden terminology.
 * Violations in the naming conventions preamble section are excluded
 * (those are the rules telling the agent NOT to use the terms).
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { discoverSkillFiles } from '../scripts/discover-skills';

const ROOT = path.resolve(import.meta.dir, '..');
const SKILL_FILES = discoverSkillFiles(ROOT).map(f => path.join(ROOT, f));

interface ForbiddenTerm {
  pattern: RegExp;
  label: string;
  correctTerm: string;
  lineExclude?: RegExp;
}

const FORBIDDEN_TERMS: ForbiddenTerm[] = [
  { pattern: /\bconnector\b(?!s?\s+documentation)/gi, label: 'connector', correctTerm: 'Micro-Integration' },
  { pattern: /\badapter\b/gi, label: 'adapter', correctTerm: 'Micro-Integration' },
  { pattern: /\bintegration module\b/gi, label: 'integration module', correctTerm: 'Micro-Integration' },
  { pattern: /\bQoS\b/gi, label: 'QoS', correctTerm: 'Direct messaging / Guaranteed messaging', lineExclude: /mapped to/i },
  { pattern: /\bquality of service\b/gi, label: 'quality of service', correctTerm: 'Direct messaging / Guaranteed messaging' },
  { pattern: /\borchestrator\s+agent\b(?!s?\b)/gi, label: 'orchestrator agent (two words)', correctTerm: 'OrchestratorAgent' },
  { pattern: /\bpersistent messaging\b/gi, label: 'persistent messaging', correctTerm: 'Guaranteed messaging' },
  { pattern: /\bfire-and-forget\b/gi, label: 'fire-and-forget', correctTerm: 'Direct messaging' },
  { pattern: /\bmanaged broker\b/gi, label: 'managed broker', correctTerm: 'Event broker service' },
  { pattern: /\bthe portal\b/gi, label: 'the portal', correctTerm: 'Event Portal' },
];

const PREAMBLE_SECTIONS = [
  '## Preamble',
  '## Grounding Discipline',
  '## Naming Conventions',
  '## Grounding Document Loading',
  '## Artifact Validation',
  '## Cross-Skill Dependencies',
  '## Project Management',
  '## Voice',
  '## AskUserQuestion Format',
  '## Writing Style',
  '## Completeness Principle',
  '## Confusion Protocol',
  '## Continuous Checkpoint',
  '## Context Health',
  '## Repo Ownership',
  '## Search Before Building',
  '## Completion Status Protocol',
  '## Timing Instrumentation',
  '## Next Step Chaining',
];

function stripPreambleSections(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inPreamble = false;
  let inBashBlock = false;

  for (const line of lines) {
    if (line.match(/^```bash/)) { inBashBlock = true; continue; }
    if (line.match(/^```$/) && inBashBlock) { inBashBlock = false; continue; }
    if (inBashBlock) continue;

    if (PREAMBLE_SECTIONS.some(m => line.startsWith(m))) {
      inPreamble = true;
      continue;
    }
    if (inPreamble && line.match(/^#\s/) && !PREAMBLE_SECTIONS.some(m => line.startsWith(m))) {
      inPreamble = false;
    }
    if (!inPreamble) {
      result.push(line);
    }
  }
  return result.join('\n');
}

describe('terminology compliance', () => {
  for (const filePath of SKILL_FILES) {
    const relPath = path.relative(ROOT, filePath);

    test(`${relPath} uses correct Solace terminology`, () => {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const content = stripPreambleSections(raw);

      const violations: string[] = [];
      const contentLines = content.split('\n');
      for (const term of FORBIDDEN_TERMS) {
        let count = 0;
        for (const line of contentLines) {
          if (term.lineExclude && term.lineExclude.test(line)) continue;
          const lineMatches = line.match(term.pattern);
          if (lineMatches) count += lineMatches.length;
        }
        if (count > 0) {
          violations.push(`Found "${term.label}" (${count}x) — use "${term.correctTerm}"`);
        }
      }

      expect(violations).toEqual([]);
    });
  }
});

describe('naming conventions section present', () => {
  for (const filePath of SKILL_FILES) {
    const relPath = path.relative(ROOT, filePath);

    test(`${relPath} includes naming conventions`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('## Naming Conventions');
    });
  }
});
