# Solace Architect development

Solace Architect is a Claude Code skill toolkit for event-driven architecture
on the Solace platform. Every recommendation must be grounded in Solace
documentation — no fabricated features, no borrowed concepts from other
messaging platforms.

## Commands

```bash
bun install          # install dependencies
bun test             # run skill validation + gen-skill-docs quality checks
bun run build        # regenerate SKILL.md files for all hosts
bun run gen:skill-docs            # regenerate SKILL.md for claude host only
bun run gen:skill-docs --host all # regenerate for all 10 hosts
bun run skill:check  # health dashboard for all skills
bun run dev:skill    # watch mode: auto-regen + validate on change
bun run url:check    # check all grounding document URLs for health
bun run dashboard    # launch project dashboard at http://localhost:3000
bun run intake       # launch interactive intake HTML form at http://localhost:3001
./install-sa.sh      # full install: deps + generate + symlink into ~/.claude/skills/
./uninstall-sa.sh    # remove all skill symlinks from ~/.claude/skills/
```

## Grounding documents

All architectural recommendations must be grounded in Solace documentation.
The authoritative sources live in `solace-grounding/`:

| Document | Purpose |
|----------|---------|
| `solace-platform-reference.md` | Coverage map. What Solace Architect is accountable to know about. |
| `solace-canonical-sources.md` | URL-by-topic retrieval index. When you need depth, fetch from these URLs. |
| `solace-reference-architectures.md` | Worked examples of how Solace components compose. |
| `antipatterns.md` | Known mistakes organized by category. Every skill checks output against this. |
| `integration-hub-catalog.md` | Snapshot of available Micro-Integrations from solace.com/integration-hub. Refreshed monthly. |
| `claude-instructions.md` | Claude-specific operating instructions for Solace Architect. |
| `gaps.md` | Gap tracker for missing grounding document coverage. |
| `MAINTENANCE.md` | Refresh manifest for all external resources with cadence and version tracking. |

Rules:
- Only assert what you can ground in `docs.solace.com`, `solacelabs.github.io/solace-agent-mesh`, `github.com/SolaceLabs`, or `solace.com/integration-hub`.
- Do not propose solutions built on non-existent Solace features, invented APIs, or techniques borrowed from other messaging vendors.
- When a capability is not in the sources, say so explicitly.

## Getting started — key commands

Most users only need these:

| Command | Purpose |
|---------|---------|
| `/solace-intake` | Skip the interview — fill out a template offline, then import |
| `/solace-discovery` | Start a new project — describe systems and goals |
| `/solace-plan` | Run the full engagement (picks skills, runs them in order) |
| `/solace-projects` | Dashboard — status, timing, summary, switch projects |

`/solace-plan` reads discovery findings and orchestrates all design, review, validation,
and blueprint skills automatically.

## All available skills

| Category | Skill | Slash command |
|----------|-------|--------------|
| Start here | Intake | `/solace-intake` |
| Start here | Discovery | `/solace-discovery` |
| Start here | Plan | `/solace-plan` |
| Start here | Projects | `/solace-projects` |
| Design | Topic Design | `/solace-topic-design` |
| Design | Broker Selection | `/solace-broker-select` |
| Design | SAM Design | `/solace-sam-design` |
| Design | Protocol Selection | `/solace-protocol-select` |
| Design | Mesh Design | `/solace-mesh-design` |
| Design | HA/DR Design | `/solace-ha-dr` |
| Design | Migration Planning | `/solace-migration` |
| Design | Integration Design | `/solace-integration` |
| Design | Event Portal | `/solace-event-portal` |
| Design | Event Portal Provisioning | `/solace-ep-provision` |
| Review | Architecture Review | `/solace-architect-review` |
| Review | Operations Review | `/solace-ops-review` |
| Review | Security Review | `/solace-security-review` |
| Review | Developer Review | `/solace-dev-review` |
| Finalize | Validate | `/solace-validate` |
| Finalize | Blueprint | `/solace-blueprint` |
| Finalize | Executive Summary | `/solace-executive` |
| Utility | Diagrams | `/solace-diagrams` |
| Utility | Help | `/solace-help` |

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool.

Primary (suggest these first):
- Intake template generation, import filled intake, kickstart from template -> invoke /solace-intake
- Architecture discovery, new project scoping -> invoke /solace-discovery
- Plan a full engagement, orchestrate skills, "run everything" -> invoke /solace-plan
- Project list, project status, switch project, compare projects -> invoke /solace-projects
- Help, available skills, workflow, getting started -> invoke /solace-help

Individual skills (for re-running specific steps or skipping the orchestrator):
- Topic taxonomy, topic hierarchy design -> invoke /solace-topic-design
- Broker type selection, cloud vs software vs appliance -> invoke /solace-broker-select
- SAM, agent mesh, AI assistant design -> invoke /solace-sam-design
- Protocol selection -> invoke /solace-protocol-select
- DMR, mesh topology, multi-site -> invoke /solace-mesh-design
- HA, DR, replication, failover -> invoke /solace-ha-dr
- Migration from Kafka, RabbitMQ, TIBCO, IBM MQ -> invoke /solace-migration
- Micro-Integration strategy -> invoke /solace-integration
- Event Portal governance, application domains, event catalog, schema registry -> invoke /solace-event-portal
- Provision Event Portal model in Solace Cloud, materialize design via EP Designer MCP -> invoke /solace-ep-provision (opt-in gate: requires `preferences.provision_event_portal: true` at intake; never auto-fires)
- Architecture review -> invoke /solace-architect-review
- Operations review -> invoke /solace-ops-review
- Security review -> invoke /solace-security-review
- Developer experience review -> invoke /solace-dev-review
- Validation, consistency checks -> invoke /solace-validate
- Blueprint assembly -> invoke /solace-blueprint
- Executive summary, business case, ROI -> invoke /solace-executive
- Regenerate diagrams, update diagrams, preview diagrams -> invoke /solace-diagrams

## Naming conventions

All output must use Solace terminology exactly:

- **Micro-Integration** (capital M, hyphenated). Never "connector" or "adapter."
- **Direct messaging** and **Guaranteed messaging**. Never "QoS" or "QoS levels."
- **OrchestratorAgent** (one word, capital O). Never "orchestrator agent."
- **Event broker service** for cloud-managed. **Solace Software Event Broker** for self-managed.
- **Gateway** in published docs. "Entrypoint" only in SAM project-internal prose.
- Topic taxonomy: `Domain/Noun/Verb/Version/Properties...`

See `scripts/resolvers/preamble/generate-naming-conventions.ts` for the full list.

## Project structure

```
solace-architect/
  hosts/                  # Typed host configs (one per AI coding agent)
    claude.ts             # Primary host config
    codex.ts              # OpenAI Codex
    factory.ts, kiro.ts, opencode.ts, slate.ts, cursor.ts, openclaw.ts, hermes.ts, gbrain.ts
    index.ts              # Registry: exports all, derives Host type
  scripts/                # Build + DX tooling
    gen-skill-docs.ts     # Template -> SKILL.md generator
    host-config.ts        # HostConfig interface + validator
    url-health-check.ts   # Grounding document URL health checker
    dashboard.ts          # Project dashboard HTTP server
    detect-bump.ts        # Version bump detection
    host-config-export.ts # CLI for host config field extraction
    parse-intake-docx.py  # DOCX intake parser (import: .docx -> YAML)
    build-intake-docx.py  # DOCX intake builder (template + export: YAML -> .docx)
    build-intake-html.py  # HTML intake form builder (standalone with autocomplete + live engagement preview)
    intake-server.ts      # Local HTTP server for hosted intake form (mirrors dashboard.ts)
    skill-routing.yaml    # Single source of truth for which skills run per intake (consumed by build-intake-html.py)
    resolvers/            # Template resolver modules
      index.ts            # Resolver registry (9 entries)
      types.ts            # TemplateContext, HostPaths, Host type
      composition.ts      # INVOKE_SKILL resolver
      utility.ts          # BASE_BRANCH_DETECT, CO_AUTHOR_TRAILER
      confidence.ts       # CONFIDENCE_CALIBRATION resolver
      finding-resolution.ts # FINDING_RESOLUTION resolver (review skills)
      preamble/           # Preamble generators (per-tier)
    discover-skills.ts    # Shared .tmpl discovery
    skill-check.ts        # Health dashboard
    dev-skill.ts          # Watch mode
    models.ts             # Model registry
    jargon-list.json      # EDA/Solace jargon (68 terms)
  solace-grounding/       # Solace platform grounding documents
    solace-platform-reference.md
    solace-canonical-sources.md
    solace-reference-architectures.md
    antipatterns.md
    integration-hub-catalog.md
    claude-instructions.md
    gaps.md               # Grounding document gap tracker
    MAINTENANCE.md        # Refresh manifest with cadence and version tracking
  solace-intake/          # /solace-intake
  solace-discovery/       # /solace-discovery
  solace-topic-design/    # /solace-topic-design
  solace-broker-select/   # /solace-broker-select
  solace-sam-design/      # /solace-sam-design
  solace-protocol-select/ # /solace-protocol-select
  solace-mesh-design/     # /solace-mesh-design
  solace-ha-dr/           # /solace-ha-dr
  solace-migration/       # /solace-migration
  solace-integration/     # /solace-integration
  solace-architect-review/  # /solace-architect-review
  solace-ops-review/      # /solace-ops-review
  solace-security-review/ # /solace-security-review
  solace-dev-review/      # /solace-dev-review
  solace-plan/            # /solace-plan
  solace-validate/        # /solace-validate
  solace-blueprint/       # /solace-blueprint
  solace-event-portal/    # /solace-event-portal
  solace-ep-provision/    # /solace-ep-provision
  solace-executive/       # /solace-executive
  solace-diagrams/        # /solace-diagrams
  solace-projects/        # /solace-projects
  solace-help/            # /solace-help
  test/                   # Test suite
    helpers/              # Shared test utilities (skill-parser)
    fixtures/             # Scenario fixtures for eval testing
    skill-terminology.test.ts
    skill-structure.test.ts
    skill-token-budget.test.ts
    skill-gen.test.ts
  projects/               # Project data (gitignored, local to user)
  SKILL.md.tmpl           # Root skill template
  SKILL.md                # Generated root skill
  install-sa.sh           # Install script
  uninstall-sa.sh         # Remove script
  VERSION                 # Current version tag
  ARCHITECTURE.md         # How the template pipeline works
  GETTING-STARTED.md      # Full walkthrough of a complete engagement
  ETHOS.md                # Working principles
  SLASH-COMMANDS.md       # Slash command reference
  docs/                   # Strategy and planning docs
    improvements.md       # Skill improvement tracking from feedback
    saas-strategy.md      # Forward-looking SaaS design discussion
  conductor.json          # Conductor configuration
  package.json            # Build scripts
```

## SKILL.md workflow

SKILL.md files are **generated** from `.tmpl` templates. To update:

1. Edit the `.tmpl` file (e.g. `solace-discovery/SKILL.md.tmpl`)
2. Run `bun run gen:skill-docs` (or `bun run build` for all hosts)
3. Commit both the `.tmpl` and generated `.md` files

**Token ceiling:** Generated SKILL.md files trip a warning above 160KB (~40K tokens).
This guards against runaway preamble growth, not against well-designed large skills.

**Merge conflicts on SKILL.md files:** NEVER resolve conflicts on generated SKILL.md
files by accepting either side. Instead: (1) resolve conflicts on the `.tmpl` templates
and `scripts/gen-skill-docs.ts`, (2) run `bun run gen:skill-docs` to regenerate,
(3) stage the regenerated files.

## Writing SKILL templates

SKILL.md.tmpl files are **prompt templates read by Claude**, not bash scripts.
Each bash code block runs in a separate shell. Variables do not persist between blocks.

Rules:
- **Use natural language for logic and state.** Don't use shell variables to pass
  state between code blocks. Tell Claude what to remember in prose.
- **Don't hardcode branch names.** Detect `main`/`master`/etc dynamically.
  Use `{{BASE_BRANCH_DETECT}}` for PR-targeting skills.
- **Keep bash blocks self-contained.** Each code block should work independently.
- **Express conditionals as English.** Instead of nested `if/elif/else` in bash,
  write numbered decision steps: "1. If X, do Y. 2. Otherwise, do Z."

## Writing style

Default output from every tier-2+ skill follows the Writing Style section in
`scripts/resolvers/preamble.ts`: jargon glossed on first use (curated list in
`scripts/jargon-list.json`, baked at gen-skill-docs time), questions framed in
outcome terms, short sentences, decisions close with user impact. Use Solace
terminology precisely per the Naming Conventions section in the preamble.

## Multi-host generation

Solace Architect generates SKILL.md files for 10 AI coding agent hosts:

| Host | Config | Skill root |
|------|--------|------------|
| Claude (primary) | `hosts/claude.ts` | `.claude/skills/solace-architect` |
| Codex | `hosts/codex.ts` | `.agents/skills/solace-architect` |
| Factory | `hosts/factory.ts` | `.factory/skills/solace-architect` |
| Kiro | `hosts/kiro.ts` | `.kiro/skills/solace-architect` |
| OpenCode | `hosts/opencode.ts` | `.config/opencode/skills/solace-architect` |
| Slate | `hosts/slate.ts` | `.slate/skills/solace-architect` |
| Cursor | `hosts/cursor.ts` | `.cursor/skills/solace-architect` |
| OpenClaw | `hosts/openclaw.ts` | `.openclaw/skills/solace-architect` |
| Hermes | `hosts/hermes.ts` | `.hermes/skills/solace-architect` |
| GBrain | `hosts/gbrain.ts` | `.gbrain/skills/solace-architect` |

External host directories (`.agents/`, `.cursor/`, `.kiro/`, etc.) are **gitignored** —
they are build artifacts generated from `.tmpl` source templates. After cloning, run
`bun run build` to generate for all hosts. Run `bun run gen:skill-docs` for Claude
host only.

## Commit style

**Always bisect commits.** Every commit should be a single logical change.
Split into separate commits before pushing. Each commit should be independently
understandable and revertable.

## Search before building

Before designing any solution that involves concurrency, unfamiliar patterns,
infrastructure, or anything where the runtime/framework might have a built-in:

1. Search for "{runtime} {thing} built-in"
2. Search for "{thing} best practice {current year}"
3. Check official runtime/framework docs

Three layers of knowledge: tried-and-true (Layer 1), new-and-popular (Layer 2),
first-principles (Layer 3). Prize Layer 3 above all. See ETHOS.md for the full
philosophy.
