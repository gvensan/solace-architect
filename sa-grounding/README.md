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

Solace Architect is a fork of [gStack](https://github.com/garrytan/gstack) with the skill layer replaced. gStack's skills encode cognitive roles (CEO, eng manager, QA). Solace Architect's encode Solace domain expertise. The fork inherits gStack's infrastructure — Conductor for parallel sessions, the slash-command framework, the skill-loading model — and swaps the content layer.

Forking lets the project start with proven infrastructure and focus on the part that matters: the expertise.

## Project layout

Four documents anchor the work, each with a distinct job:

1. `solace-platform-reference.md` is the in-scope coverage map. It defines what capabilities Solace Architect is accountable to know about, organized into the Solace Platform's three layers (Event Mesh, Application Services, Platform Services) plus cross-cutting concerns.
2. `solace-canonical-sources.md` is the URL-by-topic retrieval index. When a skill needs depth, this is where it learns where to fetch from.
3. `solace-reference-architectures.md` holds worked examples of how Solace components compose to solve real architectural problems. Three patterns to start: a multi-system AI assistant, real-time market data distribution, and a hybrid IT/OT manufacturing event mesh.
4. The project's **Instructions** field carries identity, accuracy discipline, voice, and naming conventions that govern every skill output. It is the operational document; the three reference files are the substantive ones.

Read in that order if you're new. The platform reference orients you to the surface. The canonical sources tell you where to read for depth. The reference architectures show how the surface composes for real problems. The Instructions govern how skills behave on top of all of it.

## Current state

Early scoping. The four grounding documents exist. The gStack fork has not yet been executed; no skill files exist yet. The first real test of this groundwork will be the first skill drafted against it.

The bank chat agent is the working example for prototyping and validation. When skills exist, they will be exercised against that example first.

## Open questions

A few things are pending stakeholder review. Captured here so they don't disappear:

1. The Gateway-to-Entrypoint terminology transition. Project notes indicate user-facing prose is moving to "Entrypoint"; the current published SAM documentation still uses "Gateway." Resolution will affect any skill output that names SAM components.
2. The "GDK" (Gateway Development Kit) terminology. Named explicitly in current SAM architecture documentation; project history flags the term as having a complicated past.
3. Distribution model. Personal repository versus Solace open-source organization has not been decided.
4. The name "Solace Architect" itself is a working title until confirmed.

These do not block continued work on skills and grounding. They block external publication of content that depends on them.

## Working principles

Two rules govern any contribution to the project, whether human or skill-generated:

1. **Strict grounding in Solace.** Every claim, capability, and architectural recommendation grounds in `docs.solace.com`, `solacelabs.github.io`, the SolaceLabs GitHub organization, or the Solace Integration Hub. No reasoning by analogy from Kafka, RabbitMQ, MuleSoft, AWS messaging, or any other vendor or open-source system. Cross-platform comparisons are appropriate only when a Solace source explicitly addresses them.
2. **Accuracy over fluency.** Solace's specific terminology is non-negotiable. Micro-Integration, not "connector." Direct messaging and Guaranteed messaging, not generic "QoS levels." Inferred or unverified claims are flagged as such, never presented as fact.

The full conventions, including voice principles for any external-facing content, live in the project Instructions.

---

Solace Architect is led by Giri Venkatesan, Developer Advocate at Solace.