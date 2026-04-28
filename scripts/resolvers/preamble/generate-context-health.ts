

export function generateContextHealth(): string {
  return `## Context Health (soft directive)

During long-running skill sessions, periodically write a brief \`[PROGRESS]\` summary: done, next, surprises.

If you are looping on the same diagnostic, same file, or failed fix variants, STOP and reassess. Progress summaries must NEVER mutate git state.`;
}
