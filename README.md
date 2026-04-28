# Solace Architect

An open-source Claude Code skill toolkit for event-driven architecture on the Solace platform.

Solace Architect gives AI coding agents structured, grounded expertise in Solace event brokers, Solace Agent Mesh (SAM), topic taxonomy design, broker selection, migration planning, and operational patterns. Every recommendation is grounded in Solace documentation. No fabricated features, no borrowed concepts from other messaging platforms.

## Who it's for

- **Architects** designing event-driven systems on Solace — greenfield or migration.
- **Solace SAs** during customer engagements who need structured discovery and defensible blueprints.
- **Developers** evaluating Solace for a new project who want to understand the platform's capabilities and trade-offs.

## What it does

Solace Architect is a set of skills (prompt templates) that AI coding agents read at invocation time. Each skill walks the agent through a structured workflow: asking the right questions, matching against reference architectures, applying Solace naming conventions, and producing concrete architectural artifacts.

The skills enforce:
- **Strict Solace grounding.** Every claim backed by `docs.solace.com`, SAM project docs, or SolaceLabs GitHub. When a capability is not documented, the agent says so.
- **Accurate terminology.** Micro-Integration (not "connector"). Direct messaging and Guaranteed messaging (not "QoS levels"). OrchestratorAgent (not "orchestrator agent"). See the full naming conventions in any generated SKILL.md.
- **Senior architect voice.** Concrete, direct, tied to operational outcomes. No AI vocabulary, no vendor pitch, no hedging without naming what it depends on.

## Installation

Prerequisites: [Bun](https://bun.sh) >= 1.0.0

```bash
git clone https://github.com/solacecommunity/solace-architect.git
cd solace-architect
./setup
```

The setup script installs dependencies, generates SKILL.md files for all supported hosts, and creates symlinks in `~/.claude/skills/`.

## Skill categories

### Shipped

| Skill | Command | Description |
|-------|---------|-------------|
| Discovery | `/solace-discovery` | Structured elicitation for event-driven architecture projects. Asks about systems, boundaries, events, protocols, requirements, and goals. Matches against reference architectures. Produces a discovery brief. |
| Help | `/solace-help` | Lists available skills, shows recommended workflow, displays active project status. |

### Planned

| Category | Description | Planned skills |
|----------|-------------|---------------|
| Role-based | Architect, developer, ops, security perspectives | Planned |
| Technical domain | Solace platform knowledge, artifact generation | `/solace-topic-design`, `/solace-broker-select`, `/solace-sam-design` |
| Orchestration | Skill sequencing, context threading | Planned |
| Validation | Consistency checks, antipattern detection | `/solace-validate` |

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

## Grounding documents

The `solace-grounding/` directory contains the authoritative source material:

| Document | Purpose |
|----------|---------|
| `solace-platform-reference.md` | What Solace Architect is accountable to know. Three-layer model: Event Mesh, Application Services, Platform Services. |
| `solace-canonical-sources.md` | URL-by-topic retrieval index. When depth is needed, fetch from these URLs. |
| `solace-reference-architectures.md` | Three worked patterns: multi-system AI assistant, real-time market data distribution, hybrid IT/OT manufacturing. |
| `antipatterns.md` | Known mistakes organized by category: topic design, SAM, mesh topology, delivery mode, integration. |
| `claude-instructions.md` | Claude-specific operating instructions for Solace Architect. |

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

1. **Boil the Lake.** AI makes completeness cheap. Do the complete thing.
2. **Search Before Building.** Check Solace docs first, then community content, then reason from first principles. Three layers: documentation, community/labs, original reasoning.
3. **Accuracy Over Fluency.** Ground every claim in Solace documentation. Say "I don't know" rather than fabricate.
4. **User Sovereignty.** AI recommends, users decide. No skipping the verification step.

See [ETHOS.md](ETHOS.md) for the full philosophy.

## Development

```bash
bun test             # skill validation (<2s, free)
bun run build        # regenerate all SKILL.md files
bun run skill:check  # health dashboard
bun run dev:skill    # watch mode: auto-regen on change
```

See [CLAUDE.md](CLAUDE.md) for full development instructions and [ARCHITECTURE.md](ARCHITECTURE.md) for how the template pipeline works.

## Origin

Solace Architect's template pipeline, multi-host generation, preamble tier system, and resolver architecture are adapted from [gStack](https://github.com/garrytan/gstack) by Garry Tan. The domain expertise, grounding documents, naming conventions, and voice are original to Solace Architect.

## License

MIT
