/**
 * C1: Structural validation tests.
 * Verifies every generated SKILL.md has valid frontmatter, resolved placeholders,
 * grounding rules, and correct preamble sections for its tier.
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { discoverSkillFiles, discoverTemplates } from '../scripts/discover-skills';
import { parseFrontmatter } from './helpers/skill-parser';

const ROOT = path.resolve(import.meta.dir, '..');
const SKILL_FILES = discoverSkillFiles(ROOT).map(f => path.join(ROOT, f));
const TEMPLATES = discoverTemplates(ROOT);

describe('frontmatter validation', () => {
  for (const filePath of SKILL_FILES) {
    const relPath = path.relative(ROOT, filePath);

    test(`${relPath} has valid frontmatter`, () => {
      const fm = parseFrontmatter(filePath);
      expect(fm).not.toBeNull();
      expect(fm!.name).toBeTruthy();
      expect(fm!.description).toBeTruthy();
      expect(fm!.description.length).toBeGreaterThan(10);
    });
  }
});

describe('no unresolved placeholders', () => {
  for (const filePath of SKILL_FILES) {
    const relPath = path.relative(ROOT, filePath);

    test(`${relPath} has no {{PLACEHOLDER}} markers`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const unresolved = content.match(/\{\{[A-Z_]+\}\}/g);
      expect(unresolved ?? []).toEqual([]);
    });
  }
});

describe('generated header present', () => {
  for (const filePath of SKILL_FILES) {
    const relPath = path.relative(ROOT, filePath);
    const hasTmpl = TEMPLATES.some(t => path.join(ROOT, t.output) === filePath);
    if (!hasTmpl) continue;

    test(`${relPath} has AUTO-GENERATED header`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('AUTO-GENERATED from');
      expect(content).toContain('do not edit directly');
    });
  }
});

describe('grounding discipline present', () => {
  for (const filePath of SKILL_FILES) {
    const relPath = path.relative(ROOT, filePath);

    test(`${relPath} includes grounding discipline`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('## Grounding Discipline');
    });
  }
});

describe('preamble tier sections', () => {
  for (const filePath of SKILL_FILES) {
    const relPath = path.relative(ROOT, filePath);
    const tmplPath = filePath + '.tmpl';
    if (!fs.existsSync(tmplPath)) continue;

    const tmplContent = fs.readFileSync(tmplPath, 'utf-8');
    const tierMatch = tmplContent.match(/^preamble-tier:\s*(\d+)$/m);
    if (!tierMatch) continue;
    const tier = parseInt(tierMatch[1], 10);

    test(`${relPath} (tier ${tier}) has correct preamble sections`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');

      // T1+ sections (all tiers)
      expect(content).toContain('## Grounding Discipline');
      expect(content).toContain('## Naming Conventions');
      expect(content).toContain('## Completion Status Protocol');

      if (tier >= 2) {
        expect(content).toContain('## AskUserQuestion Format');
        expect(content).toContain('## Writing Style');
        expect(content).toContain('## Completeness Principle');
        expect(content).toContain('## Confusion Protocol');
        expect(content).toContain('## Context Health');
      }

      if (tier >= 3) {
        expect(content).toContain('## Search Before Building');
      }
    });
  }
});

describe('template coverage', () => {
  test('every SKILL.md has a corresponding .tmpl', () => {
    const missing: string[] = [];
    for (const filePath of SKILL_FILES) {
      const tmplPath = filePath + '.tmpl';
      if (!fs.existsSync(tmplPath)) {
        missing.push(path.relative(ROOT, filePath));
      }
    }
    expect(missing).toEqual([]);
  });

  test('every .tmpl has a generated SKILL.md', () => {
    const missing: string[] = [];
    for (const { tmpl, output } of TEMPLATES) {
      if (!fs.existsSync(path.join(ROOT, output))) {
        missing.push(output);
      }
    }
    expect(missing).toEqual([]);
  });
});
