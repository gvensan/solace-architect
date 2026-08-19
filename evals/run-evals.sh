#!/usr/bin/env bash
# Skill quality evals - the regression net for judgment-heavy skills.
#
# Each fixture in evals/intakes/ is an intake with PLANTED ground truth
# (documented in its `description`), paired with property expectations in
# evals/expected/. The runner builds the same inline prompts an embedding
# pipeline builds, runs them through the claude CLI headless, and asserts
# PROPERTIES - never golden text, because two good reviews of the same intake
# word things differently while agreeing on substance:
#
#   review: the planted defect is flagged (matched by FIELD, not id or
#           wording), nothing below the severity floor, output parses.
#   shape:  >=2 candidates, the known component fork surfaces, the known
#           absence is stated, discriminators point at real intake fields,
#           the project's nature is named.
#
# Costs real model money per run (one review + one shape pass per fixture),
# so it runs ON DEMAND - before merging a skill change - not in CI.
#
# Usage:
#   evals/run-evals.sh                # all fixtures
#   evals/run-evals.sh folder-sync    # one fixture
#   EVAL_MODEL=claude-sonnet-5 evals/run-evals.sh
set -euo pipefail

SA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SA_DIR"
command -v claude >/dev/null || { echo "claude CLI not on PATH" >&2; exit 1; }

MODEL="${EVAL_MODEL:-claude-sonnet-5}"
ONLY="${1:-}"
FAILED=0

for fixture in evals/intakes/*.yaml; do
  name="$(basename "$fixture" .yaml)"
  [[ -n "$ONLY" && "$name" != "$ONLY" ]] && continue
  echo "== $name =="
  FIXTURE="$fixture" EXPECTED="evals/expected/$name.yaml" MODEL="$MODEL" \
    python3 evals/harness.py || FAILED=1
done

if [[ "$FAILED" == "1" ]]; then
  echo; echo "EVALS FAILED"; exit 1
fi
echo; echo "evals passed"
