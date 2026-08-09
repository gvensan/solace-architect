/**
 * Unit tests for scripts/change-impact.ts (docs/solace-change-skill.md §13).
 *
 * Scenarios run against the real declared graph so the tests double as
 * regression checks on skill-dependencies.yaml edges.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  loadGraph,
  computeImpact,
  detectCycle,
  presentArtifacts,
  type DependencyGraph,
} from '../scripts/change-impact';

const graph = loadGraph();

/** Assert producer-before-consumer for every edge inside a sequence. */
function assertTopologicallyValid(sequence: string[]) {
  const pos = new Map(sequence.map((s, i) => [s, i]));
  for (const skill of sequence) {
    for (const consumed of graph.skills[skill].consumes) {
      for (const [other, decl] of Object.entries(graph.skills)) {
        if (other === skill || !pos.has(other)) continue;
        if (decl.produces.includes(consumed)) {
          expect(
            pos.get(other)! < pos.get(skill)!,
            `${other} (produces ${consumed}) must precede ${skill}`
          ).toBe(true);
        }
      }
    }
  }
}

describe('topic-taxonomy change', () => {
  const report = computeImpact(graph, 'solace-topic-design');

  test('protocol, integration, migration, EP design need re-decide', () => {
    expect(report.re_decide).toContain('solace-protocol-select');
    expect(report.re_decide).toContain('solace-integration');
    expect(report.re_decide).toContain('solace-migration');
    expect(report.re_decide).toContain('solace-event-portal');
  });

  test('reviews are invalidated', () => {
    expect(report.re_review).toContain('solace-security-review');
    expect(report.re_review).toContain('solace-dev-review');
  });

  test('blueprint and derivatives regenerate', () => {
    expect(report.regenerate).toContain('blueprint');
    expect(report.regenerate).toContain('arch-blueprint');
    expect(report.regenerate).toContain('validation-report');
  });

  test('broker and HA/DR are explicitly unaffected', () => {
    expect(report.unaffected).toContain('broker-recommendation');
    expect(report.unaffected).toContain('ha-dr-topology');
    expect(report.unaffected).toContain('dmr-topology');
    expect(report.unaffected).toContain('discovery-brief');
  });

  test('sequence is topologically valid and owner-led', () => {
    expect(report.skill_sequence[0]).toBe('solace-topic-design');
    assertTopologicallyValid(report.skill_sequence);
  });

  test('no live conflict without a project', () => {
    expect(report.live_conflict).toBe(false);
  });
});

describe('broker-selection change', () => {
  const report = computeImpact(graph, 'solace-broker-select');

  test('mesh and HA/DR are affected', () => {
    expect(report.re_decide).toContain('solace-mesh-design');
    expect(report.re_decide).toContain('solace-ha-dr');
  });

  test('topic taxonomy is unaffected', () => {
    expect(report.unaffected).toContain('topic-taxonomy');
  });

  test('sequence is topologically valid', () => {
    assertTopologicallyValid(report.skill_sequence);
  });
});

describe('executive-only change', () => {
  const report = computeImpact(graph, 'solace-executive');

  test('no design skill is scheduled', () => {
    expect(report.re_decide).toEqual([]);
    expect(report.re_review).toEqual([]);
    expect(report.regenerate).toEqual([]);
    expect(report.skill_sequence).toEqual(['solace-executive']);
  });
});

describe('error handling', () => {
  test('unknown skill throws', () => {
    expect(() => computeImpact(graph, 'solace-nonexistent')).toThrow(/Unknown skill/);
  });

  test('unknown artifact key throws', () => {
    expect(() =>
      computeImpact(graph, 'solace-topic-design', { changedArtifacts: ['bogus-artifact'] })
    ).toThrow(/Unresolvable artifact key/);
  });

  test('cycle detection throws', () => {
    const cyclic: DependencyGraph = {
      version: 1,
      artifacts: {
        a: { dir: 'x', file: 'a.md' },
        b: { dir: 'y', file: 'b.md' },
      },
      skills: {
        's-one': { kind: 'design', consumes: ['a'], produces: ['b'] },
        's-two': { kind: 'design', consumes: ['b'], produces: ['a'] },
      },
    };
    expect(() => detectCycle(cyclic)).toThrow(/Cycle detected/);
  });
});

describe('project awareness (absent artifacts, legacy layouts)', () => {
  let projectDir: string;

  beforeAll(() => {
    // Fixture: a project with discovery + topic design + broker select on
    // the current layout, plus an executive summary on the LEGACY layout
    // (13-executive) reachable only via progress.yaml recorded paths.
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'change-impact-fixture-'));
    const write = (rel: string, content: string) => {
      const abs = path.join(projectDir, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    };
    write('artifacts/01-discovery/discovery-brief.md', '# brief');
    write('artifacts/02-topic-design/topic-taxonomy.md', '# taxonomy');
    write('artifacts/03-broker-select/broker-recommendation.md', '# broker');
    write('artifacts/13-executive/executive-summary.md', '# exec');
    write(
      'progress.yaml',
      [
        'progress:',
        '- skill: solace-executive',
        '  status: complete',
        '  artifacts:',
        '    - path: artifacts/13-executive/executive-summary.md',
        '      type: document',
      ].join('\n')
    );
  });

  afterAll(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  test('present artifacts include legacy-path executive', () => {
    const present = presentArtifacts(graph, projectDir);
    expect(present.has('discovery-brief')).toBe(true);
    expect(present.has('topic-taxonomy')).toBe(true);
    expect(present.has('executive')).toBe(true); // via recorded path, not 14-executive
    expect(present.has('sam-design')).toBe(false);
    expect(present.has('ep-provisioned')).toBe(false);
  });

  test('absent artifacts are excluded from the sequence', () => {
    const report = computeImpact(graph, 'solace-topic-design', { projectDir });
    expect(report.absent).toContain('sam-design');
    expect(report.absent).toContain('ha-dr-topology');
    expect(report.skill_sequence).not.toContain('solace-sam-design');
    expect(report.skill_sequence).not.toContain('solace-ha-dr');
    // Executive exists (legacy path), so it stays scheduled.
    expect(report.skill_sequence).toContain('solace-executive');
    assertTopologicallyValid(report.skill_sequence);
  });

  test('no live conflict when provisioned.yaml does not exist', () => {
    const report = computeImpact(graph, 'solace-topic-design', { projectDir });
    expect(report.live_conflict).toBe(false);
  });

  test('live conflict when provisioned.yaml exists', () => {
    const provisioned = path.join(projectDir, 'artifacts/13-event-portal/provisioned.yaml');
    fs.mkdirSync(path.dirname(provisioned), { recursive: true });
    fs.writeFileSync(provisioned, 'domains: []');
    // ep-design must exist too, otherwise the EP skill drops out.
    fs.writeFileSync(
      path.join(projectDir, 'artifacts/13-event-portal/event-portal-design.md'),
      '# ep'
    );
    const report = computeImpact(graph, 'solace-topic-design', { projectDir });
    expect(report.live_conflict).toBe(true);
    fs.rmSync(path.join(projectDir, 'artifacts/13-event-portal'), { recursive: true });
  });
});
