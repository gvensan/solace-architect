---
name: solace-intake
preamble-tier: 2
version: 0.1.0
description: |
  Generate a pre-engagement intake template for customers, or import a completed
  intake file to bootstrap discovery and run the full Solace Architect engagement
  with minimal interactive prompts. Two modes: (1) --template generates blank
  YAML and Markdown intake forms for offline collection; (2) import reads a
  completed intake file, validates it, asks only about gaps and domain-specific
  follow-ups, then hands off to /solace-plan for end-to-end execution.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - WebFetch
  - WebSearch
  - AskUserQuestion
interactive: true
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "SKILL: solace-intake"
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

### Cite every claim

Tag each capability claim inline with its source category (at the end of the claim; in comparison tables each row carries a tag):

- `[doc: <url-or-page>]` — grounds in docs.solace.com, solacelabs.github.io, or another technical source.
- `[ref: solace-platform-reference]` / `[ref: solace-reference-architectures]` — grounds in a project grounding doc.
- `[user]` — information the user supplied during discovery.
- `[inference]` — your own reasoning applied to user inputs; a judgment, not a fact.
- `[managed-ref: <title>]` — grounds in an admin-curated organizational reference.

A claim that fits none of these does not belong in the output — find the source, mark it `[inference]`, or remove it.

### Confidence flagging

- **Confirmed** — directly supported by a fetched or referenced source; the citation tag suffices.
- **Reasoned** — follows from a confirmed capability but extends it; tag `[inference]` and carry the source it builds on.
- **Unverified** — plausible but unconfirmed; prefix "Unverified:" and never present as fact. Watchlist: Solace Cloud region availability, version-specific features, pricing/tier behavior, performance numbers, Micro-Integration availability.

### Classify claims correctly

Misclassification is the failure that citation tags miss. Keep these distinct: **capability** (what Solace can do — ground in docs); **configuration** (what a deployment has enabled — ground in user inputs / broker state); **regulatory requirement** (what a regulation mandates — ground in the regulation itself); **project policy** (a constraint the user chose — tag `[user]`, never present as a regulatory mandate); **quantitative** (numbers carry their conditions and source); **temporal** ("current" / "deprecated" carry a date); **comparison** (only when a Solace source explicitly compares); **recommendation** (carry visible criteria). The most common error is a project policy dressed up as a regulatory requirement. Watch phrases: "GDPR requires", "PCI-DSS mandates", "best practice", "always/never", "faster than", "X% of banks".

### Additional discipline

- **Negative claims:** say "I do not have evidence Solace supports X", not "Solace does not support X" — the second is a positive claim about non-existence that needs its own source.
- **Source recency:** treat the platform reference's verification log as authoritative; re-fetch the canonical source when a claim depends on a section not verified recently (SAM moves fastest).
- **SAM version pinning:** every SAM claim names its version, e.g. `[doc: components/orchestrator, v1.19.0]`. "SAM supports X" without a version is unfalsifiable.
- **Reasoning visibility:** when you recommend one option over another, name the criteria in a sentence so the user can challenge the criteria, not just the conclusion.

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
  intake.yaml           # canonical structured intake — source of truth for routing/reviews/validation
  decisions.yaml        # design decisions across skills (review findings = entries with a source)
  open-items.yaml       # deferred findings + unaddressed requirements; blocking items gate blueprint
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

Solace Architect voice: senior architect judgment, grounded in the Solace platform.

- Lead with the point. Say what it does, why it matters, and what changes for the system.
- Be concrete. Name the broker type, the topic hierarchy, the delivery mode, the Micro-Integration, the protocol, the deployment topology.
- Tie architectural choices to operational outcomes: what fails, what scales, what the ops team sees at 3am, what the developer has to build.
- Be direct about quality. Antipatterns matter. Missing failure paths matter. Incomplete security models matter. Flag them.
- Sound like a senior architect talking to another architect, not a vendor presenting to a prospect.
- Never pitch, never hype, never hedge with "it depends" without naming what it depends on.
- No em dashes. No AI vocabulary: delve, crucial, robust, comprehensive, nuanced, multifaceted, furthermore, moreover, additionally, pivotal, landscape, tapestry, underscore, foster, showcase, intricate, vibrant, fundamental, significant.
- Use Solace terminology precisely. Micro-Integration, not connector. Direct messaging and Guaranteed messaging, not QoS levels. Event broker service, not managed broker. See the Naming section in this preamble.

Good: "DMR external links between the NY and London clusters carry market data on Direct messaging. Order flow goes Guaranteed on separate topics. Mixing delivery modes on the same topic is an antipattern — the audit path silently loses persistence."
Bad: "The comprehensive event mesh solution leverages robust messaging capabilities to ensure reliable data distribution across global hubs."

## AskUserQuestion Format

Every AskUserQuestion is a decision brief and must be sent as tool_use, not prose.

**Exception:** Next-step routing prompts use a separate streamlined format defined in the
Next Step Chaining section. Routing is workflow navigation ("what to run next"), not an
architecture decision — it does not use the D<N> schema, self-check, or completeness scoring.

```
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
```

### Format rules

**D-numbering:** first question in a skill invocation is `D1`; increment yourself.

**Context** replaces the old ELI10/Stakes/Project fields. One block, 1-2 sentences max.
Plain English a non-engineer could follow. Name the stakes (what breaks if we pick wrong).

**Recommendation callout** is a blockquote so it stands out visually. The `(recommended)`
label on the option MUST also be present — AUTO_DECIDE depends on it.

The **Why** line inside the callout must be project-specific. Bad: "because it's simpler."
Good: "because this is a single-site deployment with 3 backends, where simpler topology
reduces operational risk." Reference discovery findings, requirements, or constraints.

**Pros / cons:** use ✅ and ❌. Minimum 2 pros and 1 con per option when the choice is
real. Each bullet 40-80 characters — long enough to be concrete, short enough to scan.
Hard-stop escape for one-way/destructive confirmations: `✅ No cons — this is a hard-stop choice`.

**Completeness** goes **below each option's pros/cons**, not above the option list.
This lets the user read the tradeoffs and then see the score in context.
Use `Completeness: N/10` only when options genuinely differ in coverage (10 = complete,
7 = happy path, 3 = shortcut). Omit when options differ in kind — don't force a score.

**Neutral posture:** `Recommended: <default>) <label>` with `Why: taste call — no
strong preference either way`. The `(recommended)` label STAYS on the default.

**Effort both-scales:** when an option involves effort, label both human-team and
AI-assisted time, e.g. `(human: ~2 days / AI-assisted: ~15 min)`.

**Net line** closes the tradeoff in one sentence.

### Expanding template shorthand

Skill templates sometimes give abbreviated AskUserQuestion instructions like
`"Use AskUserQuestion: A) option, B) option"`. These are shorthand — you MUST
expand every AskUserQuestion to the full D<N> format above with Context, Recommendation
callout, pros/cons, and Net line. Never emit a bare option list.

### Auto-decide (execution_mode: auto)

Before every AskUserQuestion, check `decisions.yaml` for `execution_mode`:

```bash
ACTIVE=$(cat projects/.active)
grep "execution_mode" "projects/$ACTIVE/decisions.yaml" 2>/dev/null || echo "NOT_SET"
```

When `execution_mode: auto`:

1. **Do NOT call AskUserQuestion.** Do not stop for user input.
2. Select the option marked `(recommended)` automatically.
3. Print a one-line log: `"AUTO D<N>: <question title> → <chosen option label>"`
4. Record the decision in `decisions.yaml` with `auto_decided: true`:
   ```yaml
   <decision_key>:
     choice: "<option letter>"
     label: "<option label>"
     auto_decided: true
     rationale: "<the Why line from the recommendation callout>"
   ```
5. Continue execution without pausing.

**Auto-decide applies to all D<N> architecture decisions within every skill.**
It does not apply to:
- Free-text prompts (these require actual user input and cannot be auto-decided)
- Resume prompts ("Resume from where we left off / Start over / Review decisions")

When `execution_mode` is `interactive` or not set, call AskUserQuestion normally.

### Self-check before emitting

Before calling AskUserQuestion (interactive mode only), verify:
- [ ] D<N> header present
- [ ] Context present (1-2 sentences, plain English, stakes named)
- [ ] Recommendation callout present (blockquote, project-specific Why)
- [ ] Every option has ≥2 ✅ and ≥1 ❌, each 40-80 chars (or hard-stop escape)
- [ ] Completeness score below each option's pros/cons (if options differ in coverage)
- [ ] `(recommended)` label on one option
- [ ] Net line closes the decision
- [ ] You are calling the tool, not writing prose

### Free-text prompt format

When a question needs free-text answers (not AskUserQuestion), users can confuse
numbered question lists with selectable options. Always frame free-text prompts
with visible hints:

1. **Open with an input hint** — a short line that explicitly signals "type your
   answer in your own words." Example:
   `"Answer in your own words — these are open questions, not options to pick from:"`
2. **Use bullet points (•), not numbers.** Numbers look like selectable options.
   If numbering is needed for reference, prefix with a descriptive label
   (e.g., `"Q1."` not just `"1."`).
3. **Close with an expectation line** — tell the user what to do and that partial
   answers are fine. Example:
   `"Type your answers below — as much or as little as you have. Fine to skip what you don't know yet."`

Template:

```
<topic intro — one sentence, ends with colon>
Answer in your own words — these are open questions, not options to pick from:

• **<Label>:** <question> (<clarifying examples if needed>)
• **<Label>:** <question>
...

Type your answers below — as much or as little as you have. Fine to skip what you don't know yet.
```

This format applies to all plain-prose question lists across every skill.

## Writing Style

Applies to AskUserQuestion, user replies, and findings.

- Gloss curated jargon on first use per skill invocation, even if the user pasted the term.
- Frame questions in outcome terms: what pain is avoided, what capability unlocks, what user experience changes.
- Use short sentences, concrete nouns, active voice.
- Close decisions with user impact: what the user sees, waits for, loses, or gains.
- Use Solace terminology precisely per the Naming Conventions section.

Jargon list, gloss on first use if the term appears:
- event-driven architecture
- event mesh
- topic taxonomy
- topic hierarchy
- topic subscription
- wildcard subscription
- shared subscription
- Direct messaging
- Guaranteed messaging
- message VPN
- DMR
- DMR cluster
- external link
- Micro-Integration
- dead message queue
- last value queue
- topic endpoint
- client profile
- ACL profile
- replay
- message spool
- backpressure
- flow control
- consumer acknowledgment
- idempotent
- idempotency
- eventual consistency
- saga
- outbox pattern
- CQRS
- event sourcing
- fan-out
- fan-in
- pub/sub
- request/reply
- circuit breaker
- rate limit
- throttle
- cold start
- canary deploy
- feature flag
- dead letter queue
- schema evolution
- schema registry
- AsyncAPI
- CloudEvents
- MQTT
- AMQP
- REST delivery point
- webhook
- connector
- OT convergence
- IT/OT bridge
- edge broker
- cache stampede
- thundering herd
- optimistic locking
- pessimistic locking
- two-phase commit
- quorum
- replication lag
- sharding
- partition
- consumer group
- exactly-once delivery
- at-least-once delivery
- at-most-once delivery
- failover
- split-brain
- mate link
- monitoring node
- redundancy group
- config-sync
- replay log
- spool
- subscriber
- endpoint
- selector
- DMR bridge
- partitioned queue
- message eliding
- CacheInstance
- substitution expression


## Completeness Principle — Boil the Lake

AI makes completeness cheap. Recommend complete lakes (tests, edge cases, error paths); flag oceans (rewrites, multi-quarter migrations).

When options differ in coverage, include `Completeness: X/10` (10 = all edge cases, 7 = happy path, 3 = shortcut). When options differ in kind, write: `Note: options differ in kind, not coverage — no completeness score.` Do not fabricate scores.

## Confusion Protocol

For high-stakes ambiguity (architecture, data model, destructive scope, missing context), STOP. Name it in one sentence, present 2-3 options with tradeoffs, and ask. Do not use for routine coding or obvious changes.

## Continuous Checkpoint Mode

If `CHECKPOINT_MODE` is `"continuous"`: auto-commit completed logical units with `WIP:` prefix.

Commit after new intentional files, completed functions/modules, verified bug fixes, and before long-running install/build/test commands.

Commit format:

```
WIP: <concise description of what changed>

[checkpoint-context]
Decisions: <key choices made this step>
Remaining: <what's left in the logical unit>
Tried: <failed approaches worth recording> (omit if none)
Skill: </skill-name-if-running>
[/checkpoint-context]
```

Rules: stage only intentional files, NEVER `git add -A`, do not commit broken tests or mid-edit state, and push only if `CHECKPOINT_PUSH` is `"true"`. Do not announce each WIP commit.

If `CHECKPOINT_MODE` is `"explicit"`: ignore this section unless a skill or user asks to commit.

## Context Health (soft directive)

During long-running skill sessions, periodically write a brief `[PROGRESS]` summary: done, next, surprises.

If you are looping on the same diagnostic, same file, or failed fix variants, STOP and reassess. Progress summaries must NEVER mutate git state.

## Next Step Chaining

### Execution mode

Before presenting next-step choices, check `decisions.yaml` for `execution_mode`:

```bash
ACTIVE=$(cat projects/.active)
grep "execution_mode" "projects/$ACTIVE/decisions.yaml" 2>/dev/null || echo "NOT_SET"
```

- **`auto`** — invoke the primary recommended skill immediately. Print a one-line
  transition before invoking: `"→ Running /solace-<skill> — <title>..."`
  **Auto mode stops** (falls back to interactive) when:
  - `/solace-validate` finds critical issues (do not auto-chain to blueprint)
  - A skill completes with BLOCKED or NEEDS_CONTEXT status
  - All recommended next steps are already complete
- **`interactive`** — present the 3-option routing prompt below.
- **Not set** — treat as `interactive` (default).

### Interactive routing format

After completing a skill and saving all artifacts, present the recommended next skill
as an interactive choice — not a passive text suggestion.

Use AskUserQuestion with a streamlined **routing format** (not the full D<N> decision brief):

```
Next: <slash-command> — <skill title>
<one sentence: what this skill does and why it's the logical next step>

A) Continue — run <slash-command> now (recommended)
B) Skip for now — I'll come back to it later
C) Pick a different skill
```

**On user choice:**
- **A (Continue):** Invoke the skill immediately via the Skill tool. No further confirmation needed.
- **B (Skip):** Persist a `status: skipped` entry in `progress.yaml` for the skipped skill:

```yaml
- skill: <skipped-skill-name>
  status: skipped
  skipped_at: <ISO timestamp>
  reason: "User chose to skip during next-step routing after <current-skill>"
```

  Acknowledge the skip. Mention they can run it anytime with the slash command. Stop.
- **C (Custom):** Read progress.yaml, list remaining incomplete skills (exclude `complete` and `skipped`) with their slash commands, and ask which one. Then invoke the chosen skill.

Each skill template declares its recommended next step(s) and the condition for choosing
between them. Use progress.yaml to check what has already been completed — never recommend
a skill that is already marked complete. If all recommended next steps are already complete,
skip routing and close with a brief completion message.

This routing format is for workflow navigation only. Architecture decisions still use the
full D<N> decision brief format.

Skip next-step routing if the current skill was invoked as part of a `/solace-plan`
execution — the plan orchestrator handles sequencing.

## Completion Status Protocol

When completing a skill workflow, report status using one of:
- **DONE** — completed with evidence.
- **DONE_WITH_CONCERNS** — completed, but list concerns.
- **BLOCKED** — cannot proceed; state blocker and what was tried.
- **NEEDS_CONTEXT** — missing info; state exactly what is needed.

Escalate after 3 failed attempts, uncertain security-sensitive changes, or scope you cannot verify. Format: `STATUS`, `REASON`, `ATTEMPTED`, `RECOMMENDATION`.

# /solace-intake — Intake Template & Kickstart

You are running the intake skill. Your job is to either generate a blank intake
template for offline customer collection, or import a completed intake file and
bootstrap the entire Solace Architect engagement.

---

## Determine mode

Check for an active project:

```bash
ACTIVE=$(cat projects/.active 2>/dev/null || echo "")
if [ -n "$ACTIVE" ] && [ -f "projects/$ACTIVE/artifacts/01-discovery/discovery-brief.md" ]; then
  echo "HAS_PROJECT: $ACTIVE"
  cat "projects/$ACTIVE/context.yaml" 2>/dev/null | head -3
else
  echo "NO_EXPORTABLE_PROJECT"
fi
```

Parse the user's invocation to determine which mode to run:

1. If the argument is `--template` → run **Template Generation Mode** (Step T1–T3)
2. If the argument is a file path (e.g., `intake.docx`, `intake.yaml`, `./filled-intake.md`) → run **Import Mode** (Step I1–I7)
3. If the argument is `--export` → run **Export Mode** (Step E1–E3)
4. If no argument → ask the user:

Use AskUserQuestion. If an active project with a completed discovery brief exists,
include option C. If no exportable project exists, show only options A and B.

**With active project:**
```
What would you like to do with the intake skill?

A) Generate a blank intake template — creates a Word, YAML, or Markdown template for offline collection
B) Import a completed intake file — supports Word (.docx), YAML, or Markdown files
C) Export intake from current project — generates a filled intake file from the active project's discovery data
```

**Without active project:**
```
What would you like to do with the intake skill?

A) Generate a blank intake template — creates a Word, YAML, or Markdown template for offline collection
B) Import a completed intake file — supports Word (.docx), YAML, or Markdown files
```

---

## Template Generation Mode

### Step T1: Choose format

Use AskUserQuestion:

```
Which format should the intake template use?

A) Word document (recommended) — professional layout with dropdowns and structured fields, best for sharing with stakeholders
B) HTML form — interactive single-file form with autocomplete from the Integration Hub catalog and a live preview of the engagement scope
C) YAML — machine-readable, can be imported directly back into /solace-intake
D) Markdown — human-readable, easy to share via email or Confluence
E) All formats — generate Word, HTML, YAML, and Markdown
```

### Step T2: Generate the intake template files

**If Word (A) or All (E) was selected:**

Generate the DOCX template using the builder script:

```bash
mkdir -p intake
for BUILDER in \
  "scripts/build-intake-docx.py" \
  "$HOME/.claude/skills/solace-architect/scripts/build-intake-docx.py" \
  "~/.claude/skills/solace-architect/bin/../scripts/build-intake-docx.py"; do
  [ -f "$BUILDER" ] && break
done
echo "BUILDER: $BUILDER"
python3 "$BUILDER" --output intake/solace-intake-template.docx
```

If `python-docx` is not installed, tell the user:

> The Word document generator requires `python-docx`. Install with:
> ```
> pip install python-docx
> ```
> Then re-run `/solace-intake --template`.

If the builder script is not found at any expected location, generate YAML and
Markdown instead, and suggest the user run `./install-sa.sh` from the Solace
Architect repo to install all assets.

**If HTML (B) or All (E) was selected:**

Generate the standalone HTML form using the builder script:

```bash
mkdir -p intake
for HTMLBLD in \
  "scripts/build-intake-html.py" \
  "$HOME/.claude/skills/solace-architect/scripts/build-intake-html.py" \
  "~/.claude/skills/solace-architect/bin/../scripts/build-intake-html.py"; do
  [ -f "$HTMLBLD" ] && break
done
echo "HTML BUILDER: $HTMLBLD"
python3 "$HTMLBLD" --output intake/solace-intake-template.html
```

If the HTML builder is not found, suggest running `./install-sa.sh` from the Solace
Architect repo to install all assets. The HTML form needs `PyYAML` for routing-rule
embedding; if missing, install with `pip install pyyaml` and re-run.

The generated file is a single self-contained HTML — no CDN, no network calls.
It embeds:
- A snapshot of `solace-grounding/integration-hub-catalog.md` for system-name autocomplete
- The routing rules from `scripts/skill-routing.yaml` for a live engagement preview
- The catalog refresh date is stamped at the bottom of the form

**Sharing model — two ways to use the HTML form:**

1. **Standalone** (default) — open the file directly from disk, fill it out, click
   *Download YAML*, and place the YAML in `intake/`. Send the file to a customer by
   email; they do the same. No server required.

2. **Hosted locally** — run `bun run intake` from the repo root. This launches a
   local HTTP server (default port 3001), serves the same form, and writes
   submissions straight to `intake/<project-slug>.yaml`. The form detects server
   mode automatically and swaps the *Download YAML* button for *Submit to architect*.

If the user prefers the hosted mode, point them to:

> Run `bun run intake` from the Solace Architect repo. The form opens automatically
> in your browser. Fill it in and click *Submit to architect* — the file lands in
> `intake/` and you can immediately run `/solace-intake intake/<project-slug>.yaml`.

**If YAML (C) or All (E) was selected:**

Generate `intake/solace-intake-template.yaml`:

**File 1: `intake/solace-intake-template.yaml`**

```bash
mkdir -p intake
cat > intake/solace-intake-template.yaml << 'YAMLEOF'
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  Solace Architect — Intake Template                                        ║
# ║                                                                            ║
# ║  Fill in what you know. Leave blank what you don't — we will follow up.    ║
# ║  When complete, save this file and provide it to your Solace Architect.    ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# ── Project ──────────────────────────────────────────────────────────────────

project:
  name: ""
  # Short identifier for the project.
  # Examples: "acme-bank-chat", "global-market-data", "factory-telemetry"

  type: ""
  # Pick one: new_build | migration | extension | sam
  #   new_build  — Greenfield event-driven system on Solace
  #   migration  — Moving from an existing messaging platform to Solace
  #   extension  — Adding capabilities to an existing Solace deployment
  #   sam        — Building an AI agent system on Solace Agent Mesh

# ── System Landscape ─────────────────────────────────────────────────────────

landscape:
  systems:
    # List every system that needs to communicate through the event mesh.
    # For each system, describe: name, role (producer/consumer/both),
    # protocol it speaks, and owner/team.
    #
    # Examples:
    # - name: "Core Banking Platform"
    #   role: producer_consumer
    #   protocol: REST
    #   owner: "Core Banking Team"
    #
    # - name: "Transaction Database"
    #   role: consumer
    #   protocol: JDBC
    #   owner: "Data Team"
    - name: ""
      role: ""          # producer | consumer | producer_consumer
      protocol: ""      # REST, MQTT, AMQP, JMS, SMF, WebSocket, gRPC, FIX, etc.
      owner: ""

  existing_messaging: ""
  # What messaging systems are in place today?
  # Examples: "IBM MQ for order processing", "Kafka for analytics", "None"

  protocols_in_use: []
  # What protocols do these systems currently speak?
  # Examples: [REST, MQTT, JMS, WebSocket]

  events:
    # What events flow between systems?
    # For each event, describe: name, approximate rate, delivery mode, payload format, payload size.
    # Payload size drives broker spool sizing and protocol-overhead decisions. Free-text format.
    #
    # Examples:
    # - name: "order-created"
    #   rate: "500/sec peak"
    #   delivery: guaranteed     # direct | guaranteed
    #   payload: JSON
    #   payload_size: "~5KB"
    #
    # - name: "sensor-reading"
    #   rate: "100/sec per device"
    #   delivery: direct
    #   payload: binary
    #   payload_size: "~200B"
    - name: ""
      rate: ""
      delivery: ""       # direct | guaranteed
      payload: ""         # JSON, Avro, Protobuf, XML, binary
      payload_size: ""    # e.g. "~5KB" or "~50KB peak / ~2KB typical"

  volumes: ""
  # Approximate aggregate event rates.
  # Example: "~50K events/sec peak, ~2B events/day"

  schemas: ""
  # Are there existing schemas or an AsyncAPI spec?
  # Example: "Avro schemas in Confluent Schema Registry", "AsyncAPI 3.0 spec", "None"

  vertical: ""
  # What industry is this for?
  # Pick one: banking | capital_markets | manufacturing | healthcare | retail |
  #           telecom | logistics | energy | government | other

# ── Domain-Specific Details ──────────────────────────────────────────────────
# Fill ONLY the section that matches your vertical. Leave the others blank.

domain:

  banking:
    regulatory_constraints: ""
    # PCI-DSS requirements? Data residency rules (which jurisdiction)?
    # Audit trail requirements (which events, how long)?
    # Encryption requirements at rest and in transit?

    existing_messaging_infrastructure: ""
    # Does the bank run IBM MQ, TIBCO, or Kafka today?
    # This drives Micro-Integration strategy.

    authorization_model: ""
    # How do customer permission scopes flow from channel
    # (web, Slack, mobile) through to backends? Existing IAM (OIDC, SAML)?

    data_classification: ""
    # Which data classes need Guaranteed messaging for audit compliance
    # (transactions, fund transfers) versus Direct messaging for
    # latency-sensitive lookups (balance checks, FAQ)?

    internal_vs_customer_facing: ""
    # Is this for customers, internal staff, or both?

  capital_markets:
    latency_budget: ""
    # What is the latency budget for the hot path (market data to trader screen)?
    # What about the audit path?

    global_topology: ""
    # Which trading hubs? (NY, London, Singapore, Tokyo, Hong Kong, Chicago)
    # Which asset classes at which hubs?

    feed_infrastructure: ""
    # What feed handlers and market data providers are in use?
    # (Bloomberg, Refinitiv, direct exchange feeds, etc.)
    # What protocols do they publish on? (FIX, proprietary binary, TCP multicast)

    existing_messaging: ""
    # Any existing middleware?
    # (Kafka, TIBCO, IBM MQ, 29West/Informatica, Solace already)

    compliance_and_replay: ""
    # Which event streams must be replayable for regulatory audit?
    # What retention period?

  manufacturing:
    ot_protocol_inventory: ""
    # What protocols do machines and sensors speak?
    # (OPC UA, Modbus, MQTT, DDS, proprietary)

    edge_constraints: ""
    # What compute is available at the plant floor?
    # Can a Solace Software Event Broker run there?
    # WAN connectivity to regional/cloud — how reliable?

    telemetry_vs_command: ""
    # Does data flow only plant-to-cloud (telemetry), or do commands
    # flow back (config changes, predictive maintenance)?

    existing_historians_mes: ""
    # What systems of record exist at the plant?
    # (OSIsoft PI, Siemens MindSphere, Rockwell FactoryTalk)

  healthcare:
    hipaa_phi: ""
    # Which events contain protected health information?
    # Encryption, access control, audit requirements?

    interoperability_standards: ""
    # HL7v2, FHIR, or both? What EHR system? (Epic, Cerner, Meditech)

    realtime_vs_batch: ""
    # Which clinical events need real-time distribution
    # (alerts, orders, results) versus batch (billing, reporting)?

# ── Requirements ─────────────────────────────────────────────────────────────

requirements:
  delivery_mode: ""
  # Pick one: direct | guaranteed | mixed
  #   direct      — Fire-and-forget, lowest latency
  #   guaranteed  — Persistent, acknowledged delivery
  #   mixed       — Some flows direct, some guaranteed (most common)

  ordering: ""
  # Pick one: none | per_key | global
  #   none     — No ordering guarantees needed
  #   per_key  — Ordered within a partition key (e.g., per customer, per device)
  #   global   — Strict global ordering (rare, significant throughput cost)

  processing_guarantee: ""
  # Pick one: at_least_once | at_most_once
  #   at_least_once — Messages never lost; consumers must be idempotent
  #   at_most_once  — Messages may be lost; no redelivery

  latency_tier: ""
  # Pick one: sub_millisecond | sub_second | seconds | minutes
  #   sub_millisecond — Market data, HFT (<1ms)
  #   sub_second      — Interactive apps, real-time dashboards (<1s)
  #   seconds         — Business events, notifications (1-10s)
  #   minutes         — Batch-adjacent, analytics pipelines

  topology: ""
  # Pick one: single_site | multi_region | hybrid_cloud | edge
  #   single_site   — One data center or cloud region
  #   multi_region  — Multiple cloud regions or data centers
  #   hybrid_cloud  — Mix of on-premise and cloud
  #   edge          — Edge locations + regional/cloud (IoT, manufacturing)

  sites_and_regions: ""
  # How many sites, regions, or clouds? Name them if known.
  # Example: "US-East (AWS), EU-West (Azure), 3 plant floor edge sites"

  it_ot_boundary: ""
  # Is there an IT/OT boundary? (Manufacturing, utilities, transportation)
  # Describe the boundary and any constraints.

  growth_expectations: ""
  # Expected growth over the next 1-3 years?
  # Example: "2x event volume in 12 months, adding 5 new plants"

  data_residency: ""
  # Any regulatory constraints on where data can live or move?
  # Example: "EU data must stay in EU, PCI data cannot leave US"

  operations_team: ""
  # Who operates the messaging infrastructure?
  # Example: "Central platform team (3 people)", "App team self-service"

  solace_experience: ""
  # What is the team's experience with event-driven systems and Solace?
  # Example: "New to Solace, experienced with Kafka", "Existing Solace customer"

  observability: ""
  # What observability is in place?
  # Example: "Datadog for metrics, Jaeger for tracing", "None yet"

  cicd: ""
  # Is there an existing CI/CD pipeline for infrastructure?
  # Example: "Terraform + GitHub Actions", "Manual deployment"

# ── Goals ────────────────────────────────────────────────────────────────────

goals:
  driver: ""
  # What triggered this project? What problem is being solved?
  # Example: "IBM MQ end-of-support in 18 months", "Need real-time customer experience"

  timeline: ""
  # When does this need to be in production?
  # Example: "MVP in 6 months, full rollout in 12 months"

  budget: ""
  # Any constraints that affect broker selection?
  # Example: "Prefer cloud-managed to minimize ops cost", "Must self-host for compliance"

  team_size: ""
  # How many people will build and operate this?
  # Example: "8 developers, 2 architects, 1 SRE"

  organizational_constraints: ""
  # Approval processes, vendor relationships, procurement timelines?
  # Example: "Vendor approval takes 3 months", "Existing Solace contract"

# ── Preferences ──────────────────────────────────────────────────────────────

preferences:
  execution_mode: auto
  # How should the engagement run after intake?
  # Pick one: auto | interactive
  #   auto        — Skills run back-to-back, pausing only for design decisions (recommended)
  #   interactive — Confirm each skill before it runs

  provision_event_portal: false
  # Provision the designed Event Portal model into your Solace Cloud tenant after design?
  # Pick one: true | false (default: false)
  #   false — Design-only engagement. We do not touch your tenant.
  #   true  — After Event Portal design completes, /solace-ep-provision materializes
  #           the catalog (domains, schemas, events, applications) into Solace Cloud
  #           via the Event Portal Designer MCP.
  # Requires the Solace Event Portal Designer MCP installed in your AI host AND a
  # Solace Cloud API token with Event Portal Designer Read+Write permission. If the
  # MCP is not configured at run time, the step records a BLOCKED status with the
  # exact reason — it never writes silently or skips silently.
YAMLEOF
echo "Generated: intake/solace-intake-template.yaml"
```

**If Markdown (D) or All (E) was selected:**

Generate `intake/solace-intake-template.md`:

**File 2: `intake/solace-intake-template.md`**

```bash
mkdir -p intake
cat > intake/solace-intake-template.md << 'MDEOF'
# Solace Architect — Intake Form

> **Instructions:** Fill in what you know. Leave blank what you don't know — we will follow up during the engagement. When complete, save this file and provide it to your Solace Architect.

---

## 1. Project

**Project Name:**
<!-- Short identifier, e.g., "acme-bank-chat", "global-market-data" -->


**Project Type:** *(pick one)*
- [ ] New build — Greenfield event-driven system on Solace
- [ ] Migration — Moving from an existing messaging platform to Solace
- [ ] Extension — Adding capabilities to an existing Solace deployment
- [ ] SAM integration — Building an AI agent system on Solace Agent Mesh

---

## 2. System Landscape

### Systems
<!-- List every system that needs to communicate. For each, note: name, role (producer/consumer/both), protocol, and owning team. -->

| System | Role | Protocol | Owner |
|--------|------|----------|-------|
|        |      |          |       |
|        |      |          |       |
|        |      |          |       |

### Existing Messaging
<!-- What messaging systems are in place today? (IBM MQ, Kafka, RabbitMQ, TIBCO, none, etc.) -->


### Protocols in Use
<!-- What protocols do these systems currently speak? (REST, MQTT, AMQP, JMS, SMF, WebSocket, gRPC, FIX, etc.) -->


### Events
<!-- What events flow between systems? For each, note: name, approximate rate, delivery mode (direct/guaranteed), payload format, and typical payload size. Size drives broker sizing and protocol decisions. -->

| Event | Rate | Delivery | Payload Format | Payload Size |
|-------|------|----------|----------------|--------------|
|       |      |          |                |              |
|       |      |          |                |              |
|       |      |          |                |              |

### Aggregate Volumes
<!-- Approximate total event rates. Example: "~50K events/sec peak, ~2B events/day" -->


### Schemas
<!-- Are there existing schemas or an AsyncAPI spec? -->


### Industry Vertical
<!-- What industry is this for? (Banking, capital markets, manufacturing, healthcare, retail, telecom, logistics, etc.) -->


---

## 3. Domain-Specific Details
<!-- Fill ONLY the section that matches your industry. Delete or leave the others blank. -->

### Banking / Financial Services

**Regulatory constraints:**
<!-- PCI-DSS? Data residency? Audit trail requirements? Encryption requirements? -->

**Existing messaging infrastructure:**
<!-- IBM MQ, TIBCO, Kafka? This drives migration/integration strategy. -->

**Authorization model:**
<!-- How do permission scopes flow from channel to backends? IAM (OIDC, SAML)? -->

**Data classification:**
<!-- Which data classes need guaranteed delivery for compliance vs. direct for speed? -->

**Internal vs customer-facing:**
<!-- Is this for customers, internal staff, or both? -->

### Capital Markets

**Latency budget:**
<!-- Hot path latency (market data to trader screen)? Audit path? -->

**Global topology:**
<!-- Which trading hubs? Which asset classes at which hubs? -->

**Feed infrastructure:**
<!-- Feed handlers and market data providers? Protocols they publish on? -->

**Existing messaging:**
<!-- Existing middleware? (Kafka, TIBCO, 29West, Solace already?) -->

**Compliance and replay:**
<!-- Which streams need regulatory replay? Retention period? -->

### Manufacturing / IoT

**OT protocol inventory:**
<!-- Machine/sensor protocols? (OPC UA, Modbus, MQTT, DDS, proprietary) -->

**Edge constraints:**
<!-- Plant floor compute? Can Solace Software Event Broker run there? WAN reliability? -->

**Telemetry vs command:**
<!-- One-way telemetry only, or bidirectional with commands? -->

**Existing historians and MES:**
<!-- OSIsoft PI, Siemens MindSphere, Rockwell FactoryTalk, etc.? -->

### Healthcare

**HIPAA / PHI:**
<!-- Which events contain PHI? Encryption, access control, audit requirements? -->

**Interoperability standards:**
<!-- HL7v2, FHIR, or both? What EHR system? -->

**Real-time vs batch:**
<!-- Which clinical events need real-time vs. batch processing? -->

---

## 4. Requirements

**Delivery mode:** *(pick one)*
- [ ] Direct — Fire-and-forget, lowest latency
- [ ] Guaranteed — Persistent, acknowledged delivery
- [ ] Mixed — Some flows direct, some guaranteed

**Ordering:** *(pick one)*
- [ ] None — No ordering guarantees needed
- [ ] Per-key — Ordered within a partition key (per customer, per device)
- [ ] Global — Strict global ordering

**Processing guarantee:** *(pick one)*
- [ ] At-least-once — Messages never lost; consumers must be idempotent
- [ ] At-most-once — Messages may be lost; no redelivery

**Latency tier:** *(pick one)*
- [ ] Sub-millisecond (<1ms)
- [ ] Sub-second (<1s)
- [ ] Seconds (1-10s)
- [ ] Minutes

**Topology:** *(pick one)*
- [ ] Single site — One data center or cloud region
- [ ] Multi-region — Multiple cloud regions or data centers
- [ ] Hybrid cloud — Mix of on-premise and cloud
- [ ] Edge — Edge locations + regional/cloud

**Sites and regions:**
<!-- How many sites/regions/clouds? Name them if known. -->

**IT/OT boundary:**
<!-- Is there an IT/OT boundary? Describe constraints. -->

**Growth expectations:**
<!-- Expected growth over the next 1-3 years? -->

**Data residency:**
<!-- Regulatory constraints on where data can live or move? -->

**Operations team:**
<!-- Who operates the messaging infrastructure? -->

**Solace/EDA experience:**
<!-- Team's experience with event-driven systems and Solace? -->

**Observability:**
<!-- What observability is in place? (Metrics, tracing, logging) -->

**CI/CD:**
<!-- Existing CI/CD pipeline for infrastructure? -->

---

## 5. Goals

**Driver:**
<!-- What triggered this project? What problem is being solved? -->

**Timeline:**
<!-- When does this need to be in production? -->

**Budget:**
<!-- Constraints that affect broker selection? Cloud-managed vs self-hosted? -->

**Team size:**
<!-- How many people will build and operate this? -->

**Organizational constraints:**
<!-- Approval processes, vendor relationships, procurement timelines? -->

---

## 6. Preferences

**Execution mode:** *(pick one)*
- [x] Auto — Skills run back-to-back, pausing only for design decisions *(recommended)*
- [ ] Interactive — Confirm each skill before it runs
MDEOF
echo "Generated: intake/solace-intake-template.md"
```

### Step T3: Confirm and present

After generating files, tell the user which formats were produced:

> **Intake template files generated in `intake/`:**
>
> | File | Format | Use for |
> |------|--------|---------|
> | `intake/solace-intake-template.docx` | Word | Professional layout with dropdowns — best for stakeholder sharing |
> | `intake/solace-intake-template.html` | HTML | Interactive single-file form — autocomplete from the Integration Hub catalog, live engagement preview, downloads YAML on submit |
> | `intake/solace-intake-template.yaml` | YAML | Machine-readable — feed directly back into `/solace-intake` |
> | `intake/solace-intake-template.md` | Markdown | Human-friendly — share via email, Confluence, Google Docs |
>
> Only list the files that were actually generated.
>
> **How to use:**
> 1. Share the Word document, HTML form, or Markdown with your customer or stakeholder
> 2. Have them fill in what they know — blanks are fine, we follow up
>    - For the HTML form: open in any browser, fill it in, click *Download YAML*
> 3. Place the completed file (or downloaded YAML) in the `intake/` folder
> 4. Run: `/solace-intake intake/filled-intake.docx` (or `.yaml` / `.md`)
>
> All formats above are accepted for import. The HTML form emits the same YAML
> schema the DOCX parser produces, so the import flow is shared.

Stop here. Do not proceed to import or export mode.

---

## Export Mode

Export a filled intake file from the active project's discovery data. This is useful
for sharing project context with other teams, archiving a project's inputs, or
bootstrapping a similar project.

### Step E1: Choose format

Use AskUserQuestion:

```
Which format should the exported intake use?

A) Word document (recommended) — professional DOCX with filled dropdowns and structured fields, best for stakeholder sharing
B) YAML — machine-readable, can be imported directly into another project
C) Markdown — human-readable, easy to share or archive
D) All formats — generate Word, YAML, and Markdown
```

### Step E2: Read project data

```bash
ACTIVE=$(cat projects/.active)
echo "=== CONTEXT ==="
cat "projects/$ACTIVE/context.yaml" 2>/dev/null
echo ""
echo "=== DECISIONS ==="
cat "projects/$ACTIVE/decisions.yaml" 2>/dev/null
echo ""
echo "=== DISCOVERY BRIEF ==="
cat "projects/$ACTIVE/artifacts/01-discovery/discovery-brief.md" 2>/dev/null
```

Parse the discovery brief and decisions to extract:
- Project name and type
- Systems list with roles and protocols
- Existing messaging and protocols in play
- Event types with rates and delivery modes
- Requirements (delivery mode, ordering, latency, topology, etc.)
- Goals (driver, timeline, budget, team, constraints)
- Domain-specific details if present

### Step E3: Generate the export data YAML

Before generating any output files, first synthesize a `intake/solace-intake-export.yaml`
from the extracted project data. This YAML uses the same structure the parser produces
and serves as the data source for the DOCX builder.

Map discovery brief and decisions data to the intake YAML schema:
- `project.name` from context.yaml `name`
- `project.type` from decisions (or infer from discovery brief)
- `landscape.*` from the system landscape section of the brief
- `landscape.systems` as an array with keys: `System Name`, `Role`, `Protocol`, `Owner`
- `landscape.events` as an array with keys: `Event Name`, `Rate`, `Delivery`, `Payload Format`, `Payload Size`
- `domain.*` from domain-specific sections
- `requirements.*` from requirements section
- `goals.*` from goals section
- `preferences.execution_mode` from decisions.yaml
- `preferences.provision_event_portal` from decisions.yaml (defaults to `false` if absent)

```bash
ACTIVE=$(cat projects/.active)
mkdir -p intake
cat > "intake/solace-intake-export.yaml" << 'YAMLEOF'
<paste the filled YAML intake with all known values populated>
YAMLEOF
echo "Generated: intake/solace-intake-export.yaml"
```

### Step E4: Generate output files

**If Word (A) or All (D) was selected:**

Use the builder script with the export data:

```bash
for BUILDER in \
  "scripts/build-intake-docx.py" \
  "$HOME/.claude/skills/solace-architect/scripts/build-intake-docx.py" \
  "~/.claude/skills/solace-architect/bin/../scripts/build-intake-docx.py"; do
  [ -f "$BUILDER" ] && break
done
python3 "$BUILDER" --output intake/solace-intake-export.docx --data intake/solace-intake-export.yaml
```

If `python-docx` is not installed, tell the user:

> Word export requires `python-docx`. Install with:
> ```
> pip install python-docx
> ```
> Then re-run the export.

**If Markdown (C) or All (D) was selected:**

Generate a filled `intake/solace-intake-export.md` using the same structure as the
Markdown template but with all known values filled in. Use the same section
headings and field labels as the blank Markdown template.

```bash
mkdir -p intake
cat > "intake/solace-intake-export.md" << 'MDEOF'
<paste the filled Markdown intake with all known values populated>
MDEOF
echo "Exported: intake/solace-intake-export.md"
```

Present a summary:

> **Intake export complete.**
>
> | Metric | Value |
> |--------|-------|
> | Source project | <project name> |
> | Fields populated | N |
> | Fields left blank | N |
>
> Files saved in `intake/` — list the files that were generated.
>
> **How to use:**
> - Share with another team to bootstrap a similar engagement
> - Import into a new project: `/solace-intake intake/solace-intake-export.yaml` (or `.docx` / `.md`)
> - Archive as a record of the project's input assumptions

Stop here. Do not proceed to import mode.

---

## Import Mode

### Step I1: Read and parse the intake file

Determine the file format by extension:

**If `.docx` → Word document (use the DOCX parser):**

Locate the parser and run it:

```bash
for PARSER in \
  "scripts/parse-intake-docx.py" \
  "~/.claude/skills/solace-architect/solace-grounding/../scripts/parse-intake-docx.py" \
  "$HOME/.claude/skills/solace-architect/scripts/parse-intake-docx.py"; do
  [ -f "$PARSER" ] && break
done
echo "PARSER: $PARSER"
mkdir -p intake
python3 "$PARSER" "<file-path>" intake/intake-parsed.yaml
```

If `python-docx` is not installed, tell the user:

> The Word document parser requires `python-docx`. Install it with:
> ```
> pip install python-docx
> ```
> Then re-run `/solace-intake <file-path>`.

If the parser succeeds, read the generated YAML and proceed as if the user
provided a YAML file:

```bash
cat intake/intake-parsed.yaml
```

The parser output includes a `_meta` section with completeness information.
Use `_meta.missing_required` and `_meta.missing_important` to skip Step I2
field counting (the parser already did it). Proceed directly to Step I3
if `_meta.ready` is true, or ask for missing required fields if not.

**If `.yaml` or `.yml` → parse as YAML:**

```bash
cat "<file-path>"
```

**If `.md` → parse as Markdown:**

```bash
cat "<file-path>"
```

Extract values from the structured sections.

---

For all formats, extract all fields into a structured understanding. Track which fields are:
- **Populated** — has a meaningful value
- **Empty** — blank, empty string, or placeholder
- **Invalid** — value doesn't match expected options (e.g., `delivery_mode: "fast"`)

### Step I2: Validate completeness

Classify fields into three tiers:

**Required** (cannot proceed without):
- `project.name`
- `project.type`
- At least 1 system in `landscape.systems`
- `landscape.vertical`

**Important** (should have, will ask if missing):
- `requirements.delivery_mode`
- `requirements.topology`
- `requirements.latency_tier`
- `goals.driver`
- `goals.timeline`

**Optional** (nice to have, won't block):
- Everything else

Present a completeness report:

> **Intake Validation Report**
>
> | Category | Populated | Empty | Invalid |
> |----------|-----------|-------|---------|
> | Project | N/M | N/M | N/M |
> | Landscape | N/M | N/M | N/M |
> | Domain | N/M | N/M | N/M |
> | Requirements | N/M | N/M | N/M |
> | Goals | N/M | N/M | N/M |
>
> **Status:** ✅ Ready to proceed / ⚠ Missing required fields / ❌ Cannot proceed

If there are invalid values, list them and ask the user to correct.

If required fields are missing, ask the user to provide them before proceeding.
Use AskUserQuestion for multiple-choice fields, free-text prompt format for open fields.
Batch the missing fields into as few prompts as possible.

### Step I3: Create the project

Once validation passes, create the project using the same structure as the root skill:

```bash
PROJECT_SLUG="<slugified project.name>"
DISPLAY_NAME="<project.name>"
mkdir -p "projects/$PROJECT_SLUG/artifacts/"{01-discovery,02-topic-design,03-broker-select,04-sam-design,05-protocol-select,06-mesh-design,07-ha-dr,08-integration,09-migration,10-reviews,11-validation,12-blueprint,13-event-portal,14-executive}
cat > "projects/$PROJECT_SLUG/context.yaml" << CTXEOF
name: $PROJECT_SLUG
display_name: "$DISPLAY_NAME"
created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
status: active
source: intake
CTXEOF
cat > "projects/$PROJECT_SLUG/decisions.yaml" << DECEOF
execution_mode: <auto or interactive from preferences.execution_mode, default auto>
provision_event_portal: <true or false from preferences.provision_event_portal, default false>
# When provision_event_portal is true, /solace-plan includes /solace-ep-provision
# after /solace-event-portal in the design phase. At run time, the skill verifies
# the EP Designer MCP is available; if not, it records a BLOCKED status with the
# reason. It does not silently skip.
decisions: []
DECEOF
cat > "projects/$PROJECT_SLUG/progress.yaml" << PROGEOF
progress: []
PROGEOF
cat > "projects/$PROJECT_SLUG/feedback.yaml" << FBEOF
feedback: []
FBEOF
echo "$PROJECT_SLUG" > projects/.active
```

### Step I4: Domain-specific follow-up questions

Based on the `landscape.vertical` field, check whether the domain-specific section
was filled in the intake. If domain fields are mostly empty, ask the domain-specific
questions interactively using the **free-text prompt format**.

**Banking / Financial Services** (if `vertical` is `banking`):

Check if `domain.banking.*` fields are populated. For each empty field, include it
in a consolidated follow-up prompt:

> A few banking-specific questions that weren't covered in the intake form.
> Answer in your own words — these are open questions, not options to pick from:
>
> • **<field label>:** <question text>
> • ...
>
> Type your answers below — as much or as little as you have.

Apply the same pattern for **Capital Markets**, **Manufacturing / IoT**, and **Healthcare**.

If domain fields are already populated from the intake, skip this step entirely.

### Step I5: Resolve ambiguities and contradictions

Review the complete intake data for:

1. **Contradictions** — e.g., `topology: single_site` but `sites_and_regions` lists
   3 regions. Ask the user to clarify.

2. **Ambiguous "mixed" selections** — if `delivery_mode: mixed`, check whether the
   events list specifies which events are direct vs guaranteed. If not, ask:

   > You selected "mixed" delivery mode. Looking at your events, which flows
   > need guaranteed delivery and which can use direct?
   >
   > | Event | Suggested delivery | Reason |
   > |-------|-------------------|--------|
   > | <event> | <direct/guaranteed> | <why> |
   >
   > Does this look right, or would you change any?

3. **Missing event details** — if events are listed but rates or delivery modes
   are blank, suggest reasonable defaults based on the vertical and ask for confirmation.

### Step I6: Synthesize the discovery brief

Using all collected data (intake + follow-ups), produce the discovery brief in the
same format as `/solace-discovery` Step 4:

```markdown
# Discovery Brief: <Project Name>

## System landscape
- Systems: <list with roles (producer/consumer/both)>
- Existing messaging: <current systems, if any>
- Protocols in play: <list>
- Event types: <list with approximate rates>
- Matched reference architecture: <Pattern N: name, or "None — custom architecture">
- Micro-Integration availability: <for each backend, check ~/.claude/skills/solace-architect/solace-grounding/integration-hub-catalog.md for both direct and indirect paths. See the "Common indirect paths" section of the catalog. If no direct Source MI exists for a backend, check whether that system can natively send events to another system that DOES have a Source MI. Document both cataloged and indirect paths. Only classify as "custom needed" after confirming no cataloged path — direct or indirect — exists.>

## Requirements
- Delivery guarantee: <Direct / Guaranteed / Mixed>
- Ordering: <none / partition / global>
- Latency target: <value>
- Scale: <sites, regions, growth trajectory>
- Topology: <single-site / multi-region / hybrid / edge>

## Goals
- Project type: <new build / migration / extension / SAM>
- Driver: <what triggered this>
- Timeline: <when>
- Constraints: <budget, team, regulatory>

## Open questions
- **[Blocking]** <question> — Affects: <which skills depend on answer>
- **[Advisory]** <question> — Default assumption: <what will be assumed>

## Recommended next steps
- <skills to run next>
```

Before generating the brief, read the reference architectures and integration hub catalog
to match patterns and check Micro-Integration availability:

```bash
cat ~/.claude/skills/solace-architect/solace-grounding/solace-reference-architectures.md
```

```bash
cat ~/.claude/skills/solace-architect/solace-grounding/integration-hub-catalog.md
```

Save the brief:

```bash
ACTIVE=$(cat projects/.active)
cat > "projects/$ACTIVE/artifacts/01-discovery/discovery-brief.md" << 'BRIEFEOF'
<paste the full discovery brief content here>
BRIEFEOF
```

**Persist the canonical structured intake.** In addition to the human-readable brief,
write `projects/$ACTIVE/intake.yaml` — the machine-readable single source of truth that
`/solace-plan`, the review skills, and `/solace-validate` key off. This is a **verbatim
canonical mirror** of all collected data (the imported intake plus any follow-up answers
from Steps I4–I5), using the exact field paths and value vocabulary below. Do not
paraphrase into prose here — downstream skills evaluate these fields directly, so the keys
and values must match the schema exactly (`skill-routing.yaml` is the routing contract that
reads them).

```bash
ACTIVE=$(cat projects/.active)
cat > "projects/$ACTIVE/intake.yaml" << 'INTAKEEOF'
# Canonical structured intake — single source of truth for routing, reviews, validation.
# Field paths/values must match scripts/skill-routing.yaml and the intake HTML form data-paths.
source: intake
project:
  name: <project.name>
  type: <new_build|migration|extension|sam>
landscape:
  vertical: <banking|capital_markets|manufacturing|healthcare|other>
  existing_messaging: "<free text, verbatim>"
  volumes: "<free text, verbatim>"
  schemas: "<free text, verbatim>"
  protocols_in_use: [<list>]
  systems:
    - name: <system name>
      role: <producer|consumer|producer_consumer>
      protocol: "<protocol(s)>"
      owner: <owner>
  events:
    - name: <event name>
      rate: "<rate>"
      delivery: <guaranteed|direct>
      payload: <format>
      payload_size: "<size>"
requirements:
  delivery_mode: <guaranteed|direct|mixed>
  ordering: <value>
  processing_guarantee: <at_least_once|exactly_once|best_effort>
  latency_tier: <value>
  topology: <single_site|multi_region|hybrid_cloud|edge>
  sites_and_regions: "<free text, verbatim>"
  it_ot_boundary: "<free text, verbatim>"
  growth_expectations: "<free text, verbatim>"
  data_residency: "<free text, verbatim — empty string if none>"
  operations_team: "<free text, verbatim>"
  solace_experience: "<free text, verbatim>"
  observability: "<free text, verbatim>"
  cicd: "<free text, verbatim>"
# domain.<vertical>.* — include only the block matching landscape.vertical, verbatim
domain: {}
goals:
  driver: "<free text, verbatim>"
  timeline: "<free text, verbatim>"
  budget: "<free text, verbatim>"
  team_size: "<free text, verbatim>"
  organizational_constraints: "<free text, verbatim>"
preferences:
  execution_mode: <auto|interactive>
  provision_event_portal: <true|false>
INTAKEEOF
```

Omit only keys you genuinely have no value for; never invent values. For list fields with
no entries, use `[]`. Quote any value containing `*` or `>` so the YAML parses.

Record decisions from the intake in `decisions.yaml`. Map each selection to a decision
entry with the format:

```
- id: D<N>
  skill: solace-intake
  question: "<field label>"
  choice: "<selected value>"
  reason: "Provided via intake template"
```

Update progress:

```bash
ACTIVE=$(cat projects/.active)
python3 -c "
import yaml, datetime
data = {'progress': [{
    'skill': 'solace-intake',
    'status': 'complete',
    'started': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'completed': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'summary': '<one-line summary>',
    'step_reached': 'intake complete',
    'artifacts': [{'path': 'artifacts/01-discovery/discovery-brief.md', 'type': 'document', 'description': 'Discovery brief (from intake)'}]
}, {
    'skill': 'solace-discovery',
    'status': 'complete',
    'started': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'completed': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'summary': 'Bootstrapped from intake template',
    'step_reached': '5/5 — synthesis complete',
    'artifacts': [{'path': 'artifacts/01-discovery/discovery-brief.md', 'type': 'document', 'description': 'Discovery brief'}]
}]}
with open('projects/$ACTIVE/progress.yaml', 'w') as f:
    yaml.dump(data, f, default_flow_style=False)
" 2>/dev/null || echo "Progress update requires PyYAML — update manually if needed"
```

If the python/yaml approach fails, use the Edit tool to write progress.yaml directly.

### Step I7: Present brief and hand off to /solace-plan

Present the discovery brief to the user. Summarize:

> **Intake import complete.**
>
> | Metric | Value |
> |--------|-------|
> | Fields populated from template | N |
> | Follow-up questions asked | N |
> | Open questions remaining | N (M blocking, K advisory) |
> | Execution mode | auto / interactive |
>
> Discovery brief saved. The engagement is ready to run.

Then immediately invoke `/solace-plan` to start the full engagement.
Do not wait for user confirmation — the intake was the confirmation.
The plan skill will pick up the discovery brief and orchestrate all remaining skills.

**Next step routing:** present using the Next Step Chaining protocol.
- Primary: Read the `/solace-plan` skill file at `~/.claude/skills/solace-architect/solace-plan/SKILL.md` using the Read tool.

**If unreadable:** Skip with "Could not load /solace-plan — skipping." and continue.

Follow its instructions from top to bottom, **skipping these sections** (already handled by the parent skill):
- Preamble (run first)
- Grounding Discipline
- Naming Conventions
- Grounding Document Loading
- Artifact Validation
- Cross-Skill Dependencies
- Project Management
- AskUserQuestion Format
- Completeness Principle — Boil the Lake
- Search Before Building
- Completion Status Protocol
- Step 0: Detect platform and base branch

Execute every other section at full depth. When the loaded skill's instructions are complete, continue with the next step below. — Run the full engagement based on the intake
- Alternate: Read the `/solace-discovery` skill file at `~/.claude/skills/solace-architect/solace-discovery/SKILL.md` using the Read tool.

**If unreadable:** Skip with "Could not load /solace-discovery — skipping." and continue.

Follow its instructions from top to bottom, **skipping these sections** (already handled by the parent skill):
- Preamble (run first)
- Grounding Discipline
- Naming Conventions
- Grounding Document Loading
- Artifact Validation
- Cross-Skill Dependencies
- Project Management
- AskUserQuestion Format
- Completeness Principle — Boil the Lake
- Search Before Building
- Completion Status Protocol
- Step 0: Detect platform and base branch

Execute every other section at full depth. When the loaded skill's instructions are complete, continue with the next step below. — Run full interactive discovery instead (if intake was too sparse)
