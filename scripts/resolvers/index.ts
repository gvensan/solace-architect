/**
 * RESOLVERS record — maps {{PLACEHOLDER}} names to generator functions.
 * Each resolver takes a TemplateContext and returns the replacement string.
 */

import type { ResolverFn } from './types';

import { generatePreamble } from './preamble';
import { generateTestFailureTriage } from './preamble';
import { generateBaseBranchDetect, generateCoAuthorTrailer } from './utility';
import { generateConfidenceCalibration } from './confidence';
import { generateInvokeSkill } from './composition';

export const RESOLVERS: Record<string, ResolverFn> = {
  PREAMBLE: generatePreamble,
  BASE_BRANCH_DETECT: generateBaseBranchDetect,
  TEST_FAILURE_TRIAGE: generateTestFailureTriage,
  CO_AUTHOR_TRAILER: generateCoAuthorTrailer,
  CONFIDENCE_CALIBRATION: generateConfidenceCalibration,
  INVOKE_SKILL: generateInvokeSkill,
  BIN_DIR: (ctx) => ctx.paths.binDir,
  GROUNDING_DIR: (ctx) => ctx.paths.groundingDir,
};
