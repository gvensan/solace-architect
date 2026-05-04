/**
 * C1/C5: Token budget tests.
 * Enforces per-skill and total token budget thresholds.
 * Prevents silent context window consumption growth.
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { discoverSkillFiles } from '../scripts/discover-skills';

const ROOT = path.resolve(import.meta.dir, '..');
const SKILL_FILES = discoverSkillFiles(ROOT).map(f => path.join(ROOT, f));

const PER_SKILL_BYTE_CEILING = 160_000;
const PER_SKILL_TOKEN_CEILING = 40_000;
const TOTAL_TOKEN_WARNING = 220_000;

function estimateTokens(bytes: number): number {
  return Math.round(bytes / 4);
}

describe('per-skill token budget', () => {
  for (const filePath of SKILL_FILES) {
    const relPath = path.relative(ROOT, filePath);

    test(`${relPath} is under ${PER_SKILL_TOKEN_CEILING} tokens`, () => {
      const stat = fs.statSync(filePath);
      const tokens = estimateTokens(stat.size);
      expect(tokens).toBeLessThan(PER_SKILL_TOKEN_CEILING);
    });
  }
});

describe('total token budget', () => {
  test(`total across all skills is under ${TOTAL_TOKEN_WARNING} tokens`, () => {
    let totalBytes = 0;
    for (const filePath of SKILL_FILES) {
      totalBytes += fs.statSync(filePath).size;
    }
    const totalTokens = estimateTokens(totalBytes);
    expect(totalTokens).toBeLessThan(TOTAL_TOKEN_WARNING);
  });
});

describe('token budget report', () => {
  test('generates a summary', () => {
    const budget: Array<{ skill: string; bytes: number; tokens: number }> = [];
    for (const filePath of SKILL_FILES) {
      const stat = fs.statSync(filePath);
      budget.push({
        skill: path.relative(ROOT, filePath),
        bytes: stat.size,
        tokens: estimateTokens(stat.size),
      });
    }

    budget.sort((a, b) => b.tokens - a.tokens);
    const total = budget.reduce((s, b) => s + b.tokens, 0);

    expect(budget.length).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(0);
  });
});
