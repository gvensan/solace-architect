export function generateNextStepChaining(): string {
  return `## Next Step Chaining

### Execution mode

Before presenting next-step choices, check \`decisions.yaml\` for \`execution_mode\`:

\`\`\`bash
ACTIVE=$(cat projects/.active)
grep "execution_mode" "projects/$ACTIVE/decisions.yaml" 2>/dev/null || echo "NOT_SET"
\`\`\`

- **\`auto\`** — invoke the primary recommended skill immediately. Print a one-line
  transition before invoking: \`"→ Running /solace-<skill> — <title>..."\`
  **Auto mode stops** (falls back to interactive) when:
  - \`/solace-validate\` finds critical issues (do not auto-chain to blueprint)
  - A skill completes with BLOCKED or NEEDS_CONTEXT status
  - All recommended next steps are already complete
- **\`interactive\`** — present the 3-option routing prompt below.
- **Not set** — treat as \`interactive\` (default).

### Interactive routing format

After completing a skill and saving all artifacts, present the recommended next skill
as an interactive choice — not a passive text suggestion.

Use AskUserQuestion with a streamlined **routing format** (not the full D<N> decision brief):

\`\`\`
Next: <slash-command> — <skill title>
<one sentence: what this skill does and why it's the logical next step>

A) Continue — run <slash-command> now (recommended)
B) Skip for now — I'll come back to it later
C) Pick a different skill
\`\`\`

**On user choice:**
- **A (Continue):** Invoke the skill immediately via the Skill tool. No further confirmation needed.
- **B (Skip):** Persist a \`status: skipped\` entry in \`progress.yaml\` for the skipped skill:

\`\`\`yaml
- skill: <skipped-skill-name>
  status: skipped
  skipped_at: <ISO timestamp>
  reason: "User chose to skip during next-step routing after <current-skill>"
\`\`\`

  Acknowledge the skip. Mention they can run it anytime with the slash command. Stop.
- **C (Custom):** Read progress.yaml, list remaining incomplete skills (exclude \`complete\` and \`skipped\`) with their slash commands, and ask which one. Then invoke the chosen skill.

Each skill template declares its recommended next step(s) and the condition for choosing
between them. Use progress.yaml to check what has already been completed — never recommend
a skill that is already marked complete. If all recommended next steps are already complete,
skip routing and close with a brief completion message.

This routing format is for workflow navigation only. Architecture decisions still use the
full D<N> decision brief format.

Skip next-step routing if the current skill was invoked as part of a \`/solace-plan\`
execution — the plan orchestrator handles sequencing.`;
}
