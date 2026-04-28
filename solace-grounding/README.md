# Solace Architect

Senior architects working with Solace don't lack documentation. The platform's docs are thorough, and Solace publishes solution briefs, white papers, and customer references for every vertical it serves. What's missing is the layer between: a structured way to take a specific business problem and arrive at a defensible Solace architecture without manually stitching together dozens of pages and tribal knowledge.

Solace Architect is an open-source toolkit for Claude Code that closes that gap. It walks an architect from "I have this problem" to a complete blueprint covering Micro-Integration strategy, event topology, broker configuration, agent topology where relevant, and the YAML to run it on Solace.

## What it does

Solace Architect is a set of skills that compose into an interview-style architectural session. The skills cover five categories:

1. **Discovery.** Eliciting the business problem clearly. Surfacing latency, throughput, regulatory, organizational, and budget constraints. Inventorying the existing landscape.
2. **Role-based.** Applying architect, developer, ops, and security perspectives to the current problem.
3. **Technical domain.** Solace platform knowledge across event mesh, application services, and platform services, plus cross-cutting concerns like deployment topology, security, performance and sizing, migration, observability, and governance.
4. **Orchestration.** Sequencing skills based on dependencies, threading context and decisions across skill invocations.
5. **Validation.** Consistency checks, antipattern detection, completeness checks before the blueprint goes to engineering.

The toolkit is anchored to event-driven architecture broadly, not to Solace Agent Mesh specifically. Event mesh-only architectures are a first-class output. SAM enters when the problem genuinely calls for it.

## How it's built

Solace Architect uses a template pipeline that generates host-adapted SKILL.md files from `.tmpl` templates. The pipeline resolves placeholders, applies per-host transforms (frontmatter, path rewrites, tool name translations), and enforces consistent Solace terminology and grounding discipline across all generated skills.

The template infrastructure supports 10 AI coding agent hosts (Claude Code, Codex, Factory, Kiro, OpenCode, Slate, Cursor, OpenClaw, Hermes, GBrain).

## Project layout

Four documents anchor the work, each with a distinct job:

1. `solace-platform-reference.md` is the in-scope coverage map. It defines what capabilities Solace Architect is accountable to know about, organized into the Solace Platform's three layers (Event Mesh, Application Services, Platform Services) plus cross-cutting concerns.
2. `solace-canonical-sources.md` is the URL-by-topic retrieval index. When a skill needs depth, this is where it learns where to fetch from.
3. `solace-reference-architectures.md` holds worked examples of how Solace components compose to solve real architectural problems. Three patterns to start: a multi-system AI assistant, real-time market data distribution, and a hybrid IT/OT manufacturing event mesh.
4. `claude-instructions.md` carries identity, accuracy discipline, voice, and naming conventions that govern every skill output.

Read in that order if you're new. The platform reference orients you to the surface. The canonical sources tell you where to read for depth. The reference architectures show how the surface composes for real problems. The instructions govern how skills behave on top of all of it.

## Current state

Early development. The template pipeline is operational. The discovery skill (`/solace-discovery`) is shipped. The grounding documents are in place. More skills are planned across the remaining four categories.

The bank chat agent is the working example for prototyping and validation. When new skills are drafted, they are exercised against that example first.

## Working principles

Two rules govern any contribution to the project, whether human or skill-generated:

1. **Strict grounding in Solace.** Every claim, capability, and architectural recommendation grounds in `docs.solace.com`, `solacelabs.github.io`, the SolaceLabs GitHub organization, or the Solace Integration Hub. No reasoning by analogy from Kafka, RabbitMQ, MuleSoft, AWS messaging, or any other vendor or open-source system. Cross-platform comparisons are appropriate only when a Solace source explicitly addresses them.
2. **Accuracy over fluency.** Solace's specific terminology is non-negotiable. Micro-Integration, not "connector." Direct messaging and Guaranteed messaging, not generic "QoS levels." Inferred or unverified claims are flagged as such, never presented as fact.

The full conventions, including voice principles for any external-facing content, live in `claude-instructions.md`.

---

Solace Architect is led by Giri Venkatesan, Developer Advocate at Solace.
