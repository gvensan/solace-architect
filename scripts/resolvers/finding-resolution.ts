import type { ResolverFn } from './types';

export const generateFindingResolution: ResolverFn = () => `## Interactive Finding Resolution

After completing all analysis steps, present findings to the user one at a time.
Categorize each finding as either a **confirmation** (no issue) or an **issue** (needs action).

### Confirmations (no issue found)

For areas where the architecture is sound, present them grouped as a confirmation block.
Do not ask for user input on these — just display them:

\`\`\`
✓ Confirmed — No Issues
  • <area>: <why it's sound>
  • <area>: <why it's sound>
  • <area>: <why it's sound>
\`\`\`

### Issues (action needed)

Walk through each issue one at a time using AskUserQuestion. Present in severity order
(Critical first, then Important, then Advisory).

For each issue, present:

\`\`\`
Finding <N>/<total> — <severity>

  Issue:    <one-sentence description of the problem>
  Impact:   <what happens if this is not addressed>
  Fix:      <concrete, specific proposed remediation>
  Artifact: <which project artifact would be updated>

  A) Apply — update <artifact> with the proposed fix
  B) Defer — log this finding for later; proceed to next
  C) Discuss — I have questions before deciding
\`\`\`

**Apply:** Update the referenced artifact in place. Add a decision entry to \`decisions.yaml\`
recording what was changed, why, and which review surfaced it:

\`\`\`yaml
- decision: "<what was changed>"
  rationale: "<finding description>"
  source: "<review skill name>"
  severity: "<critical|important|advisory>"
  action: applied
\`\`\`

**Defer:** Do not modify any artifact. Add a decision entry recording the deferral:

\`\`\`yaml
- decision: "Deferred: <finding description>"
  rationale: "<user's reason if given, otherwise 'deferred without comment'>"
  source: "<review skill name>"
  severity: "<critical|important|advisory>"
  action: deferred
\`\`\`

**Discuss:** Answer the user's questions. After discussion, re-present the same finding
with the Apply/Defer choice. Do not advance to the next finding until this one is resolved.

### Execution mode behavior

Check \`decisions.yaml\` for \`execution_mode\`:
- **\`interactive\`** or **not set**: Walk through every issue with Apply/Defer/Discuss.
- **\`auto\`**: Auto-apply Advisory and Important findings. Pause for Apply/Defer/Discuss
  only on Critical findings — these always require explicit user consent.

### Final summary

After all findings are resolved, present a resolution summary before writing the artifact:

\`\`\`
Finding Resolution Summary
  Applied:  <count> findings (<list severity breakdown>)
  Deferred: <count> findings (<list severity breakdown>)
  No issue: <count> areas confirmed

  Artifacts updated: <list of modified artifact files>
\`\`\`

Then write the review document. The document must reflect the resolution status of each
finding — mark applied findings as "APPLIED" and deferred findings as "DEFERRED" so the
record is clear when read later or picked up by \`/solace-validate\`.`;
