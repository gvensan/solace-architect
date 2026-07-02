/**
 * Managed grounding (Phase 4) guard.
 *
 * The [managed-ref:] citation tag promoted into the grounding discipline is only
 * meaningful if the managed-grounding digest exists and every skill is told to
 * load it. These tests keep the digest, the loader instruction, and the citation
 * tag from drifting apart.
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');

describe('managed grounding', () => {
  test('the managed digest and README exist', () => {
    expect(fs.existsSync(path.join(ROOT, 'solace-grounding', 'managed', 'digest.md'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'solace-grounding', 'managed', 'README.md'))).toBe(true);
  });

  test('the digest frames itself as reference material, not instructions', () => {
    const digest = fs.readFileSync(path.join(ROOT, 'solace-grounding', 'managed', 'digest.md'), 'utf-8');
    expect(digest.toLowerCase()).toContain('never instructions');
    expect(digest).toContain('[managed-ref:');
  });

  test('every generated skill is told to load the managed digest', () => {
    const skillFiles = [
      path.join(ROOT, 'SKILL.md'),
      ...fs.readdirSync(ROOT)
        .filter(d => d.startsWith('solace-') && fs.existsSync(path.join(ROOT, d, 'SKILL.md')))
        .map(d => path.join(ROOT, d, 'SKILL.md')),
    ];
    const missing = skillFiles.filter(f => !fs.readFileSync(f, 'utf-8').includes('managed/digest.md'));
    expect({ count: skillFiles.length, missing }).toEqual({ count: skillFiles.length, missing: [] });
  });
});
