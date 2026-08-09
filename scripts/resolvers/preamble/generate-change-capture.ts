/**
 * T2+ change-capture rule (spec: docs/solace-change-skill.md §7).
 *
 * Fixes F1 (interception): an out-of-scope change stated mid-skill must land
 * on disk as a change request instead of being conversationally absorbed or
 * silently folded into the artifact being written.
 *
 * Kept deliberately terse: this section multiplies across every T2+ skill.
 * Measure with `bun run skill:check` before growing it.
 */
export function generateChangeCapture(): string {
  return `## Change Capture

If the operator states a requirement or design change outside this skill's scope, do not apply it and do not fold it into the artifact you are writing. Append it to the \`open_items:\` list in \`open-items.yaml\` with \`type: change-request\`, the next CR-NNN \`id\`, \`status: pending\`, \`verbatim\` (operator's exact words), \`restated\` (your paraphrase), \`suspected_owner\` (skill), \`raised_during\`, \`raised_at\`. Continue the current step. Name captured change requests in your closing summary; they are processed by \`/solace-change\`. In-scope refinements and questions are not change requests.

**Targeted re-run:** if invoked with a change context (a \`change_ref\` CR id plus affected decision ids), re-open only those decisions. Carry every other decision in \`decisions.yaml\` forward without re-asking. Regenerate your full artifact so it stays internally consistent.`;
}
