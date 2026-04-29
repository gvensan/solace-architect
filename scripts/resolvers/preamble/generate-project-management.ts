export function generateProjectManagement(): string {
  return `## Project Management

All project outputs go to \`projects/<project-slug>/\`. Each project has:

\`\`\`
projects/<project-slug>/
  context.yaml          # project name, display name, creation date, status
  decisions.yaml        # accumulated design decisions across skills
  progress.yaml         # skill execution log with resume support
  artifacts/            # all generated outputs, organized by skill
    discovery/
    topic-design/
    sam-design/
    broker-select/
    protocol-select/
    mesh-design/
    ha-dr/
    integration/
    migration/
    validation/
    blueprint/
\`\`\`

### Active project

Read \`projects/.active\` to determine the current project slug. If it exists, tell the user which project is active at session start.

### Project warnings

- **Non-discovery skill invoked with no active project:** Warn. Ask the user to create a new project or pick an existing one.
- **Non-discovery skill invoked but active project has no discovery brief:** Warn that discovery has not been completed. Recommend \`/solace-discovery\` first.
- **\`/solace-discovery\` invoked but active project already has a completed discovery brief:** Warn this will overwrite the existing brief. Ask the user to confirm or create a new project instead.

### Progress tracking

\`progress.yaml\` tracks what has been done per skill:

\`\`\`yaml
- skill: solace-discovery
  status: complete      # started | in-progress | complete | interrupted
  started: 2026-04-28T10:30:00Z
  completed: 2026-04-28T10:45:00Z
  summary: "Retail bank AI assistant. Pattern 1 match. 4 backends identified."
  step_reached: "5/5 — synthesis complete"
  artifacts:
    - path: artifacts/discovery/discovery-brief.md
      type: document
      description: "Discovery brief"
  timing:
    wall_sec: 900
    user_wait_sec: 540
    execution_sec: 360
    steps:
      - step: 1
        label: "Understand the landscape"
        execution_sec: 90
    questions:
      - id: D1
        label: "Project type"
        wait_sec: 120
\`\`\`

**Checkpoint writes.** Every skill writes to \`progress.yaml\` at these points:
- On start: status \`in-progress\`, current step, timestamp
- On each major step completion: update \`step_reached\`, \`summary\`, and \`artifacts\`
- On clean completion: status \`complete\`, completion timestamp
- If the skill never writes \`complete\`, the status stays \`in-progress\` (interrupted)

**Resume behavior.** When a skill is invoked and \`progress.yaml\` shows that same skill was previously \`in-progress\` for the active project:
1. Read the progress entry and the project's \`decisions.yaml\`
2. Present a summary: "Last time we ran this skill, we got through step X of Y. Here's what was completed. Here's what's pending."
3. Ask the user via AskUserQuestion (this is multiple-choice): A) Resume from where we left off, B) Start over, C) Review completed decisions first
4. If A: skip completed steps, pick up at \`step_reached\`
5. If B: clear the old progress entry and start fresh
6. If C: walk through completed decisions, then decide

**Project status display.** When a project is opened or switched to, show:

\`\`\`
Project: <name>
Status: <overall status>

Completed:
  ✓ Discovery — N artifacts
  ✓ Broker selection — N artifacts

Interrupted:
  ⚠ SAM design (3/5) — N artifacts produced, M pending

Not started:
  · Topic design
  · Validation
  · Blueprint

Total artifacts: N files
Recommended next: <suggestion>
\`\`\``;
}
