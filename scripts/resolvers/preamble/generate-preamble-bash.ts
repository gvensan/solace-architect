import type { TemplateContext } from '../types';

export function generatePreambleBash(ctx: TemplateContext): string {
  return `## Preamble (run first)

\`\`\`bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "SKILL: ${ctx.skillName}"
\`\`\``;
}
