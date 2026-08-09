/**
 * Preamble composition root for Solace Architect.
 *
 * Each generator lives in its own file under ./preamble/*.ts. This file only
 * wires them together via generatePreamble(). Keep composition declarative —
 * no inline logic beyond tier gating.
 *
 * Tier system:
 *   T1: core bootstrap + voice (trimmed) + grounding + naming + grounding-loading + validation + dependencies + project-mgmt + timing + completion
 *   T2: T1 + voice (full) + ask format + writing style + completeness + confusion + checkpoint + context health + next-step chaining + change capture
 *   T3: T2 + repo-mode + search-before-building
 *   T4: same as T3 (TEST_FAILURE_TRIAGE is a separate {{}} placeholder, not preamble)
 */

import type { TemplateContext } from './types';

// Core bootstrap
import { generatePreambleBash } from './preamble/generate-preamble-bash';
import { generateCompletionStatus } from './preamble/generate-completion-status';

// Solace-specific grounding and naming
import { generateGroundingRules } from './preamble/generate-grounding-rules';
import { generateNamingConventions } from './preamble/generate-naming-conventions';
import { generateGroundingLoading } from './preamble/generate-grounding-loading';

// Artifact validation and cross-skill enforcement
import { generateValidationHook } from './preamble/generate-validation-hook';
import { generateDependencyEnforcement } from './preamble/generate-dependency-enforcement';

// Project management, progress tracking, and timing
import { generateProjectManagement } from './preamble/generate-project-management';
import { generateTimingInstrumentation } from './preamble/generate-timing-instrumentation';

// Behavioral / voice
import { generateVoiceDirective } from './preamble/generate-voice-directive';

// Tier 2+ context and interaction framework
import { generateAskUserFormat } from './preamble/generate-ask-user-format';
import { generateWritingStyle } from './preamble/generate-writing-style';
import { generateCompletenessSection } from './preamble/generate-completeness-section';
import { generateConfusionProtocol } from './preamble/generate-confusion-protocol';
import { generateContinuousCheckpoint } from './preamble/generate-continuous-checkpoint';
import { generateContextHealth } from './preamble/generate-context-health';
import { generateNextStepChaining } from './preamble/generate-next-step-chaining';
import { generateChangeCapture } from './preamble/generate-change-capture';

// Tier 3+ repo mode + search
import { generateRepoModeSection } from './preamble/generate-repo-mode-section';
import { generateSearchBeforeBuildingSection } from './preamble/generate-search-before-building';

// Standalone export used directly by the resolver registry
export { generateTestFailureTriage } from './preamble/generate-test-failure-triage';

// Preamble Composition (tier → sections)
// ─────────────────────────────────────────────
// T1: bootstrap + grounding + naming + grounding-loading + validation + dependencies + project-mgmt + timing + voice(trimmed) + completion
// T2: T1 + voice(full) + ask + writing-style + completeness + confusion + checkpoint + context-health + next-step-chaining + change-capture
// T3: T2 + repo-mode + search
// T4: same as T3
export function generatePreamble(ctx: TemplateContext): string {
  const tier = ctx.preambleTier ?? 4;
  if (tier < 1 || tier > 4) {
    throw new Error(`Invalid preamble-tier: ${tier} in ${ctx.tmplPath}. Must be 1-4.`);
  }
  const sections = [
    generatePreambleBash(ctx),
    generateGroundingRules(ctx),
    generateNamingConventions(),
    generateGroundingLoading(ctx),
    generateValidationHook(),
    generateDependencyEnforcement(),
    generateProjectManagement(),
    generateTimingInstrumentation(),
    generateVoiceDirective(tier),
    ...(tier >= 2 ? [
      generateAskUserFormat(ctx),
      generateWritingStyle(ctx),
      generateCompletenessSection(),
      generateConfusionProtocol(),
      generateContinuousCheckpoint(),
      generateContextHealth(),
      generateNextStepChaining(),
      generateChangeCapture(),
    ] : []),
    ...(tier >= 3 ? [generateRepoModeSection(), generateSearchBeforeBuildingSection(ctx)] : []),
    generateCompletionStatus(ctx),
  ];
  return sections.filter(s => s && s.trim().length > 0).join('\n\n');
}
