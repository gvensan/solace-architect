import type { TemplateContext } from '../types';

export function generateAskUserFormat(_ctx: TemplateContext): string {
  return `## AskUserQuestion Format

Every AskUserQuestion is a decision brief and must be sent as tool_use, not prose.

**Exception:** Next-step routing prompts use a separate streamlined format defined in the
Next Step Chaining section. Routing is workflow navigation ("what to run next"), not an
architecture decision — it does not use the D<N> schema, self-check, or completeness scoring.

\`\`\`
D<N> — <one-line question title>
Context: <what this decides and what's at stake — 1-2 sentences, plain English>

> **Recommended: <choice>) <option label>**
> Why: <1-2 sentences — project-specific rationale, not generic. Reference the
> project's constraints, requirements, or discovery findings that make this the
> right call.>

A) <option label> (recommended)
  ✅ <pro — concrete, observable, 40-80 chars>
  ✅ <pro>
  ❌ <con — honest, 40-80 chars>
  Completeness: X/10

B) <option label>
  ✅ <pro>
  ❌ <con>
  Completeness: Y/10

Net: <one-line synthesis of what you're actually trading off>
\`\`\`

### Format rules

**D-numbering:** first question in a skill invocation is \`D1\`; increment yourself.

**Context** replaces the old ELI10/Stakes/Project fields. One block, 1-2 sentences max.
Plain English a non-engineer could follow. Name the stakes (what breaks if we pick wrong).

**Recommendation callout** is a blockquote so it stands out visually. The \`(recommended)\`
label on the option MUST also be present — AUTO_DECIDE depends on it.

The **Why** line inside the callout must be project-specific. Bad: "because it's simpler."
Good: "because this is a single-site deployment with 3 backends, where simpler topology
reduces operational risk." Reference discovery findings, requirements, or constraints.

**Pros / cons:** use ✅ and ❌. Minimum 2 pros and 1 con per option when the choice is
real. Each bullet 40-80 characters — long enough to be concrete, short enough to scan.
Hard-stop escape for one-way/destructive confirmations: \`✅ No cons — this is a hard-stop choice\`.

**Completeness** goes **below each option's pros/cons**, not above the option list.
This lets the user read the tradeoffs and then see the score in context.
Use \`Completeness: N/10\` only when options genuinely differ in coverage (10 = complete,
7 = happy path, 3 = shortcut). Omit when options differ in kind — don't force a score.

**Neutral posture:** \`Recommended: <default>) <label>\` with \`Why: taste call — no
strong preference either way\`. The \`(recommended)\` label STAYS on the default.

**Effort both-scales:** when an option involves effort, label both human-team and
AI-assisted time, e.g. \`(human: ~2 days / AI-assisted: ~15 min)\`.

**Net line** closes the tradeoff in one sentence.

### Expanding template shorthand

Skill templates sometimes give abbreviated AskUserQuestion instructions like
\`"Use AskUserQuestion: A) option, B) option"\`. These are shorthand — you MUST
expand every AskUserQuestion to the full D<N> format above with Context, Recommendation
callout, pros/cons, and Net line. Never emit a bare option list.

### Self-check before emitting

Before calling AskUserQuestion, verify:
- [ ] D<N> header present
- [ ] Context present (1-2 sentences, plain English, stakes named)
- [ ] Recommendation callout present (blockquote, project-specific Why)
- [ ] Every option has ≥2 ✅ and ≥1 ❌, each 40-80 chars (or hard-stop escape)
- [ ] Completeness score below each option's pros/cons (if options differ in coverage)
- [ ] \`(recommended)\` label on one option
- [ ] Net line closes the decision
- [ ] You are calling the tool, not writing prose

### Free-text prompt format

When a question needs free-text answers (not AskUserQuestion), users can confuse
numbered question lists with selectable options. Always frame free-text prompts
with visible hints:

1. **Open with an input hint** — a short line that explicitly signals "type your
   answer in your own words." Example:
   \`"Answer in your own words — these are open questions, not options to pick from:"\`
2. **Use bullet points (•), not numbers.** Numbers look like selectable options.
   If numbering is needed for reference, prefix with a descriptive label
   (e.g., \`"Q1."\` not just \`"1."\`).
3. **Close with an expectation line** — tell the user what to do and that partial
   answers are fine. Example:
   \`"Type your answers below — as much or as little as you have. Fine to skip what you don't know yet."\`

Template:

\`\`\`
<topic intro — one sentence, ends with colon>
Answer in your own words — these are open questions, not options to pick from:

• **<Label>:** <question> (<clarifying examples if needed>)
• **<Label>:** <question>
...

Type your answers below — as much or as little as you have. Fine to skip what you don't know yet.
\`\`\`

This format applies to all plain-prose question lists across every skill.`;
}
