# Solace Architect

Senior architects working with Solace don't lack documentation. The platform's docs are thorough, and Solace publishes solution briefs, white papers, and customer references for every vertical it serves. What's missing is the layer between: a structured way to take a specific business problem and arrive at a defensible Solace architecture without manually stitching together dozens of pages and tribal knowledge.

Solace Architect is an open-source toolkit for Claude Code that closes that gap. It walks an architect from "I have this problem" to a complete blueprint covering Micro-Integration strategy, event topology, broker configuration, agent topology where relevant, and the YAML to run it on Solace.

## What it does

Solace Architect is a set of 25 skills that compose into an interview-style architectural session. The skills cover seven categories:

1. **Discovery.** Eliciting the business problem clearly. Surfacing latency, throughput, regulatory, organizational, and budget constraints. Inventorying the existing landscape.
2. **Technical domain.** Solace platform knowledge: topic taxonomy design, broker selection, SAM agent topology, protocol selection, DMR mesh design, HA/DR, migration planning, and Micro-Integration strategy.
3. **Review.** Applying architect, developer, ops, and security perspectives to the current design.
4. **Orchestration.** Sequencing skills based on dependencies, threading context and decisions across skill invocations.
5. **Validation.** Consistency checks, antipattern detection, completeness checks before the blueprint goes to engineering.
6. **Assembly.** Final blueprint assembly into an engineering handoff package.
7. **Change.** Mid-engagement change requests: capture, classification, blast-radius analysis from the declared skill dependency graph, and confirmed re-runs of the affected skills in order.

The toolkit is anchored to event-driven architecture broadly, not to Solace Agent Mesh specifically. Event mesh-only architectures are a first-class output. SAM enters when the problem genuinely calls for it.

## How it's built

Solace Architect uses a template pipeline that generates host-adapted SKILL.md files from `.tmpl` templates. The pipeline resolves placeholders, applies per-host transforms (frontmatter, path rewrites, tool name translations), and enforces consistent Solace terminology and grounding discipline across all generated skills.

The template infrastructure supports 10 AI coding agent hosts (Claude Code, Codex, Factory, Kiro, OpenCode, Slate, Cursor, OpenClaw, Hermes, GBrain).

## Grounding documents

Eight documents anchor the Solace **platform** grounding:

| Document | Purpose |
|----------|---------|
| `solace-platform-reference.md` | In-scope coverage map. Defines what Solace Architect is accountable to know, organized into Event Mesh, Application Services, and Platform Services. |
| `solace-canonical-sources.md` | URL-by-topic retrieval index. When a skill needs depth, this is where it learns where to fetch from. |
| `solace-reference-architectures.md` | Three worked patterns: multi-system AI assistant, real-time market data distribution, hybrid IT/OT manufacturing event mesh. |
| `antipatterns.md` | Known mistakes organized by category. Every technical domain and validation skill checks output against this library. |
| `integration-hub-catalog.md` | Point-in-time snapshot of Solace Integration Hub. Skills match backend systems against available Micro-Integrations. |
| `claude-instructions.md` | Identity, accuracy discipline, voice, and naming conventions that govern every skill output. |
| `gaps.md` | Gap tracker. Records when a skill can't find what it needs in the grounding documents. |
| `MAINTENANCE.md` | Refresh manifest. Tracks all external resources, their refresh cadence, and version numbers. |

Read in this order if you're new: platform reference (orients you to the surface), canonical sources (where to read for depth), reference architectures (how the surface composes for real problems), claude-instructions (how skills behave on top of all of it).

Alongside the platform docs, `managed/` holds an **organizational** grounding layer: admin-curated reference material for a specific customer's own standards, landscape, and constraints (see `managed/README.md`). It is distinct from Solace platform grounding — every skill loads it and cites it `[managed-ref: <title>]`, and it is applied as reference material, never as instructions. It ships empty; maintainers populate `managed/digest.md` per deployment.

## Working principles

Two rules govern any contribution to the project, whether human or skill-generated:

1. **Strict grounding in Solace.** Every claim, capability, and architectural recommendation grounds in `docs.solace.com`, `solacelabs.github.io`, the SolaceLabs GitHub organization, or the Solace Integration Hub. No reasoning by analogy from Kafka, RabbitMQ, MuleSoft, AWS messaging, or any other vendor or open-source system. Cross-platform comparisons are appropriate only when a Solace source explicitly addresses them.
2. **Accuracy over fluency.** Solace's specific terminology is non-negotiable. Micro-Integration, not "connector." Direct messaging and Guaranteed messaging, not generic "QoS levels." Inferred or unverified claims are flagged as such, never presented as fact.

The full conventions, including voice principles for any external-facing content, live in `claude-instructions.md`.

---

Solace Architect is led by Giri Venkatesan, Developer Advocate at Solace.
