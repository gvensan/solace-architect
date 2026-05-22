#!/usr/bin/env bash
# Solace Architect setup — install dependencies, generate skills, register with Claude Code
set -e

if ! command -v bun >/dev/null 2>&1; then
  echo "Error: bun is required but not installed." >&2
  echo "Install: https://bun.sh" >&2
  exit 1
fi

SA_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_SKILLS_DIR="$HOME/.claude/skills"

echo "Installing dependencies..."
(cd "$SA_DIR" && bun install)

echo "Generating skills for all hosts..."
(cd "$SA_DIR" && bun run gen:skill-docs --host all)

# Create ~/.claude/skills/ symlinks
mkdir -p "$CLAUDE_SKILLS_DIR"

# Root skill: solace-architect
SA_LINK="$CLAUDE_SKILLS_DIR/solace-architect"
if [ -L "$SA_LINK" ] || [ -d "$SA_LINK" ]; then rm -rf "$SA_LINK"; fi
mkdir -p "$SA_LINK"
ln -snf "$SA_DIR/SKILL.md" "$SA_LINK/SKILL.md"

# Symlink runtime assets into root skill directory (grounding docs, etc.)
for asset in solace-grounding docs solace-intake-template.docx scripts; do
  [ -e "$SA_DIR/$asset" ] && ln -snf "$SA_DIR/$asset" "$SA_LINK/$asset"
done

echo "  linked: /solace-architect (+ solace-grounding)"

# Skill subdirectories
for skill_dir in "$SA_DIR"/solace-*/; do
  [ -f "$skill_dir/SKILL.md" ] || continue
  skill_name="$(basename "$skill_dir")"
  target="$CLAUDE_SKILLS_DIR/$skill_name"
  if [ -L "$target" ] || [ -d "$target" ]; then rm -rf "$target"; fi
  mkdir -p "$target"
  ln -snf "$skill_dir/SKILL.md" "$target/SKILL.md"
  echo "  linked: /$skill_name"
done

echo ""
echo "Solace Architect installed."
echo ""
echo "  Skills directory: $CLAUDE_SKILLS_DIR"
echo "  Source: $SA_DIR"
echo ""
echo "Available commands:"
echo "  /solace-architect        — Architecture advisor (root skill)"
echo "  /solace-discovery        — Structured discovery for EDA projects"
echo "  /solace-plan             — Orchestrate skills for a complete engagement"
echo "  /solace-topic-design     — Topic taxonomy design"
echo "  /solace-broker-select    — Broker type selection"
echo "  /solace-sam-design       — SAM agent topology design"
echo "  /solace-protocol-select  — Protocol selection"
echo "  /solace-mesh-design      — DMR mesh topology design"
echo "  /solace-ha-dr            — HA and DR design"
echo "  /solace-migration        — Migration planning"
echo "  /solace-integration      — Micro-Integration design"
echo "  /solace-event-portal     — Event Portal governance design"
echo "  /solace-architect-review — Architecture review"
echo "  /solace-ops-review       — Operations readiness review"
echo "  /solace-security-review  — Security posture review"
echo "  /solace-dev-review       — Developer experience review"
echo "  /solace-validate         — Validation and consistency checks"
echo "  /solace-blueprint        — Final blueprint assembly"
echo "  /solace-executive        — Executive summary for business leaders"
echo "  /solace-diagrams         — Regenerate Mermaid diagrams"
echo "  /solace-help             — Skills catalog, workflow, project status"
echo ""
echo "To regenerate after editing templates:"
echo "  bun run build"
