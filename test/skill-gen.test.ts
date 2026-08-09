/**
 * C1: Generation pipeline tests.
 * Verifies that gen-skill-docs produces fresh output matching committed files.
 * Also tests the resolver registry for completeness.
 */

import { describe, test, expect } from 'bun:test';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { discoverTemplates } from '../scripts/discover-skills';
import { RESOLVERS } from '../scripts/resolvers/index';

const ROOT = path.resolve(import.meta.dir, '..');

describe('generation freshness', () => {
  test('all generated SKILL.md files are fresh (claude host)', () => {
    const result = execSync('bun run scripts/gen-skill-docs.ts --dry-run', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const staleLines = result.split('\n').filter(l => l.startsWith('STALE'));
    expect(staleLines).toEqual([]);
  });
});

describe('resolver registry', () => {
  const EXPECTED_RESOLVERS = [
    'PREAMBLE',
    'BASE_BRANCH_DETECT',
    'TEST_FAILURE_TRIAGE',
    'CO_AUTHOR_TRAILER',
    'CONFIDENCE_CALIBRATION',
    'INVOKE_SKILL',
    'FINDING_RESOLUTION',
    'BIN_DIR',
    'GROUNDING_DIR',
  ];

  for (const name of EXPECTED_RESOLVERS) {
    test(`resolver ${name} is registered`, () => {
      expect(RESOLVERS[name]).toBeDefined();
      expect(typeof RESOLVERS[name]).toBe('function');
    });
  }

  test('no unexpected resolvers in registry', () => {
    const registered = Object.keys(RESOLVERS).sort();
    const expected = [...EXPECTED_RESOLVERS].sort();
    expect(registered).toEqual(expected);
  });
});

describe('template discovery', () => {
  test('discovers all 26 skill templates', () => {
    // Update when adding/removing skills. Run discoverTemplates() to verify.
    // 26 = 25 + solace-change (change-request compiler, v0.2.0).
    const templates = discoverTemplates(ROOT);
    expect(templates.length).toBe(26);
  });

  test('all templates produce output files', () => {
    const templates = discoverTemplates(ROOT);
    const missing = templates.filter(t => !fs.existsSync(path.join(ROOT, t.output)));
    expect(missing.map(t => t.output)).toEqual([]);
  });
});
