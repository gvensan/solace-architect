# `/solace-change` — Requirements Specification

**Repo:** `gvensan/solace-architect`
**Target version:** next minor (bump `VERSION`)
**Status:** specification for implementation
**Audience:** Claude Code working inside the repo

---

## 0. Prerequisites — read before writing anything

Do not assume schemas from this document. Read the actual files first and conform to what exists. This spec states *what must be true*, not the exact field names already in use.

Read, in order:

1. `CLAUDE.md` — build commands, template pipeline, routing table, naming conventions.
2. `SKILL.md.tmpl` and one representative skill template with interactive decisions — `solace-topic-design/SKILL.md.tmpl`.
3. `solace-plan/SKILL.md.tmpl` — how one skill invokes another (`{{INVOKE_SKILL}}` resolver) and how it decides which skills apply.
4. `solace-validate/SKILL.md.tmpl` and `solace-blueprint/SKILL.md.tmpl` — what they read and how they detect completeness today.
5. `scripts/resolvers/preamble/*` — preamble tier generators; identify which generator emits into T2+.
6. `scripts/skill-routing.yaml` — existing routing source of truth.
7. `scripts/dashboard.ts` — sidebar view registration, how Open Items and Decisions are rendered.
8. A real project under `projects/<slug>/` if one exists — the live shape of `context.yaml`, `intake.yaml`, `decisions.yaml`, `open-items.yaml`, `progress.yaml`. **These are the binding schemas.** All additions below are additive fields; do not rename or restructure existing keys.
9. `test/skill-token-budget.test.ts` — current total ceiling and headroom.

If a project folder does not exist locally, generate one via a short `/solace-discovery` run against the retail-banking fixture in `test/fixtures/` before designing schema changes, so the additions are validated against real output.

---

## 1. Problem

Two independent failures exist today:

**F1 — Interception.** During a sequential engagement, an operator states a change in plain prose mid-skill ("the schema needs a tenant field", "we should version the topic"). The active skill body dominates the instruction stream. The remark is absorbed conversationally, possibly reflected in the artifact being written at that moment, and never routed, never recorded in `decisions.yaml`. The artifact on disk silently diverges from what the operator believes was agreed.

**F2 — Propagation.** Even when the right skill is re-run explicitly, nothing marks downstream artifacts stale. `05-protocol-select`, `10-reviews`, `12-blueprint` continue to reflect superseded upstream decisions. Today the README assigns this sequencing to the human. It is not enforced, not detected, and not visible.

## 2. Goals

| ID | Goal |
|----|------|
| G1 | No stated change is ever lost — every one is captured to disk at the moment it is uttered |
| G2 | No change is silently applied — capture is not application; application is explicit and confirmed |
| G3 | Change → owning skill routing is deterministic and inspectable, not vibes |
| G4 | Downstream impact is computed from a declared dependency graph, not hardcoded lists |
| G5 | Stale artifacts are visible in `progress.yaml`, the dashboard, and any report generated while stale |
| G6 | Live-tenant (Event Portal) collisions are treated as breaking changes, never silent edits |
| G7 | Accepted and rejected changes both leave an audit trail with rationale |

## 3. Non-goals

- No automatic execution of changes without operator confirmation (violates User Sovereignty).
- No natural-language diffing of artifact prose. Impact is computed at artifact granularity, not line granularity.
- No rollback / undo of a previously applied change in this phase (see §13).
- `/solace-change` **never writes design artifacts directly.** Regeneration always routes through the owning skill so there remains exactly one code path per output file.

---

## 4. Deliverables — file manifest

| Path | Action | Purpose |
|------|--------|---------|
| `solace-change/SKILL.md.tmpl` | new | The change-request compiler skill (T3 tier) |
| `solace-change/SKILL.md` | generated | Do not hand-edit |
| `scripts/skill-dependencies.yaml` | new | Declared `produces` / `consumes` graph |
| `scripts/change-impact.ts` | new | Deterministic impact resolver + CLI |
| `scripts/resolvers/preamble/generate-change-capture.ts` | new | T2+ capture rule (F1 fix) |
| `scripts/dashboard.ts` | edit | Change Requests view + stale badges |
| `scripts/report-packs.yaml` | edit | Stale-input banner in generated reports |
| `solace-validate/SKILL.md.tmpl` | edit | Stale-input detection |
| `solace-blueprint/SKILL.md.tmpl` | edit | Stale-input gate |
| `solace-plan/SKILL.md.tmpl` | edit | Drain pending change requests before final assembly |
| `solace-help/SKILL.md.tmpl` | edit | List the new command |
| All `*/SKILL.md.tmpl` | edit | Add `produces:` / `consumes:` frontmatter |
| `CLAUDE.md` | edit | Routing entry + skill table row + project-structure entry |
| `README.md` | edit | Skill reference row + iteration-cycle section rewrite |
| `docs/slash-commands.md` | edit | Full command reference entry |
| `test/skill-dependencies.test.ts` | new | Graph validation |
| `test/change-impact.test.ts` | new | Impact resolver unit tests |
| `test/skill-token-budget.test.ts` | edit | Ceiling adjustment with justification |
| `VERSION` | edit | Minor bump |

---

## 5. Data model

All additions are **additive**. Existing readers must not break.

### 5.1 `scripts/skill-dependencies.yaml` (new — single source of truth for the graph)

```yaml
version: 1
artifacts:
  discovery-brief:      { dir: 01-discovery,        file: discovery-brief.md }
  topic-taxonomy:       { dir: 02-topic-design,     file: topic-taxonomy.md }
  broker-recommendation:{ dir: 03-broker-select,    file: broker-recommendation.md }
  sam-design:           { dir: 04-sam-design,       file: "*" }
  protocol-map:         { dir: 05-protocol-select,  file: protocol-map.md }
  dmr-topology:         { dir: 06-mesh-design,      file: dmr-topology.md }
  ha-dr-topology:       { dir: 07-ha-dr,            file: ha-dr-topology.md }
  micro-integration-map:{ dir: 08-integration,      file: micro-integration-map.md }
  migration-plan:       { dir: 09-migration,        file: migration-plan.md }
  review-architect:     { dir: 10-reviews,          file: architect-review.md }
  review-ops:           { dir: 10-reviews,          file: ops-review.md }
  review-security:      { dir: 10-reviews,          file: security-review.md }
  review-dev:           { dir: 10-reviews,          file: dev-review.md }
  validation-report:    { dir: 11-validation,       file: validation-report.md }
  blueprint:            { dir: 12-blueprint,        file: architecture.md }
  diagrams:             { dir: 12-blueprint/diagrams, file: "*" }
  ep-design:            { dir: 13-event-portal,     file: event-portal-design.md }
  ep-provisioned:       { dir: 13-event-portal,     file: provisioned.yaml, live: true }
  executive:            { dir: 14-executive,        file: executive-summary.md }
  arch-blueprint:       { dir: 15-arch-blueprint,   file: "*" }

skills:
  solace-topic-design:
    kind: design            # design -> re_decide | review -> re_review | assemble -> regenerate
    consumes: [discovery-brief]
    produces: [topic-taxonomy]
  solace-protocol-select:
    kind: design
    consumes: [discovery-brief, topic-taxonomy]   # topic-taxonomy via decisions.yaml (delivery modes)
    produces: [protocol-map]
  # ... one entry per skill
```

Reviews are four separate artifacts (each review skill writes its own file in
`10-reviews/`), so review impact is computed per review skill instead of one
undifferentiated `reviews` blob. The `kind` field drives the §8.3 buckets
deterministically.

Rules:
- Every skill that writes to `artifacts/` must appear.
- `produces` and `consumes` must be **mirrored into each skill's `.tmpl` frontmatter**; a test asserts the two agree. The YAML is what tooling reads; the frontmatter is what a human editing a skill sees.
- The graph must be acyclic. Reviews consume design artifacts; design artifacts never consume reviews. Review *findings* re-enter through `decisions.yaml`, not through the artifact graph.
- `live: true` marks artifacts backed by external state (Solace Cloud tenant). These get the §8.4 treatment.

Derive the initial edge set from `scripts/skill-routing.yaml` plus the artifact numbering, then verify each edge by reading the corresponding skill template's inputs section. Do not guess edges.

**Legacy project layouts.** Projects created before the current artifact numbering exist (e.g. `payment-solutions-v1` has `13-executive` where the graph expects `14-executive`, and no `13-event-portal` or `15-arch-blueprint`). The `dir` values above describe the current layout only. `change-impact.ts` must resolve an artifact's actual location from the artifact paths recorded in that project's `progress.yaml`, falling back to the declared `dir` when no recorded path exists. An artifact is `absent` only when neither source locates it. Never let a numbering mismatch silently reclassify an existing artifact as absent.

### 5.2 `open-items.yaml` — change-request entries

The capture rule (§7) appends entries of this shape:

```yaml
- id: CR-001
  type: change-request
  status: pending          # pending | applied | deferred | rejected
  raised_during: solace-topic-design      # skill active when captured
  raised_at: 2026-08-09T14:22:10Z
  verbatim: "actually the schema should carry a tenant id"
  restated: "Add tenantId to the payment event payload schema"
  suspected_owner: solace-event-portal    # best guess, not binding
```

`verbatim` is mandatory and must be the operator's words unedited. `restated` is the skill's paraphrase, clearly separate. Never merge the two.

**Backward compatibility.** Existing projects carry `OI-NNN` entries with no `type:` field. Every reader must treat an entry without `type: change-request` as an ordinary open item, never as a change request. `/solace-change` ignores untyped entries entirely.

### 5.3 `decisions.yaml` — supersession

Applied and rejected change requests both produce an entry conforming to the existing decision schema, plus:

```yaml
  source: change-request
  change_ref: CR-001
  supersedes: topic-taxonomy   # the superseded entry's `decision:` key; omit if the change adds rather than replaces
  disposition: applied         # applied | rejected
  rationale: "..."             # required for rejected
```

Note: the existing decision schema keys entries by a `decision:` slug
(e.g. `decision: topic-taxonomy`), not by D-numbers - `supersedes` and
`superseded_by` carry those slugs. The superseded decision is **not
deleted**. Add `superseded_by: <new decision key>` to it. Decision history
is append-only.

### 5.4 `progress.yaml` — freshness

Per-artifact freshness alongside existing per-skill status:

```yaml
artifacts:
  topic-taxonomy:   { state: current, last_run: ..., change_ref: CR-001 }
  protocol-map:     { state: stale, stale_since: ..., change_ref: CR-001, stale_reason: "CR-001 changed topic-taxonomy" }
  review-security:  { state: stale, change_ref: CR-001, stale_reason: "..." }
  ep-provisioned:   { state: divergent, change_ref: CR-001, stale_reason: "live tenant differs from design" }
```

`change_ref` is structured on stale/divergent entries (not only inside the
`stale_reason` text): validate, the blueprint gate, and the dashboard read it.
While a change is recorded but not yet regenerated, the changed artifact
itself is also marked `stale`, so a crash mid-application leaves truthful state.

States: `current` | `stale` | `divergent` | `absent`. `divergent` applies only to `live: true` artifacts.

**Backward compatibility - the default is healthy.** No existing project has an `artifacts:` freshness section. Absent freshness data (missing section, or an artifact with no entry) means `current`-equivalent, silently: validate raises no finding, blueprint does not refuse, reports carry no banner. Freshness tracking activates for a project only when the first change request touches it. This default is what keeps the feature shippable without migrating ten existing projects.

### 5.5 Change log artifact

`artifacts/16-changes/change-log.md` — append-only, human-readable. One section per change request: ID, date, verbatim text, restated delta, classification, decision reference, artifacts regenerated, artifacts still stale, disposition. This is the narrative counterpart to `decisions.yaml` and gets included in the Comprehensive report pack.

---

## 6. Classification taxonomy

Encode as a table inside `solace-change/SKILL.md.tmpl`. Classification is the skill's judgment call; the table constrains it.

| Change signal | Owning skill | Notes |
|---|---|---|
| Topic level, hierarchy, wildcard subscription, delivery mode (Direct / Guaranteed) | `/solace-topic-design` | |
| Payload schema, field addition/removal, event version | `/solace-event-portal` | If the topic address also moves, this is a **compound change** — see §8.5 |
| Messaging protocol per integration point, client SDK | `/solace-protocol-select` | |
| Broker deployment model, sizing, region, tier | `/solace-broker-select` | Often cascades to mesh + HA/DR |
| DMR topology, multi-site, multi-cloud placement | `/solace-mesh-design` | |
| RPO/RTO, replication, failover posture | `/solace-ha-dr` | |
| Micro-Integration choice, Integration Hub vs custom, Kafka bridge | `/solace-integration` | |
| Agents, Gateways, OrchestratorAgent, A2A topics, authorization model | `/solace-sam-design` | |
| Migration source system, phasing, cutover strategy | `/solace-migration` | |
| ACL model, TLS, auth propagation, PII handling | `/solace-security-review` | Review-owned; may force a topic-design change if ACL patterns depend on taxonomy |
| Monitoring, capacity, runbook gaps | `/solace-ops-review` | |
| Non-functional requirement: volume, latency, retention, throughput | **`intake.yaml` amendment** | Amend intake, then fan out to every skill consuming the changed field |
| Business scope, cost basis, ROI assumption | `/solace-executive` | |
| Nothing matches | **stop** | Record as `deferred` with reason `unclassified`; ask the operator |

Never guess when two entries plausibly apply. Use the AskUserQuestion format from the T2+ preamble and present the candidate owners with what each would re-run.

---

## 7. Component A — capture rule (fixes F1)

New preamble generator emitted into **T2 and above only** (T1 skills are non-interactive and never hold a conversation).

Behavioral requirement, in the skill's own words when rendered:

> If the operator states a requirement, constraint, or design change that falls outside the scope of the step you are currently executing, do not act on it and do not silently fold it into the artifact you are writing. Append it to `open-items.yaml` as `type: change-request` with the operator's exact words, your restatement, and the skill you believe owns it. Continue the current step. Surface all change requests captured during this run in your closing summary, with the exact command to process them: `/solace-change`.

Constraints:
- Rendered size **≤ 60 tokens**. It multiplies across ~25 skills.
- Must not fire for in-scope refinements. If the operator changes a topic level while `/solace-topic-design` is running, that is the current skill's business — handle it normally as a `D<N>` decision. The rule is for *out-of-scope* statements only.
- Must not fire on questions ("should we version this?") — only on statements of intent. When ambiguous, ask one clarifying question rather than capturing noise.

Register the generator in the preamble tier system alongside the existing ones, following the pattern of `generate-grounding-rules.ts`.

---

## 8. Component B — the `/solace-change` skill

Tier: **T3** (modifies files, invokes other skills). Keep `SKILL.md.tmpl` body under 500 lines; move the taxonomy table and worked examples to `solace-change/references/` if it grows past that.

### 8.1 Frontmatter description

Triggering matters more than prose quality here. Write the `description` to be explicit and slightly pushy, covering: processing pending change requests, applying a mid-engagement change, "we need to change X", requirement changed after design, impact analysis of a design change, what breaks if we change Y. Under-triggering is the expected failure mode.

### 8.2 Invocation modes

| Invocation | Behavior |
|---|---|
| `/solace-change` | Drain queue: list all `pending` change requests, process interactively one at a time |
| `/solace-change list` | Show the queue with classification and blast radius. **Read-only. No writes, no skill invocation.** |
| `/solace-change "<text>"` | Classify and process this change immediately; still creates a `CR-NNN` entry first |
| `/solace-change CR-003` | Process one specific pending request |
| `/solace-change --dry-run` | Classification + impact + live-tenant check (workflow steps 2-4), stop before the Step 5 confirm; write nothing |
| `/solace-change reject CR-003 "<reason>"` | Record rejection with rationale; no regeneration |
| `/solace-change defer CR-003` | Leave pending, mark reviewed so it stops surfacing every run |

### 8.3 Workflow

**Step 1 — Collect.** Load the active project from `context.yaml`. Gather pending change requests from `open-items.yaml`, plus any inline argument. If the queue is empty and no argument was given, report that and exit — do not invent work.

**Step 2 — Classify.** For each request, produce an explicit delta:

```
FROM: <current state, quoted from the artifact with file path and line context>
TO:   <proposed state>
CONTRADICTS: D07 ("Topic version omitted from taxonomy")
OWNER: /solace-topic-design
CLASS: structural
```

The `FROM` side must be read out of the actual artifact, not recalled from conversation. If the current state cannot be located in any artifact, say so and treat the change as an addition rather than a replacement.

Change classes: `cosmetic` (wording, naming, no downstream effect) · `local` (owning artifact only) · `structural` (crosses artifact boundaries) · `breaking-live` (conflicts with provisioned Event Portal state).

**Step 3 — Compute impact.** Call `scripts/change-impact.ts` (§9) with the owning skill. Present three buckets:

- **Regenerate** — deterministic derivatives: diagrams, blueprint, arch-blueprint, AsyncAPI exports.
- **Re-review** — review skills whose scope intersects the changed artifacts. A topic taxonomy change invalidates the security review's ACL analysis and the developer review's usability findings; it does not invalidate the ops review's capacity math.
- **Re-decide** — design skills holding decisions keyed to a changed artifact. These need a *targeted* re-run (§8.6), not a full re-interview.

State the cost plainly: number of skills, whether any will ask questions, rough wait.

**Step 4 — Live-tenant check.** If `13-event-portal/provisioned.yaml` exists and the change touches a provisioned topic address, schema, or application produce/consume graph: classify as `breaking-live`. Do **not** propose an in-place edit. Present the versioning path instead — new event version, new schema version, coexistence window, deprecation of the old — and require explicit confirmation before anything reaches `/solace-ep-provision`. Mark `ep-provisioned` as `divergent` until reconciled. Honor the Early Access constraint: never mass-mutate a live tenant from this skill.

**Step 5 — Confirm.** Present delta + blast radius + cost. Options: apply now / defer / reject with reason / modify the restatement. Under `execution_mode: auto`, `cosmetic` and `local` changes may auto-apply with full rationale logged; `structural` and `breaking-live` **always** pause regardless of execution mode.

**Step 6 — Record before executing.** Write the `decisions.yaml` entry, set `superseded_by` on the superseded decision, update the `open-items.yaml` status, and mark downstream artifacts `stale` in `progress.yaml`. Do this *before* invoking any skill, so a crash mid-run leaves a truthful, resumable state rather than a silent partial application.

**Step 7 — Execute.** Invoke via `{{INVOKE_SKILL}}`, in dependency order:
1. Owning skill in targeted mode
2. Re-decide skills, in graph order
3. Re-review skills
4. `/solace-validate`
5. `/solace-blueprint` (then `/solace-architecture-blueprint` if `15-arch-blueprint/` exists)
6. `/solace-diagrams` if not already covered by blueprint
7. `/solace-executive` **only if** the change altered cost, risk, scope, or timeline — state the test explicitly, do not run it reflexively

After each skill returns, flip that artifact's `progress.yaml` state to `current`. If a skill fails or is interrupted, leave the remaining artifacts `stale`, record which step failed, and exit with clear resume instructions. Partial state must be truthful.

**Step 8 — Report.** Append to `artifacts/16-changes/change-log.md`. Print a closing summary: what changed, what regenerated, what is still stale, what remains pending in the queue.

### 8.4 Targeted re-run mode

Owning skills must accept a targeted invocation that re-opens **only** the affected decision rather than replaying the full workflow. Implement as a documented contract in the T2+ preamble or as an explicit input section per design skill:

> When invoked with a change context (`change_ref` + affected decision IDs), re-open only those decisions. Carry every other decision forward unchanged. Regenerate the full artifact, since the document must remain internally consistent, but do not re-ask questions whose answers are already recorded in `decisions.yaml`.

This is the difference between a 2-minute change and a 25-minute re-interview. It is a hard requirement, not an optimization.

### 8.5 Compound changes

A single request may span owners (schema field + topic address). Split into linked sub-requests `CR-001a`, `CR-001b` with a shared parent, order them by the dependency graph, and process in order. Never process a compound change as one undifferentiated blob.

---

## 9. `scripts/change-impact.ts`

Deterministic, testable, no model in the loop. Everything mechanical belongs here rather than in prose.

```
bun run change:impact --skill solace-topic-design [--project <slug>] [--json]
```

Returns:

```json
{
  "owner": "solace-topic-design",
  "changed_artifacts": ["topic-taxonomy"],
  "regenerate": ["blueprint", "arch-blueprint", "diagrams", "validation-report"],
  "re_review": ["solace-security-review", "solace-dev-review"],
  "re_decide": ["solace-protocol-select", "solace-integration"],
  "unaffected": ["broker-recommendation", "ha-dr-topology"],
  "absent": [],
  "live_conflict": false,
  "skill_sequence": ["solace-topic-design", "solace-protocol-select", "..."]
}
```

(`regenerate` lists artifact keys; `re_review`/`re_decide`/`skill_sequence`
list skill names.)

Requirements:
- Transitive closure over `consumes` edges from the changed artifact set.
- `skill_sequence` is a topological sort of the affected subgraph — the skill executes this order verbatim.
- Reads `progress.yaml` so artifacts that do not exist in this project are reported `absent`, not scheduled. Artifact locations resolve from `progress.yaml` recorded paths first, declared `dir` second (see §5.1 legacy layouts).
- `unaffected` is explicitly enumerated. Silence about an artifact is not evidence it is unaffected, and the operator needs to see the boundary.
- Exit non-zero on cycle detection or unresolvable artifact key.
- Registered in `package.json` as `change:impact` so `bun run change:impact` works as shown above.

---

## 10. Component C — downstream guards (fixes F2 permanently)

**`/solace-validate`:** add a consistency check that reads `progress.yaml` freshness. Any `stale` artifact is a finding with severity proportional to its position — a stale review is `medium`, a stale design artifact feeding the blueprint is `high`. Report which change request caused it.

**`/solace-blueprint`:** refuse to assemble when any consumed artifact is `stale`, unless invoked with the explicit override flag `--allow-stale`. On refusal, print the exact command sequence to fix it. A blueprint assembled from stale inputs is worse than no blueprint — it looks authoritative and is not. `--allow-stale` exists for the operator who knowingly wants a snapshot; it must stamp a visible banner into `architecture.md`. Use the flag name `--allow-stale` consistently in the skill body, the refusal message, and all docs. Absent freshness data is `current`-equivalent (§5.4); the gate fires only on explicit `stale` markers.

**Report packs:** any HTML report generated while artifacts are stale carries a dated banner listing the stale artifacts and their causes. Applies to every pack, including the audience-scoped ones.

**`/solace-plan`:** before the finalize phase, drain pending change requests. If any are `pending`, stop and tell the operator to run `/solace-change` — do not finalize an engagement over an unprocessed queue.

---

## 11. Component D — dashboard

Note on location: `scripts/dashboard.ts` is only the file/YAML server. The view logic lives in the `dashboard/` app directory (`dashboard/index.html` and its scripts) — that is where the additions below land. The server likely needs no change beyond what already flows through `open-items.yaml`, `decisions.yaml`, and `progress.yaml`.

- New sidebar view **Changes**: table of all change requests with ID, status, class, owner, blast radius, applied date. Click through to the full delta and the linked decision.
- **Overview**: pending-change-request card next to the existing EP Provisioning card. Zero pending renders neutral, not celebratory.
- **Artifacts** tree: stale artifacts badged, with the causing `CR-NNN` in the tooltip.
- **Decisions**: superseded decisions rendered struck-through with a link to the superseding entry. History stays visible.
- **Next-action guidance**: the dashboard is read-only and never executes changes, but wherever it surfaces pending or stale state it must show the exact copyable CLI command to resolve it. The Changes view shows `/solace-change CR-NNN` on each pending row and `/solace-change` on the queue header; the Overview pending-changes card and every stale-artifact badge tooltip carry the same copyable command. A user looking at the dashboard always knows the one command to paste into the CLI next, scoped to all requests or a specific one.

---

## 12. Token budget — read this before touching preambles

Per `CLAUDE.md`, the total budget across all skills sits roughly 2K tokens under a 300K ceiling. The §7 capture rule multiplies across every T2+ skill. Required approach, in order:

1. Draft the capture rule and measure with `bun run skill:check`.
2. If it does not fit in existing headroom, **trim existing preamble text first** — look for redundancy between the grounding-rules and naming-conventions generators.
3. Only if trimming is insufficient, raise the ceiling in `test/skill-token-budget.test.ts` **with an inline comment naming the change-capture rule as the cause and the measured delta**, matching the existing comment convention for the grounding-discipline bump.

Never raise the ceiling silently to make a test pass.

---

## 13. Tests and acceptance criteria

Extend the existing suite. All must pass under `bun test` (target: still under a few seconds).

**`test/skill-dependencies.test.ts`**
- Every skill directory with an `artifacts/` output appears in `skill-dependencies.yaml`.
- Every `produces` / `consumes` key resolves to a declared artifact.
- `.tmpl` frontmatter matches the YAML for every skill.
- The graph is acyclic.
- Every artifact except `discovery-brief` has at least one producer.
- **No drift against routing:** every artifact-producing skill in `scripts/skill-routing.yaml` appears in `skill-dependencies.yaml`, and every skill in `skill-dependencies.yaml` appears in `skill-routing.yaml`. Two hand-maintained YAML sources of truth must be mechanically reconciled.

**`test/change-impact.test.ts`**
- Topic-taxonomy change → protocol-map, integration map, EP design, reviews, blueprint in `regenerate`/`re_decide`; `ha-dr-topology` and `broker-recommendation` in `unaffected`.
- Broker-select change → mesh and HA/DR affected.
- Executive-only change → no design skill scheduled.
- Absent artifacts are excluded from the sequence.
- `skill_sequence` is topologically valid for each fixture.

**`test/skill-terminology.test.ts`, `skill-structure.test.ts`, `skill-gen.test.ts`** — must pass unchanged for the new skill: zero forbidden terms, valid frontmatter, correct preamble tier, committed `SKILL.md` matches template.

**Capture-rule fixture (write it before tuning the rule):** add a scenario fixture under `test/fixtures/` containing a transcript-style exchange with one in-scope refinement and one out-of-scope remark, plus the expected `open-items.yaml` outcome (exactly one change request, verbatim preserved). Even if checked by hand at first, it is the stable target for A1/A2 tuning.

**Acceptance criteria (behavioral, verify manually against a fixture project):**

| ID | Criterion |
|----|-----------|
| A1 | A change stated mid-`/solace-topic-design` outside that skill's scope lands in `open-items.yaml` with verbatim text, and the skill's closing summary names it |
| A2 | An in-scope refinement during the same skill does **not** create a change request |
| A3 | `/solace-change list` writes nothing to disk |
| A4 | `/solace-change --dry-run` produces the full impact report and modifies nothing |
| A5 | Applying a topic change marks `protocol-map` and `reviews` stale in `progress.yaml` before any skill runs |
| A6 | `/solace-blueprint` refuses to assemble while those artifacts are stale, and names the fix |
| A7 | After the full sequence completes, every affected artifact is `current` and `/solace-validate` reports no staleness findings |
| A8 | A rejected change produces a `decisions.yaml` entry with rationale and no artifact changes |
| A9 | A change conflicting with `provisioned.yaml` is classified `breaking-live` and proposes versioning, never an in-place tenant edit |
| A10 | A superseded decision remains in `decisions.yaml` with `superseded_by` set |
| A11 | Interrupting the sequence mid-run leaves stale markers intact and prints resume instructions |
| A12 | `execution_mode: auto` does not auto-apply a `structural` change |
| A13 | With pending change requests or stale artifacts, the dashboard displays the exact copyable command (`/solace-change` or `/solace-change CR-NNN`) at every surface that shows that state, and offers no in-dashboard apply action |

---

## 14. Integration checklist

- [ ] `CLAUDE.md`: routing entry — *"Change request, requirement changed, impact of a design change, apply a pending change → invoke /solace-change"*; skill table row under a new **Change** category; project-structure listing
- [ ] `README.md`: skill reference row; rewrite the "Iterating and re-assembling" section — `/solace-change` becomes the recommended path, manual re-run remains documented for single-slice work
- [ ] `docs/slash-commands.md`: full entry with scenarios and the dependency map
- [ ] `solace-help/SKILL.md.tmpl`: list the command; surface pending change count in status output
- [ ] `scripts/skill-routing.yaml`: add `solace-change` as a `utility`-phase entry excluded from the intake preview (same treatment as `/solace-projects` and `/solace-help`) — it is never intake-triggered
- [ ] `package.json`: register `change:impact` script
- [ ] `scripts/report-packs.yaml`: include `16-changes/change-log.md` in the Comprehensive pack
- [ ] `bun run build` regenerates all 10 hosts; commit `.tmpl` and generated `.md` together
- [ ] `VERSION` bumped
- [ ] Commits bisected — one logical change each: graph declaration, impact script, capture preamble, the skill itself, downstream guards, dashboard, docs

---

## 15. Out of scope (candidate phase 2)

- Undo / revert of an applied change request.
- Cross-project change propagation (applying one CR to `payments-v1` and `payments-v2` together).
- Line-level artifact diffing and merge.
- Automatic detection of drift between `provisioned.yaml` and the live tenant without an explicit run.
