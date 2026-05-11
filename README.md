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

Solace Architect is a toolkit of 23 skills (prompt templates) that AI coding agents read at invocation time. Each skill walks the agent through a structured workflow: asking the right questions, matching against reference architectures, applying Solace naming conventions, and producing concrete architectural artifacts.

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
./setup
```

The setup script installs dependencies, generates SKILL.md files for all supported hosts, and creates symlinks in `~/.claude/skills/`.

## Skill categories

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
| Finalize | Executive | `/solace-executive` | Executive summary for CXO and business leaders: ROI, risk reduction, strategic value. |
| Utility | Projects | `/solace-projects` | Project dashboard: status, timing, summary, compare, switch projects. |
| Utility | Diagrams | `/solace-diagrams` | Regenerate Mermaid diagrams for the current project (all or by name). |
| Utility | Help | `/solace-help` | Lists available skills, shows recommended workflow, displays active project status. |

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

For Claude Code, `./setup` handles generation and symlinks in one step.

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
| `gaps.md` | Gap tracker for missing grounding document coverage. |
| `MAINTENANCE.md` | Refresh manifest for all external resources with cadence and version tracking. |

## How it works

```
SKILL.md.tmpl          Human-written skill logic + {{PLACEHOLDERS}}
       |
gen-skill-docs.ts      Resolves placeholders, applies host transforms
       |
SKILL.md               Committed, auto-generated, ready for the agent to read
```

Skills use a preamble tier system (T1–T4) that controls which shared sections are included. Every skill gets grounding rules and naming conventions. Interactive skills (T2+) also get the AskUserQuestion format, writing style, and completeness principle. Code-modifying skills (T3+) add search-before-building and repo ownership.

## Dashboard

Solace Architect includes a project dashboard for visualizing engagement progress.

```bash
bun run dashboard    # opens at localhost:3000
```

The dashboard shows:
- **Overview** — Skill groups (Discovery, Design, Review, Finalize) with per-skill status tiles
- **Decisions** — Design decisions and review findings with severity and resolution status
- **Artifacts** — File browser for all generated outputs
- **HTML Report** — Self-contained report with Executive Summary, architecture diagrams, and full engagement history. Print to PDF from the browser.

## Event Portal provisioning (MCP)

The `/solace-ep-provision` skill materializes the Event Portal model designed by `/solace-event-portal` into a live Solace Cloud tenant via the [Solace Event Portal Designer MCP](https://github.com/SolaceLabs/solace-platform-mcp/tree/main/solace-event-portal-designer-mcp). The MCP is published and maintained by Solace; this section covers what you need to configure it for use with Solace Architect.

> **Early Access caveat.** Solace labels the EP Designer MCP as Early Access. Per Solace's published guidance, the MCP is *"intended for use with AI assistants in a controlled environment with human oversight. Not designed for automated workflows like GitHub Actions or unattended automation systems."* The `/solace-ep-provision` skill honors this — auto mode pauses per-layer for confirmation, never silently mass-creates, and surfaces every API response.

> **Opt-in only at intake.** `/solace-ep-provision` writes to a live Solace Cloud tenant, so it never auto-fires from project type. The intake form (`/solace-intake`) has an explicit **"Provision Event Portal model after design?"** field (`preferences.provision_event_portal`). Default is `false` — a design-only engagement leaves your tenant untouched. Set it to `true` only when you want the design materialized at the end of the run. If the MCP is not configured at run time, the skill records a `BLOCKED` status with the exact reason; it never writes silently or skips silently. The dashboard's project Overview surfaces an **EP Provisioning** card (`Live` / `Pending` / `Blocked`) so the live-tenant state is always visible alongside the design.

### Prerequisites

| Requirement | Notes |
|-------------|-------|
| Solace Cloud account with Event Portal | Free tier at `https://console.solace.cloud/login/new-account` |
| Python 3.10+ | Required by the MCP runtime |
| [`uv`](https://docs.astral.sh/uv/) | Recommended — handles MCP install via `uvx`. Alternative: `pip install solace-event-portal-designer-mcp` |
| Solace API token | Must have `Event Portal > Designer > Read` + `Event Portal > Designer > Write` scopes |

### Setup steps

**1. Create an API token** in [Solace Cloud Console → Token Management](https://console.solace.cloud/account/tokens). Required scopes:
- `Event Portal > Designer > Read`
- `Event Portal > Designer > Write`

Copy the token immediately — Solace shows it once.

**2. Install `uv`** (one-time, skips MCP install entirely since `uvx` downloads on demand):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uvx --version    # verify
```

**3. Register the MCP with Claude Code.** Either use the `claude mcp add` CLI (positional syntax — the command and its args come after a `--` separator):

```bash
claude mcp add solace-event-portal-designer \
  --env SOLACE_API_TOKEN="<your-token>" \
  -- uvx --from solace-event-portal-designer-mcp solace-ep-designer-mcp
```

Or edit the MCP config file directly — more reliable across Claude Code versions (`~/.claude.json` user-level, or `.mcp.json` project-level — gitignore the latter if you use it):

```json
{
  "mcpServers": {
    "solace-event-portal-designer": {
      "command": "uvx",
      "args": [
        "--from",
        "solace-event-portal-designer-mcp",
        "solace-ep-designer-mcp"
      ],
      "env": {
        "SOLACE_API_TOKEN": "<your-token>"
      }
    }
  }
}
```

**4. Non-US region (optional).** Default base URL is `https://api.solace.cloud`. If you're on EU, AU, or SG, add `SOLACE_API_BASE_URL` to the `env` block:

| Region | URL |
|--------|-----|
| United States (default) | `https://api.solace.cloud` |
| Europe | `https://api.solacecloud.eu` |
| Australia | `https://api.solacecloud.com.au` |
| Singapore | `https://api.solacecloud.sg` |

**5. Restart Claude Code.** MCP servers load on startup — fully quit and relaunch, not just close the window.

### Verification

In Claude Code, ask:

> List all application domains in my Event Portal.

| Response | Meaning |
|----------|---------|
| Returns a list (possibly empty) | MCP is configured correctly |
| *"Tool not found"* | MCP didn't load — check config syntax, restart Claude Code |
| *"Authentication failed"* | Token wrong, expired, or missing scope — re-create in Cloud Console |
| *"Connection refused / timeout"* | Wrong region URL — set `SOLACE_API_BASE_URL` |

When you next run `/solace-ep-provision`, its Step 1 makes this same read-only call automatically — failures here surface before any provisioning writes are attempted.

### Workflow

```
/solace-intake             → user sets preferences.provision_event_portal: true (opt-in gate)
/solace-event-portal       → designs domains, schemas, events, applications (paper artifacts)
/solace-ep-provision       → reads the design, provisions live objects via the MCP,
   (only if gate is true)    exports AsyncAPI per application, writes provisioned.yaml
```

When the intake gate is `false` (default), `/solace-plan` simply skips `/solace-ep-provision` — the engagement is design-only and no tenant writes happen. When the gate is `true`, the plan includes it after `/solace-event-portal`. If the MCP is unavailable at run time the skill ends with status `BLOCKED` and the plan summary surfaces the blocker explicitly rather than treating it as a silent skip.

The skill creates objects in dependency order (domain → schemas → events → applications), records every object ID for traceability, and applies a **content-match verification** before reusing any existing object — see the [skill template](solace-ep-provision/SKILL.md) for full semantics. Auto mode pauses per layer; interactive mode allows finer-grained confirmation.

### Operational notes

- **Token hygiene.** Use separate tokens for dev and production tenants. Never reuse a production token for skill experimentation. Rotate quarterly (Solace tokens default to 12-month validity; the architecture's recommended posture is 90-day rotation).
- **Idempotency is content-aware, not name-only.** A rerun against a tenant that already contains objects with matching names does *not* silently reuse them — it fetches the live object, compares semantic fields (schema content, topic addresses, produce/consume graphs), and hard-stops on mismatch. Safe to run on shared tenants.
- **Partial-failure resume.** If a run fails mid-batch, re-invoke `/solace-ep-provision`. The same content-match flow detects what was already created and resumes from there.
- **AsyncAPI export.** Every provisioned application emits an AsyncAPI document to `13-event-portal/asyncapi/<application-name>.yaml`. Wire these into your service repos for code generation and contract testing.

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
bun run url:check    # check grounding document URLs for health
bun run dashboard    # project dashboard at localhost:3000
./uninstall          # remove all skill symlinks
```

The test suite checks terminology compliance (zero forbidden terms), structural validation (frontmatter, placeholders, preamble tiers), token budget enforcement (per-skill and total ceilings), and generation freshness (committed files match templates).

See [CLAUDE.md](CLAUDE.md) for full development instructions and [ARCHITECTURE.md](ARCHITECTURE.md) for how the template pipeline works.

## Origin

Solace Architect's template pipeline, multi-host generation, preamble tier system, and resolver architecture are adapted from [gStack](https://github.com/garrytan/gstack) by Garry Tan. The domain expertise, grounding documents, naming conventions, and voice are original to Solace Architect.

## License

MIT
