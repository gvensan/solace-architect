# Architecture

This document explains how Solace Architect's template pipeline works and why it is built this way. For setup and commands, see CLAUDE.md.

## The core idea

Solace Architect gives AI coding agents a set of opinionated skills for event-driven architecture on the Solace platform. Every skill is a Markdown document (SKILL.md) that tells the agent what to do, step by step, grounded in Solace documentation.

The hard part is not the Markdown. The hard part is generating consistent, accurate, host-adapted skill documents across 10 different AI coding agents while enforcing strict Solace terminology, grounding discipline, and naming conventions. That is what the template pipeline does.

```
SKILL.md.tmpl          (human-written skill logic + {{PLACEHOLDERS}})
       |
gen-skill-docs.ts      (reads templates, resolves placeholders, applies host transforms)
       |
SKILL.md               (committed, auto-generated, host-specific)
```

## Template pipeline

### Templates

Every skill has a `.tmpl` file containing the skill's logic as Markdown prose with embedded bash code blocks. The prose is what the AI coding agent reads at skill invocation time. Templates contain `{{PLACEHOLDER}}` markers that the generator resolves at build time.

### Resolvers

The `scripts/resolvers/` directory contains modules that fill in placeholders. The registry lives in `scripts/resolvers/index.ts`:

```typescript
export const RESOLVERS: Record<string, ResolverFn> = {
  PREAMBLE: generatePreamble,
  BASE_BRANCH_DETECT: generateBaseBranchDetect,
  TEST_FAILURE_TRIAGE: generateTestFailureTriage,
  CO_AUTHOR_TRAILER: generateCoAuthorTrailer,
  CONFIDENCE_CALIBRATION: generateConfidenceCalibration,
  INVOKE_SKILL: generateInvokeSkill,
  FINDING_RESOLUTION: generateFindingResolution,
  BIN_DIR: (ctx) => ctx.paths.binDir,
  GROUNDING_DIR: (ctx) => ctx.paths.groundingDir,
};
```

Each resolver is a function that takes a `TemplateContext` and returns a string. The context carries the current host, skill metadata, and computed paths.

Most resolvers live inside the preamble composition (`scripts/resolvers/preamble/`). Standalone resolvers like `FINDING_RESOLUTION` are used as `{{PLACEHOLDER}}` markers in specific skill templates (e.g., review skills) rather than being injected into every skill's preamble.

### The preamble

The `{{PREAMBLE}}` placeholder is the most important resolver. It generates the shared sections that appear at the top of every skill, controlled by a tier system:

| Tier | Sections included | Use case |
|------|-------------------|----------|
| T1 | Bootstrap bash, grounding rules, naming conventions, grounding loading, validation hook, dependency enforcement, project management, timing instrumentation, voice (minimal), completion status | Lightweight utility skills |
| T2 | T1 + AskUserQuestion format, writing style, completeness principle, confusion protocol, continuous checkpoint, context health, next-step chaining | Interactive skills (discovery, design) |
| T3 | T2 + repo ownership, search before building | Skills that modify code or infrastructure |
| T4 | T3 (full preamble) | Reserved for future expansion |

The composition root is `scripts/resolvers/preamble.ts`:

```typescript
export function generatePreamble(ctx: TemplateContext): string {
  const tier = ctx.preambleTier ?? 4;
  const sections = [
    generatePreambleBash(ctx),
    generateGroundingRules(ctx),
    generateNamingConventions(),
    generateGroundingLoading(ctx),
    generateValidationHook(),
    generateDependencyEnforcement(),
    generateProjectManagement(),
    generateTimingInstrumentation(),
    generateVoiceDirective(tier),
    ...(tier >= 2 ? [
      generateAskUserFormat(ctx),
      generateWritingStyle(ctx),
      generateCompletenessSection(),
      generateConfusionProtocol(),
      generateContinuousCheckpoint(),
      generateContextHealth(),
      generateNextStepChaining(),
    ] : []),
    ...(tier >= 3 ? [generateRepoModeSection(), generateSearchBeforeBuildingSection(ctx)] : []),
    generateCompletionStatus(ctx),
  ];
  return sections.filter(s => s && s.trim().length > 0).join('\n\n');
}
```

### Preamble generators

Each generator in `scripts/resolvers/preamble/` produces one section:

| Generator | Section | Purpose |
|-----------|---------|---------|
| `generate-grounding-rules.ts` | Grounding Discipline | Enforces accuracy: only assert what Solace docs support |
| `generate-naming-conventions.ts` | Naming Conventions | Solace terminology table + "never use" prohibitions |
| `generate-voice-directive.ts` | Voice | Senior architect tone, no AI vocabulary, no vendor pitch |
| `generate-ask-user-format.ts` | AskUserQuestion Format | Decision brief format: D-numbered, context, recommendation callout, per-option pros/cons with completeness, free-text prompt format |
| `generate-writing-style.ts` | Writing Style | Jargon glossing, outcome framing, Solace term precision |
| `generate-completeness-section.ts` | Completeness Principle | "Boil the Lake" philosophy: completeness is cheap with AI |
| `generate-confusion-protocol.ts` | Confusion Protocol | Stop and ask on high-stakes ambiguity |
| `generate-continuous-checkpoint.ts` | Continuous Checkpoint | WIP commit discipline when CHECKPOINT_MODE is continuous |
| `generate-context-health.ts` | Context Health | Progress summaries during long sessions |
| `generate-next-step-chaining.ts` | Next Step Chaining | 3-option interactive routing (Continue/Skip/Custom) with auto/interactive execution mode |
| `generate-completion-status.ts` | Completion Status | DONE / BLOCKED / NEEDS_CONTEXT protocol |
| `generate-preamble-bash.ts` | Preamble bash | Branch detection + skill name echo |
| `generate-repo-mode-section.ts` | Repo Ownership | Code modification guidelines |
| `generate-search-before-building.ts` | Search Before Building | Three-layer knowledge framework |
| `generate-grounding-loading.ts` | Grounding Document Loading | Pre-recommendation verification against grounding docs |
| `generate-validation-hook.ts` | Artifact Validation | Terminology, naming, and ungrounded claims checks |
| `generate-dependency-enforcement.ts` | Cross-Skill Dependencies | Input dependency verification before skill execution |
| `generate-project-management.ts` | Project Management | Project lifecycle, progress tracking, resume support |
| `generate-timing-instrumentation.ts` | Timing Instrumentation | Per-skill wall time, user wait time, and execution time tracking in progress.yaml |

## Grounding documents

The `solace-grounding/` directory contains the authoritative source material that every skill references:

| Document | Role |
|----------|------|
| `solace-platform-reference.md` | Coverage map. Three-layer model: Event Mesh, Application Services, Platform Services. What Solace Architect is accountable to know. |
| `solace-canonical-sources.md` | URL-by-topic index. When a skill needs technical depth, it fetches from these URLs rather than reasoning from training data. |
| `solace-reference-architectures.md` | Three worked patterns: multi-system AI assistant (SAM), real-time market data distribution (event mesh), hybrid IT/OT manufacturing (federated mesh). |
| `antipatterns.md` | Known mistakes organized by category. Every technical domain and validation skill checks output against this library. |
| `integration-hub-catalog.md` | Point-in-time snapshot of Solace Integration Hub. Skills match backend systems against available Micro-Integrations without live fetching. |
| `claude-instructions.md` | Claude-specific operating instructions. |
| `gaps.md` | Gap tracker. Records when a skill can't find what it needs in the grounding documents. |
| `MAINTENANCE.md` | Refresh manifest. Tracks all external resources, their refresh cadence, and version numbers. |

The grounding discipline is enforced in `generate-grounding-rules.ts`. It tells the agent:
- Only assert what Solace docs support
- Do not invent Solace features or borrow concepts from other messaging vendors
- When a capability is not in the sources, say so explicitly
- When reasoning from first principles, label it as architectural inference
- Fetch canonical sources rather than reasoning from training data

## Multi-host generation

Solace Architect generates SKILL.md files for 10 AI coding agent hosts. Each host has a typed config in `hosts/`.

External host output directories (`.agents/`, `.cursor/`, `.kiro/`, etc.) are **gitignored** — they are build artifacts, not source. Only the `.tmpl` templates and the Claude-primary SKILL.md files are committed. After cloning, run `bun run build` to generate for all hosts.

### Host config interface

```typescript
interface HostConfig {
  name: string;
  displayName: string;
  cliCommand: string;
  globalRoot: string;           // e.g., '.claude/skills/solace-architect'
  localSkillRoot: string;
  hostSubdir: string;
  usesEnvVars: boolean;
  frontmatter: {
    mode: 'allowlist' | 'denylist';
    keepFields?: string[];
    stripFields?: string[];
    descriptionLimit: number | null;
  };
  generation: {
    generateMetadata: boolean;
  };
  pathRewrites: Array<{ from: string; to: string }>;
  toolRewrites: Record<string, string>;
  suppressedResolvers: string[];
  runtimeRoot: {
    globalSymlinks: string[];
  };
  install: {
    prefixable: boolean;
    linkingStrategy: string;
  };
  coAuthorTrailer: string;
}
```

### Host adaptation pipeline

When generating for an external host (anything other than Claude):

1. **Frontmatter transform.** Allowlist mode keeps only specified fields. Denylist mode removes specified fields. Some hosts add conditional fields based on template metadata.

2. **Path rewrites.** Each host specifies `from → to` path pairs. For example, hosts that use environment variables rewrite `~/.claude/skills/solace-architect` to `$SOLACE_ARCHITECT_ROOT`.

3. **Tool rewrites.** Hosts that don't share Claude's tool names get rewrites. For example, `use the Bash tool` may become `use the exec tool` or `run this command` depending on the host.

4. **Metadata generation.** Some hosts need additional files alongside each SKILL.md (e.g., YAML manifests).

5. **Skill naming.** External hosts prefix skill names with `solace-`. The `externalSkillName()` function handles this: `discovery` becomes `solace-discovery`. Names already starting with `solace-` pass through unchanged.

### The generator

`scripts/gen-skill-docs.ts` orchestrates the full pipeline:

1. Discover all `.tmpl` files using `scripts/discover-skills.ts`
2. For each template: parse frontmatter, build `TemplateContext`, resolve all `{{PLACEHOLDER}}` markers
3. Write the generated SKILL.md alongside the template
4. If `--host all`: repeat for each external host, applying that host's transforms
5. Report token budgets per host (warning at 160KB / ~40K tokens)

## Skill categories

Skills are organized into categories. Users only need three commands to run a full engagement:

| Command | Purpose |
|---------|---------|
| `/solace-discovery` | Start a new project — describe systems and goals |
| `/solace-plan` | Run the full engagement (picks skills, runs them in order) |
| `/solace-projects` | Dashboard — status, timing, summary, switch projects |
| `bun run dashboard` | Launch project dashboard on localhost:3000 |

The remaining skills run automatically via `/solace-plan` or can be invoked individually:

| Category | Skills | Description |
|----------|--------|-------------|
| Start here | `/solace-discovery`, `/solace-plan`, `/solace-projects` | Entry points: project creation, orchestration, dashboard |
| Design | `/solace-topic-design`, `/solace-broker-select`, `/solace-sam-design`, `/solace-protocol-select`, `/solace-mesh-design`, `/solace-ha-dr`, `/solace-migration`, `/solace-integration`, `/solace-event-portal` | Solace platform knowledge, artifact generation (YAML, diagrams, configs) |
| Review | `/solace-architect-review`, `/solace-ops-review`, `/solace-security-review`, `/solace-dev-review` | Architect, developer, ops, security perspectives with interactive finding resolution |
| Finalize | `/solace-validate`, `/solace-blueprint` | Consistency checks, antipattern detection, final blueprint assembly |
| Utility | `/solace-help` | Skill catalog, workflow overview, active project status |

Each skill directory follows the naming convention: `solace-<skill-name>/SKILL.md.tmpl`.

### Interactive finding resolution (review skills)

All four review skills use the `{{FINDING_RESOLUTION}}` resolver to walk through findings interactively. Areas with no issues are displayed as grouped confirmations. Actual issues are presented one at a time with Apply/Defer/Discuss options:

- **Apply** — updates the referenced artifact and records the change in `decisions.yaml`
- **Defer** — logs the finding for later; `/solace-validate` picks up deferred items
- **Discuss** — user asks questions before deciding; the finding is re-presented after discussion

In auto execution mode, Advisory and Important findings are auto-applied; only Critical findings pause for user consent. The final review document marks each finding as APPLIED or DEFERRED.

## Project management infrastructure

Skills produce artifacts for a specific engagement. Project management infrastructure gives those artifacts a home and tracks progress across skill invocations.

### Project directory structure

All project outputs go to `projects/<project-slug>/`. The `projects/` directory is gitignored — project data is local to the user, not committed to the toolkit repo.

```
projects/<project-slug>/
  context.yaml          # project name, creation date, status
  decisions.yaml        # accumulated design decisions across skills
  progress.yaml         # skill execution log with resume support
  feedback.yaml         # per-project feedback on skill output quality
  artifacts/            # all generated outputs, organized by skill
    01-discovery/
    02-topic-design/
    03-broker-select/
    04-sam-design/
    05-protocol-select/
    06-mesh-design/
    07-ha-dr/
    08-integration/
    09-migration/
    10-reviews/
    11-validation/
    12-blueprint/

dashboard/
  index.html            # Dashboard shell (sidebar nav, content area, right sidebar)
  app.js                # Single-page app: views, report generation, data fetching
  styles.css            # Dark/light themes, skill groups, animations
```

### Active project tracking

`projects/.active` is a plain text file containing the current project slug. The preamble's project management section tells the agent to read this at session start.

### Progress tracking and resume

`progress.yaml` logs what each skill has done: status (started, in-progress, complete, interrupted), timestamps, step reached, artifacts produced, pending items, and timing data. Each skill's progress entry includes a `timing` block that tracks `wall_sec`, `user_wait_sec`, and `execution_sec`, with per-step and per-question breakdowns. This separates model work time from user wait time. When a skill is re-invoked and its previous run was interrupted, the skill offers to resume from where it left off.

### Execution mode

Users choose an execution mode during discovery (or plan): `auto` or `interactive`. This is stored in `decisions.yaml` as `execution_mode`. In auto mode, skills chain automatically without per-step confirmation (pausing only on critical review findings or validation failures). In interactive mode, each skill completion presents a 3-option routing prompt: Continue / Skip / Pick a different skill.

### Cross-skill dependencies

The dependency map in `generate-dependency-enforcement.ts` ensures skills check whether their input requirements are met before proceeding. Discovery is the entry point. Technical domain skills require discovery. Validation requires at least one technical skill. Blueprint requires validation.

### Antipattern library

`solace-grounding/antipatterns.md` extracts all antipatterns from the reference architectures into a single categorized reference. Every technical domain skill and the validation skill checks output against this library before writing artifacts.

### Feedback loops

`projects/<slug>/feedback.yaml` records what worked and what didn't about each skill's output. When feedback patterns repeat across projects, they become entries in `IMPROVEMENTS.md` at the repo root, which maps patterns to specific skill template changes.

`solace-grounding/gaps.md` records when a skill can't find what it needs in the grounding documents. Each gap entry names the topic, the skill that needed it, and the workaround used. This drives grounding document maintenance priorities.

## Testing infrastructure

The `test/` directory contains automated quality checks that run via `bun test`:

| Test file | What it checks |
|-----------|---------------|
| `skill-terminology.test.ts` | Scans all SKILL.md files for forbidden terminology (connector, QoS, orchestrator agent, etc.). Excludes the naming conventions preamble section where terms appear as "never use" rules. |
| `skill-structure.test.ts` | Validates frontmatter (name, description present), resolved placeholders (no `{{PLACEHOLDER}}` markers), generated headers, grounding discipline section, and correct preamble sections per tier. |
| `skill-token-budget.test.ts` | Enforces per-skill (40K tokens) and total (200K tokens) budget ceilings. Prevents silent context window consumption growth. |
| `skill-gen.test.ts` | Verifies generation freshness (committed files match `--dry-run` output), resolver registry completeness, and template discovery count. |

### Scenario fixtures

`test/fixtures/scenarios.ts` contains pre-recorded discovery inputs for the three reference architecture patterns:

1. **Bank chat agent** (Pattern 1) — SAM, multi-backend, regulated
2. **Global market data distribution** (Pattern 2) — event-mesh-only, global, ultra-low-latency
3. **Hybrid IT/OT manufacturing** (Pattern 3) — edge-to-cloud, OT protocols, optional SAM

These fixtures drive eval testing and provide reproducible test inputs for manual skill validation.

## Grounding document maintenance

`scripts/url-health-check.ts` fetches every URL in `solace-canonical-sources.md` and reports health status (200, redirect, 404, timeout). Run via `bun run url:check`. This catches broken links before they affect skill output quality.

The canonical sources index follows three update rules: add URLs found during skill development, fix 404s, and push depth into the platform reference when topics gain real coverage.

## Dashboard

The project dashboard is a lightweight Bun HTTP server (`scripts/dashboard.ts`) that serves a single-page app from the `dashboard/` directory. It provides a read-only view of project state for monitoring engagements in progress or reviewing completed ones.

Launch via `bun run dashboard`. The server runs on port 3000 by default (configurable via the `PORT` environment variable). On macOS it opens the browser automatically.

### Server

The server exposes three route groups:

| Route | Purpose |
|-------|---------|
| `GET /api/projects` | List all projects with their context, progress, decisions, and artifact file lists |
| `GET /api/projects/:slug/artifact?path=...` | Serve a single artifact file from `projects/<slug>/artifacts/` |
| `GET /*` | Static file serving from the `dashboard/` directory (HTML, CSS, JS) |

Responses include no-cache headers. The client polls `/api/projects` every 10 seconds to pick up changes made by running skills.

### Client

The single-page app (`dashboard/app.js`) has six views:

| View | Content |
|------|---------|
| Overview | Skill groups (Discovery, Design, Review, Finalize) organized by phase. Each group shows its skills as status tiles (complete, in-progress, skipped, pending). Summary stats: total wall time, execution time, user wait time, decisions made, artifacts generated. |
| Timeline | Per-skill execution timeline with wall time bars. Click a skill for step-level and question-level timing breakdown. |
| Decisions | Two tables: design decisions (D-numbered, from interactive prompts) and review findings (severity, source skill, applied/deferred status). |
| Artifacts | File browser showing all generated outputs. Click a file to view its content with syntax highlighting for YAML, Markdown rendering, and Mermaid diagram rendering. |
| Stats | Aggregate timing, step counts, question counts, and per-skill breakdowns. |
| Export | HTML report generation. |

The right sidebar shows a skill tree with group/skill hierarchy on the Overview page, and a file tree on the Artifacts page. Dark and light themes are toggled from the sidebar header.

### HTML report generation

The Export view generates a self-contained HTML file that can be saved or printed to PDF from the browser. The report includes:

- Executive Summary with project context and aggregate timing
- Discovery summary
- Per-group sections (Design, Review) with all artifact content rendered inline
- Diagrams section collecting all Mermaid files
- Blueprint section
- Design decisions table and review findings table
- Table of contents with anchor links

The report fetches each artifact from the API, renders Markdown via `marked`, and embeds Mermaid diagrams for client-side rendering. The generated HTML is opened in a new tab.

## What's intentionally not here

- **No browser automation or headless testing.** The dashboard is a lightweight development server for viewing project state, not a production web application.
- **No design tooling.** No image generation, no visual design tools. The output is architecture documentation and event-driven design artifacts.
- **No deploy pipeline.** Solace Architect advises on architecture. It does not deploy brokers or configure infrastructure.
