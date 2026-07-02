/**
 * Confidence calibration resolver
 *
 * Adds confidence scoring rubric to review-producing skills.
 * Every finding includes a 1-10 score that gates display:
 *   7+: show normally
 *   5-6: show with caveat
 *   <5: suppress from main report
 */
import type { TemplateContext } from './types';

export function generateConfidenceCalibration(_ctx: TemplateContext): string {
  return `## Confidence Calibration

Score every finding 1–10 in its header, grounded in the artifact/doc that supports it:
8–10 verified · 6–7 strong inference · 4–5 show with a "verify" caveat · 1–3 omit unless
severity would be Critical (then state what would confirm it).`;
}
