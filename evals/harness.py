#!/usr/bin/env python3
"""Eval harness: build the inline prompts, run the CLI headless, assert
properties. See run-evals.sh for the philosophy; this file is the mechanics.

The prompts here deliberately mirror what an embedding pipeline (Solace
Grinder) builds, because that is the path under the most change - but they
are self-contained, so the evals hold for standalone use too.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

import yaml

SA = Path(__file__).resolve().parents[1]
FIXTURE = yaml.safe_load(Path(os.environ["FIXTURE"]).read_text())
EXPECTED = yaml.safe_load(Path(os.environ["EXPECTED"]).read_text())
MODEL = os.environ.get("MODEL", "claude-sonnet-5")

FAILURES: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {label}" + (f"  ({detail})" if detail else ""))
    if not ok:
        FAILURES.append(label)


def run_claude(prompt: str) -> str:
    """One headless turn; the final message text is the output under test."""
    result = subprocess.run(
        ["claude", "-p", "--output-format", "json", "--model", MODEL,
         "--setting-sources", "user"],
        input=prompt, capture_output=True, text=True, timeout=600, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"claude exited {result.returncode}: {result.stderr[:300]}")
    try:
        return str(json.loads(result.stdout).get("result") or "")
    except json.JSONDecodeError:
        return result.stdout


def yaml_block(text: str) -> dict:
    m = re.search(r"```ya?ml\s*\n(.*?)```", text, re.DOTALL)
    if not m:
        return {}
    raw = m.group(1)
    try:
        return yaml.safe_load(raw) or {}
    except yaml.YAMLError:
        return {}


def intake_paths() -> set:
    """Every dot-path the fixture's intake actually contains - discriminators
    must point at one of these (indexed forms reduced to their base)."""
    out = set()

    def walk(node, prefix):
        if isinstance(node, dict):
            for k, v in node.items():
                walk(v, f"{prefix}.{k}" if prefix else k)
        elif isinstance(node, list):
            out.add(prefix)
        else:
            out.add(prefix)
    walk(FIXTURE["intake"], "")
    return out


def samples_text() -> str:
    return "\n".join(f"--- {n}\n{c}" for n, c in (FIXTURE.get("samples") or {}).items())


# --------------------------------------------------------------------------- #
# review eval
# --------------------------------------------------------------------------- #
def eval_review() -> None:
    exp = EXPECTED.get("review")
    if not exp:
        return
    skill = (SA / "solace-intake-review" / "SKILL.md").read_text()
    prompt = (
        "Follow this skill document for an INLINE run.\n\n" + skill
        + "\n\n---\nRun /solace-intake-review intake.yaml --report --inline\n\n"
        "## Severity policy\nReport ONLY `blocker` and `warning` severity findings.\n\n"
        "## The intake\n\n```yaml\n" + yaml.safe_dump(FIXTURE["intake"], sort_keys=False)
        + "```\n\n## Sample payloads\n\n" + samples_text()
        + "\n\n## Precomputed architecture arithmetic (authoritative)\n"
        + FIXTURE.get("arithmetic", "")
        + "\n\nReturn ONLY the findings yaml block as your final message.")
    out = run_claude(prompt)
    doc = yaml_block(out)
    findings = doc.get("findings") or []
    check("review: output parses with findings list", isinstance(findings, list) and bool(doc))
    flagged = set()
    for f in findings:
        for p in (f.get("fields") or [f.get("field") or ""]):
            flagged.add(str(p).split("[")[0].strip())
    for field in exp.get("must_flag_fields", []):
        check(f"review: flags {field}", field in flagged, f"flagged={sorted(flagged)}")
    below = [f.get("id") for f in findings
             if (f.get("severity") or "") in set(exp.get("forbidden_severities_below_floor", []))]
    check("review: nothing below the severity floor", not below, str(below))
    check("review: within finding cap", len(findings) <= int(exp.get("max_findings", 12)),
          f"{len(findings)} findings")


# --------------------------------------------------------------------------- #
# shape eval
# --------------------------------------------------------------------------- #
def eval_shape() -> None:
    exp = EXPECTED.get("shape")
    if not exp:
        return
    doc_path = SA / "solace-grounding" / "solution-shaping.md"
    prompt = (
        "You are synthesizing the '## Solution shape' section of a discovery brief.\n"
        "Follow the obligations document below EXACTLY, including its output shape.\n"
        "Return the section as your final message: prose plus the fenced "
        "solution_shape yaml block.\n\n# The obligations document\n\n"
        + doc_path.read_text()
        + "\n\n# The intake\n\n```yaml\n" + yaml.safe_dump(FIXTURE["intake"], sort_keys=False)
        + "```\n\n# Sample payloads (the actual events)\n\n" + samples_text()
        + "\n\n# Precomputed arithmetic (authoritative)\n" + FIXTURE.get("arithmetic", ""))
    out = run_claude(prompt)
    shape = (yaml_block(out) or {}).get("solution_shape") or {}
    cands = shape.get("candidates") or []
    check("shape: yaml block parses", bool(shape))
    check(f"shape: >= {exp.get('min_candidates', 2)} candidates",
          len(cands) >= int(exp.get("min_candidates", 2)),
          str([c.get("name") for c in cands]))
    low = out.lower()
    for needle in exp.get("must_mention_any", []):
        check(f"shape: surfaces '{needle}'", needle.lower() in low)
        break
    absence = exp.get("must_find_absence") or []
    check("shape: states the planted absence",
          any(k in low for k in absence))
    if exp.get("discriminator_fields_must_be_real"):
        real = intake_paths()
        discs = shape.get("discriminators") or []
        bogus = [d.get("field") for d in discs
                 if str(d.get("field") or "").split("[")[0].strip() not in real]
        check("shape: discriminators point at real intake fields",
              bool(discs) and not bogus, f"bogus={bogus}")
    if exp.get("must_name_nature"):
        check("shape: names the project's nature", bool(shape.get("nature_assumed")))


eval_review()
eval_shape()
if FAILURES:
    sys.exit(1)
