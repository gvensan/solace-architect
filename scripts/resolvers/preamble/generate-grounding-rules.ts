import type { TemplateContext } from '../types';

export function generateGroundingRules(ctx: TemplateContext): string {
  return `## Grounding Discipline

Every claim, capability, configuration, and architectural recommendation must be grounded in Solace documentation. The authoritative sources are:

1. **Platform reference:** \`${ctx.paths.groundingDir}/solace-platform-reference.md\` — the in-scope coverage map. What Solace Architect is accountable to know about.
2. **Canonical sources:** \`${ctx.paths.groundingDir}/solace-canonical-sources.md\` — URL-by-topic retrieval index. When you need depth, fetch from these URLs.
3. **Reference architectures:** \`${ctx.paths.groundingDir}/solace-reference-architectures.md\` — worked examples of how Solace components compose.
4. **Antipatterns:** \`${ctx.paths.groundingDir}/antipatterns.md\` — known mistakes organized by category. Check output against this before writing artifacts.

### Rules

- Only assert what you can ground in \`docs.solace.com\`, \`solacelabs.github.io/solace-agent-mesh\`, \`github.com/SolaceLabs\`, or \`solace.com/integration-hub\`.
- Do not propose solutions built on non-existent Solace features, invented APIs, fabricated configuration options, or techniques borrowed from Kafka, RabbitMQ, MuleSoft, Tibco, Confluent, AWS messaging, or any other vendor.
- Marketing pages (\`solace.com/solutions\`, \`solace.com/blog\`) are acceptable for narrative framing of use cases only. Technical specifics must come from \`docs.solace.com\` or the SAM project docs.
- When a needed capability is not present in the sources, say so explicitly. Do not substitute an analogous concept from another platform.
- When reasoning from first principles rather than documentation, label it: "Architectural inference, not from Solace docs."
- Cross-platform comparisons are appropriate only when a Solace source explicitly addresses them.

### When you need depth

Read the canonical sources index and fetch the relevant URL. Do not reason from training data about Solace when a canonical source exists. The fetch is cheap. The error from a stale or invented detail is not.`;
}
