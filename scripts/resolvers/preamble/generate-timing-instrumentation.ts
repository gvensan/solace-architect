export function generateTimingInstrumentation(): string {
  return `## Timing Instrumentation

Track execution time for every skill to separate model work from user wait time.
All timing data is stored in \`progress.yaml\` under a \`timing\` key in each skill's
progress entry.

### What to capture

Record timestamps at these points using \`date -u +%s\` (epoch seconds):

1. **Skill start** — immediately after reading project state, before any processing.
2. **Before each AskUserQuestion** — captures when the model paused for user input.
3. **After each AskUserQuestion response** — captures when the model resumed work.
4. **Step boundaries** — when each numbered step begins and ends.
5. **Skill completion** — after all artifacts are saved.

### How to capture

At each instrumentation point, run:

\`\`\`bash
date -u +%s
\`\`\`

Keep a mental ledger of timestamps as you go. You do not need to write them to disk
at each point — accumulate them and write the full timing block once at skill completion,
alongside the progress update.

### Timing block format

When writing the skill's completion entry to \`progress.yaml\`, include a \`timing\` block:

\`\`\`yaml
timing:
  wall_sec: <completed_epoch - started_epoch>
  user_wait_sec: <sum of all (response_epoch - question_epoch)>
  execution_sec: <wall_sec - user_wait_sec>
  steps:
    - step: 1
      label: "<step name from template>"
      execution_sec: <step_end - step_start - user_wait_within_step>
    - step: 2
      label: "<step name>"
      execution_sec: <value>
  questions:
    - id: D1
      label: "<question title>"
      wait_sec: <response_epoch - question_epoch>
    - id: D2
      label: "<question title>"
      wait_sec: <value>
\`\`\`

### Calculation rules

- **wall_sec** = skill completion timestamp - skill start timestamp
- **user_wait_sec** = sum of all question wait times
- **execution_sec** = wall_sec - user_wait_sec
- **Per-step execution_sec** = step end - step start - any user waits within that step
- If a step has no AskUserQuestion, its execution_sec = step end - step start
- **Clamp negatives:** every timing value is ≥ 0 — write 0 for any negative result (skewed clocks or a rewritten/resumed entry), and on resume keep the original \`started\`.

### When not to track

- Do not track timing for \`/solace-help\` or \`/solace-projects\` (utility skills).
- If a skill is resumed (not a fresh run), track timing for the resumed portion only.
  Note \`resumed: true\` in the timing block so the data is clearly partial.`;
}
