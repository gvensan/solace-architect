# Uplift plan: absorbing `sam-solace-architect` sophistication into the skill toolkit

**Status:** Phase 0 ✅ and Phase 1 ✅ implemented (working tree, uncommitted; 277 tests pass).
Phases 2–4 not started. See §5 for phase definitions.
**Author:** Drafted with Claude Code during a review session.
**Goal:** Bring this skill-based toolkit (`solace-architect-v1`) up to parity with the more
advanced reference project `sam-solace-architect` (a SAM agentic system, internally "V2"),
**while keeping this project skill-based, not agentic.** Absorb the reference's sophistication;
exclude its SAM-runtime plumbing.

Reference location: `/Users/girivenkatesan/gitmine/sam-solace-architect`.

---

## 1. What each project is

- **This project** (`solace-architect-v1`): a Claude-Code **skill toolkit**. Each skill is a
  `SKILL.md.tmpl` compiled to `SKILL.md` by TypeScript resolvers, with a tiered shared preamble.
  27 skills, an on-disk project/artifact model, an intake HTML form, and a dashboard with
  audience-filtered report export.
- **Reference** (`sam-solace-architect`): a **SAM agentic system** — a mesh of A2A agents over a
  shared `solace-architect-core` library of **deterministic tools + orchestrator logic + configs +
  grounding**. Its `documents/v2spec.md` (2,782 lines) and `v1-v2-gap-analysis.md` document how it
  was built from an earlier skill toolkit.

Key structural insight: the reference's **agent prompts are thinner than our skill templates**
(its Domain agent prompt is 264 lines vs our discovery skill's 549). Its sophistication lives in
three borrowable places: **(A) deterministic Python logic** (`orchestrator/*.py`),
**(B) config-as-source-of-truth YAML**, and **(C) a stronger grounding + protocol discipline** in
`agent-preamble.md`.

---

## 2. Where this project already matches or exceeds the reference

Do not spend effort here.

| Capability | This project | Reference |
|---|---|---|
| Global decision numbering | `D1..Dn` **persisted** in `decisions.yaml` | procedural |
| Report packs | **6** packs incl. `arch-blueprint` | 5 packs |
| ROI model | real `roi-framework.md` worksheet (C/P/V rows, sensitivity, auto-fill deps) | interactive JS calculator (richer rendering, same model) |
| 4+1 architecture blueprint | full `/solace-architecture-blueprint` (logical/process/dev/physical/scenarios + domain model + entity state machines) | skill exists but **no engagement ever emitted 4+1 views or a `stateDiagram`** |
| Mermaid diagram system | 8 core + 7 conditional, classDef palette, split rules, `-detail.md` companions | comparable (17 diagrams in richest sample) |
| Grounding discipline *text* | full version in `claude-instructions.md` | `agent-preamble.md` (same lineage) |

The reference's genuine edge is **structured data rigor** and **specific per-report depth**
(notably the security review's per-system ACL tables + PCI-DSS Req 1–12 checklist), not breadth of
report types.

---

## 3. Verified mechanics (why the plan below is concrete)

- **Findings already are structured data.** The dashboard renders "Review Findings" by reading
  `decisions.yaml` and filtering `items.filter(d => d.source)` — a finding *is* a decision entry
  with a `source`. Fields consumed: `source`, `severity` (critical/important/advisory), `decision`,
  `action` (applied/deferred). `scripts/resolvers/finding-resolution.ts` already writes this shape.
  → **We will NOT introduce a separate `findings.yaml`** (the reference has one, but adopting it
  here would force a dashboard rewrite for no user-visible gain).
- **Open-items are the real gap.** The dashboard reads `projects/<slug>/open-items.yaml` (project
  root, not `artifacts/`) and renders `id`, `severity` (blocking/high/medium/advisory),
  `description`, `source`, `resolution`, `status` (open/resolved). **No skill writes this file.**
- **Severity map** (both vocabularies verified): findings `critical/important/advisory` →
  open-items `critical→blocking`, `important→high`, `advisory→advisory`.
- **`scripts/resolvers/confidence.ts` is dead AND wrong-domain** — 0 template references, and its
  body emits `[P1] (confidence: 9/10) app/models/user.rb:42 — SQL injection` (copied from a
  code-review toolkit, never adapted to Solace).
- **Test gates:** `test/skill-structure.test.ts` presence-checks `## ` headers per tier;
  `skill-terminology`, `skill-token-budget`, `report-packs` also gate. Every change needs
  `bun run gen:skill-docs` (or `bun run build`) + `bun test`.

---

## 4. The intake-alignment gap (root cause — drives Phase 0)

`/solace-plan` does **not** mechanically evaluate `skill-routing.yaml` against a structured schema.
It reads `discovery-brief.md` (prose) + `decisions.yaml` and interprets them with the LLM; the only
clean field it reads is `provision_event_portal` from `decisions.yaml`.

The intake HTML form maps fields to a canonical dotted schema via `data-path` attributes (e.g.
`requirements.topology`, `landscape.systems[]`). But **the intake import does not persist that
schema into the project**:

- `context.yaml` — name/status only.
- `decisions.yaml` — intake selections become free-text decision entries (`question: "Topology"`,
  `choice: "single_site"`).
- `discovery-brief.md` — everything else flattened to **prose**.

So `skill-routing.yaml` is called the "single source of truth," but the schema it references is
**never stored where skills can read it**. Any deterministic behavior we add (candidate-finding
checks, open-item gating, requirement tracing) would have no reliable structured field to key off,
and would drift from the intake vocabulary. **This makes intake work foundational (Phase 0).**

### 4.1 Canonical intake field paths (source of truth: form `data-path` + `skill-routing.yaml`)

```
project.name, project.type (new_build|migration|extension|sam)
landscape.existing_messaging, landscape.volumes, landscape.schemas
landscape.vertical (banking|capital_markets|manufacturing|healthcare|other)
landscape.protocols_in_use[]
landscape.systems[]  (name, role: producer|consumer|producer_consumer, protocol, owner)
landscape.events[]   (name, rate, delivery, payload, payload_size)
requirements.delivery_mode (guaranteed|direct|mixed)
requirements.ordering, requirements.processing_guarantee (e.g. at_least_once)
requirements.latency_tier, requirements.topology (single_site|multi_region|hybrid_cloud|edge)
requirements.sites_and_regions (FREE TEXT), requirements.it_ot_boundary
requirements.growth_expectations, requirements.data_residency
requirements.operations_team, requirements.solace_experience
requirements.observability, requirements.cicd
domain.<vertical>.*  (banking|capital_markets|manufacturing|healthcare specifics)
goals.driver, goals.timeline, goals.budget, goals.team_size, goals.organizational_constraints
preferences.execution_mode (auto|interactive), preferences.provision_event_portal (bool)
```

### 4.2 Field-vocabulary alignment (use CURRENT paths, not the reference's)

| Behavior | Reference assumed | **Current canonical (use this)** |
|---|---|---|
| delivery | `requirements.delivery_mode` guaranteed/mixed | same ✓ |
| processing guarantee | `at-least-once` | `requirements.processing_guarantee: at_least_once` |
| topology | `multi-site/hybrid-cloud` | `requirements.topology: single_site\|multi_region\|hybrid_cloud\|edge` |
| data residency | `requirements.data_residency_constraints` | `requirements.data_residency` |
| single-site check | counts `sites[]` list | `requirements.topology == single_site` (`sites_and_regions` is free text) |
| systems | `landscape.systems[]` role "both" | same paths; role vocab `producer_consumer` |
| vertical | brief field | `landscape.vertical` (banking/capital_markets/manufacturing/healthcare/other) |
| EP provision | `preferences.provision_event_portal` | same ✓ (also mirrored to `decisions.yaml`) |

---

## 5. The plan (file-by-file)

### Phase 0 — persist one canonical structured brief (foundational)
- **`solace-intake/SKILL.md.tmpl`** (import step): also write `projects/<slug>/intake.yaml` = the
  raw canonical intake **verbatim** (exact paths + value vocab). The reference's "verbatim mirror of
  intake — hard rule."
- **`solace-discovery/SKILL.md.tmpl`** (Step 4): for the interactive path (no intake file), emit the
  **same** `intake.yaml` from interview answers. `discovery-brief.md` stays as the human companion.
- **`solace-plan/SKILL.md.tmpl`** (Step 1): evaluate `skill-routing.yaml` conditions against
  `intake.yaml`; fall back to prose if absent (older projects).
- **Drift-guard test** (`test/`): assert form `data-path` set ≡ `intake.yaml` keys ≡
  `skill-routing.yaml` referenced fields, so the three never diverge again.

### Phase 1 — finding→open-item bridge + gating
- **`scripts/resolvers/finding-resolution.ts`**: on **Defer** (and on **Apply** of a Critical with
  residual risk), append an entry to `projects/<slug>/open-items.yaml` using the dashboard's exact
  schema + severity map (§3). Add `OI-NNN` id sequencing.
- **`scripts/resolvers/preamble/generate-project-management.ts`**: document `open-items.yaml` as a
  first-class project file.
- **`solace-plan/SKILL.md.tmpl`**: pre-dispatch gate — read `open-items.yaml`; if a `blocking` item
  names the next step, surface Resolve/Defer/Discuss instead of running it.
- **`solace-validate/SKILL.md.tmpl`**: emit `open-items.yaml` entries for unaddressed requirements
  (source=`validation`), matching what its report already computes in prose.

### Phase 2 — review rigor
- **`scripts/resolvers/confidence.ts`**: rewrite for the Solace domain (severity tiers +
  `artifact:section`, not `file:line`); reference `{{CONFIDENCE_CALIBRATION}}` in the four
  `solace-*-review/SKILL.md.tmpl` files.
- **Candidate-finding checklists** (prose port of the reference's `orchestrator/review_checks.py`)
  added to each review template, keyed off `intake.yaml`:
  - ops: `requirements.delivery_mode in [guaranteed, mixed]` but HA/DR artifact lacks redundancy;
    broker rec without a sizing block.
  - security: no TLS anywhere; no auth/ACL/OAuth; `requirements.data_residency` non-empty but mesh
    has no selective replication (**critical**).
  - developer: topic taxonomy has no version level; schemas noted but no registry/versioning.
  - architect: `requirements.topology == single_site` but DMR/federation present (over-engineered).
- **`solace-security-review/SKILL.md.tmpl`** Step 7: replace the bare `<paste findings>` heredoc
  with an explicit output structure matching the reference's depth (per-system ACL profile table,
  client-profiles, cert-lifecycle, PCI-DSS Req 1–12 checklist, residency table).

### Phase 3 — grounding
- **`scripts/resolvers/preamble/generate-grounding-rules.ts`**: promote the fuller discipline from
  `claude-instructions.md` (citation tags incl. `[managed-ref:]`, 3-level confidence, claim
  classification, negative-claim, source-recency). Watch `skill-token-budget.test.ts`.
- Runtime gap recording: an instruction + append pattern to `gaps.md` when a grounding lookup fails.

### Phase 4 — managed grounding (net-new capability)
- New `solace-grounding/managed/` (`digest.md` + manifest), one preamble line pointing skills at it,
  a `[managed-ref:]` citation tag, and a small add/approve flow reusing `scripts/intake-server.ts`
  patterns.

---

## 6. Explicitly out of scope (SAM-runtime infra)

`design_state.py` single-writer state machine; session/telemetry/lifecycle/workflow/interaction
tools; WebUI/REST entrypoints; A2A topics; worker-mode prompting; WeasyPrint PDF + JS ROI rendering.

One cheap idea worth stealing conceptually: **`reconcile_with_artifacts`** — a check that demotes a
step marked "done" whose artifact is missing. Could live in `/solace-projects` or `/solace-validate`.

---

## 7. Open decision for the maintainer

Keep findings in `decisions.yaml` (recommended — no dashboard churn) vs introduce a dedicated
`findings.yaml` (reference-faithful, higher churn). This plan assumes the former.
