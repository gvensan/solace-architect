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
./setup              # full install: deps + generate + symlink into ~/.claude/skills/
./uninstall          # remove all skill symlinks from ~/.claude/skills/
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

## Available skills

| Category | Skill | Slash command |
|----------|-------|--------------|
| Discovery | Discovery | `/solace-discovery` |
| Technical | Topic Design | `/solace-topic-design` |
| Technical | Broker Selection | `/solace-broker-select` |
| Technical | SAM Design | `/solace-sam-design` |
| Technical | Protocol Selection | `/solace-protocol-select` |
| Technical | Mesh Design | `/solace-mesh-design` |
| Technical | HA/DR Design | `/solace-ha-dr` |
| Technical | Migration Planning | `/solace-migration` |
| Technical | Integration Design | `/solace-integration` |
| Review | Architecture Review | `/solace-architect-review` |
| Review | Operations Review | `/solace-ops-review` |
| Review | Security Review | `/solace-security-review` |
| Review | Developer Review | `/solace-dev-review` |
| Orchestration | Plan | `/solace-plan` |
| Validation | Validate | `/solace-validate` |
| Assembly | Blueprint | `/solace-blueprint` |
| Utility | Help | `/solace-help` |

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool.

- Architecture discovery, new project scoping -> invoke /solace-discovery
- Help, available skills, workflow, getting started -> invoke /solace-help
- Plan a full engagement, orchestrate skills -> invoke /solace-plan
- Topic taxonomy, topic hierarchy design -> invoke /solace-topic-design
- Broker type selection, cloud vs software vs appliance -> invoke /solace-broker-select
- SAM, agent mesh, AI assistant design -> invoke /solace-sam-design
- Protocol selection -> invoke /solace-protocol-select
- DMR, mesh topology, multi-site -> invoke /solace-mesh-design
- HA, DR, replication, failover -> invoke /solace-ha-dr
- Migration from Kafka, RabbitMQ, TIBCO, IBM MQ -> invoke /solace-migration
- Micro-Integration strategy -> invoke /solace-integration
- Architecture review -> invoke /solace-architect-review
- Operations review -> invoke /solace-ops-review
- Security review -> invoke /solace-security-review
- Developer experience review -> invoke /solace-dev-review
- Validation, consistency checks -> invoke /solace-validate
- Blueprint assembly -> invoke /solace-blueprint

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
    resolvers/            # Template resolver modules
      index.ts            # Resolver registry (8 entries)
      types.ts            # TemplateContext, HostPaths, Host type
      composition.ts      # INVOKE_SKILL resolver
      utility.ts          # BASE_BRANCH_DETECT, CO_AUTHOR_TRAILER
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
    claude-instructions.md
    gaps.md               # Grounding document gap tracker
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
  setup                   # Install script
  uninstall               # Remove script
  VERSION                 # Current version tag
  IMPROVEMENTS.md         # Skill improvement tracking from feedback
  ARCHITECTURE.md         # How the template pipeline works
  GETTING-STARTED.md      # Full walkthrough of a complete engagement
  ETHOS.md                # Working principles
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

Run `bun run build` to regenerate for all hosts. Run `bun run gen:skill-docs`
for Claude host only.

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
