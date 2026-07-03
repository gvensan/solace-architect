# Solace Architect

An open-source Claude Code skill toolkit for event-driven architecture on the Solace platform.

Solace Architect gives AI coding agents structured, grounded expertise in Solace event brokers, Solace Agent Mesh (SAM), topic taxonomy design, broker selection, migration planning, and operational patterns. Every recommendation is grounded in Solace documentation. No fabricated features, no borrowed concepts from other messaging platforms.

## Who it's for

The tool has two distinct audiences: the **operator** who runs the skills, and the **consumer** who reads the deliverables.

**Operators run the engagement:**
- **Solace SAs, Developer Advocates, pre-sales engineers, and professional services consultants** running customer engagements who need structured discovery and defensible blueprints.
- **Architects** designing event-driven systems on Solace — greenfield or migration — who want a guided workflow rather than an empty document.

**Consumers read the artifacts:**
- **Customer architecture and platform teams** receive the blueprint, runbook, and provisioning parameters.
- **Engineering leadership** receives the executive summary and ROI framework.
- **Developers evaluating Solace** read the architecture document and reference patterns to understand platform capabilities and trade-offs.

The skills assume an expert operator who can verify "architectural inference, not from Solace docs" labels and adapt recommendations to customer constraints. Self-serve customer use works but is not the primary design target.

## What it does

Solace Architect is a toolkit of 24 skills (prompt templates) that AI coding agents read at invocation time. You drive it with slash commands (`/solace-intake`, `/solace-discovery`, `/solace-plan`), or capture requirements through a local HTML form (`bun run intake`). Each skill walks the agent through a structured workflow: asking the right questions, matching against reference architectures, applying Solace naming conventions, and writing real artifacts to disk — markdown documents, Mermaid diagrams, YAML configs, and a runbook. See [Outputs and reports](#outputs-and-reports) for where everything lands and how to share it.

One skill, [`/solace-ep-provision`](#event-portal-provisioning-mcp), bridges the design output to a live Solace Cloud tenant via the [Solace Event Portal Designer MCP](https://github.com/SolaceLabs/solace-platform-mcp/tree/main/solace-event-portal-designer-mcp). See the **Event Portal provisioning (MCP)** section below for setup.

The skills enforce:
- **Strict Solace grounding.** Every claim backed by `docs.solace.com`, SAM project docs, or SolaceLabs GitHub. When a capability is not documented, the agent says so.
- **Accurate terminology.** Micro-Integration (not "connector"). Direct messaging and Guaranteed messaging (not "QoS levels"). OrchestratorAgent (not "orchestrator agent"). See the full naming conventions in any generated SKILL.md.
- **Senior architect voice.** Concrete, direct, tied to operational outcomes. No AI vocabulary, no vendor pitch, no hedging without naming what it depends on.

## Installation

Prerequisites: [Bun](https://bun.sh) >= 1.0.0

```bash
git clone https://github.com/solacecommunity/solace-architect.git
cd solace-architect
./install-sa.sh
```

What `install-sa.sh` does:

1. Installs Bun dependencies.
2. Generates SKILL.md files for all 10 supported AI agent hosts.
3. Symlinks the Claude Code skills into `~/.claude/skills/` so you can invoke them as slash commands.

Re-running `./install-sa.sh` is safe — it refreshes the symlinks against the current source after edits.

### Uninstall

```bash
./uninstall-sa.sh
```

Removes only the symlinks under `~/.claude/skills/` that point back to this repo (it reads the symlink target before deleting, so unrelated skills are left alone). Your local copy of the repo, the `projects/` folder, the `intake/` folder, and any other local environment are untouched.

To wipe everything Solace Architect added — including the cloned repo — run `./uninstall-sa.sh` first, then delete the repo directory.

## Getting started

### Three ways to start

Pick the entry point that matches how much info you already have and how you want to capture it.

**A. Interactive discovery — no prep.**

```
/solace-discovery
```

The skill asks ~15 structured questions about systems, flows, reliability, topology, and goals. Allow ~20–30 minutes. Produces a discovery brief that feeds every downstream skill.

**B. Intake template — prep offline first.**

```
/solace-intake                            # generates blank YAML + DOCX template
# fill the template offline (~30–45 minutes)
/solace-intake import path/to/intake.yaml # imports and bootstraps the engagement
```

Best when you're gathering info from a customer, a workshop, or async stakeholders, and you want a portable file (YAML for engineers, DOCX for stakeholders). The completed intake skips discovery's interactive questions entirely.

**C. Intake form — fill it in a browser.**

```
bun run intake          # serves http://localhost:3001
```

Best when stakeholders prefer a guided UI to a document, or when you want offline-collection benefits without hand-managing a YAML/DOCX file. See [Intake form](#intake-form) below for what it offers and how to import the result.

The same `/solace-intake import` command consumes the output from B and C — the only difference is where the YAML came from.

### Intake form

For browser-based capture, run the intake server:

```bash
bun run intake          # serves http://localhost:3001 (auto-opens on macOS)
```

It opens an HTML intake form with autocomplete, a live engagement preview as you type, and a "Pre-fill from existing project" picker so you can clone and edit a prior intake instead of starting from blank. Submitting writes `intake/<slug>.yaml` (the slug is derived from the project name). Bootstrap the engagement from it with:

```
/solace-intake import intake/<slug>.yaml
```

This is the input-side counterpart to the [Dashboard](#dashboard): `bun run intake` captures requirements into a project, `bun run dashboard` renders and exports what the engagement produces.

### Drive the full engagement

Once discovery is in place, run one command to do everything:

```
/solace-plan
```

`/solace-plan` reads the brief, decides which technical skills apply (skips SAM if there's no AI layer, skips migration for greenfield), and runs design → review → validation → blueprint → executive summary in order.

Or call any single skill directly when you only need one slice:

```
/solace-topic-design     # rework topic taxonomy
/solace-broker-select    # redo broker sizing or type
/solace-diagrams         # regenerate visuals after a design change
/solace-blueprint        # reassemble the engineering handoff package
```

### Iterating and re-assembling

Every skill can be re-run at any time — you don't have to restart the engagement to refine a decision. After re-running any design or review skill, run `/solace-validate` to confirm consistency, then `/solace-blueprint` to refresh the engineering handoff package (`architecture.md`, runbook, diagrams, configs) with the updated content. Run `/solace-executive` after that if the business framing changed too.

Typical iteration cycle:

```
/solace-topic-design     # change something upstream
/solace-validate         # re-check consistency and antipatterns
/solace-blueprint        # refresh the final package
/solace-executive        # (optional) refresh the business case
```

`/solace-blueprint` and `/solace-executive` overwrite their outputs on every run, so the files on disk — and everything the dashboard and HTML report read from — always reflect the current state of decisions. Treat the blueprint as the always-current snapshot; individual skill artifacts are the working drafts that feed into it.

### Auto or interactive mode

Each `D<N>` design decision in a skill can either pause for your input (interactive, the default) or be auto-decided to the recommended option with full rationale logged. Set this during intake, or add `execution_mode: auto` to the project's `decisions.yaml`. Either way, every choice is recorded with the option chosen and why.

Use interactive when you want to drive the trade-offs. Use auto for fast end-to-end runs, comparison projects, or after you've validated the recommended path is sensible.

### What you can do across projects

```
/solace-projects              # status of the active project (also recommends what to run next)
/solace-projects list         # all projects
/solace-projects summary      # key decisions and findings for the active project
/solace-projects switch       # change the active project
/solace-projects compare      # decision diff between two projects
/solace-help                  # workflow overview + skill index
```

Each engagement is a self-contained folder under `projects/<slug>/`, so parallel designs (e.g., `payment-solutions-v1`, `v2`, `v3`) live side by side and can be compared decision-by-decision.

### See it end-to-end

1. `/solace-discovery` — answer the questions for a small system (e.g., two services and a mobile app).
2. `/solace-plan` — let the orchestrator run the rest in auto mode.
3. `bun run dashboard` — open `http://localhost:3000` and click **Export** for the HTML report.

For a full guided walkthrough of a real engagement (retail banking AI assistant scenario, every skill explained step-by-step), see [docs/getting-started.md](docs/getting-started.md).

Next: read [Outputs and reports](#outputs-and-reports) to see exactly what gets produced and how to share it.

## Outputs and reports

Slash commands produce real artifacts on disk: markdown documents, Mermaid diagrams, YAML configs, and a runbook. Everything lands under `projects/<your-project>/artifacts/`. You can read it as plain files, browse it through a local dashboard, or export it as a single shareable report.

### Where everything lives

Every skill writes to a numbered subdirectory:

```
projects/<your-project>/
  context.yaml                       ← project metadata
  intake.yaml                        ← canonical structured intake (single source of truth for routing/reviews/validation)
  decisions.yaml                     ← every D<N> decision with rationale (review findings are entries with a source)
  open-items.yaml                    ← deferred findings + unaddressed requirements; blocking items gate blueprint
  progress.yaml                      ← per-skill status, timing, artifact list
  artifacts/
    01-discovery/discovery-brief.md
    02-topic-design/topic-taxonomy.md
    03-broker-select/broker-recommendation.md
    04-sam-design/                   ← only if SAM design ran
    05-protocol-select/protocol-map.md
    06-mesh-design/dmr-topology.md
    07-ha-dr/ha-dr-topology.md
    08-integration/micro-integration-map.md
    09-migration/                    ← only if migration planning ran
    10-reviews/                      ← architect, ops, security, dev reviews
    11-validation/validation-report.md
    12-blueprint/                    ← engineering handoff package
      architecture.md
      runbook.md
      topic-taxonomy.md
      validation-report.md
      diagrams/*.mermaid             ← 8 core + conditional diagrams
      config/                        ← YAML configs, broker provisioning params
    13-event-portal/                 ← Event Portal governance design
    14-executive/                    ← business case
      executive-summary.md
      roi-framework.md
      business-architecture.mermaid
```

Open any of these in your editor. Mermaid diagrams render in GitHub, VS Code, Obsidian, or [mermaid.live](https://mermaid.live).

### Dashboard

For interactive browsing, run the dashboard:

```bash
bun run dashboard    # serves http://localhost:3000 (auto-opens on macOS)
```

Sidebar views:

- **Overview** — Phases (Discovery, Design, Review, Finalize) with per-skill status tiles. Click a tile for details.
- **Timeline** — Chronological view with timing per skill and decisions in context.
- **Decisions** — Every `D<N>` design decision with rationale, plus review findings with severity and resolution status.
- **Open Items** — Unresolved questions, risks, and follow-ups across the engagement.
- **Artifacts** — File tree browser. Click any file to view rendered content. Mermaid diagrams render inline.
- **Stats** — Execution time, user wait time, decision counts, artifact counts.
- **Export** — One-click HTML report (comprehensive or audience-specific) or print-to-PDF (see below).

### Single-file report — share, archive, print

The **Export** view turns the engagement into a self-contained HTML file — one document with the executive summary, business case, architecture diagrams, decision log, and engagement history. No server is required to view it: email it, drop it in a repo, or attach it to a ticket.

The view opens with the **Comprehensive Report** as the default (every artifact, decision, and review finding). Below it, audience packs filter that content down to what a single reader role needs:

| Report pack | For | Contains |
|-------------|-----|----------|
| **Comprehensive Report** | Everyone — start here if unsure | Full deliverable: every artifact, decision, and finding |
| **System & Engineering View** | Implementation team, eng leads, onboarding devs | 4+1 architecture views (logical, process, development, physical, scenarios) |
| **Strategic Executive View** | CXO, sponsors, investment committee | Business case, ROI, recommendation in plain language |
| **Infrastructure & Operations View** | Solace admin, SRE, on-call | Provisioning params, monitoring, runbooks, HA/DR |
| **Security & Governance View** | Security architect, compliance, audit | Auth, ACLs, encryption, PII, audit posture |
| **Application Developer View** | App engineers writing client code | Topics, schemas, protocols, AsyncAPI exports |

Each tile generates an HTML report scoped to its audience. The packs are defined in [`scripts/report-packs.yaml`](scripts/report-packs.yaml) — edit that file to retune what each pack includes. Inside any generated report, **Print / Save as PDF** triggers the browser print dialog; the styles are print-aware, so diagrams and tables format cleanly for handoff packages.

### What to share with whom

| Audience | Hand them this |
|----------|----------------|
| Engineering team (implementing) | **System & Engineering View** report, or raw `12-blueprint/` (`architecture.md`, `runbook.md`, `diagrams/`, `config/`) |
| Solace ops / cloud provisioning | **Infrastructure & Operations View** report, or `12-blueprint/config/broker/provisioning-parameters.md` |
| Security / compliance / audit | **Security & Governance View** report |
| Application developers | **Application Developer View** report |
| Event Portal admin / governance | `13-event-portal/` (provisioning plan + design) |
| CXO / business stakeholders | **Strategic Executive View** report, or `14-executive/executive-summary.md` |
| External review or archive | **Comprehensive Report** (single self-contained file) |
| Live walkthrough | Dashboard at `localhost:3000` |

## Skill reference

Full catalog of every skill. For the recommended flow, see [Getting started](#getting-started). For per-skill scenarios, the dependency map, and detailed usage patterns, see [docs/slash-commands.md](docs/slash-commands.md).

| Category | Skill | Command | Description |
|----------|-------|---------|-------------|
| Start here | Intake | `/solace-intake` | Generate intake templates for offline collection, or import a completed intake to bootstrap the full engagement. |
| Discovery | Discovery | `/solace-discovery` | Structured elicitation. Asks about systems, boundaries, events, protocols, requirements, and goals. Matches against reference architectures. Produces a discovery brief. |
| Technical | Topic Design | `/solace-topic-design` | Maps data flows to `Domain/Noun/Verb/Version/Properties` taxonomy, assigns delivery modes, designs wildcard subscriptions, validates against antipatterns. |
| Technical | Broker Selection | `/solace-broker-select` | Selects broker deployment model (Cloud, Software, Appliance) based on constraints. |
| Technical | SAM Design | `/solace-sam-design` | Designs SAM agent topologies: agents, Gateways, Micro-Integrations, OrchestratorAgent, A2A topics, authorization model. |
| Technical | Protocol Selection | `/solace-protocol-select` | Selects messaging protocol per integration point: SMF, MQTT, AMQP, JMS, REST, WebSocket. |
| Technical | Mesh Design | `/solace-mesh-design` | Designs DMR topologies for multi-site, multi-cloud, and hybrid deployments. |
| Technical | HA/DR | `/solace-ha-dr` | Designs HA within sites and DR across sites. Replication groups, failover, RPO/RTO mapping. |
| Technical | Migration | `/solace-migration` | Plans phased migration from Kafka, RabbitMQ, TIBCO, or IBM MQ to Solace. |
| Technical | Integration | `/solace-integration` | Designs Micro-Integration strategy: Integration Hub, custom MIs, Kafka bridge. |
| Technical | Event Portal | `/solace-event-portal` | Maps architecture into Event Portal objects: application domains, events, schemas, applications, runtime connections. |
| Technical | Event Portal Provisioning | `/solace-ep-provision` | Provisions the EP model in Solace Cloud via the EP Designer MCP. Creates domains, schemas, events, applications; exports AsyncAPI per app. Requires the MCP and a Solace API token. **Opt-in only** — set `preferences.provision_event_portal: true` during intake; never auto-fires from project type. |
| Review | Architecture | `/solace-architect-review` | Reviews trade-offs, component choices, topology decisions. |
| Review | Operations | `/solace-ops-review` | Reviews monitoring, failure modes, capacity, runbook completeness. |
| Review | Security | `/solace-security-review` | Reviews ACL model, TLS, auth propagation, regulatory compliance. |
| Review | Developer | `/solace-dev-review` | Reviews topic usability, SDK selection, onboarding path. |
| Orchestration | Plan | `/solace-plan` | Orchestrates skills in sequence for a complete engagement. |
| Validation | Validate | `/solace-validate` | Consistency checks, antipattern detection, completeness verification. |
| Assembly | Blueprint | `/solace-blueprint` | Final assembly into an engineering handoff package. |
| Assembly | Architecture Blueprint (4+1) | `/solace-architecture-blueprint` | Repackages the engineering blueprint into Kruchten's 4+1 view (logical, process, development, physical, scenarios) for implementation teams onboarding to the design. |
| Finalize | Executive | `/solace-executive` | Executive summary for CXO and business leaders: ROI, risk reduction, strategic value. |
| Utility | Projects | `/solace-projects` | Project dashboard: status, timing, summary, compare, switch projects. |
| Utility | Diagrams | `/solace-diagrams` | Regenerate Mermaid diagrams for the current project (all or by name). |
| Utility | Help | `/solace-help` | Lists available skills, shows recommended workflow, displays active project status. |

## Event Portal provisioning (MCP)

The `/solace-ep-provision` skill materializes the Event Portal model designed by `/solace-event-portal` into a live Solace Cloud tenant via the [Solace Event Portal Designer MCP](https://github.com/SolaceLabs/solace-platform-mcp/tree/main/solace-event-portal-designer-mcp). The MCP is published and maintained by Solace.

For installation, token creation, region configuration, verification, and troubleshooting, see **[docs/install-ep-designer-mcp.md](docs/install-ep-designer-mcp.md)**. This section covers only what's distinctive about how Solace Architect uses the MCP.

> **Early Access caveat.** Solace labels the EP Designer MCP as Early Access. Per Solace's published guidance, the MCP is *"intended for use with AI assistants in a controlled environment with human oversight. Not designed for automated workflows like GitHub Actions or unattended automation systems."* The `/solace-ep-provision` skill honors this — auto mode pauses per-layer for confirmation, never silently mass-creates, and surfaces every API response.

> **Opt-in only at intake.** `/solace-ep-provision` writes to a live Solace Cloud tenant, so it never auto-fires from project type. The intake form has an explicit **"Provision Event Portal model after design?"** field (`preferences.provision_event_portal`). Default is `false` — a design-only engagement leaves your tenant untouched. Set it to `true` only when you want the design materialized at the end of the run. If the MCP is not configured at run time, the skill records a `BLOCKED` status with the exact reason; it never writes silently or skips silently. The dashboard's project Overview surfaces an **EP Provisioning** card (`Live` / `Pending` / `Blocked`) so the live-tenant state is always visible alongside the design.

### Workflow

```
/solace-intake             → user sets preferences.provision_event_portal: true (opt-in gate)
/solace-event-portal       → designs domains, schemas, events, applications (paper artifacts)
/solace-ep-provision       → reads the design, provisions live objects via the MCP,
   (only if gate is true)    exports AsyncAPI per application, writes provisioned.yaml
```

When the intake gate is `false` (default), `/solace-plan` skips `/solace-ep-provision` — the engagement is design-only and no tenant writes happen. When the gate is `true`, the plan includes it after `/solace-event-portal`. If the MCP is unavailable at run time the skill ends with status `BLOCKED` and the plan summary surfaces the blocker explicitly rather than treating it as a silent skip.

The skill creates objects in dependency order (domain → schemas → events → applications), records every object ID for traceability, and applies a **content-match verification** before reusing any existing object — see the [skill template](solace-ep-provision/SKILL.md) for full semantics. Auto mode pauses per layer; interactive mode allows finer-grained confirmation.

### Operational notes

- **Token hygiene.** Use separate tokens for dev and production tenants. Never reuse a production token for skill experimentation. Rotate quarterly (Solace tokens default to 12-month validity; the architecture's recommended posture is 90-day rotation).
- **Idempotency is content-aware, not name-only.** A rerun against a tenant that already contains objects with matching names does *not* silently reuse them — it fetches the live object, compares semantic fields (schema content, topic addresses, produce/consume graphs), and hard-stops on mismatch. Safe to run on shared tenants.
- **Partial-failure resume.** If a run fails mid-batch, re-invoke `/solace-ep-provision`. The same content-match flow detects what was already created and resumes from there.
- **AsyncAPI export.** Every provisioned application emits an AsyncAPI document to `13-event-portal/asyncapi/<application-name>.yaml`. Wire these into your service repos for code generation and contract testing.

## Supported hosts

Solace Architect generates adapted SKILL.md files for 10 AI coding agent hosts:

| Host | Skill root |
|------|------------|
| Claude Code (primary) | `.claude/skills/solace-architect/` |
| OpenAI Codex | `.agents/skills/solace-architect/` |
| Factory | `.factory/skills/solace-architect/` |
| Kiro | `.kiro/skills/solace-architect/` |
| OpenCode | `.config/opencode/skills/solace-architect/` |
| Slate | `.slate/skills/solace-architect/` |
| Cursor | `.cursor/skills/solace-architect/` |
| OpenClaw | `.openclaw/skills/solace-architect/` |
| Hermes | `.hermes/skills/solace-architect/` |
| GBrain | `.gbrain/skills/solace-architect/` |

Each host gets adapted SKILL.md files with appropriate frontmatter, path rewrites, and tool name translations.

External host directories (`.agents/`, `.cursor/`, `.kiro/`, etc.) are **gitignored** — they are build artifacts generated from the `.tmpl` source templates. After cloning, run `bun run build` to generate skill files for all hosts:

```bash
bun run build                          # generate for all 10 hosts
bun run gen:skill-docs --host codex    # generate for a single host
```

For Claude Code, `./install-sa.sh` handles generation and symlinks in one step.

## Grounding documents

The `solace-grounding/` directory contains the authoritative source material:

| Document | Purpose |
|----------|---------|
| `solace-platform-reference.md` | What Solace Architect is accountable to know. Three-layer model: Event Mesh, Application Services, Platform Services. |
| `solace-canonical-sources.md` | URL-by-topic retrieval index. When depth is needed, fetch from these URLs. |
| `solace-reference-architectures.md` | Three worked patterns: multi-system AI assistant, real-time market data distribution, hybrid IT/OT manufacturing. |
| `antipatterns.md` | Known mistakes organized by category: topic design, SAM, mesh topology, delivery mode, integration. |
| `integration-hub-catalog.md` | Snapshot of available Micro-Integrations from solace.com/integration-hub. Refreshed monthly. |
| `claude-instructions.md` | Claude-specific operating instructions for Solace Architect. |
| `gaps.md` | Gap tracker for missing grounding document coverage. Skills append at runtime when grounding is missing. |
| `MAINTENANCE.md` | Refresh manifest for all external resources with cadence and version tracking. |
| `managed/digest.md` | Optional **organizational** grounding: a customer's own standards, landscape, and constraints, curated by a maintainer. Loaded by every skill and cited `[managed-ref:]`, distinct from Solace platform grounding. Ships empty. |

## How it works

```
SKILL.md.tmpl          Human-written skill logic + {{PLACEHOLDERS}}
       |
gen-skill-docs.ts      Resolves placeholders, applies host transforms
       |
SKILL.md               Committed, auto-generated, ready for the agent to read
```

Skills use a preamble tier system (T1–T4) that controls which shared sections are included. Every skill gets grounding rules and naming conventions. Interactive skills (T2+) also get the AskUserQuestion format, writing style, and completeness principle. Code-modifying skills (T3+) add search-before-building and repo ownership.

## Working principles

Four principles drive every skill: **Boil the Lake** (completeness is cheap with AI), **Search Before Building** (Solace docs → community → first principles), **Accuracy Over Fluency** (say "I don't know" rather than fabricate), and **User Sovereignty** (AI recommends, users decide). See [docs/ethos.md](docs/ethos.md) for the full philosophy.

## Development

```bash
bun test             # skill validation (<2s, free)
bun run build        # regenerate all SKILL.md files
bun run skill:check  # health dashboard
bun run dev:skill    # watch mode: auto-regen on change
bun run url:check    # check grounding document URLs for health
bun run dashboard    # project dashboard at localhost:3000
bun run intake       # intake HTML form at localhost:3001
bun run grounding    # managed-grounding admin console at localhost:3002
```

The test suite checks terminology compliance (zero forbidden terms), structural validation (frontmatter, placeholders, preamble tiers), token budget enforcement (per-skill and total ceilings), and generation freshness (committed files match templates).

See [CLAUDE.md](CLAUDE.md) for full development instructions and [docs/architecture.md](docs/architecture.md) for how the template pipeline works.

## Origin

Solace Architect's template pipeline, multi-host generation, preamble tier system, and resolver architecture are adapted from [gStack](https://github.com/garrytan/gstack) by Garry Tan. The domain expertise, grounding documents, naming conventions, and voice are original to Solace Architect.

## License

MIT
