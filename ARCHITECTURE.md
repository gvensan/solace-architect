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
  BIN_DIR: (ctx) => ctx.paths.binDir,
  GROUNDING_DIR: (ctx) => ctx.paths.groundingDir,
};
```

Each resolver is a function that takes a `TemplateContext` and returns a string. The context carries the current host, skill metadata, and computed paths.

### The preamble

The `{{PREAMBLE}}` placeholder is the most important resolver. It generates the shared sections that appear at the top of every skill, controlled by a tier system:

| Tier | Sections included | Use case |
|------|-------------------|----------|
| T1 | Bootstrap bash, grounding rules, naming conventions, voice (minimal), completion status | Lightweight utility skills |
| T2 | T1 + AskUserQuestion format, writing style, completeness principle, confusion protocol, continuous checkpoint, context health | Interactive skills (discovery, design) |
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
    generateVoiceDirective(tier),
    ...(tier >= 2 ? [
      generateAskUserFormat(ctx),
      generateWritingStyle(ctx),
      generateCompletenessSection(),
      generateConfusionProtocol(),
      generateContinuousCheckpoint(),
      generateContextHealth(),
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
| `generate-ask-user-format.ts` | AskUserQuestion Format | Decision brief format: D-numbered, ELI10, pros/cons, recommendation |
| `generate-writing-style.ts` | Writing Style | Jargon glossing, outcome framing, Solace term precision |
| `generate-completeness-section.ts` | Completeness Principle | "Boil the Lake" philosophy: completeness is cheap with AI |
| `generate-confusion-protocol.ts` | Confusion Protocol | Stop and ask on high-stakes ambiguity |
| `generate-continuous-checkpoint.ts` | Continuous Checkpoint | WIP commit discipline when CHECKPOINT_MODE is continuous |
| `generate-context-health.ts` | Context Health | Progress summaries during long sessions |
| `generate-completion-status.ts` | Completion Status | DONE / BLOCKED / NEEDS_CONTEXT protocol |
| `generate-preamble-bash.ts` | Preamble bash | Branch detection + skill name echo |
| `generate-repo-mode-section.ts` | Repo Ownership | Code modification guidelines |
| `generate-search-before-building.ts` | Search Before Building | Three-layer knowledge framework |
| `generate-grounding-loading.ts` | Grounding Document Loading | Pre-recommendation verification against grounding docs |
| `generate-validation-hook.ts` | Artifact Validation | Terminology, naming, and ungrounded claims checks |
| `generate-dependency-enforcement.ts` | Cross-Skill Dependencies | Input dependency verification before skill execution |
| `generate-project-management.ts` | Project Management | Project lifecycle, progress tracking, resume support |

## Grounding documents

The `sa-grounding/` directory contains the authoritative source material that every skill references:

| Document | Role |
|----------|------|
| `solace-platform-reference.md` | Coverage map. Three-layer model: Event Mesh, Application Services, Platform Services. What Solace Architect is accountable to know. |
| `solace-canonical-sources.md` | URL-by-topic index. When a skill needs technical depth, it fetches from these URLs rather than reasoning from training data. |
| `solace-reference-architectures.md` | Three worked patterns: multi-system AI assistant (SAM), real-time market data distribution (event mesh), hybrid IT/OT manufacturing (federated mesh). |
| `antipatterns.md` | Known mistakes organized by category. Every technical domain and validation skill checks output against this library. |
| `claude-instructions.md` | Claude-specific operating instructions. |

The grounding discipline is enforced in `generate-grounding-rules.ts`. It tells the agent:
- Only assert what Solace docs support
- Do not invent Solace features or borrow concepts from other messaging vendors
- When a capability is not in the sources, say so explicitly
- When reasoning from first principles, label it as architectural inference
- Fetch canonical sources rather than reasoning from training data

## Multi-host generation

Solace Architect generates SKILL.md files for 10 AI coding agent hosts. Each host has a typed config in `hosts/`:

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

Skills are organized into five planned categories:

| Category | Description | Status |
|----------|-------------|--------|
| Discovery | Eliciting business problems, surfacing constraints, inventorying existing landscape | `/solace-discovery` shipped |
| Role-based | Architect, developer, ops, security perspectives applied to current problem | Planned |
| Technical domain | Solace platform knowledge, artifact generation (YAML, diagrams, blueprints) | Planned |
| Orchestration | Sequencing skills, threading context, conditional paths | Planned |
| Validation | Consistency checks, antipattern detection, completeness before handoff | Planned |

Each skill directory follows the naming convention: `solace-<skill-name>/SKILL.md.tmpl`.

## Project management infrastructure

Skills produce artifacts for a specific engagement. Project management infrastructure gives those artifacts a home and tracks progress across skill invocations.

### Project directory structure

All project outputs go to `projects/<project-slug>/`. The `projects/` directory is gitignored — project data is local to the user, not committed to the toolkit repo.

```
projects/<project-slug>/
  context.yaml          # project name, creation date, status
  decisions.yaml        # accumulated design decisions across skills
  progress.yaml         # skill execution log with resume support
  artifacts/            # all generated outputs, organized by skill
    discovery/
    topic-design/
    sam-design/
    broker-select/
    mesh-design/
    ha-dr/
    integration/
    migration/
    validation/
    blueprint/
```

### Active project tracking

`projects/.active` is a plain text file containing the current project slug. The preamble's project management section tells the agent to read this at session start.

### Progress tracking and resume

`progress.yaml` logs what each skill has done: status (started, in-progress, complete, interrupted), timestamps, step reached, artifacts produced, and pending items. When a skill is re-invoked and its previous run was interrupted, the skill offers to resume from where it left off.

### Cross-skill dependencies

The dependency map in `generate-dependency-enforcement.ts` ensures skills check whether their input requirements are met before proceeding. Discovery is the entry point. Technical domain skills require discovery. Validation requires at least one technical skill. Blueprint requires validation.

### Antipattern library

`sa-grounding/antipatterns.md` extracts all antipatterns from the reference architectures into a single categorized reference. Every technical domain skill and the validation skill checks output against this library before writing artifacts.

## What's intentionally not here

- **No browser automation.** Solace Architect is a pure skills toolkit. No Playwright, no headless Chromium, no daemon process.
- **No design tooling.** No image generation, no visual design tools. The output is architecture documentation and event-driven design artifacts.
- **No deploy pipeline.** Solace Architect advises on architecture. It does not deploy brokers or configure infrastructure.
- **No eval infrastructure yet.** E2E testing via `claude -p` and LLM-as-judge evals are planned but not yet implemented.
