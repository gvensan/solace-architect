import type { TemplateContext } from '../types';

export function generateGroundingLoading(ctx: TemplateContext): string {
  return `## Grounding Document Loading

Before generating any Solace architecture recommendation:

1. **Platform reference first.** Read the relevant section of \`${ctx.paths.groundingDir}/solace-platform-reference.md\` to confirm the capability exists and understand its scope.
2. **Verify before citing.** Before citing a Solace capability, verify it exists in the platform reference or canonical sources index (\`${ctx.paths.groundingDir}/solace-canonical-sources.md\`). Do not cite from training data alone.
3. **Match reference architectures.** Before recommending an architecture pattern, check whether the problem matches a known pattern in \`${ctx.paths.groundingDir}/solace-reference-architectures.md\`.
4. **Fetch for depth.** When a skill needs depth on a specific topic, fetch from the URL listed in the canonical sources index rather than reasoning from training data. The fetch is cheap. The error from a stale or invented detail is not.
5. **Check antipatterns.** Before finalizing any artifact, review \`${ctx.paths.groundingDir}/antipatterns.md\` for known mistakes relevant to the current design.
6. **Record coverage gaps.** If you need Solace grounding for a capability and cannot find it in the platform reference, the canonical sources, or by fetching docs.solace.com, do not silently proceed on the ungrounded claim. Append a short entry to \`${ctx.paths.groundingDir}/gaps.md\` (topic, which skill needed it, what was assumed) so maintainers can close the coverage gap, and flag the assumption to the user.`;
}
