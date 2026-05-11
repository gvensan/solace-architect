# What is Solace Architect?

Solace Architect is an AI-powered solution architect that takes you from business
requirements to a complete Solace architecture — and the business case to back it up.

You describe your systems and goals. Solace Architect runs a structured engagement:
discovery, design, reviews, validation. What comes out the other end is a technical
blueprint your engineering team can build from, and an executive summary your
leadership team can fund with.

---

## The problem it solves

Designing an event-driven architecture on Solace involves dozens of decisions:
broker type, topic taxonomy, protocol selection, mesh topology, HA/DR strategy,
security posture, migration path, governance model. Each decision depends on the
others, and getting them wrong is expensive to fix later.

Today, these decisions live in the heads of senior architects. The knowledge is
real but scarce — and an engagement that should take days stretches into weeks
of meetings, slide decks, and back-and-forth.

Solace Architect compresses that timeline. It brings the structured thinking of
an experienced Solace architect into every engagement, every time — consistent,
thorough, and grounded in Solace documentation.

---

## What it does

A Solace Architect engagement has three phases:

### 1. Understand

Everything starts with discovery. You describe the systems that need to
communicate, the protocols they speak, the event types that flow between them,
and the requirements that constrain the design: latency targets, delivery
guarantees, topology, compliance, scale.

Solace Architect asks the right questions, identifies what matters, and captures
it in a structured discovery brief. No detail is assumed — every architectural
decision traces back to a stated requirement or an explicit design choice.

For teams that prefer to collect requirements offline, the intake template
(available as a Word document, YAML, or Markdown) lets stakeholders fill in
what they know before the engagement begins. What they leave blank, Solace
Architect follows up on.

### 2. Design

With discovery complete, Solace Architect works through each design dimension:

- **Topic taxonomy** — the naming structure that organizes every event in the system
- **Broker selection** — cloud-managed, self-hosted software, or appliance, with sizing
- **Protocol selection** — which protocol fits each system's needs and constraints
- **Mesh topology** — how brokers connect across sites, regions, and clouds
- **HA and DR** — what fails, how it recovers, and what the business loses in between
- **Integration** — which Micro-Integrations connect external systems to the event mesh
- **Migration** — if moving from another platform, the phased path to get there
- **Event Portal governance** — how events are cataloged, discovered, and promoted

Each step produces a concrete artifact: a topology document, a protocol map, a
migration plan. Every recommendation is grounded in Solace platform documentation —
not invented, not borrowed from other vendors, not hallucinated.

At each decision point, Solace Architect presents the options, the tradeoffs,
and a recommendation. You choose. The design accumulates your decisions into a
coherent architecture.

### 3. Validate and deliver

Before anything is finalized, four independent reviews check the design:

- **Architecture review** — structural soundness, antipattern detection
- **Operations review** — day-two readiness, monitoring, upgrade paths
- **Security review** — authentication, encryption, access control, compliance
- **Developer experience review** — SDK choices, schema governance, onboarding

Findings feed back into the design. What remains is validated, cross-checked,
and assembled into two deliverables:

**The technical blueprint** — a deployment-ready specification covering every
layer of the architecture: infrastructure, topic design, queue bindings,
security configuration, monitoring setup, and CI/CD integration.

**The executive summary** — the business case for the architecture: what it
enables, what it costs, what it saves, and the ROI framework with sensitivity
analysis that lets leadership pressure-test the numbers.

---

## How it works in practice

There are two ways to run an engagement:

**The three-command path** — for most projects, three commands cover the full arc:

1. `/solace-discovery` — describe your systems and goals
2. `/solace-plan` — Solace Architect picks the right skills, runs them in order,
   and pauses only for design decisions
3. `/solace-projects` — track progress, review artifacts, export the report

**Individual skills** — for teams that want to run specific design steps
independently, each skill is available as a standalone command. Re-run topic
design after requirements change. Add a security review to an existing project.
Pick up where you left off.

Every engagement produces a project folder with all artifacts, decisions, and
a timing log. The project dashboard gives you a single view of everything
produced — and the HTML report packages it for stakeholders who were not in
the room.

---

## The business case

A good architecture that never gets funded is the same as no architecture. Solace
Architect closes that gap by producing the business case alongside the technical
design — not as an afterthought, but as a first-class deliverable.

**Executive summary** — a narrative written for leadership, not engineers. It
frames the architecture in business terms: what capability it unlocks, what risk
it retires, what operational cost it eliminates. The format is ready to drop into
a funding request or a steering committee deck.

**ROI framework** — a structured model that quantifies the value of the
architecture across five dimensions:

- *Development velocity* — time saved by standardized event patterns and
  pre-built Micro-Integrations versus custom point-to-point integration
- *Operational efficiency* — reduction in incident response time, lower
  monitoring overhead, fewer manual interventions
- *Infrastructure optimization* — right-sized broker selection, avoided
  over-provisioning, cloud cost management
- *Risk reduction* — quantified cost of downtime avoided through HA/DR
  design, security posture improvements, compliance coverage
- *Time to market* — faster delivery of new event-driven capabilities
  using the designed platform versus building from scratch

The ROI model includes a sensitivity analysis with adjustable parameters —
adoption rate, implementation timeline, cost assumptions — so leadership can
pressure-test the numbers against their own expectations. A combined scenario
shows how multiple what-if adjustments compound, with delta indicators showing
the shift from baseline projections.

The result: engineering gets a blueprint they can build from, and leadership
gets a business case they can fund with. Same engagement, both audiences served.

---

## What it is not

Solace Architect does not deploy infrastructure. It does not write application
code. It does not replace the judgment of an experienced architect — it augments
it.

It is a design tool, not a runtime tool. The output is a blueprint: precise
enough to build from, reviewed enough to trust, and documented enough to hand
to someone who was not part of the conversation.

---

## Who it is for

Solace Architect has two distinct audiences: the **operator** who runs the
engagement, and the **consumer** who reads the deliverables.

**Operators** — the people who invoke the skills and guide the engagement.

- **Solution architects, developer advocates, pre-sales engineers, and
  professional services consultants** running Solace engagements — faster
  time-to-design, consistent quality, nothing missed

**Consumers** — the people who receive the artifacts.

- **Engineering teams evaluating Solace** — structured discovery surfaces the
  right questions before the first line of code
- **Technical leaders building the business case** — ROI framework and executive
  summary speak the language of funding decisions
- **Existing Solace customers extending their platform** — migration planning,
  new use case design, architecture review of what is already running

The skills assume an expert operator who can verify recommendations against
Solace documentation and adapt them to customer-specific constraints. Customers
can run the tool unguided, but the discovery questions, grounding caveats, and
validation labels are written for someone who can verify and adapt on the spot.

---

## Built on what Solace knows

Every recommendation Solace Architect makes is grounded in Solace documentation:
`docs.solace.com`, the Solace Agent Mesh project, the Integration Hub catalog,
and published reference architectures. When a capability is not documented, Solace
Architect says so — it does not guess.

The naming is precise. The terminology is exact. The antipatterns are cataloged
and checked against. This is not a general-purpose AI giving generic advice about
messaging — it is a Solace-specific tool that knows where the platform shines and
where the sharp edges are.
