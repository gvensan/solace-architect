# Solace Architect SaaS — Architecture & Strategy

This document captures the design discussion for building a SaaS web application
on top of the Solace Architect skill-based toolkit.

---

## 1. Current State: Skill-Based Toolkit

Solace Architect is implemented as a set of **Claude Code skills** — prompt
templates (`.tmpl` files) that are generated into `SKILL.md` files and symlinked
into `~/.claude/skills/`. Users invoke them as slash commands (`/solace-discovery`,
`/solace-plan`, etc.) within a Claude Code CLI session.

### Characteristics

- **No standalone runtime** — everything runs inside a Claude Code session.
- **Prompt-as-program** — `.tmpl` templates are the source code, written in
  natural language with embedded bash blocks.
- **Skill chaining** — `/solace-plan` orchestrates other skills in sequence.
- **Local project state** — artifacts are written to a `projects/` directory on
  the local filesystem.
- **18 skills** covering discovery, design (7 skills), review (4 skills),
  validation, blueprint assembly, orchestration, project management, and help.

---

## 2. Goal: SaaS Web Application

Build a web-based frontend that fully capitalizes on the existing skill toolkit
while providing:

- Controlled flow and presentation (not a raw CLI interface)
- Project lifecycle management (create, switch, execute skills, review artifacts)
- Multi-user, multi-tenant support
- Custom UI for each workflow stage (forms, dashboards, visualizations)
- Streaming real-time output during skill execution

---

## 3. Approaches Evaluated

### Option 1: Claude Code Agent SDK as Backend

Use the Claude Code TypeScript SDK (`@anthropic-ai/claude-agent-sdk`) or CLI
(`claude -p`) as a headless backend, wrapping skill invocations behind a web
server.

**Available capabilities:**
- `claude -p` with `--output-format json|stream-json` for programmatic output
- TypeScript SDK `query()` function with streaming, session management, hooks
- Session resumption via session IDs (`--resume`, `options.resume`)
- Permission control via `--allowedTools` and `--permission-mode`
- Structured outputs via `--json-schema`
- Built-in tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch

**Limitations:**
- **Skills (slash commands) are not available in programmatic mode.** This is the
  critical blocker — you cannot invoke `/solace-discovery` from `-p` mode or the
  SDK. You would need to embed skill prompts as system prompts anyway.
- Mid-skill flow control (pause, inject UI checkpoints) is not possible — once
  invoked, a skill runs to completion.
- Text-in/text-out interface — structured input/output requires parsing natural
  language on both ends.

### Option 2: Claude API Directly (Recommended)

Build a standard web application using the Anthropic Messages API
(`@anthropic-ai/sdk`), embedding skill prompts as system instructions with
tool use for structured interactions.

**Advantages:**
- Full UI control — structured forms, visual dashboards, approval gates
- Prompt caching — 90% cost reduction on reused skill prompts
- Tool use — define custom tools Claude calls, executed server-side
- Streaming — token-by-token output via SSE
- Extended thinking — for complex architectural reasoning
- Multi-user persistence — conversation history in a database
- Skill orchestration — custom chaining logic replaces `/solace-plan`

### Decision: Option 2

Since skills don't work in programmatic Claude Code mode, option 1 would require
embedding skill prompts as system prompts anyway — which is exactly what option 2
does, but with more control, lower cost (via caching), and a proper product
architecture.

---

## 4. Target Architecture

```
┌─────────────────────────────────────────────┐
│  React / Next.js Frontend                   │
│                                             │
│  - Project dashboard (list, create, switch) │
│  - Skill launcher (buttons, not slash cmds) │
│  - Streaming response display               │
│  - Structured forms for discovery inputs    │
│  - Visual artifact viewers                  │
│    (topologies, taxonomies, mesh diagrams)  │
│  - Approval gates between skill steps       │
│  - Progress tracking across skill sequence  │
└──────────────────┬──────────────────────────┘
                   │  REST / WebSocket / SSE
                   ▼
┌─────────────────────────────────────────────┐
│  Backend (Node.js / Next.js API Routes)     │
│                                             │
│  - Authentication & multi-tenancy           │
│  - Project & session persistence (DB)       │
│  - Skill prompt loader & template resolver  │
│  - Orchestration engine (skill chaining)    │
│  - Tool execution layer                     │
│    (save/read artifacts, run validations)   │
│  - Prompt caching management                │
│  - Rate limiting & usage metering           │
└──────────────────┬──────────────────────────┘
                   │  @anthropic-ai/sdk
                   ▼
┌─────────────────────────────────────────────┐
│  Claude API (Messages API)                  │
│                                             │
│  - Skill prompts as cached system prompts   │
│  - Tool use for structured interactions     │
│  - Streaming for real-time output           │
│  - Extended thinking for complex design     │
└─────────────────────────────────────────────┘
```

---

## 5. Mapping: Current Skills to SaaS Components

| Current (Claude Code)            | SaaS Equivalent                                       |
|----------------------------------|-------------------------------------------------------|
| `.tmpl` skill templates          | System prompts loaded per-skill, cached via API       |
| `/solace-discovery`              | "New Project" button → API call with discovery prompt |
| `/solace-plan` orchestrator      | Backend skill-chaining loop                           |
| `/solace-projects` dashboard     | React project dashboard with DB-backed state          |
| `projects/` directory            | Database (Postgres) — per-tenant project storage      |
| Session continuity (conversation)| Conversation history stored in DB, replayed per call  |
| Claude's built-in Read/Write/Bash| Custom tools defined and executed server-side          |
| Free-text slash command input    | Mix of structured forms + chat interface              |
| Artifact files on disk           | Artifacts stored in DB, rendered in UI                |
| Skill template variables         | Server-side template resolver (reuse existing code)   |

---

## 6. Key API Capabilities

### 6.1 Prompt Caching

Skill prompts are large (often 10K+ tokens) and identical across users. The
Anthropic API supports prompt caching that reduces input token costs by 90%
after the first cache write.

```typescript
const response = await client.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 4096,
  system: [
    {
      type: "text",
      text: skillPromptContent,       // large, reusable skill prompt
      cache_control: { type: "ephemeral" }  // cached for 5 minutes
    }
  ],
  messages: conversationHistory
});
```

**Cost impact:**
- Uncached input: $5.00/MTok
- Cached read: $0.50/MTok (90% savings)
- Cache write: $6.25/MTok (1.25x, amortized across reads)

### 6.2 Tool Use

Define custom tools that Claude can call during skill execution. The backend
executes the tool and returns results to Claude.

```typescript
const tools = [
  {
    name: "save_artifact",
    description: "Save a skill artifact (topology, taxonomy, config) to the project",
    input_schema: {
      type: "object",
      properties: {
        artifact_type: {
          type: "string",
          enum: ["topic-taxonomy", "broker-config", "mesh-topology",
                 "ha-dr-plan", "migration-plan", "integration-design",
                 "protocol-matrix", "sam-design", "review-findings",
                 "validation-report", "blueprint"]
        },
        name: { type: "string" },
        content: { type: "string" }
      },
      required: ["artifact_type", "name", "content"]
    }
  },
  {
    name: "read_artifact",
    description: "Read a previously saved artifact from the project",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        artifact_type: { type: "string" },
        name: { type: "string" }
      },
      required: ["project_id", "artifact_type"]
    }
  },
  {
    name: "list_project_artifacts",
    description: "List all artifacts in a project",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" }
      },
      required: ["project_id"]
    }
  }
];
```

### 6.3 Streaming

Token-by-token output streamed to the frontend via Server-Sent Events:

```typescript
const stream = client.messages.stream({
  model: "claude-opus-4-7",
  max_tokens: 4096,
  system: skillPrompt,
  messages: conversationHistory
});

for await (const event of stream) {
  if (event.type === "content_block_delta" &&
      event.delta.type === "text_delta") {
    res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
  }
}
```

### 6.4 Conversation Management

The Messages API is stateless. Conversation history must be managed server-side:

```typescript
class SkillSession {
  private history: Array<{ role: "user" | "assistant"; content: string }> = [];

  async execute(userInput: string, skillPrompt: string): Promise<string> {
    this.history.push({ role: "user", content: userInput });

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      system: [{ type: "text", text: skillPrompt, cache_control: { type: "ephemeral" } }],
      messages: this.history
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    this.history.push({ role: "assistant", content: text });
    return text;
  }
}
```

For multi-user SaaS, persist `history` to the database keyed by
`(user_id, project_id, skill_name)`.

### 6.5 Extended Thinking

For complex architectural reasoning (mesh design, HA/DR trade-offs):

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 8192,
  thinking: {
    type: "enabled",
    budget_tokens: 5000
  },
  system: skillPrompt,
  messages: [{ role: "user", content: userInput }]
});
```

### 6.6 Skill Orchestration

The `/solace-plan` orchestrator becomes a backend loop:

```typescript
async function executeEngagement(projectId: string, discoveryOutput: string) {
  const skillSequence = [
    "topic-design",
    "protocol-select",
    "broker-select",
    "mesh-design",
    "ha-dr",
    "integration",
    "sam-design"
  ];

  let previousOutput = discoveryOutput;

  for (const skillName of skillSequence) {
    const prompt = await loadSkillPrompt(skillName);
    const result = await executeSkillWithTools(prompt, previousOutput, projectId);
    await db.saveArtifact(projectId, skillName, result);
    previousOutput = result;

    // Emit progress to frontend
    await notifyClient(projectId, { skill: skillName, status: "complete" });
  }
}
```

---

## 7. Components to Build

### 7.1 Skill Prompt Loader

Reads `.tmpl` files, resolves template variables (reusing the existing
`scripts/resolvers/` pipeline), and serves them as system prompts.

**Reuse from current codebase:**
- `scripts/gen-skill-docs.ts` — template generation logic
- `scripts/resolvers/` — all 9 resolver modules
- `scripts/resolvers/preamble/` — preamble generators

The loader would resolve templates at startup or on-demand, cache the resolved
prompts, and serve them to the API layer.

### 7.2 Orchestration Engine

Replaces `/solace-plan`. Manages:
- Skill sequencing (which skills to run, in what order)
- Artifact passing between skills (output of one feeds the next)
- Progress tracking and status reporting
- Approval gates (pause between skills for user review)
- Error handling and retry logic

### 7.3 Tool Execution Layer

Server-side handlers for tools Claude calls during skill execution:
- `save_artifact` — persist design artifacts to database
- `read_artifact` — retrieve previous artifacts for cross-skill context
- `list_project_artifacts` — enumerate what's been produced
- `validate_artifact` — run consistency checks (from `/solace-validate`)
- `fetch_grounding` — retrieve Solace documentation for grounding

### 7.4 Project Persistence

Database schema (Postgres recommended):

```
users
  id, email, name, created_at

projects
  id, user_id, name, status, discovery_brief, created_at, updated_at

artifacts
  id, project_id, skill_name, artifact_type, name, content, version, created_at

conversations
  id, project_id, skill_name, messages (jsonb), created_at, updated_at

skill_executions
  id, project_id, skill_name, status, started_at, completed_at,
  input_tokens, output_tokens, cost_usd
```

### 7.5 Authentication & Multi-Tenancy

- User accounts with project isolation
- API key or OAuth-based authentication
- Per-user usage tracking and billing
- Project sharing (optional — team collaboration)

### 7.6 Frontend

| View                  | Purpose                                                |
|-----------------------|--------------------------------------------------------|
| Project Dashboard     | List projects, status, last activity, create new       |
| Discovery Wizard      | Structured form for system landscape, goals, constraints|
| Skill Launcher        | Run individual skills, see progress, approve/reject    |
| Plan Executor         | Run full engagement, track progress across all skills  |
| Artifact Viewer       | Rendered view of topologies, taxonomies, configs       |
| Chat Interface        | Follow-up questions, refinements within a skill        |
| Review Dashboard      | Findings from review skills, severity, recommendations |
| Blueprint Export      | Download final blueprint as PDF/Markdown               |

---

## 8. Cost Profile

### Per-Skill Execution (with prompt caching)

| Component        | Tokens | Rate            | Cost     |
|------------------|--------|-----------------|----------|
| Skill prompt (cached read) | ~2,000 | $0.50/MTok | $0.001   |
| User input       | ~500   | $5.00/MTok      | $0.003   |
| Output           | ~1,500 | $25.00/MTok     | $0.038   |
| **Total per call** |      |                 | **~$0.04** |

### Per-Engagement (15 skills, full plan)

| Scenario          | Calls | Cost/call | Total    |
|-------------------|-------|-----------|----------|
| Single pass       | 15    | $0.04     | ~$0.60   |
| With follow-ups   | 30    | $0.04     | ~$1.20   |
| Heavy interaction | 60    | $0.04     | ~$2.40   |

### Monthly SaaS (projections)

| Scale              | Projects/month | Cost (API) | Notes                    |
|--------------------|----------------|------------|--------------------------|
| Early (10 users)   | 50             | ~$60       | Prompt caching essential  |
| Growth (100 users) | 500            | ~$600      | Batch API for reviews     |
| Scale (1000 users) | 5,000          | ~$6,000    | Priority tier recommended |

---

## 9. Implementation Sequence

### Phase 1: Proof of Concept
1. Skill prompt loader — resolve `.tmpl` files server-side
2. Single-skill API endpoint (discovery) with streaming
3. Minimal React frontend — chat interface + response display
4. In-memory project state (no DB yet)

### Phase 2: Core Product
5. Database persistence (projects, artifacts, conversations)
6. Tool execution layer (save/read artifacts)
7. Orchestration engine (skill chaining, progress tracking)
8. Authentication (user accounts, project isolation)
9. Project dashboard and skill launcher UI

### Phase 3: Polish & Scale
10. Structured forms for discovery inputs
11. Visual artifact renderers (topology diagrams, taxonomy trees)
12. Review dashboard with findings aggregation
13. Blueprint export (PDF/Markdown)
14. Usage metering and billing
15. Team collaboration (shared projects)

---

## 10. Technology Stack (Recommended)

| Layer        | Technology                                          |
|--------------|-----------------------------------------------------|
| Frontend     | Next.js (App Router), React, Tailwind CSS           |
| Backend      | Next.js API routes or standalone Node.js/Express    |
| Database     | PostgreSQL (via Prisma or Drizzle ORM)              |
| Auth         | NextAuth.js or Clerk                                |
| AI           | `@anthropic-ai/sdk` (Anthropic TypeScript SDK)      |
| Streaming    | Server-Sent Events (SSE) or WebSocket               |
| Hosting      | Vercel, Railway, or AWS                             |
| Monitoring   | Token usage tracking, cost dashboards               |

---

## 11. What Transfers Directly from Current Codebase

The following components can be reused with minimal modification:

| Component                           | Current location              | Reuse strategy                |
|-------------------------------------|-------------------------------|-------------------------------|
| Skill prompt templates              | `**/SKILL.md.tmpl`           | Load and resolve server-side  |
| Template resolver pipeline          | `scripts/resolvers/`         | Import directly               |
| Preamble generators                 | `scripts/resolvers/preamble/`| Import directly               |
| Naming conventions                  | `scripts/resolvers/preamble/generate-naming-conventions.ts` | Embed in system prompts |
| Jargon glossary                     | `scripts/jargon-list.json`   | Embed in system prompts       |
| Antipatterns                        | `solace-grounding/antipatterns.md` | Feed to validation tool  |
| Grounding documents                 | `solace-grounding/`          | Serve via grounding tool      |
| Skill discovery                     | `scripts/discover-skills.ts` | Reuse for skill registry      |
| Host config types                   | `hosts/`, `scripts/host-config.ts` | Adapt for SaaS host     |
| Model registry                      | `scripts/models.ts`          | Reuse for model selection     |

---

## 12. Open Questions

1. **Deployment model** — Self-hosted per customer, or shared multi-tenant?
2. **Grounding document access** — Fetch live from Solace docs, or bundle snapshots?
3. **Artifact format** — Markdown (current), structured JSON, or both?
4. **Approval workflow** — Automatic skill chaining, or manual approval between steps?
5. **Pricing model** — Per-project, per-skill-execution, subscription tier, or usage-based?
6. **Offline/export** — Should users be able to export and continue in Claude Code CLI?
7. **Team features** — Shared projects, role-based access, commenting on artifacts?
