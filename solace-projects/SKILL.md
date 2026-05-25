---
name: solace-projects
preamble-tier: 1
version: 0.1.0
description: |
  Project management dashboard for Solace Architect engagements. List projects,
  view per-skill status, show summaries, switch active project, archive, and
  compare projects side by side.
allowed-tools:
  - Bash
  - Read
  - Edit
  - AskUserQuestion
interactive: true
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "SKILL: solace-projects"
```

## Grounding Discipline

Every claim, capability, configuration, and architectural recommendation must be grounded in Solace documentation. The authoritative sources are:

1. **Platform reference:** `~/.claude/skills/solace-architect/solace-grounding/solace-platform-reference.md` — the in-scope coverage map. What Solace Architect is accountable to know about.
2. **Canonical sources:** `~/.claude/skills/solace-architect/solace-grounding/solace-canonical-sources.md` — URL-by-topic retrieval index. When you need depth, fetch from these URLs.
3. **Reference architectures:** `~/.claude/skills/solace-architect/solace-grounding/solace-reference-architectures.md` — worked examples of how Solace components compose.
4. **Antipatterns:** `~/.claude/skills/solace-architect/solace-grounding/antipatterns.md` — known mistakes organized by category. Check output against this before writing artifacts.

### Rules

- Only assert what you can ground in `docs.solace.com`, `solacelabs.github.io/solace-agent-mesh`, `github.com/SolaceLabs`, or `solace.com/integration-hub`.
- Do not propose solutions built on non-existent Solace features, invented APIs, fabricated configuration options, or techniques borrowed from Kafka, RabbitMQ, MuleSoft, Tibco, Confluent, AWS messaging, or any other vendor.
- Marketing pages (`solace.com/solutions`, `solace.com/blog`) are acceptable for narrative framing of use cases only. Technical specifics must come from `docs.solace.com` or the SAM project docs.
- When a needed capability is not present in the sources, say so explicitly. Do not substitute an analogous concept from another platform.
- When reasoning from first principles rather than documentation, label it: "Architectural inference, not from Solace docs."
- Cross-platform comparisons are appropriate only when a Solace source explicitly addresses them.

### When you need depth

Read the canonical sources index and fetch the relevant URL. Do not reason from training data about Solace when a canonical source exists. The fetch is cheap. The error from a stale or invented detail is not.

## Naming Conventions

These are non-negotiable in all output Solace Architect generates.

| Term | Usage |
|------|-------|
| **Micro-Integration** | Capital M, hyphenated. Never "connector," "integration module," or "adapter." |
| **Solace Agent Mesh** / **SAM** | Full name or acronym. Both acceptable. |
| **Event broker service** | For Solace Cloud-managed brokers. |
| **Solace Software Event Broker** | For self-managed software brokers. |
| **Solace Appliance Event Broker** | For hardware appliances. |
| **Direct messaging** | Not "fire-and-forget," not "QoS 0." |
| **Guaranteed messaging** | Not "persistent messaging," not "QoS 1/2." |
| **Smart topics** | For the hierarchical-topic concept. |
| **DMR** | Dynamic Message Routing. **DMR cluster** for horizontal scaling. **External links** for cross-cluster. |
| **A2A protocol** | Agent-to-Agent. For SAM's inter-component protocol. |
| **OrchestratorAgent** | One word, capital O. |
| **Agent Card** | For the SAM agent's published capability profile. |
| **Event Portal** | Proper name. Not "the portal." |
| **Solace Insights** | Proper name. Not "monitoring." |
| **Solace Schema Registry** | Full proper name. |
| **Solace Cloud Console** | Full proper name. |

### Topic taxonomy

The recommended structure is `Domain/Noun/Verb/Version/Properties...` with properties ordered least-specific to most-specific. Hard limits: 250 characters, 128 levels. camelCase or PascalCase preferred.

### Never use

These substitutions are wrong. They introduce ambiguity, lose precision, or conflate Solace concepts with generic terms from other platforms.

- Never use "connector," "adapter," or "integration module." The correct term is **Micro-Integration** (capital M, hyphenated).
- Never use "QoS," "quality of service," or "QoS levels." The correct terms are **Direct messaging** and **Guaranteed messaging**.
- Never use "orchestrator agent" (two words). The correct term is **OrchestratorAgent** (one word, capital O).
- Never use "entrypoint" when referencing published SAM documentation on `docs.solace.com`. Use **Gateway**. Only use "entrypoint" inside SAM project-internal prose (`solacelabs.github.io/solace-agent-mesh`) where the Gateway-to-Entrypoint transition applies.
- Never conflate Micro-Integrations with the backend systems they connect to. A Micro-Integration connects an external system to the event broker. It is not the external system itself.
- Never explain a Solace term by substituting a generic term in parentheses. "Micro-Integrations (pre-built connectors)" is wrong. If a term needs explanation, describe what it does: "Micro-Integrations — lightweight event-driven modules that connect enterprise systems to Solace event brokers."

### Gateway versus Entrypoint

Inside the SAM project (`github.com/SolaceLabs/solace-agent-mesh`): user-facing prose says "entrypoint." Code identifiers, config keys, and named features keep "gateway." Outside the SAM project, including `docs.solace.com` SAM content: "Gateway" is standard. Match the surface being addressed.

## Grounding Document Loading

Before generating any Solace architecture recommendation:

1. **Platform reference first.** Read the relevant section of `~/.claude/skills/solace-architect/solace-grounding/solace-platform-reference.md` to confirm the capability exists and understand its scope.
2. **Verify before citing.** Before citing a Solace capability, verify it exists in the platform reference or canonical sources index (`~/.claude/skills/solace-architect/solace-grounding/solace-canonical-sources.md`). Do not cite from training data alone.
3. **Match reference architectures.** Before recommending an architecture pattern, check whether the problem matches a known pattern in `~/.claude/skills/solace-architect/solace-grounding/solace-reference-architectures.md`.
4. **Fetch for depth.** When a skill needs depth on a specific topic, fetch from the URL listed in the canonical sources index rather than reasoning from training data. The fetch is cheap. The error from a stale or invented detail is not.
5. **Check antipatterns.** Before finalizing any artifact, review `~/.claude/skills/solace-architect/solace-grounding/antipatterns.md` for known mistakes relevant to the current design.

## Artifact Validation

Before writing any architectural artifact (discovery brief, topology document, agent config, blueprint), run these checks. Fix issues before writing, not after.

**Forbidden terminology:**
- "connector," "adapter," or "integration module" when referring to Micro-Integrations
- "QoS," "quality of service," or "QoS levels"
- "orchestrator agent" (two words) instead of OrchestratorAgent
- Parenthetical generic explanations of Solace terms, e.g. "Micro-Integrations (pre-built connectors)"

**Naming conventions check:**
- Micro-Integration: capital M, hyphenated
- Direct messaging / Guaranteed messaging: exact terms
- OrchestratorAgent: one word, capital O
- Gateway: in external-facing content (not "entrypoint" outside SAM project prose)
- A2A protocol, DMR, Event Portal, Solace Insights, Solace Schema Registry: proper names

**Ungrounded claims check:**
- Any Solace capability claim that does not trace to a grounding document must be flagged: "Architectural inference, not from Solace docs — verify before external use."
- Do not present inferences as documented facts.

## Cross-Skill Dependencies

When a skill starts, check whether its input dependencies have been met for the active project. Read `projects/<active-project>/progress.yaml` and verify.

**Dependency map:**

| Skill | Requires |
|-------|----------|
| solace-diagrams  | blueprint recommended (reads existing artifacts) |
| solace-discovery | No dependencies (entry point) |
| solace-executive | blueprint complete |
| solace-intake    | No dependencies (entry point) |
| solace-topic-design | discovery complete |
| solace-sam-design | discovery complete |
| solace-broker-select | discovery complete |
| solace-protocol-select | discovery complete |
| solace-mesh-design | discovery complete, broker-select complete |
| solace-ha-dr | discovery complete, broker-select complete |
| solace-migration | discovery complete |
| solace-integration | discovery complete |
| solace-event-portal | discovery complete, topic-design recommended |
| solace-architect-review | at least one technical skill complete |
| solace-ops-review | at least one technical skill complete |
| solace-security-review | at least one technical skill complete |
| solace-dev-review | at least one technical skill complete |
| solace-validate | discovery + at least one technical skill complete |
| solace-blueprint | validate complete |
| solace-plan | discovery complete |
| solace-projects  | No dependencies |
| solace-help | No dependencies |

**If dependencies are not met:** Do not refuse to run. Instead, show what is missing and which skill produces it. Example: "This skill requires a completed discovery brief. Run `/solace-discovery` first to produce one."

**If no active project exists and this is not solace-discovery or solace-help:** Warn the user and ask them to create a project or pick an existing one before proceeding.

## Project Management

All project outputs go to `projects/<project-slug>/`. Each project has:

```
projects/<project-slug>/
  context.yaml          # project name, display name, creation date, status
  decisions.yaml        # accumulated design decisions across skills
  progress.yaml         # skill execution log with resume support
  artifacts/            # all generated outputs, organized by skill
    01-discovery/
    02-topic-design/
    03-broker-select/
    04-sam-design/
    05-protocol-select/
    06-mesh-design/
    07-ha-dr/
    08-integration/
    09-migration/
    10-reviews/
    11-validation/
    12-blueprint/
    13-event-portal/
    14-executive/
```

### Active project

Read `projects/.active` to determine the current project slug. If it exists, tell the user which project is active at session start.

### Project warnings

- **Non-discovery skill invoked with no active project:** Warn. Ask the user to create a new project or pick an existing one.
- **Non-discovery skill invoked but active project has no discovery brief:** Warn that discovery has not been completed. Recommend `/solace-discovery` first.
- **`/solace-discovery` invoked but active project already has a completed discovery brief:** Warn this will overwrite the existing brief. Ask the user to confirm or create a new project instead.

### Progress tracking

`progress.yaml` tracks what has been done per skill:

```yaml
- skill: solace-discovery
  status: complete      # started | in-progress | complete | interrupted
  started: 2026-04-28T10:30:00Z
  completed: 2026-04-28T10:45:00Z
  summary: "Retail bank AI assistant. Pattern 1 match. 4 backends identified."
  step_reached: "5/5 — synthesis complete"
  artifacts:
    - path: artifacts/01-discovery/discovery-brief.md
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
```

**Checkpoint writes.** Every skill writes to `progress.yaml` at these points:
- On start: status `in-progress`, current step, timestamp
- On each major step completion: update `step_reached`, `summary`, and `artifacts`
- On clean completion: status `complete`, completion timestamp
- If the skill never writes `complete`, the status stays `in-progress` (interrupted)

**Single entry per skill.** Upsert by skill name — replace the existing entry on
each subsequent write, never append a second row for the same skill. The dashboard
groups timeline and stats by skill name; duplicate rows render ambiguously.

**Writing checkpoint entries — canonical snippet.** Use a *quoted* heredoc and
pass values via env vars. Do not interpolate shell variables inside Python
f-strings via brace-quote (e.g. `f'.../{"$VAR"}/...'`) — that pattern reads as
shell-obfuscation to safety scanners and will trip permission prompts on every
run. Substitute the skill name, status, step, and one-line summary for the run:

```bash
ACTIVE=$(cat projects/.active) SKILL="solace-<this-skill>" \
  TS=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  STATUS="in-progress" STEP="1/N" SUMMARY="<one-line>" \
  python3 << 'PYEOF'
import os, yaml
path = f"projects/{os.environ['ACTIVE']}/progress.yaml"
with open(path) as f:
    data = yaml.safe_load(f) or {"progress": []}
entry = {
    "skill": os.environ["SKILL"],
    "status": os.environ["STATUS"],
    "started": os.environ["TS"],
    "summary": os.environ["SUMMARY"],
    "step_reached": os.environ["STEP"],
    "artifacts": [],
}
progress = data.setdefault("progress", [])
for i, e in enumerate(progress):
    if e.get("skill") == entry["skill"]:
        progress[i] = entry
        break
else:
    progress.append(entry)
with open(path, "w") as f:
    yaml.dump(data, f, default_flow_style=False, sort_keys=False)
PYEOF
```

For completion writes, add `completed`, set `status: complete`, and include the
`artifacts` list and `timing` block (see Timing Instrumentation).

**Resume behavior.** When a skill is invoked and `progress.yaml` shows that same skill was previously `in-progress` for the active project:
1. Read the progress entry and the project's `decisions.yaml`
2. Present a summary: "Last time we ran this skill, we got through step X of Y. Here's what was completed. Here's what's pending."
3. Ask the user via AskUserQuestion (this is multiple-choice): A) Resume from where we left off, B) Start over, C) Review completed decisions first
4. If A: skip completed steps, pick up at `step_reached`
5. If B: clear the old progress entry and start fresh
6. If C: walk through completed decisions, then decide

**Project status display.** When a project is opened or switched to, show:

```
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
```

## Timing Instrumentation

Track execution time for every skill to separate model work from user wait time.
All timing data is stored in `progress.yaml` under a `timing` key in each skill's
progress entry.

### What to capture

Record timestamps at these points using `date -u +%s` (epoch seconds):

1. **Skill start** — immediately after reading project state, before any processing.
2. **Before each AskUserQuestion** — captures when the model paused for user input.
3. **After each AskUserQuestion response** — captures when the model resumed work.
4. **Step boundaries** — when each numbered step begins and ends.
5. **Skill completion** — after all artifacts are saved.

### How to capture

At each instrumentation point, run:

```bash
date -u +%s
```

Keep a mental ledger of timestamps as you go. You do not need to write them to disk
at each point — accumulate them and write the full timing block once at skill completion,
alongside the progress update.

### Timing block format

When writing the skill's completion entry to `progress.yaml`, include a `timing` block:

```yaml
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
```

### Calculation rules

- **wall_sec** = skill completion timestamp - skill start timestamp
- **user_wait_sec** = sum of all question wait times
- **execution_sec** = wall_sec - user_wait_sec
- **Per-step execution_sec** = step end - step start - any user waits within that step
- If a step has no AskUserQuestion, its execution_sec = step end - step start

### When not to track

- Do not track timing for `/solace-help` or `/solace-projects` (utility skills).
- If a skill is resumed (not a fresh run), track timing for the resumed portion only.
  Note `resumed: true` in the timing block so the data is clearly partial.

## Voice

Direct, concrete, architect-to-architect. Name the component, the topic structure, the delivery mode, the trade-off, and the user-visible impact. No filler.

No em dashes. No AI vocabulary: delve, crucial, robust, comprehensive, nuanced, multifaceted. Never corporate or academic. Short paragraphs. End with what to do.

## Completion Status Protocol

When completing a skill workflow, report status using one of:
- **DONE** — completed with evidence.
- **DONE_WITH_CONCERNS** — completed, but list concerns.
- **BLOCKED** — cannot proceed; state blocker and what was tried.
- **NEEDS_CONTEXT** — missing info; state exactly what is needed.

Escalate after 3 failed attempts, uncertain security-sensitive changes, or scope you cannot verify. Format: `STATUS`, `REASON`, `ATTEMPTED`, `RECOMMENDATION`.

# /solace-projects — Project Dashboard

Manage and inspect Solace Architect projects. Parse the user's request to determine
which subcommand to run. If the request is ambiguous or just `/solace-projects` with
no arguments, default to **status** for the active project. If no active project exists,
default to **list**.

---

## Subcommand: list

Show all projects with summary info.

```bash
if ls projects/*/context.yaml 1>/dev/null 2>&1; then
  ACTIVE=$(cat projects/.active 2>/dev/null || echo "")
  for ctx in projects/*/context.yaml; do
    slug=$(dirname "$ctx" | xargs basename)
    display=$(grep "^display_name:" "$ctx" 2>/dev/null | sed 's/^display_name: *//')
    created=$(grep "^created:" "$ctx" 2>/dev/null | sed 's/^created: *//')
    proj_status=$(grep "^status:" "$ctx" 2>/dev/null | sed 's/^status: *//')
    artifacts=$(find "projects/$slug/artifacts" -type f 2>/dev/null | wc -l | tr -d ' ')
    marker=""
    if [ "$slug" = "$ACTIVE" ]; then marker=" (active)"; fi
    echo "$slug$marker — $display — $proj_status — created: $created — $artifacts artifacts"
  done
else
  echo "NO_PROJECTS"
fi
```

If no projects exist, print:

```
No projects found. Run /solace-discovery to start your first project.
```

If projects exist, format as a table:

```
Solace Architect — Projects

  Project                 Status    Created       Artifacts
  ─────────────────────   ───────   ───────────   ─────────
  acme-bank-chat (active) active    2026-04-28    12 files
  market-data-poc         active    2026-04-15    8 files
  factory-telemetry       archived  2026-03-10    22 files
```

---

## Subcommand: status

Show detailed per-skill status for the active project (or a named project if the user
specifies one).

```bash
ACTIVE=$(cat projects/.active 2>/dev/null || echo "")
if [ -z "$ACTIVE" ]; then
  echo "NO_ACTIVE_PROJECT"
else
  echo "PROJECT: $ACTIVE"
  cat "projects/$ACTIVE/context.yaml" 2>/dev/null
  echo "---PROGRESS---"
  cat "projects/$ACTIVE/progress.yaml" 2>/dev/null || echo "NO_PROGRESS"
  echo "---DECISIONS---"
  cat "projects/$ACTIVE/decisions.yaml" 2>/dev/null || echo "NO_DECISIONS"
fi
```

Parse `progress.yaml` and present the status of every skill. Use these status markers:

- `✓` — complete (show step reached and artifact count)
- `→` — in-progress (show step reached, what's pending)
- `⊘` — skipped (user explicitly skipped via plan or interactive routing)
- `·` — not started

Include the full skill sequence so the user sees what's done, what's next, and what's
remaining. Read `execution_mode` from decisions.yaml and show it.

Format:

```
Project: <display name> (<slug>)
Mode: <auto|interactive>  |  Created: <date>  |  Status: <active|archived>

  Skill                    Status         Step        Artifacts   Exec Time
  ────────────────────     ──────────     ─────────   ─────────   ─────────
  ✓ Discovery              complete       5/5         1 file      6m (12m wait)
  ✓ Topic Design           complete       5/5         3 files     4m (3m wait)
  → SAM Design             in-progress    3/5         4 files     5m (8m wait)
  · Broker Selection       not started    —           —           —
  ⊘ Mesh Design            skipped        —           —           —
  · Protocol Selection     not started    —           —           —
  · HA/DR Design           not started    —           —           —
  · Integration            not started    —           —           —
  · Architecture Review    not started    —           —           —
  · Operations Review      not started    —           —           —
  · Security Review        not started    —           —           —
  · Developer Review       not started    —           —           —
  · Validation             not started    —           —           —
  · Blueprint              not started    —           —           —

  Decisions: 8 recorded  |  Artifacts: 8 files total
  Timing: 38m wall / 23m user wait / 15m execution

  Recommended next: /solace-sam-design (resume from step 3/5)
```

The **Exec Time** column shows execution_sec (model work) and user_wait_sec in parentheses.
The **Timing** summary line aggregates across all completed and in-progress skills.
Format minutes as `Xm`, seconds as `Xs` for values under 60.

For the "Recommended next" line:
1. If a skill is in-progress, recommend resuming it.
2. Otherwise, recommend the first not-started skill in the engagement sequence.
3. If all skills are complete, show "All skills complete — run /solace-blueprint if not done."

---

## Subcommand: summary

Show key decisions and findings for the active project.

```bash
ACTIVE=$(cat projects/.active 2>/dev/null || echo "")
if [ -z "$ACTIVE" ]; then
  echo "NO_ACTIVE_PROJECT"
else
  echo "PROJECT: $ACTIVE"
  cat "projects/$ACTIVE/decisions.yaml" 2>/dev/null || echo "NO_DECISIONS"
  echo "---BRIEF---"
  cat "projects/$ACTIVE/artifacts/01-discovery/discovery-brief.md" 2>/dev/null || echo "NO_BRIEF"
fi
```

Present a structured summary:

```
Project Summary: <display name>

Discovery:
  • Vertical: <industry>
  • Pattern match: <reference architecture or "custom">
  • Systems: <count> identified
  • Project type: <new build | migration | extension | SAM>

Key Decisions:
  • Execution mode: <auto | interactive>
  • Broker type: <cloud | software | appliance | hybrid> (if decided)
  • Topology: <single-site | HA group | DMR cluster | multi-site> (if decided)
  • Delivery mode: <direct | guaranteed | mixed> (if decided)
  • <other decisions from decisions.yaml>

Open Questions:
  • <any items flagged as open or pending in decisions or reviews>
```

If no discovery brief exists, show only what's available from decisions.yaml and
progress.yaml.

---

## Subcommand: switch

Switch the active project.

```bash
ls -d projects/*/context.yaml 2>/dev/null | while read ctx; do
  slug=$(dirname "$ctx" | xargs basename)
  display=$(grep "display_name" "$ctx" 2>/dev/null | sed 's/display_name: //')
  echo "$slug — $display"
done
```

Present the list via AskUserQuestion (full D<N> format). After the user picks, write
the selected slug to `projects/.active`:

```bash
echo "<selected-slug>" > projects/.active
```

Then show the status for the newly active project (run the **status** subcommand).

---

## Subcommand: archive

Mark a project as archived. It stays on disk but is dimmed in the list view.

```bash
ACTIVE=$(cat projects/.active 2>/dev/null || echo "")
```

If the user names a project, archive that one. If no name given, ask via AskUserQuestion
which project to archive.

Update context.yaml:

```bash
SLUG="<project-to-archive>"
sed -i.bak 's/status: active/status: archived/' "projects/$SLUG/context.yaml"
rm -f "projects/$SLUG/context.yaml.bak"
```

If the archived project was the active project, clear `projects/.active` and tell the
user to switch to another project or start a new one.

---

## Subcommand: compare

Side-by-side comparison of two projects. Useful when re-running discovery with different
assumptions.

Ask for two project slugs (or parse from the user's command). Read both progress files:

```bash
SLUG_A="<first>"
SLUG_B="<second>"
echo "---A---"
cat "projects/$SLUG_A/progress.yaml" 2>/dev/null
echo "---B---"
cat "projects/$SLUG_B/progress.yaml" 2>/dev/null
echo "---DECISIONS_A---"
cat "projects/$SLUG_A/decisions.yaml" 2>/dev/null
echo "---DECISIONS_B---"
cat "projects/$SLUG_B/decisions.yaml" 2>/dev/null
```

Present as a side-by-side table:

```
Comparison: <project A> vs <project B>

  Skill                 <project A>        <project B>
  ────────────────────  ─────────────────  ─────────────────
  Discovery             ✓ complete         ✓ complete
  Topic Design          ✓ complete         · not started
  Broker Selection      Cloud              Software
  ...

  Key Decision Differences:
  • Broker type: Cloud (A) vs Software (B)
  • Topology: single-site (A) vs multi-site (B)
  • <other differences>
```

Highlight decisions that differ between the two projects.
