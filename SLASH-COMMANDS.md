# Slash Commands Reference

Solace Architect provides 21 slash commands organized into five categories: Start Here, Design, Review, Finalize, and Utility. Every command can run standalone — `/solace-plan` sequences them automatically, but you can invoke any command directly when you know what you need.

---

## Quick Reference

| Command | Category | One-line Description |
|---------|----------|---------------------|
| `/solace-intake` | Start Here | Generate an intake template for offline collection, or import a completed one to kickstart |
| `/solace-discovery` | Start Here | Elicit system landscape, requirements, and goals for a new project |
| `/solace-plan` | Start Here | Orchestrate all skills in sequence for a complete engagement |
| `/solace-projects` | Start Here | Dashboard: list projects, view status, switch, archive, compare |
| `/solace-topic-design` | Design | Map data flows to `Domain/Noun/Verb/Version/Properties` topics |
| `/solace-broker-select` | Design | Choose between Event broker service, Software Event Broker, or Appliance |
| `/solace-sam-design` | Design | Design Solace Agent Mesh topology: agents, Gateways, OrchestratorAgent |
| `/solace-protocol-select` | Design | Assign SMF, MQTT, AMQP, JMS, REST, or WebSocket per integration point |
| `/solace-mesh-design` | Design | Design DMR topology for multi-site, multi-cloud, or hybrid deployments |
| `/solace-ha-dr` | Design | Configure HA redundancy groups and cross-site DR replication |
| `/solace-integration` | Design | Design Micro-Integration strategy for backend connectivity |
| `/solace-migration` | Design | Plan phased migration from Kafka, RabbitMQ, TIBCO, or IBM MQ |
| `/solace-architect-review` | Review | Evaluate trade-offs, component choices, and simpler alternatives |
| `/solace-ops-review` | Review | Assess monitoring, failure modes, capacity, and day-2 readiness |
| `/solace-security-review` | Review | Audit ACLs, TLS, authentication, authorization, and compliance |
| `/solace-dev-review` | Review | Evaluate topic usability, SDK choices, onboarding, and schema governance |
| `/solace-validate` | Finalize | Run antipattern detection, consistency checks, and requirement tracing |
| `/solace-blueprint` | Finalize | Assemble all artifacts into a single engineering handoff package |
| `/solace-executive` | Finalize | Executive summary for CXO: ROI, risk reduction, strategic value |
| `/solace-diagrams` | Utility | Regenerate Mermaid diagrams for the current project (all or by name) |
| `/solace-help` | Utility | Show available skills, workflow overview, and active project status |

---

## How to Start

There is no single entry point. How you start depends on what you have and what you need.

### Scenario 1: New project, interactive discovery

You have a rough idea of the system and want a guided conversation.

```
/solace-discovery     → asks structured questions, produces a discovery brief
/solace-plan          → reads the brief, sequences all skills, runs the engagement
```

This is the most common path. Discovery takes 15–20 minutes of conversation. Plan runs everything else automatically (or interactively, your choice).

### Scenario 2: New project, from an intake template

You want to collect requirements offline — from a customer, a stakeholder, or yourself — before starting.

```
/solace-intake --template     → generates blank intake forms in the intake/ folder
  ... customer fills them out offline ...
/solace-intake intake/filled-intake.docx     → validates, asks follow-ups, creates project
  → automatically chains to /solace-plan
```

Intake bootstraps discovery. The plan skill picks up from there with no extra steps.

### Scenario 3: New project, jump to a specific design skill

You already know the architecture and just need one deliverable — a topic taxonomy, a migration plan, a broker recommendation.

```
/solace-discovery     → still needed to create a project and capture context
/solace-topic-design  → run the specific skill you need
```

You can skip `/solace-plan` and invoke any design skill directly after discovery. The skill reads the discovery brief and produces its artifacts independently.

### Scenario 4: Resume an interrupted engagement

You started an engagement, left, and came back.

```
/solace-projects      → shows per-skill status, tells you what ran and what's next
/solace-plan          → picks up where it left off (reads progress.yaml)
```

Or invoke the specific skill that was interrupted — every skill checks its own progress and offers to resume.

### Scenario 5: Re-run a design skill after changes

You completed the engagement but want to redo one part — new requirements, changed topology, updated event list.

```
/solace-topic-design       → re-runs topic design, overwrites previous artifacts
/solace-validate           → re-validate to catch inconsistencies with other artifacts
```

Any design skill can be re-run at any time. Re-running one skill does not automatically re-run downstream skills, so follow up with `/solace-validate` to check consistency.

### Scenario 6: Run reviews independently

You have an existing Solace architecture (not built through Solace Architect) and want a review.

```
/solace-discovery          → describe the existing architecture
/solace-architect-review   → review trade-offs and alternatives
/solace-security-review    → audit security posture
```

Review skills require at least one technical artifact to exist, but you can run any single review after discovery without running all the design skills.

### Scenario 7: Regenerate deliverables

The blueprint, executive summary, or diagrams need updating after design changes.

```
/solace-diagrams      → regenerate all diagrams (or a specific one) from current artifacts
/solace-blueprint     → reassemble the full engineering handoff package
/solace-executive     → regenerate the CXO-level business case and ROI framework
```

These are independently callable at any time. Diagrams can run after any design skill. Blueprint and executive produce the best output when all design and review skills have completed, but will work with whatever artifacts exist.

### Scenario 8: Compare approaches

You want to evaluate two different architectures for the same system.

```
/solace-discovery              → create project A with one set of assumptions
/solace-plan                   → run the full engagement
/solace-discovery              → create project B with different assumptions
/solace-plan                   → run again
/solace-projects compare       → side-by-side comparison of A and B
```

### Scenario 9: Get oriented

You are new to Solace Architect and want to understand what is available.

```
/solace-help          → shows the three essential commands, active project status, full skill catalog
```

---

## Dependency Map

Every skill checks project state before running. This table shows what must be complete before each skill can produce meaningful output.

| Skill | Hard prerequisites | Soft prerequisites (recommended) |
|-------|--------------------|----------------------------------|
| `/solace-intake` | None | None |
| `/solace-discovery` | None | None |
| `/solace-plan` | Discovery complete | None |
| `/solace-projects` | None | None |
| `/solace-topic-design` | Discovery complete | None |
| `/solace-broker-select` | Discovery complete | None |
| `/solace-sam-design` | Discovery complete | Topic design (reads taxonomy if available) |
| `/solace-protocol-select` | Discovery complete | Broker selection |
| `/solace-mesh-design` | Discovery complete, broker selection complete | None |
| `/solace-ha-dr` | Discovery complete, broker selection complete | Mesh design (reads DMR topology if available) |
| `/solace-integration` | Discovery complete | SAM design, broker selection |
| `/solace-migration` | Discovery complete | None |
| `/solace-architect-review` | ≥1 technical skill complete | All technical skills complete |
| `/solace-ops-review` | ≥1 technical skill complete | All technical skills complete |
| `/solace-security-review` | ≥1 technical skill complete | All technical skills complete |
| `/solace-dev-review` | ≥1 technical skill complete | All technical skills complete |
| `/solace-validate` | Discovery + ≥1 technical skill complete | All technical + review skills complete |
| `/solace-blueprint` | ≥1 technical skill complete | Validation complete |
| `/solace-executive` | ≥1 technical skill complete | Blueprint complete |
| `/solace-diagrams` | ≥1 technical artifact exists | More artifacts = more diagrams generated |
| `/solace-help` | None | None |

Skills with soft prerequisites will run without them but produce better output when they are available. Skills with hard prerequisites will warn and redirect if the prerequisite is missing.

---

## Skill Chaining Order

When `/solace-plan` orchestrates the engagement, it runs skills in this sequence. Skills marked conditional are included only when the discovery brief indicates they are relevant.

```
  1.  ✓ Discovery (already complete — plan requires it)
  2.  → Topic taxonomy design        /solace-topic-design
  3.  → Broker selection             /solace-broker-select
  4.  → SAM agent design             /solace-sam-design           [if SAM/AI/agent/chatbot]
  5.  → Protocol selection           /solace-protocol-select
  6.  → Mesh topology                /solace-mesh-design          [if multi-site/multi-region/edge]
  7.  → HA/DR design                 /solace-ha-dr                [if HA/DR required or regulated]
  8.  → Micro-Integration design     /solace-integration
  9.  → Migration planning           /solace-migration            [if migrating from another platform]
  10. → Architecture review          /solace-architect-review
  11. → Operations review            /solace-ops-review
  12. → Security review              /solace-security-review
  13. → Developer review             /solace-dev-review
  14. → Validation                   /solace-validate
  15. → Blueprint assembly           /solace-blueprint
  16. → Executive summary            /solace-executive
```

When running skills individually (outside `/solace-plan`), each skill suggests the next logical step via its "Next step routing" at completion.

---

# Start Here

---

## `/solace-intake`

**Category:** Start Here
**Preamble tier:** T2
**Prerequisites:** None. This is an alternative entry point to `/solace-discovery`.

### When to use

- You want to collect requirements offline before the architecture engagement begins.
- You are an SA sending a questionnaire to a customer ahead of a workshop.
- You have a completed intake file (YAML or Markdown) and want to skip interactive discovery.

### Intent

Intake has two modes. **Template mode** generates blank YAML and Markdown intake forms that a customer or stakeholder fills out offline. **Import mode** reads a completed intake file, validates it, asks targeted follow-up questions about gaps, synthesizes a discovery brief, and hands off to `/solace-plan` for end-to-end execution.

### Scope

Covers: YAML and Markdown template generation with domain-specific sections (banking, capital markets, manufacturing, healthcare), intake validation with completeness scoring, domain-specific follow-up questions for empty fields, ambiguity and contradiction resolution, discovery brief synthesis from intake data, reference architecture pattern matching, Integration Hub catalog lookup.

Does not cover: architecture design. Intake gathers and validates facts, then delegates design to downstream skills via `/solace-plan`.

### Inputs

- **Template mode:** No project state needed. Generates files in the `intake/` folder.
- **Import mode:** A completed Word (.docx), YAML, or Markdown intake file. Creates a new project from the intake data.
- **User input requested:** Follow-up questions for missing required fields, domain-specific clarifications, ambiguity resolution.

### Steps

1. **Determine mode.** Parse the invocation: `--template` for template generation, a file path for import, or ask the user which mode.
2. **Template mode (T1–T3).** Ask the user for format (Word, YAML, Markdown, or all). Generate the chosen template files in the `intake/` folder. Present with usage instructions. Stop.
3. **Import mode (I1–I7).** Read and parse the intake file. Validate completeness across five categories (project, landscape, domain, requirements, goals). Create the project directory structure. Ask domain-specific follow-up questions for empty fields. Resolve ambiguities and contradictions. Synthesize the discovery brief (same format as `/solace-discovery` output). Record decisions and mark both intake and discovery as complete.
4. **Hand off to `/solace-plan`.** Import mode automatically chains to the plan orchestrator.

### Outputs

- **Template mode:** `intake/solace-intake-template.{docx,yaml,md}` (whichever formats were selected)
- **Import mode:** `artifacts/01-discovery/discovery-brief.md`, `decisions.yaml`, `progress.yaml` with intake and discovery marked complete
- **Chains to:** `/solace-plan` (from import mode) or `/solace-discovery` (if intake was too sparse)

### Example

An SA sends the Word template to a banking customer. The customer fills in their systems (core banking, Salesforce, knowledge base), selects "SAM integration" as project type, checks "Mixed" delivery mode, and notes PCI-DSS requirements. The SA runs `/solace-intake intake/filled-intake.docx`. Intake validates 80% completeness, asks three banking-specific follow-ups about authorization model and data classification, resolves that "mixed delivery" means transfers are Guaranteed and balance checks are Direct, and produces the discovery brief. The engagement starts running automatically.

---

## `/solace-discovery`

**Category:** Start Here
**Preamble tier:** T2
**Prerequisites:** None. This is the primary entry point for every engagement.

### When to use

- You are starting a new architecture engagement and want interactive, guided discovery.
- You have a rough idea of the system and want structured elicitation.
- You want to branch from an existing project with different assumptions.

### Intent

Discovery elicits the information needed to make sound architectural recommendations for an event-driven system on the Solace platform. It asks structured questions about the system landscape, communication patterns, reliability requirements, deployment topology, and integration constraints. The output is a discovery brief that feeds every downstream skill.

### Scope

Covers: system inventory, existing messaging infrastructure, event types and volumes, protocols in use, non-functional requirements (delivery mode, ordering, latency, topology), project goals, timeline, and team capacity. Matches the user's scenario against reference architecture patterns (multi-system AI assistant, real-time market data, hybrid IT/OT manufacturing). Triggers domain-specific question paths for banking, capital markets, manufacturing/IoT, and healthcare.

Does not cover: architecture design, topic taxonomy, broker selection, or any design decisions. Discovery gathers facts. Design happens in downstream skills.

### Inputs

- **Project state read:** `projects/.active`, existing `progress.yaml`, existing `discovery-brief.md` (if resuming or branching from a prior project)
- **User input requested:**
  - Project name (free-text, used to create the project slug)
  - Project type via AskUserQuestion: New build, Migration, Extension of existing Solace deployment, or SAM integration
  - System landscape details (free-text): systems, existing messaging, protocols, events, volumes, schemas, vertical
  - Domain-specific questions (free-text): regulatory, authorization, latency budgets, OT protocols, depending on vertical
  - Reliability requirements via AskUserQuestion: delivery mode, ordering, processing guarantee, latency tier, topology
  - Scale and operations details (free-text): sites, growth, data residency, team, observability, CI/CD
  - Goals (free-text): driver, timeline, budget, team size, constraints
  - Execution mode via AskUserQuestion: Auto or Interactive

### Steps

1. **Project initialization.** Check for an active project. If one exists with completed discovery, offer to overwrite, create a new project, or cancel. If no project exists, ask for a project name, slugify it, and create the full project directory structure with `context.yaml`, `decisions.yaml`, `progress.yaml`, and `feedback.yaml`.
2. **Source context import.** If a new project was created because the prior project already had discovery, offer to import the existing discovery brief. If imported, summarize the findings and ask what has changed.
3. **Understand the landscape.** Determine the project type. Ask about systems, existing messaging, protocols, events, volumes, schemas, and vertical. If a codebase is provided, scan for AsyncAPI specs and config files.
4. **Match against reference architectures.** Compare the described landscape against Pattern 1 (multi-system AI assistant), Pattern 2 (real-time market data), and Pattern 3 (hybrid IT/OT manufacturing). If a pattern matches, load its key design decisions and antipatterns. Generate targeted follow-up questions from the pattern.
5. **Domain-specific questions.** Based on the identified vertical, ask banking, capital markets, manufacturing/IoT, or healthcare questions.
6. **Understand requirements.** Collect delivery mode, ordering, processing guarantee, latency tier, and topology via AskUserQuestion. Collect sites, regions, growth, data residency, operations team, experience level, observability, and CI/CD via free-text.
7. **Understand goals.** Collect driver, timeline, budget, team size, and organizational constraints via free-text.
8. **Synthesize the discovery brief.** Produce a structured brief with system landscape, requirements, goals, open questions (classified as Blocking or Advisory), and recommended next steps. Save to `artifacts/01-discovery/discovery-brief.md`.
9. **Execution mode selection.** Ask the user to choose Auto (skills chain back-to-back) or Interactive (confirm each transition). Save to `decisions.yaml`.
10. **Route to next step.** Primary: `/solace-plan`. Alternate: the first individually recommended skill.

### Outputs

- **Artifacts:** `artifacts/01-discovery/discovery-brief.md`
- **Decisions:** `execution_mode` (auto or interactive) written to `decisions.yaml`
- **Progress:** `solace-discovery` marked complete with `step_reached: "5/5"` in `progress.yaml`
- **Chains to:** `/solace-plan` (primary) or the first recommended individual skill

### Execution Mode Behavior

Discovery always runs interactively. It asks questions and waits for answers. The execution mode question at the end determines how subsequent skills run, not discovery itself.

### Example

A user says "I need to build a chatbot that connects to our core banking system, Salesforce, and a knowledge base." Discovery identifies this as a SAM integration matching Pattern 1 (multi-system AI assistant), asks banking-specific regulatory and authorization questions, captures that the team is new to Solace, and produces a brief recommending Event broker service with SAM design as the first technical skill.

---

## `/solace-plan`

**Category:** Start Here
**Preamble tier:** T2
**Prerequisites:** Discovery must be complete (`solace-discovery` status: complete in `progress.yaml`).

### When to use

- You finished discovery (or intake) and want the engagement to run automatically.
- You want to resume an interrupted engagement from where it left off.
- You want to see the full skill sequence before committing.

### Intent

The plan skill reads the discovery brief, determines which technical domain skills this project needs, sequences them correctly, and guides the user through the complete architecture engagement. It is the orchestrator that threads context across skills via `decisions.yaml`.

### Scope

Covers: skill selection based on discovery findings, skill sequencing, execution mode management, progress tracking across the full engagement, handling interruptions and resumption.

Does not cover: the actual design work. Each invoked skill handles its own domain.

### Inputs

- **Project state read:** `artifacts/01-discovery/discovery-brief.md`, `decisions.yaml`, `progress.yaml`
- **User input requested:**
  - Execution mode via AskUserQuestion (if not already set in discovery): Auto or Interactive
  - Plan confirmation via AskUserQuestion: Proceed, Skip specific skills, Reorder skills, or Add skills

### Steps

1. **Project and dependency check.** Verify an active project exists with completed discovery. If the plan was previously run and skills are in progress, show the current state and offer to continue from where things left off.
2. **Determine relevant skills.** Always includes: `/solace-topic-design`, `/solace-broker-select`, `/solace-protocol-select`. Conditionally includes: `/solace-sam-design` (if AI/agent/chatbot mentioned), `/solace-mesh-design` (if multi-site), `/solace-ha-dr` (if HA/DR requirements or regulated environment), `/solace-integration` (if backends need Micro-Integrations), `/solace-migration` (if migrating from another system). Always ends with: all four review skills, `/solace-validate`, `/solace-blueprint`, `/solace-executive`.
3. **Present the plan.** Show the numbered skill sequence with already-completed skills marked. Ask for execution mode if not set. Present plan for confirmation with options to proceed, skip, reorder, or add skills.
4. **Execute the plan.** In Auto mode: invoke each skill immediately, print a one-line transition, and move to the next on success. Falls back to Interactive if validation finds critical issues. In Interactive mode: announce the next skill, tell the user to invoke it, wait for completion, then proceed.
5. **Track plan progress.** Update the plan's own progress entry after each skill completion.
6. **Complete the plan.** When all skills finish, present a summary of skills completed, total artifacts, key decisions, and open questions.

### Outputs

- **Artifacts:** None of its own. The plan skill orchestrates other skills that produce artifacts.
- **Decisions:** `execution_mode` written to `decisions.yaml` (if not already set)
- **Progress:** `solace-plan` tracked in `progress.yaml` with step counts reflecting completed skills
- **Chains to:** Each skill in sequence; final skill is `/solace-executive`

### Execution Mode Behavior

In **Auto mode**, the plan invokes each skill via the Skill tool immediately after the previous one completes. The user still makes every architecture decision within each skill. Auto mode pauses only if `/solace-validate` finds critical issues or a skill returns BLOCKED status.

In **Interactive mode**, the plan announces each skill and waits for the user to invoke it manually. This gives the user full control over pacing, with natural pause points between skills.

### Example

After discovery for a banking chatbot project, `/solace-plan` determines the sequence: topic design, broker selection, SAM design, protocol selection, integration design, all four reviews, validation, blueprint, and executive summary. It skips mesh design (single-site) and migration (new build). In Auto mode, it runs all 14 skills back-to-back, pausing only for architecture decisions within each skill.

---

## `/solace-projects`

**Category:** Start Here
**Preamble tier:** T1
**Prerequisites:** None. Works with or without existing projects.

### When to use

- You want to see what state your engagement is in — which skills ran, which are pending.
- You are returning to an engagement after a break and need to get oriented.
- You want to switch between multiple projects or compare two architectures.
- You want to archive a completed project.

### Intent

The project dashboard lets users manage and inspect Solace Architect engagements. It shows per-skill status with timing data, key decisions, project summaries, and supports switching between projects, archiving completed work, and comparing two projects side by side.

### Scope

Covers: listing all projects, detailed per-skill status (with execution time and user wait time), key decision summaries, project switching, archiving, and side-by-side comparison.

Does not cover: creating new projects (use `/solace-discovery` or `/solace-intake`), running skills, or modifying project artifacts.

### Inputs

- **Project state read:** `projects/.active`, `context.yaml`, `progress.yaml`, `decisions.yaml`, `discovery-brief.md`
- **User input requested:** Subcommand selection (implicit from the user's request), project selection for switch/archive/compare via AskUserQuestion

### Subcommands

1. **list** — Show all projects in a table: slug, display name, status, creation date, artifact count. Marks the active project.
2. **status** (default) — Show per-skill progress for the active project. Each skill shows a status marker: complete, in-progress, skipped, or not started. Includes step reached, artifact count, execution time, and user wait time. Shows aggregated timing and recommends the next skill to run.
3. **summary** — Show key decisions and findings: vertical, pattern match, systems count, project type, execution mode, broker type, topology, delivery mode, and open questions.
4. **switch** — Present all projects via AskUserQuestion, write the selected slug to `projects/.active`, then show status for the newly active project.
5. **archive** — Mark a project as archived in `context.yaml`. If the archived project was active, clear `.active`.
6. **compare** — Side-by-side comparison of two projects showing skill status and key decision differences.

### Outputs

- **Artifacts:** None. This skill reads and displays state without modifying artifacts.
- **Decisions:** None.
- **Progress:** No progress entry for this skill. It is a utility.

### Example

Running `/solace-projects` with no arguments on an active project shows a status table:

```
  Skill                    Status         Step        Artifacts   Exec Time
  Discovery                complete       5/5         1 file      6m (12m wait)
  Topic Design             complete       5/5         3 files     4m (3m wait)
  SAM Design               in-progress    3/5         4 files     5m (8m wait)
  ...
  Recommended next: /solace-sam-design (resume from step 3/5)
```

---

# Design

---

## `/solace-topic-design`

**Category:** Design
**Preamble tier:** T2
**Prerequisites:** Discovery complete.

### When to use

- First technical skill in a standard engagement — designs the topic taxonomy that all other skills reference.
- Re-run after discovery changes to update the taxonomy for new data flows.
- Re-run after a review flagged topic antipatterns that need fixing.

### Intent

Maps every data flow identified in discovery to a well-structured Solace topic taxonomy using the `Domain/Noun/Verb/Version/Properties` convention. Assigns delivery modes (Direct messaging or Guaranteed messaging) per topic, designs wildcard subscriptions for each consumer, and validates the entire taxonomy against known antipatterns.

### Scope

Covers: data flow inventory, topic string construction, delivery mode assignment per topic, wildcard subscription design (including negative subscriptions for Guaranteed messaging), antipattern validation against six specific checks.

Does not cover: protocol selection, broker configuration, queue provisioning. Those belong to downstream skills.

### Inputs

- **Project state read:** `discovery-brief.md`, `decisions.yaml`, reference architectures (if a pattern was matched)
- **User input requested:**
  - Confirmation of the data flow inventory (free-text corrections)
  - Delivery mode decisions via AskUserQuestion where there is genuine ambiguity between Direct messaging and Guaranteed messaging

### Steps

1. **Inventory data flows.** Extract producer, consumer, event type, payload shape, volume, and delivery requirement for each flow from the discovery brief. Present as a table for user confirmation.
2. **Map flows to topic taxonomy.** Construct topic strings following `Domain/Noun/Verb/Version/Properties`. Domain is the organizational owner, Noun is the business object, Verb is the action in past tense, Version starts at `v1`, Properties ordered least-specific to most-specific. Hard limits: 250 characters, 128 levels. For SAM projects, design A2A protocol topics in a separate namespace.
3. **Design wildcard subscriptions.** For each consumer, determine which `*` (single-level) and `>` (trailing) wildcards give it exactly the events it needs. Flag overly broad subscriptions, especially across DMR external links. Identify where negative subscriptions (`!` prefix, Guaranteed messaging only) are needed.
4. **Validate against antipatterns.** Check every topic against: environment names in topics, tracing/audit IDs in topics, overly broad wildcards across DMR, plant/line/machine ID before version, message properties used for filtering, special characters in published topics. Fix any violations before writing artifacts.
5. **Write artifacts.** Save `topic-taxonomy.md`, `wildcard-subscriptions.md`, and `antipattern-report.md` to `artifacts/02-topic-design/`. Update `decisions.yaml` with topic decisions.

### Outputs

- **Artifacts:** `artifacts/02-topic-design/topic-taxonomy.md`, `wildcard-subscriptions.md`, `antipattern-report.md`
- **Decisions:** Topic strings, delivery modes, subscription strategy written to `decisions.yaml`
- **Progress:** `solace-topic-design` marked complete with `step_reached: "5/5"`
- **Chains to:** `/solace-broker-select` (primary) or `/solace-sam-design` (if SAM project)

### Example

For a banking chatbot, the skill produces topics like `banking/balance/checked/v1/{customerId}` (Direct messaging) and `banking/transfer/initiated/v1/{customerId}/{accountId}` (Guaranteed messaging). It designs a wildcard subscription `banking/transfer/>/` for the audit consumer and flags that `banking/>` would be overly broad for a DMR-connected compliance broker.

---

## `/solace-broker-select`

**Category:** Design
**Preamble tier:** T2
**Prerequisites:** Discovery complete.

### When to use

- Selecting the deployment model for a new Solace project.
- Re-evaluating broker type after requirements change (e.g., new data residency constraints).
- Comparing cloud-managed vs self-managed for a cost analysis.

### Intent

Selects the right Solace broker deployment model: Event broker service (cloud-managed), Software Event Broker (self-managed containers/VMs), or Appliance Event Broker (purpose-built hardware). Presents a comparison table with clear trade-offs grounded in Solace documentation and provides sizing guidance.

### Scope

Covers: extraction of broker selection criteria from discovery, side-by-side comparison of all three broker types across operations burden, latency, data residency, HA, scaling, and cost model. Includes sizing notes for service classes (Developer, Enterprise, Enterprise+) or container resource requirements.

Does not cover: specific pricing (flagged as "verify with Solace sales"), network configuration, or queue provisioning.

### Inputs

- **Project state read:** `discovery-brief.md`, `decisions.yaml`, platform reference for broker capabilities
- **User input requested:**
  - Confirmation of extracted selection criteria (free-text if anything is missing)
  - Broker type selection via AskUserQuestion with recommendation and rationale

### Steps

1. **Extract selection criteria.** Pull latency requirements, regulatory constraints, team size and Solace experience, scale numbers, budget preferences, deployment topology, and HA/DR needs from the discovery brief.
2. **Evaluate the three options.** Present a comparison table. Apply grounded biases: small teams new to Solace lean toward Event broker service; strict data residency leans toward Software Event Broker; ultra-low-latency (capital markets) leans toward Appliance; hybrid/edge needs Software at the edge with Cloud in the cloud connected via DMR.
3. **Present recommendation.** Use AskUserQuestion with clear rationale tied to the project's constraints. Include the hybrid option if warranted.
4. **Sizing notes.** For Cloud: which service class. For Software: container CPU/memory requirements by edition. For Appliance: flag that model selection requires Solace engagement. Save to `artifacts/03-broker-select/broker-recommendation.md`.

### Outputs

- **Artifacts:** `artifacts/03-broker-select/broker-recommendation.md`
- **Decisions:** Broker type, service class or edition written to `decisions.yaml`
- **Progress:** `solace-broker-select` marked complete
- **Chains to:** `/solace-protocol-select` (primary), `/solace-mesh-design` (if multi-site), or `/solace-sam-design` (if SAM not yet done)

### Example

For a small team building a new chatbot with no data residency constraints, the skill recommends Event broker service (Enterprise class) because HA is built-in, Solace manages upgrades, and the team has no Solace operational experience. It notes that if data residency requirements emerge later, Software Event Broker in a private cloud is the fallback.

---

## `/solace-sam-design`

**Category:** Design
**Preamble tier:** T2
**Prerequisites:** Discovery complete. Reads topic taxonomy if available but does not require it.

### When to use

- The project involves AI agent orchestration, chatbots, or multi-system assistants.
- You need to design the agent inventory, Gateways, and OrchestratorAgent topology.
- Re-run after adding new backend systems or user channels to update the agent mesh.

### Intent

Designs the complete Solace Agent Mesh (SAM) topology for projects that involve AI agent orchestration. Defines which agents exist, which Gateways serve which channels, which Micro-Integrations connect agents to backends, how the OrchestratorAgent routes work, and how authorization scopes propagate from user channel to backend system.

### Scope

Covers: agent granularity decision (coarse-grained vs fine-grained), agent inventory per backend, Gateway type selection per channel (HTTP SSE, REST, Webhook, Slack, Teams, Event Mesh, Custom), Micro-Integration mapping for each backend, A2A topic namespace design, authorization propagation model (Gateway to OrchestratorAgent to agent tools to backend), and YAML config generation.

Does not cover: non-SAM messaging patterns, broker provisioning, or protocol selection.

### Inputs

- **Project state read:** `discovery-brief.md`, `decisions.yaml`, `topic-taxonomy.md` (if available), SAM documentation via canonical sources
- **User input requested:**
  - Agent granularity via AskUserQuestion: Coarse-grained (one agent per backend) or Fine-grained (one agent per capability)
  - Gateway type selections via AskUserQuestion when choice is ambiguous
  - Micro-Integration vs agent tool decisions via AskUserQuestion for genuine trade-offs

### Steps

1. **Agent granularity decision.** Present coarse-grained (simpler, one agent per backend) vs fine-grained (more agents, finer authorization control). Default: coarse-grained unless backends have multiple distinct permission scopes. Propose an agent for each backend system.
2. **Gateway selection.** For each user-facing channel, select a Gateway type. Standard options: HTTP SSE, REST, Webhook, Slack, Teams, Event Mesh. Only recommend Custom when no standard Gateway fits.
3. **Micro-Integration mapping.** For each backend, check the Integration Hub catalog. Distinguish cloud-managed vs self-managed Micro-Integrations. Distinguish agent tools (direct backend calls) from Micro-Integrations (decoupled via event mesh).
4. **A2A topic layout and authorization model.** Design the A2A topic namespace ensuring no collision with application topics. Define authorization propagation: authentication at Gateway, scope propagation through OrchestratorAgent, tool filtering at each agent. Check antipatterns: agents skipping the orchestrator, hardcoded credentials, environment names in SAM namespace.
5. **Generate YAML configs.** Produce agent topology overview, individual agent configs, gateway configs, Micro-Integration map, A2A topic map, and auth model document. Save to `artifacts/04-sam-design/`.

### Outputs

- **Artifacts:** `artifacts/04-sam-design/agent-topology.md`, `agent-configs/*.yaml`, `gateway-configs/*.yaml`, A2A topic map, auth model document
- **Decisions:** Agent granularity, gateway types, MI vs tool choices written to `decisions.yaml`
- **Progress:** `solace-sam-design` marked complete
- **Chains to:** `/solace-broker-select` (if not yet complete) or `/solace-protocol-select`

### Example

For a banking chatbot with web, Slack, and mobile channels connecting to core banking, Salesforce, and a knowledge base, the skill designs: HTTP SSE Gateway for web, Slack Gateway for Slack, REST Gateway for mobile; one agent per backend (balance-agent, salesforce-agent, knowledge-agent); OrchestratorAgent routing cross-domain queries; and an authorization model where customer scopes propagate from JWT through the OrchestratorAgent to filter each agent's tools.

---

## `/solace-protocol-select`

**Category:** Design
**Preamble tier:** T2
**Prerequisites:** Discovery complete. Benefits from broker selection being done but does not strictly require it.

### When to use

- Assigning protocols for each system connecting to the event mesh.
- Re-run after adding new integration points.
- Evaluating protocol mediation implications for a mixed-protocol architecture.

### Intent

Selects the right messaging protocol for each integration point in the architecture. The Solace event broker handles protocol mediation transparently, so each client can use whatever protocol fits its stack. This skill assigns the best protocol per system and documents cross-protocol considerations.

### Scope

Covers: integration point inventory, protocol selection matrix (SMF, MQTT, AMQP, JMS, REST, WebSocket), per-system protocol assignment with rationale, protocol mediation implications, feature asymmetry across protocols, REST delivery point configuration for Guaranteed messaging consumers.

Does not cover: broker configuration, TLS cipher suite selection, or client SDK implementation details.

### Inputs

- **Project state read:** `discovery-brief.md`, `decisions.yaml`, platform reference for protocol capabilities
- **User input requested:**
  - Protocol selection via AskUserQuestion when genuine ambiguity exists

### Steps

1. **Inventory integration points.** List every system connecting to the event mesh with its role, current protocol, latency requirement, and delivery mode.
2. **Protocol selection.** Apply the selection matrix: SMF for lowest latency with Solace-native clients; MQTT for IoT and constrained devices; AMQP for enterprise systems already speaking AMQP 1.0; JMS for Java enterprise apps (same wire performance as SMF); REST for simple integrations with no SDK; WebSocket for browser clients. Assign one protocol per system.
3. **Cross-protocol considerations.** Document mediation paths, feature asymmetry (negative subscriptions only in SMF), shared subscription differences, and REST delivery point requirements.
4. **Write artifacts.** Save `protocol-map.md` to `artifacts/05-protocol-select/`.

### Outputs

- **Artifacts:** `artifacts/05-protocol-select/protocol-map.md`
- **Decisions:** Protocol per integration point written to `decisions.yaml`
- **Progress:** `solace-protocol-select` marked complete
- **Chains to:** `/solace-integration` (primary) or `/solace-architect-review` (if all technical skills complete)

### Example

For a system with a Java backend (JMS), IoT sensors (MQTT), a web dashboard (WebSocket via Solace JavaScript API), and a REST-based third-party integration, the skill assigns JMS, MQTT 5.0, WebSocket, and REST respectively. It notes that the Java backend publishing via JMS over SMF will reach the MQTT sensor consumers transparently through broker-level protocol mediation.

---

## `/solace-mesh-design`

**Category:** Design
**Preamble tier:** T2
**Prerequisites:** Discovery complete and broker selection complete. Mesh topology depends on the broker type.

### When to use

- The architecture spans multiple sites, regions, or clouds.
- You need to design DMR link topology and subscription propagation.
- Re-run after topology changes (new sites, changed data sovereignty constraints).

### Intent

Designs the DMR (Dynamic Message Routing) topology that connects Solace event brokers across sites, regions, and clouds. Selects the right topology pattern based on scale, geography, data sovereignty, and traffic patterns.

### Scope

Covers: topology requirement assessment, pattern selection (single broker, DMR cluster, multi-site federation via external links, hybrid cluster+federation), link direction and subscription propagation strategy, bandwidth considerations, Mermaid topology diagrams.

Does not cover: broker provisioning, HA/DR configuration (separate skill), or protocol selection.

### Inputs

- **Project state read:** `discovery-brief.md`, `broker-recommendation.md`, `decisions.yaml`, platform reference for DMR details, reference architectures for multi-site patterns
- **User input requested:**
  - Topology pattern via AskUserQuestion

### Steps

1. **Assess topology requirements.** Extract site count, geography, traffic patterns, data sovereignty constraints, scale, and latency constraints.
2. **Select topology pattern.** Present options: Single broker, DMR cluster, Multi-site federation, or Hybrid.
3. **Design the topology.** For DMR clusters: determine node count. For external links: map site-to-site connections, direction, subscription propagation. For hybrid: cluster per site plus external links. Generate a Mermaid diagram.
4. **Document subscription propagation.** For each external link: which topics propagate, delivery mode, bandwidth implications, negative subscriptions needed.
5. **Write artifacts.** Save `dmr-topology.md` and `dmr-topology.mermaid` to `artifacts/06-mesh-design/`.

### Outputs

- **Artifacts:** `artifacts/06-mesh-design/dmr-topology.md`, `dmr-topology.mermaid`
- **Decisions:** Topology pattern, link map, subscription propagation strategy written to `decisions.yaml`
- **Progress:** `solace-mesh-design` marked complete
- **Chains to:** `/solace-ha-dr` (primary) or `/solace-protocol-select` (if not yet complete)

### Example

A capital markets deployment with trading hubs in New York and London gets a multi-site federation with external links: market data flows US-East to EU-West via Direct messaging, order flow returns EU-West to US-East via Guaranteed messaging. The skill flags that a `marketData/>` wildcard across the external link would carry all instruments and recommends scoping to `marketData/equities/>` and `marketData/fx/>`.

---

## `/solace-ha-dr`

**Category:** Design
**Preamble tier:** T2
**Prerequisites:** Discovery complete and broker selection complete. Mesh design is recommended but not required.

### When to use

- The project has uptime or data durability requirements.
- The deployment spans multiple sites and needs DR strategy.
- Regulatory requirements mandate specific RPO/RTO targets.
- Re-run after broker type or mesh topology changes.

### Intent

Designs the high availability configuration within each site and the disaster recovery strategy across sites. Maps each data class to appropriate RPO and RTO targets and selects the mechanisms to meet them.

### Scope

Covers: RPO/RTO requirement assessment per data class, HA redundancy group design (three-node model: primary, backup, monitoring), Cloud HA (built-in for non-Developer service classes), cross-site DR replication (active/standby), interaction between replication groups and DMR, synchronous vs asynchronous replication mode, Mermaid diagrams.

Does not cover: application-level idempotency design, active/active DR, or network failover configuration.

### Inputs

- **Project state read:** `discovery-brief.md`, `broker-recommendation.md`, `dmr-topology.md` (if available), `decisions.yaml`, canonical sources for HA/DR documentation
- **User input requested:**
  - RPO/RTO confirmation per data class
  - HA approach via AskUserQuestion when there is genuine choice

### Steps

1. **Assess HA/DR requirements.** Extract data classes, RPO/RTO targets, regulatory drivers, broker type, and DMR topology.
2. **Design HA within site.** For Cloud: note built-in HA. For Software: three-node HA redundancy group. For Appliance: hardware-specific considerations.
3. **Design DR across sites.** Replication groups, active/standby, interaction with DMR, synchronous vs asynchronous replication.
4. **Map data classes to RPO/RTO.** Document specific HA and DR mechanisms per data class.
5. **Write artifacts.** Save `ha-dr-topology.md` and `ha-dr-topology.mermaid` to `artifacts/07-ha-dr/`.

### Outputs

- **Artifacts:** `artifacts/07-ha-dr/ha-dr-topology.md`, `ha-dr-topology.mermaid`
- **Decisions:** HA mode, DR replication mode, RPO/RTO per data class written to `decisions.yaml`
- **Progress:** `solace-ha-dr` marked complete
- **Chains to:** `/solace-protocol-select` (if not done) or `/solace-integration`

### Example

For a banking platform on Software Event Broker with transaction data (RPO: zero, RTO: seconds) and analytics data (RPO: minutes, RTO: minutes), the skill designs a three-node HA group at the primary site with synchronous replication to a DR site for transaction data and asynchronous replication for analytics.

---

## `/solace-integration`

**Category:** Design
**Preamble tier:** T2
**Prerequisites:** Discovery complete. Benefits from SAM design and broker selection being done.

### When to use

- Backend systems need to connect to the event mesh via Micro-Integrations.
- You want to check what is available in the Integration Hub before designing custom integrations.
- Re-run after adding new backend systems or after the Integration Hub catalog is refreshed.

### Intent

Designs the Micro-Integration strategy: which backend systems connect through which Micro-Integrations, whether they are cloud-managed, self-managed, or broker-integrated, and where custom Micro-Integrations are needed. This skill is the authoritative Micro-Integration inventory, overriding the initial screening done during discovery.

### Scope

Covers: backend system inventory, Integration Hub catalog lookup (both direct and indirect paths), behavioral fitness checks for every selected Micro-Integration, custom Micro-Integration specifications, SAM agent tool vs Micro-Integration trade-off analysis, Kafka bridge configuration (broker-integrated, not a Spring Boot MI).

Does not cover: Micro-Integration implementation code, broker provisioning, or protocol selection.

### Inputs

- **Project state read:** `discovery-brief.md`, `decisions.yaml`, `agent-topology.md` (if SAM), `broker-recommendation.md`, Integration Hub catalog snapshot
- **User input requested:**
  - Backend inventory confirmation
  - Agent tool vs Micro-Integration decisions via AskUserQuestion for SAM projects
  - Discrepancy resolution when discovery said "custom needed" but a cataloged path exists

### Steps

1. **Inventory backend systems.** List every backend with connection type, protocol, data direction, and volume.
2. **Check Integration Hub availability.** For each backend, check for direct and indirect MI matches. Classify: available, indirect path, not in catalog, or custom needed.
3. **Behavioral fitness check.** For every cataloged MI: What does it do? Does it satisfy the requirement? If gap, what fills it?
4. **Design custom Micro-Integrations.** For backends needing custom MIs, specify technology, events, authentication, error handling.
5. **SAM tool vs MI decisions.** Present the trade-off per backend for SAM projects.
6. **Write artifacts.** Save `micro-integration-map.md` and custom MI specs to `artifacts/08-integration/`.

### Outputs

- **Artifacts:** `artifacts/08-integration/micro-integration-map.md`, `custom-integration-specs/*.md`
- **Decisions:** MI selections, tool vs MI choices written to `decisions.yaml`
- **Progress:** `solace-integration` marked complete
- **Chains to:** `/solace-architect-review` (primary) or `/solace-validate` (if reviews done)

### Example

For a system connecting to Salesforce, Kafka, GCS, and a custom database: Salesforce gets a cataloged self-managed MI; Kafka gets the broker-integrated bridge; GCS gets an indirect path via Google Pub/Sub Source MI with a fitness note; the custom database gets a Python custom MI specification.

---

## `/solace-migration`

**Category:** Design
**Preamble tier:** T2
**Prerequisites:** Discovery complete. The discovery brief must identify the source messaging system.

### When to use

- Migrating from Kafka, RabbitMQ, TIBCO, or IBM MQ to Solace.
- Re-evaluating the migration plan after scope or phasing changes.
- You need a coexistence topology showing legacy and Solace side by side.

### Intent

Plans a phased migration from an existing messaging system to Solace. Every migration is phased with a coexistence period. The skill maps source concepts to Solace equivalents, designs the bridge topology, and produces a five-phase migration plan with validation criteria and rollback plans.

### Scope

Covers: source system inventory, concept mapping from source platform to Solace, coexistence topology with bridge design, five-phase migration plan, topic mapping from source to Solace taxonomy.

Does not cover: application code changes, client SDK migration guides, or source system decommissioning procedures.

### Inputs

- **Project state read:** `discovery-brief.md`, `decisions.yaml`, topic taxonomy (if available)
- **User input requested:**
  - Source system details (free-text): platform, topology, scale, client count, patterns, schema management

### Steps

1. **Inventory the source system.** Platform, topology, scale, client count, patterns, schema management.
2. **Map source concepts to Solace.** Kafka topics+partitions to Solace topics+queue subscriptions, consumer groups to non-exclusive queues, etc.
3. **Design coexistence topology.** Kafka: broker-integrated bridge. Others: MI bridge or REST relay.
4. **Design five-phase migration.** Bridge and observe, new consumers on Solace, migrate existing consumers, migrate producers, decommission source.
5. **Topic mapping.** Map source topics/queues to Solace taxonomy with delivery mode and phase.
6. **Write artifacts.** Save to `artifacts/09-migration/`.

### Outputs

- **Artifacts:** `artifacts/09-migration/migration-plan.md`, `coexistence-topology.md`, `coexistence-topology.mermaid`, `topic-mapping.md`
- **Decisions:** Migration phases, bridge configuration, topic mapping written to `decisions.yaml`
- **Progress:** `solace-migration` marked complete
- **Chains to:** `/solace-broker-select` (if not done) or `/solace-topic-design`

### Example

Migrating from a 5-broker Kafka cluster: the skill maps Kafka consumer groups to Solace non-exclusive queues, configures the broker-integrated Kafka bridge (Kafka as source of authority during coexistence), and designs five phases starting with a shadow read. It flags that Kafka Streams applications need application-level redesign.

---

## `/solace-event-portal`

**Category:** Design
**Preamble tier:** T2
**Prerequisites:** Discovery complete. Topic design strongly recommended (topic taxonomy is the primary input).

### When to use

- You need to map your architecture into Event Portal governance objects.
- You want application domain definitions, event objects, and schema attachments designed.
- You need a REST API provisioning plan for Event Portal setup.

### Intent

Translates the architecture produced by upstream skills into Event Portal governance objects: application domains, events with schema bindings, applications, and runtime broker connections. The output is a complete Event Portal design ready for provisioning via Designer or REST API.

### Scope

Covers: application domain mapping from topic taxonomy, event object definitions, schema format and evolution policy, application inventory (publisher/consumer/both), runtime broker connections, catalog organization and tagging, REST API provisioning outline.

Does not cover: actual provisioning execution, Event Portal UI configuration, or runtime monitoring setup.

### Inputs

- **Project state read:** `discovery-brief.md`, `topic-taxonomy.md`, `decisions.yaml`, `broker-recommendation.md`, review artifacts
- **User input requested:**
  - Confirm application domain mapping
  - Schema format choice (if multiple viable)

### Steps

1. **Application domains.** Map domain prefixes from topic taxonomy to Event Portal application domains.
2. **Event objects.** Define event objects for each topic pattern (name, address, version, type, delivery mode).
3. **Schema attachments.** Determine schema format, derive skeletons, set evolution policy.
4. **Applications.** Map discovery systems to Event Portal applications with pub/sub relationships.
5. **Runtime connections.** Design broker-to-Event-Portal connection topology.
6. **Catalog organization.** Define tagging, documentation standards, governance workflow, promotion flow.
7. **REST API provisioning.** Produce structured provisioning outline with project-specific objects.
8. **Write artifacts.** Save to `artifacts/13-event-portal/`.

### Outputs

- **Artifacts:** `artifacts/13-event-portal/event-portal-design.md`, `provisioning-plan.md`
- **Decisions:** Domain count/names, schema format, evolution policy, environment mapping written to `decisions.yaml`
- **Progress:** `solace-event-portal` marked complete
- **Chains to:** Reviews or `/solace-validate`

### Example

For a retail banking project with topic prefixes `payments/`, `fraud/`, `notifications/`: creates three application domains, defines event objects like "Payment Transaction Authorized" mapped to `payments/transaction/authorized/v1/{region}/{merchantId}`, selects JSON Schema with backward-compatible evolution, and maps each backend system to an Event Portal application.

---

## `/solace-ep-provision`

**Category:** Technical
**Preamble tier:** T2
**Prerequisites:** `/solace-event-portal` complete. Solace Event Portal Designer MCP installed in the AI host. Solace Cloud API token with Event Portal Designer Read+Write scope.

### When to use

- The intake flow set `preferences.provision_event_portal: true`, opting the engagement into live-tenant materialization.
- The design from `/solace-event-portal` has been reviewed and you want the catalog (application domains, schemas, events, applications) created in Solace Cloud, plus AsyncAPI specs exported per application for code generation.
- A prior run was BLOCKED (e.g., MCP not registered, token missing) and you've corrected the underlying issue; re-invoking resumes safely via content-match verification.

### Opt-in gate

This skill is **never** auto-fired by project type. Inclusion in `/solace-plan` requires `decisions.yaml` to contain `provision_event_portal: true`, set at intake time via the **"Provision Event Portal model after design?"** preference. The default is `false` — design-only engagements never touch your tenant.

If the gate is on but the MCP is not configured at run time, the skill records a `BLOCKED` status with the exact reason (tool not found, auth error, region mismatch) and the plan summary surfaces it — it never writes silently or skips silently.

### What it does

Reads `event-portal-design.md` and provisions in dependency order:

1. **Application Domain** with `uniqueTopicAddressEnforcementEnabled: true`.
2. **Schemas + Schema Versions** — one JSON Schema per event type, v1.0.0. Content is synthesized from design field skeletons (Path A) unless `13-event-portal/schemas/<name>.json` exists (Path B — author externally).
3. **Events + Event Versions** with topic addresses bound to schema versions, delivery mode (Guaranteed/Direct) captured in description.
4. **Applications + Application Versions** with `declaredProducedEventVersionIds` / `declaredConsumedEventVersionIds` resolved from the design's produce/consume graph.
5. **AsyncAPI 2.5.0 export** per application version into `artifacts/13-event-portal/asyncapi/<application>.yaml`.

Before reusing any existing object with a matching name, the skill performs **content-match verification** (semantic equality of fields, not name-only). On mismatch it hard-stops with a structured diff so a shared tenant's prior objects are never silently rebound to a new design.

### Outputs

- **Artifacts:** `artifacts/13-event-portal/provisioned.yaml` (object ID map), `provisioning-report.md` (run summary), `asyncapi/<application>.yaml` (one per application).
- **Decisions:** `ep_provision` block in `decisions.yaml` with domain ID, counts, region, status.
- **Progress:** `solace-ep-provision` marked complete (or `blocked`/`partial` on failure, with the prior attempt preserved under `prior_attempts:`).
- **Chains to:** Reviews or `/solace-validate`.

### Example

For the `retailco-order-events` project, opting in at intake produces: 1 application domain (`RetailCo Order Operations`), 10 JSON Schemas v1.0.0, 10 events with topic addresses (`retailco/order/created/v1/{customerId}/{orderId}`, etc.), 4 applications (E-Commerce Backend, WMS, Order Dashboard, Mobile App) with full produce/consume declarations, and 4 AsyncAPI specs ready for client code generation.

---

# Review

All four review skills share the same structure: read all available artifacts, evaluate against their domain, classify findings as Critical/Important/Advisory, and resolve each finding interactively (Apply, Defer, or Discuss). They require at least one technical skill to be complete, but produce the best output when all technical skills have run.

---

## `/solace-architect-review`

**Category:** Review
**Preamble tier:** T2
**Prerequisites:** At least one technical domain skill complete.

### When to use

- All (or most) technical design skills have completed and you want an architecture-level sanity check.
- You changed a design decision and want to verify the trade-offs still hold.
- You want an independent evaluation of whether simpler alternatives exist.

### Intent

Reviews the current architecture through an architect's lens. Evaluates whether trade-offs are sound, component choices are defensible, the topology matches constraints, and whether simpler alternatives exist that achieve the same goals.

### Scope

Covers: structural review (broker type, protocol choices, DMR topology, topic taxonomy consistency, SAM agent granularity), trade-off analysis for every major decision, gap analysis (failure paths, scaling boundaries, operational visibility, security completeness, Integration Hub catalog re-verification).

Does not cover: operations readiness, security audit, or developer experience.

### Outputs

- **Artifacts:** `artifacts/10-reviews/architect-review.md`
- **Decisions:** Applied and deferred entries written to `decisions.yaml`
- **Chains to:** `/solace-ops-review`

### Example

The review finds that a three-site DMR topology uses hub-and-spoke but traffic is symmetric — recommends full mesh. Also flags that a custom MI was designed for a backend that has a cataloged indirect path.

---

## `/solace-ops-review`

**Category:** Review
**Preamble tier:** T2
**Prerequisites:** At least one technical domain skill complete.

### When to use

- You want to evaluate production readiness: monitoring, alerting, failure recovery, capacity planning.
- The architecture is designed and you need to assess day-2 operational concerns.
- You want a failure mode catalog with detection and recovery procedures.

### Intent

Evaluates whether the architecture is operable in production. Focuses on what the on-call engineer sees at 3am: which alerts fire, which runbooks exist, what capacity limits will be hit first, and how failures are detected and recovered.

### Scope

Covers: monitoring and observability (Solace Insights, Distributed Tracing, SAM health checks), failure mode analysis for every component, capacity planning (connections, message rate, spool, DMR bandwidth), day-2 operations (upgrades, certificate rotation, schema evolution, Config-Sync).

### Outputs

- **Artifacts:** `artifacts/10-reviews/ops-review.md`
- **Decisions:** Applied and deferred entries written to `decisions.yaml`
- **Chains to:** `/solace-security-review`

### Example

Finds no spool usage alert threshold (P1), undocumented DMR bandwidth budget (P2), and manual certificate rotation (P3). Recommends spool alerts at 70%/90%, explicit bandwidth budgets, and SEMP API-based rotation.

---

## `/solace-security-review`

**Category:** Review
**Preamble tier:** T2
**Prerequisites:** At least one technical domain skill complete.

### When to use

- You need a security posture assessment: authentication, authorization, encryption, compliance.
- The project has regulatory requirements (PCI-DSS, HIPAA, data residency).
- You want to verify ACL profiles, TLS configuration, and SAM authorization propagation.

### Intent

Evaluates the security model of the architecture: authentication mechanisms, authorization and ACL design, encryption posture, credential management, and regulatory compliance.

### Scope

Covers: client authentication (basic auth, client certificates, OAuth 2.0, LDAP, RADIUS), message VPN-scoped authentication, ACL profile design, SAM scope propagation, TLS configuration, message spool encryption, certificate management, PCI-DSS and HIPAA compliance checks, data residency validation against DMR topology, audit logging.

### Outputs

- **Artifacts:** `artifacts/10-reviews/security-review.md`
- **Decisions:** Applied and deferred entries written to `decisions.yaml`
- **Chains to:** `/solace-dev-review`

### Example

For a banking project: SAM agent configs contain hardcoded database credentials (Critical), ACL profiles allow publish to `banking/>` instead of per-application scoping (Important), TLS 1.2 configured but 1.3 available (Advisory).

---

## `/solace-dev-review`

**Category:** Review
**Preamble tier:** T2
**Prerequisites:** At least one technical domain skill complete.

### When to use

- You want to assess the developer experience: can a new developer onboard easily?
- You need to evaluate topic taxonomy usability, SDK selection, and schema governance.
- You want to identify friction in the "first event published" path.

### Intent

Evaluates the architecture from a developer's perspective. Focuses on what it takes for a new developer to produce or consume events: topic taxonomy usability, SDK selection, API abstraction level, onboarding friction, schema governance, and Event Portal adoption.

### Scope

Covers: topic taxonomy discoverability and naming consistency, SDK and API selection per language, developer onboarding path (environment access, topic discovery, schema discovery, first message, testing, error handling), schema governance (Schema Registry, AsyncAPI specs, evolution policy).

### Outputs

- **Artifacts:** `artifacts/10-reviews/dev-review.md`
- **Decisions:** Applied and deferred entries written to `decisions.yaml`
- **Chains to:** `/solace-validate`

### Example

Inconsistent topic casing (camelCase in some domains, PascalCase in others) causes confusion (Friction). No AsyncAPI specs for event definitions (Missing). Banking domain topic naming is intuitive and well-documented (Good).

---

# Finalize

---

## `/solace-validate`

**Category:** Finalize
**Preamble tier:** T2
**Prerequisites:** Discovery complete AND at least one technical domain skill complete.

### When to use

- Before assembling the blueprint — the final consistency check.
- After re-running a design skill to verify nothing broke.
- After resolving review findings to confirm the fixes are consistent.

### Intent

Performs a final consistency and completeness check across all project artifacts before the blueprint is assembled. Runs antipattern detection, cross-component consistency checks, requirement satisfaction tracing, and decision conflict analysis.

### Scope

Covers: antipattern detection (topic, SAM, mesh, delivery mode, integration), cross-component consistency (topic taxonomy vs A2A topics, protocols vs capabilities, broker vs required features, ACL vs SAM auth, mesh vs HA/DR, MI catalog re-verification), completeness checks, requirement satisfaction tracing, decision conflict analysis.

Does not cover: fixing the issues it finds. Validation reports; the user and upstream skills fix.

### Inputs

- **Project state read:** All artifacts across all skill directories, `decisions.yaml`, `progress.yaml`, antipattern library, Integration Hub catalog
- **User input requested:** None for validation. If critical issues are found, recommends fixing before proceeding.

### Outputs

- **Artifacts:** `artifacts/11-validation/validation-report.md`
- **Decisions:** None (validation reports, does not decide)
- **Progress:** `solace-validate` marked complete
- **Chains to:** `/solace-blueprint` (if pass) or fix issues first

### Example

A topic uses Guaranteed messaging but the assigned protocol (MQTT QoS 0) maps to Direct messaging (FAIL). A discovery requirement for file transfer traces through the mesh but no component copies actual file content (FAIL). An open question about delete propagation was never resolved but a delete topic exists (FAIL). Architecture flagged as not ready for blueprint.

---

## `/solace-blueprint`

**Category:** Finalize
**Preamble tier:** T2
**Prerequisites:** At least one technical skill complete. Validation complete is recommended — if not run, the skill warns and offers to run it first.

### When to use

- All design and review skills have completed and you want the final engineering handoff package.
- Re-run after fixing issues identified in validation or reviews.
- You want to regenerate the unified architecture document after design changes.

### Intent

Assembles all project artifacts into a single engineering handoff package. The blueprint is the final deliverable: a unified architecture document, Mermaid diagrams, SAM YAML configs, Micro-Integration configs, broker provisioning parameters, validation report, operational runbook, and topic taxonomy.

### Scope

Covers: blueprint directory structure creation, architecture document synthesis (a coherent narrative, not concatenation), diagram generation (8 core diagrams plus conditional diagrams), config assembly, operational runbook generation.

Does not cover: implementation. The blueprint is a design document for an engineering team to build from.

### Inputs

- **Project state read:** All artifacts from all skill directories, `decisions.yaml`, `progress.yaml`
- **User input requested:**
  - Whether to run validation first via AskUserQuestion (if not run)
  - Final review confirmation

### Outputs

- **Artifacts:** `artifacts/12-blueprint/architecture.md`, `runbook.md`, `topic-taxonomy.md`, `validation-report.md`, `diagrams/*.mermaid`, `config/` directory
- **Decisions:** None (assembly, not design)
- **Progress:** `solace-blueprint` marked complete
- **Chains to:** `/solace-executive`

### Example

For a banking chatbot: unified architecture document describing three-agent SAM topology, 12 Mermaid diagrams, YAML configs for balance-agent, salesforce-agent, and knowledge-agent, Enterprise-class Event broker service provisioning file, and an operational runbook with OrchestratorAgent queue depth alert thresholds.

---

## `/solace-executive`

**Category:** Finalize
**Preamble tier:** T2
**Prerequisites:** At least one technical skill complete. Blueprint complete is recommended — if not run, the skill warns and offers to run it first.

### When to use

- You need a CXO-ready business case after the technical architecture is designed.
- You want to regenerate the executive summary after design or review changes.
- You need an ROI framework worksheet for the finance team.
- A stakeholder needs a non-technical summary for board presentations or investment decisions.

### Intent

Translates all project artifacts into a business-focused report for CXO-level stakeholders. This report contains zero technical jargon — no protocols, no topic hierarchies, no broker configurations. Instead it speaks in business outcomes, risk reduction, cost impact, and strategic alignment.

### Scope

Covers: business problem framing, current state cost analysis, solution description in business terms, operational resilience narrative, integration efficiency metrics, time-to-market impact, regulatory and compliance summary, risk assessment (migration, operational, mitigation), investment overview (scope, cost drivers, qualitative ROI indicators), implementation timeline with business milestones, one-page business architecture diagram (max 15 nodes, business labels only), fillable ROI framework worksheet.

Does not cover: technical architecture details — those live in the blueprint.

### Inputs

- **Project state read:** All artifacts (especially blueprint `architecture.md`, discovery brief, validation report, review findings), `decisions.yaml`, `context.yaml`
- **User input requested:**
  - Whether to run blueprint first via AskUserQuestion (if not run)
  - Tone and audience adjustments after review

### Steps

1. **Project and dependency check.** Verify an active project exists. Check if blueprint is complete; if not, offer to run it first or proceed with available artifacts.
2. **Identify business context.** Extract business problem, current state costs, stakeholder impact, and strategic drivers from the artifacts.
3. **Write the executive summary.** Translate technical decisions into business language: "Guaranteed messaging" becomes "zero message loss," "HA triplet" becomes "automatic failover," "DMR topology" becomes "multi-region presence."
4. **Generate one-page visual.** A simplified business architecture diagram with business labels, no technical names.
5. **Generate ROI framework worksheet.** A fillable template the finance team can populate with actual cost data.
6. **Final review.** Present the summary for tone and content adjustments.

### Outputs

- **Artifacts:** `artifacts/14-executive/executive-summary.md`, `business-architecture.mermaid`, `roi-framework.md`
- **Decisions:** None
- **Progress:** `solace-executive` marked complete

### Example

For a banking chatbot on Event broker service: the executive summary frames the initiative as "real-time customer engagement platform," translates the three-agent SAM topology into "AI-powered assistant connecting banking, CRM, and knowledge systems," quantifies that 3 pre-built integrations replace custom code, and provides an ROI worksheet with categories for reduced downtime, integration maintenance savings, and developer productivity gains.

---

# Utility

---

## `/solace-diagrams`

**Category:** Utility
**Preamble tier:** T2
**Prerequisites:** At least one technical artifact exists. No specific skill completion required.

### When to use

- You changed a design and want the diagrams updated without re-running the full blueprint.
- You want to preview diagrams mid-engagement before blueprint assembly.
- You want to regenerate a specific diagram (e.g., just the DMR topology diagram after mesh redesign).

### Intent

Reads the current project artifacts and generates (or regenerates) Mermaid diagrams. This skill can run at any point in the engagement — it generates only the diagrams supported by existing artifacts. More completed skills means more diagrams available.

### Scope

Covers: 15 diagram types based on artifact availability:

| Diagram | Required artifacts |
|---------|-------------------|
| `data-flow` | Integration map OR topic taxonomy |
| `broker-topology` | Broker recommendation |
| `topic-hierarchy` | Topic taxonomy |
| `queue-subscriptions` | Topic taxonomy |
| `protocol-stack` | Protocol map |
| `security-boundaries` | Security review |
| `failure-modes` | Ops review |
| `dlq-flow` | Topic taxonomy |
| `sam-agent-topology` | SAM topology |
| `auth-scope-flow` | SAM topology |
| `dmr-topology` | DMR topology |
| `ha-failover` | HA/DR design |
| `dr-failover` | HA/DR design (multi-region) |
| `mi-connectivity` | Integration map |
| `migration-coexistence` | Migration plan |

### Inputs

- **Project state read:** All available artifact files. Checks which artifacts exist to determine which diagrams can be generated.
- **User input requested:**
  - Scope via AskUserQuestion: Generate all available, generate a specific diagram, or list what is available.

### Outputs

- **Artifacts:** `artifacts/12-blueprint/diagrams/*.mermaid` (only diagrams supported by existing artifacts)
- **Progress:** Diagram generation noted. Does not affect blueprint progress.

### Example

After topic design and SAM design are complete (but before reviews), running `/solace-diagrams` generates: data-flow, topic-hierarchy, queue-subscriptions, dlq-flow, sam-agent-topology, and auth-scope-flow. It reports that broker-topology, security-boundaries, and failure-modes are not yet available and lists which artifacts are needed.

---

## `/solace-help`

**Category:** Utility
**Preamble tier:** T1
**Prerequisites:** None.

### When to use

- You are new to Solace Architect and want to understand the available skills and workflow.
- You want to see the status of the active project at a glance.
- You want the full skill catalog with one-line descriptions.

### Intent

Displays help information for Solace Architect. Shows the essential commands for getting started, active project status (if a project exists), and the full skill catalog organized by category.

### Scope

Covers: getting started guide (discovery, plan, projects, and the optional intake shortcut), active project status summary (completed skills, in-progress skills, recommended next step), full skill catalog listing (Design, Review, Finalize, Utility categories with one-line descriptions).

Does not cover: running any skills, modifying project state, or creating projects.

### Inputs

- **Project state read:** `projects/.active`, `progress.yaml` for the active project
- **User input requested:** None. This is a read-only display.

### Outputs

- **Artifacts:** None.
- **Decisions:** None.
- **Progress:** No progress entry. This is a utility command.

### Example

Running `/solace-help` with an active project that has completed discovery and topic design shows:

```
  You only need three commands:
    /solace-discovery     Start a new project
    /solace-plan          Run the full engagement
    /solace-projects      Dashboard

  Optional shortcut:
    /solace-intake        Generate a template for offline collection, or import a completed intake

  Active project: acme-bank-chat
    ✓ Discovery (complete)
    ✓ Topic Design (complete)
    · Broker Selection (not started)
    ...
  Recommended next: /solace-broker-select

  Individual Skills
    Design:    8 skills (topic, broker, SAM, protocol, mesh, HA/DR, migration, integration)
    Review:    4 skills (architect, ops, security, dev)
    Finalize:  3 skills (validate, blueprint, executive)
    Utility:   2 skills (diagrams, help)
```
