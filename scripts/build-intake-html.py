#!/usr/bin/env python3
"""
Generate a standalone Solace Architect intake HTML form.

Usage:
    python3 scripts/build-intake-html.py --output intake/solace-intake-template.html

The output is a single self-contained .html file:
  - No CDN, no external assets, no network calls
  - All CSS and JavaScript inlined
  - Catalog of Micro-Integrations embedded as JSON for autocomplete
  - Skill routing rules embedded as JSON for live engagement preview
  - YAML output round-trips through scripts/parse-intake-docx.py expectations

The form mirrors the schema in solace-intake/SKILL.md.tmpl YAML template.
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
CATALOG_PATH = REPO_ROOT / "solace-grounding" / "integration-hub-catalog.md"
ROUTING_PATH = SCRIPT_DIR / "skill-routing.yaml"
JARGON_PATH = SCRIPT_DIR / "jargon-list.json"


# ---------------------------------------------------------------------------
# Catalog parser — extracts Micro-Integration entries from the markdown catalog
# ---------------------------------------------------------------------------
def parse_catalog(catalog_md: str) -> dict:
    """
    Walk the integration hub catalog markdown and pull every table row into a
    flat list. Returns {version, refreshed, entries: [...]}.
    Each entry: name, direction, platform, notes, category.
    """
    lines = catalog_md.splitlines()
    entries = []
    indirect_paths = []
    current_h2 = None
    current_h3 = None
    in_indirect = False
    refreshed = None

    refreshed_re = re.compile(r"\*\*Last refreshed:\*\*\s*(\S+)")
    h2_re = re.compile(r"^##\s+(.+?)\s*$")
    h3_re = re.compile(r"^###\s+(.+?)\s*$")
    table_row_re = re.compile(r"^\|(.+)\|\s*$")

    for line in lines:
        m = refreshed_re.search(line)
        if m:
            refreshed = m.group(1)
            continue

        m = h2_re.match(line)
        if m:
            current_h2 = m.group(1).strip()
            current_h3 = None
            in_indirect = current_h2.lower().startswith("common indirect paths")
            continue

        m = h3_re.match(line)
        if m:
            current_h3 = m.group(1).strip()
            continue

        m = table_row_re.match(line)
        if not m:
            continue

        cells = [c.strip() for c in m.group(1).split("|")]
        if not cells or set("".join(cells)) <= set("-: "):
            continue
        # Skip table headers (rows whose first cell looks like a header label)
        first = cells[0].lower()
        if first in {"micro-integration", "asset", "platform", "source system"}:
            continue
        # Skip rows whose category we don't track (e.g., Platform types explained)
        if current_h2 and current_h2.lower().startswith("platform types"):
            continue

        if in_indirect:
            if len(cells) >= 4:
                indirect_paths.append({
                    "source": cells[0],
                    "intermediate": cells[1],
                    "via_mi": cells[2],
                    "description": cells[3],
                })
            continue

        # Standard MI row: name | direction | platform | notes
        if len(cells) >= 4:
            entry = {
                "name": cells[0],
                "direction": cells[1],
                "platform": cells[2],
                "notes": cells[3],
                "category": current_h3 or current_h2 or "Other",
            }
            entries.append(entry)

    # Dedupe by name+direction (the catalog cross-lists some MIs)
    seen = set()
    deduped = []
    for e in entries:
        key = (e["name"].lower(), e["direction"].lower())
        if key in seen:
            continue
        seen.add(key)
        deduped.append(e)

    return {
        "refreshed": refreshed or "unknown",
        "entries": deduped,
        "indirect_paths": indirect_paths,
    }


# ---------------------------------------------------------------------------
# Routing loader — reads scripts/skill-routing.yaml
# ---------------------------------------------------------------------------
def _jsonable(obj):
    """Coerce datetime/date/etc to strings so json.dumps doesn't choke."""
    from datetime import date, datetime as dt
    if isinstance(obj, dict):
        return {k: _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_jsonable(v) for v in obj]
    if isinstance(obj, (date, dt)):
        return obj.isoformat()
    return obj


def load_routing() -> dict:
    if not ROUTING_PATH.exists():
        return {"version": 0, "skills": []}
    if not HAS_YAML:
        print("WARNING: PyYAML missing — routing rules will be empty.", file=sys.stderr)
        return {"version": 0, "skills": []}
    with open(ROUTING_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return _jsonable(data)


# ---------------------------------------------------------------------------
# Jargon loader — for inline tooltips on key Solace terms
# ---------------------------------------------------------------------------
JARGON_GLOSS = {
    "Micro-Integration": (
        "Lightweight event-driven module that connects an enterprise system to "
        "a Solace event broker. Capital M, hyphenated. Not a connector or adapter."
    ),
    "Direct messaging": (
        "Fire-and-forget delivery. Lowest latency. No persistence, no acknowledgment. "
        "Used for market data, telemetry, ephemeral updates."
    ),
    "Guaranteed messaging": (
        "Persistent, acknowledged delivery. The broker spools messages until the "
        "consumer confirms receipt. Used for transactions, orders, audit flows."
    ),
    "DMR": (
        "Dynamic Message Routing. Solace's mechanism for federating brokers across "
        "sites, regions, or clouds without static topic mappings."
    ),
    "OrchestratorAgent": (
        "The central agent in Solace Agent Mesh that decomposes user goals into "
        "agent calls, manages a session-scoped artifact bus, and synthesizes results."
    ),
    "Event Portal": (
        "Solace's design-time governance plane: application domains, event "
        "definitions, schema bindings, and runtime broker connections."
    ),
    "topic taxonomy": (
        "The hierarchical structure (Domain/Noun/Verb/Version/Properties) that "
        "names every event in the system and enables wildcard subscriptions."
    ),
    "Solace Agent Mesh": (
        "Solace's AI agent orchestration framework. Distributed agents communicate "
        "via the A2A protocol over Solace messaging."
    ),
    "SAM": "Short for Solace Agent Mesh.",
}


# ---------------------------------------------------------------------------
# HTML template
# ---------------------------------------------------------------------------
HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Solace Architect — Intake Form</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    --bg: #f7f8fa;
    --surface: #ffffff;
    --border: #d8dce3;
    --border-strong: #b6bcc9;
    --text: #1d2433;
    --muted: #5a6377;
    --accent: #00c895;
    --accent-dark: #009974;
    --warn: #d97706;
    --error: #c53030;
    --ok: #16a34a;
    --chip-bg: #eef2f7;
    --tooltip-bg: #1d2433;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    line-height: 1.5;
  }
  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  h1 { font-size: 18px; margin: 0; font-weight: 600; }
  .subtitle { color: var(--muted); font-size: 13px; margin-top: 2px; }
  .progress-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--muted);
  }
  .progress-bar {
    width: 200px;
    height: 8px;
    background: var(--chip-bg);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.2s;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 24px;
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
  }
  @media (max-width: 980px) {
    .layout { grid-template-columns: 1fr; }
    aside.preview { position: static; }
  }
  main { min-width: 0; }
  section.card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 16px;
  }
  section.card h2 {
    font-size: 15px;
    margin: 0 0 4px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  section.card .section-hint {
    color: var(--muted);
    font-size: 12px;
    margin-bottom: 14px;
  }
  .field { margin-bottom: 14px; }
  .field label {
    display: block;
    font-weight: 500;
    margin-bottom: 4px;
    font-size: 13px;
  }
  .field .help {
    color: var(--muted);
    font-size: 12px;
    margin-bottom: 6px;
  }
  .field input[type="text"],
  .field input[type="email"],
  .field textarea,
  .field select {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
    background: var(--surface);
  }
  .field textarea { min-height: 70px; resize: vertical; }
  .field input:focus, .field textarea:focus, .field select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(0,200,149,0.2);
  }
  .req-marker { color: var(--error); margin-left: 2px; }
  .radio-group, .check-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .radio-group.inline, .check-group.inline {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }
  .radio-group label, .check-group label {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-weight: normal;
    cursor: pointer;
  }
  .radio-group input, .check-group input { margin-top: 3px; }
  .radio-group .opt-desc {
    color: var(--muted);
    font-size: 12px;
    margin-left: 22px;
    margin-top: -2px;
  }
  table.repeater {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }
  table.repeater th {
    background: var(--chip-bg);
    text-align: left;
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 600;
    border-bottom: 1px solid var(--border);
  }
  table.repeater td {
    padding: 4px 6px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  table.repeater td input, table.repeater td select {
    width: 100%;
    padding: 5px 7px;
    border: 1px solid var(--border);
    border-radius: 3px;
    font-size: 12px;
    font-family: inherit;
  }
  .row-delete {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
  }
  .row-delete:hover { color: var(--error); }
  .row-add {
    background: var(--chip-bg);
    border: 1px dashed var(--border-strong);
    color: var(--muted);
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  .row-add:hover {
    background: var(--surface);
    color: var(--accent-dark);
    border-color: var(--accent);
    border-style: solid;
  }
  .domain-block { display: none; padding-top: 8px; border-top: 1px dashed var(--border); margin-top: 12px; }
  .domain-block.active { display: block; }
  .domain-block h3 { font-size: 13px; margin: 0 0 10px 0; color: var(--accent-dark); }
  .catalog-hint {
    background: rgba(0,200,149,0.08);
    border-left: 3px solid var(--accent);
    padding: 6px 10px;
    font-size: 12px;
    color: var(--text);
    border-radius: 3px;
    margin-top: 4px;
  }
  .catalog-hint.miss {
    background: rgba(217,119,6,0.08);
    border-left-color: var(--warn);
  }
  .catalog-hint.indirect {
    background: rgba(0,200,149,0.05);
    border-left-color: var(--accent-dark);
  }
  /* Tooltip for jargon */
  .glossed {
    border-bottom: 1px dotted var(--muted);
    cursor: help;
    position: relative;
  }
  .glossed:hover::after {
    content: attr(data-tip);
    position: absolute;
    bottom: 100%;
    left: 0;
    width: 280px;
    padding: 8px 10px;
    background: var(--tooltip-bg);
    color: white;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.4;
    z-index: 200;
    margin-bottom: 4px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }
  /* Sidebar */
  aside.preview {
    position: sticky;
    top: 90px;
    align-self: start;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px 18px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }
  aside.preview h3 {
    font-size: 13px;
    margin: 0 0 4px 0;
    color: var(--text);
  }
  aside.preview .preview-hint {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 10px;
  }
  .phase {
    margin-bottom: 12px;
  }
  .phase-title {
    font-size: 11px;
    text-transform: uppercase;
    color: var(--muted);
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .outcome {
    font-size: 12px;
    padding: 5px 8px;
    border-radius: 3px;
    margin-bottom: 3px;
    background: var(--chip-bg);
    color: var(--text);
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }
  .outcome.included { background: rgba(0,200,149,0.1); }
  .outcome.always { color: var(--text); }
  .outcome.conditional-off { opacity: 0.35; }
  .outcome .marker { color: var(--accent-dark); font-weight: bold; }
  .outcome .marker.off { color: var(--muted); }
  .preview-count {
    font-size: 12px;
    color: var(--muted);
    padding-top: 8px;
    border-top: 1px solid var(--border);
    margin-top: 8px;
  }
  /* Footer / actions */
  .actions {
    position: sticky;
    bottom: 0;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 12px 24px;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    z-index: 50;
  }
  .actions .spacer { flex: 1; }
  button.primary {
    background: var(--accent);
    color: white;
    border: none;
    padding: 8px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }
  button.primary:hover { background: var(--accent-dark); }
  button.secondary {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border-strong);
    padding: 8px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  button.secondary:hover { border-color: var(--accent); color: var(--accent-dark); }
  .draft-status {
    font-size: 12px;
    color: var(--muted);
  }
  .draft-status.saved { color: var(--ok); }
  .stamp {
    font-size: 11px;
    color: var(--muted);
    text-align: right;
  }
</style>
</head>
<body>
<header>
  <div class="header-row">
    <div>
      <h1>Solace Architect — Intake Form</h1>
      <div class="subtitle">Fill in what you know. Blanks are fine — your architect will follow up.</div>
    </div>
    <div class="progress-wrap">
      <span id="prog-label">Required 0 / __REQ_COUNT__</span>
      <div class="progress-bar"><div class="progress-fill" id="prog-fill"></div></div>
    </div>
  </div>
</header>

<!-- Optional: pre-fill from an existing project. Populated at runtime if the
     intake server detects projects with source: intake. Hidden if list empty
     (the form also opens directly via file://, in which case the API is
     unreachable and this banner stays hidden). -->
<div id="load-existing-bar" style="display:none;background:#f0fdf9;border-bottom:1px solid #00C895;padding:10px 20px;font-size:14px;align-items:center;gap:10px">
  <label for="load-existing-select" style="font-weight:600;color:#093B5F;white-space:nowrap">Pre-fill from existing project:</label>
  <select id="load-existing-select" onchange="onLoadExistingChange()" style="flex:0 1 360px;max-width:360px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;background:#fff">
    <option value="">— Select project —</option>
  </select>
  <span id="load-existing-status" style="color:#5A7A94;font-style:italic"></span>
</div>

<div class="layout">
<main>

<!-- ── Section 1: Project ─────────────────────────────────────────────── -->
<section class="card">
  <h2>1. Project</h2>
  <div class="section-hint">Identifies the engagement.</div>

  <div class="field">
    <label>Project name<span class="req-marker">*</span></label>
    <div class="help">Short identifier. Examples: <em>acme-bank-chat</em>, <em>global-market-data</em>, <em>factory-telemetry</em>.</div>
    <input type="text" id="project_name" data-path="project.name" data-required="1">
  </div>

  <div class="field">
    <label>Project type<span class="req-marker">*</span></label>
    <div class="radio-group">
      <label><input type="radio" name="project_type" value="new_build" data-path="project.type" data-required="1"> <span><strong>New build</strong> — Greenfield event-driven system on Solace</span></label>
      <label><input type="radio" name="project_type" value="migration" data-path="project.type"> <span><strong>Migration</strong> — Moving from an existing messaging platform to Solace</span></label>
      <label><input type="radio" name="project_type" value="extension" data-path="project.type"> <span><strong>Extension</strong> — Adding capabilities to an existing Solace deployment</span></label>
      <label><input type="radio" name="project_type" value="sam" data-path="project.type"> <span><strong>SAM integration</strong> — Building an AI agent system on <span class="glossed" data-tip="Solace Agent Mesh — Solace's AI agent orchestration framework.">Solace Agent Mesh</span></span></label>
    </div>
  </div>
</section>

<!-- ── Section 2: System Landscape ────────────────────────────────────── -->
<section class="card">
  <h2>2. System landscape</h2>
  <div class="section-hint">Every system that needs to talk through the event mesh.</div>

  <div class="field">
    <label>Systems<span class="req-marker">*</span></label>
    <div class="help">Name, role (producer/consumer/both), protocol, and owning team. Autocomplete checks against the Solace Integration Hub catalog.</div>
    <table class="repeater" id="systems-table">
      <thead>
        <tr>
          <th style="width:30%">Name</th>
          <th style="width:18%">Role</th>
          <th style="width:18%">Protocol</th>
          <th style="width:24%">Owner / team</th>
          <th style="width:10%"></th>
        </tr>
      </thead>
      <tbody id="systems-body"></tbody>
    </table>
    <button class="row-add" type="button" onclick="addSystemRow()">+ Add system</button>
    <div id="catalog-summary"></div>
  </div>

  <div class="field">
    <label>Existing messaging</label>
    <div class="help">What messaging systems are in place today? (IBM MQ, Kafka, RabbitMQ, TIBCO, none, etc.)</div>
    <input type="text" data-path="landscape.existing_messaging">
  </div>

  <div class="field">
    <label>Protocols in use</label>
    <div class="help">Select all that apply.</div>
    <div class="check-group inline">
      <label><input type="checkbox" data-protocol="REST"> REST</label>
      <label><input type="checkbox" data-protocol="MQTT"> MQTT</label>
      <label><input type="checkbox" data-protocol="AMQP"> AMQP</label>
      <label><input type="checkbox" data-protocol="JMS"> JMS</label>
      <label><input type="checkbox" data-protocol="SMF"> SMF</label>
      <label><input type="checkbox" data-protocol="WebSocket"> WebSocket</label>
      <label><input type="checkbox" data-protocol="gRPC"> gRPC</label>
      <label><input type="checkbox" data-protocol="FIX"> FIX</label>
      <label><input type="checkbox" data-protocol="Kafka"> Kafka</label>
    </div>
  </div>

  <div class="field">
    <label>Events</label>
    <div class="help">Major event types. Each row: name, approximate rate, delivery mode, payload format, typical payload size. Size drives broker sizing and protocol decisions; free-text like "~5KB", "~50KB peak / ~2KB typical".</div>
    <table class="repeater" id="events-table">
      <thead>
        <tr>
          <th style="width:24%">Name</th>
          <th style="width:16%">Rate</th>
          <th style="width:18%">Delivery</th>
          <th style="width:16%">Payload format</th>
          <th style="width:18%">Payload size</th>
          <th style="width:8%"></th>
        </tr>
      </thead>
      <tbody id="events-body"></tbody>
    </table>
    <button class="row-add" type="button" onclick="addEventRow()">+ Add event</button>
  </div>

  <div class="field">
    <label>Aggregate volumes</label>
    <div class="help">Approximate total event rates. Example: <em>~50K events/sec peak, ~2B events/day</em>.</div>
    <input type="text" data-path="landscape.volumes">
  </div>

  <div class="field">
    <label>Schemas</label>
    <div class="help">Existing schemas or an AsyncAPI spec? Example: <em>Avro schemas in Confluent Schema Registry</em>, <em>AsyncAPI 3.0 spec</em>, <em>None</em>.</div>
    <input type="text" data-path="landscape.schemas">
  </div>

  <div class="field">
    <label>Industry vertical<span class="req-marker">*</span></label>
    <div class="help">Drives which domain-specific questions appear below.</div>
    <select id="vertical" data-path="landscape.vertical" data-required="1" onchange="onVerticalChange()">
      <option value="">— Select —</option>
      <option value="banking">Banking / Financial Services</option>
      <option value="capital_markets">Capital Markets</option>
      <option value="manufacturing">Manufacturing / IoT</option>
      <option value="healthcare">Healthcare</option>
      <option value="retail">Retail</option>
      <option value="telecom">Telecom</option>
      <option value="logistics">Logistics</option>
      <option value="energy">Energy / Utilities</option>
      <option value="government">Government</option>
      <option value="other">Other</option>
    </select>
  </div>
</section>

<!-- ── Section 3: Domain details (conditional) ────────────────────────── -->
<section class="card" id="domain-card" style="display:none">
  <h2>3. Domain details</h2>
  <div class="section-hint">Industry-specific questions. Only the section matching your vertical is shown.</div>

  <div class="domain-block" data-domain="banking">
    <h3>Banking / Financial Services</h3>
    <div class="field"><label>Regulatory constraints</label>
      <div class="help">PCI-DSS? Data residency rules? Audit trail requirements? Encryption at rest and in transit?</div>
      <textarea data-path="domain.banking.regulatory_constraints"></textarea></div>
    <div class="field"><label>Existing messaging infrastructure</label>
      <div class="help">IBM MQ, TIBCO, Kafka today? This drives Micro-Integration strategy.</div>
      <textarea data-path="domain.banking.existing_messaging_infrastructure"></textarea></div>
    <div class="field"><label>Authorization model</label>
      <div class="help">How do customer permission scopes flow from channel (web, mobile) to backends? Existing IAM (OIDC, SAML)?</div>
      <textarea data-path="domain.banking.authorization_model"></textarea></div>
    <div class="field"><label>Data classification</label>
      <div class="help">Which data classes need <span class="glossed" data-tip="Persistent, acknowledged delivery — the broker spools until the consumer confirms.">Guaranteed messaging</span> versus <span class="glossed" data-tip="Fire-and-forget, lowest latency, no persistence.">Direct messaging</span>?</div>
      <textarea data-path="domain.banking.data_classification"></textarea></div>
    <div class="field"><label>Internal vs customer-facing</label>
      <div class="help">For customers, internal staff, or both?</div>
      <textarea data-path="domain.banking.internal_vs_customer_facing"></textarea></div>
  </div>

  <div class="domain-block" data-domain="capital_markets">
    <h3>Capital Markets</h3>
    <div class="field"><label>Latency budget</label>
      <div class="help">Hot path latency (market data to trader screen)? Audit path latency?</div>
      <textarea data-path="domain.capital_markets.latency_budget"></textarea></div>
    <div class="field"><label>Global topology</label>
      <div class="help">Trading hubs and asset classes per hub.</div>
      <textarea data-path="domain.capital_markets.global_topology"></textarea></div>
    <div class="field"><label>Feed infrastructure</label>
      <div class="help">Feed handlers and providers (Bloomberg, Refinitiv, direct exchange feeds). Protocols they publish on (FIX, proprietary binary, TCP multicast).</div>
      <textarea data-path="domain.capital_markets.feed_infrastructure"></textarea></div>
    <div class="field"><label>Existing messaging</label>
      <div class="help">Existing middleware (Kafka, TIBCO, 29West/Informatica, Solace already)?</div>
      <textarea data-path="domain.capital_markets.existing_messaging"></textarea></div>
    <div class="field"><label>Compliance and replay</label>
      <div class="help">Which event streams must be replayable for regulatory audit? Retention period?</div>
      <textarea data-path="domain.capital_markets.compliance_and_replay"></textarea></div>
  </div>

  <div class="domain-block" data-domain="manufacturing">
    <h3>Manufacturing / IoT</h3>
    <div class="field"><label>OT protocol inventory</label>
      <div class="help">Protocols machines and sensors speak (OPC UA, Modbus, MQTT, DDS, proprietary).</div>
      <textarea data-path="domain.manufacturing.ot_protocol_inventory"></textarea></div>
    <div class="field"><label>Edge constraints</label>
      <div class="help">Compute at the plant floor? Can a Solace Software Event Broker run there? WAN reliability to regional/cloud?</div>
      <textarea data-path="domain.manufacturing.edge_constraints"></textarea></div>
    <div class="field"><label>Telemetry vs command</label>
      <div class="help">One-way telemetry only, or bidirectional with commands?</div>
      <textarea data-path="domain.manufacturing.telemetry_vs_command"></textarea></div>
    <div class="field"><label>Existing historians and MES</label>
      <div class="help">OSIsoft PI, Siemens MindSphere, Rockwell FactoryTalk, etc.?</div>
      <textarea data-path="domain.manufacturing.existing_historians_mes"></textarea></div>
  </div>

  <div class="domain-block" data-domain="healthcare">
    <h3>Healthcare</h3>
    <div class="field"><label>HIPAA / PHI</label>
      <div class="help">Which events contain PHI? Encryption, access control, audit requirements?</div>
      <textarea data-path="domain.healthcare.hipaa_phi"></textarea></div>
    <div class="field"><label>Interoperability standards</label>
      <div class="help">HL7v2, FHIR, or both? What EHR system (Epic, Cerner, Meditech)?</div>
      <textarea data-path="domain.healthcare.interoperability_standards"></textarea></div>
    <div class="field"><label>Real-time vs batch</label>
      <div class="help">Which clinical events need real-time distribution (alerts, orders, results) vs batch (billing, reporting)?</div>
      <textarea data-path="domain.healthcare.realtime_vs_batch"></textarea></div>
  </div>
</section>

<!-- ── Section 4: Requirements ───────────────────────────────────────── -->
<section class="card">
  <h2>4. Requirements</h2>
  <div class="section-hint">How events should behave end-to-end.</div>

  <div class="field">
    <label>Delivery mode<span class="req-marker">*</span></label>
    <div class="radio-group">
      <label><input type="radio" name="delivery_mode" value="direct" data-path="requirements.delivery_mode" data-required="1"> <span><strong><span class="glossed" data-tip="Fire-and-forget, lowest latency, no persistence.">Direct</span></strong> — Fire-and-forget, lowest latency</span></label>
      <label><input type="radio" name="delivery_mode" value="guaranteed" data-path="requirements.delivery_mode"> <span><strong><span class="glossed" data-tip="Persistent, acknowledged delivery — the broker spools until the consumer confirms.">Guaranteed</span></strong> — Persistent, acknowledged delivery</span></label>
      <label><input type="radio" name="delivery_mode" value="mixed" data-path="requirements.delivery_mode"> <span><strong>Mixed</strong> — Some flows direct, some guaranteed (most common)</span></label>
    </div>
  </div>

  <div class="field">
    <label>Ordering</label>
    <div class="radio-group">
      <label><input type="radio" name="ordering" value="none" data-path="requirements.ordering"> <span><strong>None</strong> — No ordering guarantees needed</span></label>
      <label><input type="radio" name="ordering" value="per_key" data-path="requirements.ordering"> <span><strong>Per-key</strong> — Ordered within a partition key (per customer, per device)</span></label>
      <label><input type="radio" name="ordering" value="global" data-path="requirements.ordering"> <span><strong>Global</strong> — Strict global ordering</span></label>
    </div>
  </div>

  <div class="field">
    <label>Processing guarantee</label>
    <div class="radio-group inline">
      <label><input type="radio" name="processing_guarantee" value="at_least_once" data-path="requirements.processing_guarantee"> At-least-once</label>
      <label><input type="radio" name="processing_guarantee" value="at_most_once" data-path="requirements.processing_guarantee"> At-most-once</label>
    </div>
  </div>

  <div class="field">
    <label>Latency tier<span class="req-marker">*</span></label>
    <div class="radio-group">
      <label><input type="radio" name="latency_tier" value="sub_millisecond" data-path="requirements.latency_tier" data-required="1"> <span><strong>Sub-millisecond</strong> — Market data, HFT (&lt;1ms)</span></label>
      <label><input type="radio" name="latency_tier" value="sub_second" data-path="requirements.latency_tier"> <span><strong>Sub-second</strong> — Interactive apps, real-time dashboards (&lt;1s)</span></label>
      <label><input type="radio" name="latency_tier" value="seconds" data-path="requirements.latency_tier"> <span><strong>Seconds</strong> — Business events, notifications (1-10s)</span></label>
      <label><input type="radio" name="latency_tier" value="minutes" data-path="requirements.latency_tier"> <span><strong>Minutes</strong> — Batch-adjacent, analytics pipelines</span></label>
    </div>
  </div>

  <div class="field">
    <label>Topology<span class="req-marker">*</span></label>
    <div class="radio-group">
      <label><input type="radio" name="topology" value="single_site" data-path="requirements.topology" data-required="1" onchange="updatePreview()"> <span><strong>Single site</strong> — One data center or cloud region</span></label>
      <label><input type="radio" name="topology" value="multi_region" data-path="requirements.topology" onchange="updatePreview()"> <span><strong>Multi-region</strong> — Multiple cloud regions or data centers</span></label>
      <label><input type="radio" name="topology" value="hybrid_cloud" data-path="requirements.topology" onchange="updatePreview()"> <span><strong>Hybrid cloud</strong> — Mix of on-premise and cloud</span></label>
      <label><input type="radio" name="topology" value="edge" data-path="requirements.topology" onchange="updatePreview()"> <span><strong>Edge</strong> — Edge locations + regional/cloud</span></label>
    </div>
  </div>

  <div class="field">
    <label>Sites and regions</label>
    <div class="help">How many sites, regions, or clouds? Name them if known.</div>
    <input type="text" data-path="requirements.sites_and_regions">
  </div>

  <div class="field">
    <label>IT/OT boundary</label>
    <div class="help">Is there an IT/OT boundary? Describe constraints.</div>
    <textarea data-path="requirements.it_ot_boundary"></textarea>
  </div>

  <div class="field">
    <label>Growth expectations</label>
    <div class="help">Expected growth over the next 1-3 years?</div>
    <textarea data-path="requirements.growth_expectations"></textarea>
  </div>

  <div class="field">
    <label>Data residency</label>
    <div class="help">Regulatory constraints on where data can live or move?</div>
    <textarea data-path="requirements.data_residency"></textarea>
  </div>

  <div class="field">
    <label>Operations team</label>
    <input type="text" data-path="requirements.operations_team">
  </div>

  <div class="field">
    <label>Solace / EDA experience</label>
    <div class="help">Team experience with <span class="glossed" data-tip="Event-driven architecture — systems coordinated by emitting and reacting to events.">event-driven architecture</span> and Solace.</div>
    <input type="text" data-path="requirements.solace_experience">
  </div>

  <div class="field">
    <label>Observability</label>
    <div class="help">What's in place? Metrics, tracing, logging.</div>
    <input type="text" data-path="requirements.observability">
  </div>

  <div class="field">
    <label>CI/CD</label>
    <input type="text" data-path="requirements.cicd">
  </div>
</section>

<!-- ── Section 5: Goals ──────────────────────────────────────────────── -->
<section class="card">
  <h2>5. Goals</h2>
  <div class="section-hint">Why this engagement exists.</div>

  <div class="field">
    <label>Driver<span class="req-marker">*</span></label>
    <div class="help">What triggered this project? What problem is being solved?</div>
    <textarea data-path="goals.driver" data-required="1"></textarea>
  </div>

  <div class="field">
    <label>Timeline<span class="req-marker">*</span></label>
    <div class="help">When does this need to be in production?</div>
    <input type="text" data-path="goals.timeline" data-required="1">
  </div>

  <div class="field">
    <label>Budget</label>
    <div class="help">Constraints that affect broker selection? Cloud-managed vs self-hosted?</div>
    <input type="text" data-path="goals.budget">
  </div>

  <div class="field">
    <label>Team size</label>
    <input type="text" data-path="goals.team_size">
  </div>

  <div class="field">
    <label>Organizational constraints</label>
    <div class="help">Approval processes, vendor relationships, procurement timelines?</div>
    <textarea data-path="goals.organizational_constraints"></textarea>
  </div>
</section>

<!-- ── Section 6: Preferences ────────────────────────────────────────── -->
<section class="card">
  <h2>6. Preferences</h2>

  <div class="field">
    <label>Execution mode</label>
    <div class="radio-group">
      <label><input type="radio" name="execution_mode" value="auto" data-path="preferences.execution_mode" checked> <span><strong>Auto</strong> — Skills run back-to-back, auto-selecting the recommended option at each decision (logged, and reviewable/overridable afterward) <em>(recommended)</em></span></label>
      <label><input type="radio" name="execution_mode" value="interactive" data-path="preferences.execution_mode"> <span><strong>Interactive</strong> — Confirm each skill and each decision before it runs</span></label>
    </div>
  </div>

  <div class="field">
    <label>Provision the Event Portal model after design?</label>
    <div class="help">When enabled, <code>/solace-ep-provision</code> runs after Event Portal design and materializes the catalog (domains, schemas, events, applications) directly into your Solace Cloud tenant via the EP Designer MCP. Requires the <strong>Solace Event Portal Designer MCP</strong> installed in your AI host and a <strong>Solace Cloud API token with Event Portal Designer Read+Write</strong> permission. If the MCP is not configured at run time, the step records a BLOCKED status with the exact reason — it never writes silently or skips silently.</div>
    <div class="radio-group">
      <label><input type="radio" name="provision_event_portal" value="false" data-path="preferences.provision_event_portal" data-bool="1" checked onchange="updatePreview()"> <span><strong>No</strong> — design-only engagement; we do not touch your tenant <em>(default)</em></span></label>
      <label><input type="radio" name="provision_event_portal" value="true" data-path="preferences.provision_event_portal" data-bool="1" onchange="updatePreview()"> <span><strong>Yes</strong> — provision the designed Event Portal model into Solace Cloud after design completes</span></label>
    </div>
  </div>
</section>

<div class="stamp" id="stamp">
  Integration catalog as of <span id="catalog-refreshed">__CATALOG_REFRESHED__</span>
  · Generated <span id="generated-at">__GENERATED_AT__</span>
  · Your architect will reconfirm Micro-Integration availability at import.
</div>

</main>

<aside class="preview">
  <h3>Your engagement preview</h3>
  <div class="preview-hint">Based on your answers, here's what your architect will design.</div>
  <div id="preview-content"></div>
  <div class="preview-count" id="preview-count"></div>
</aside>
</div>

<div class="actions">
  <button class="secondary" type="button" onclick="saveDraft()">Save draft</button>
  <span class="draft-status" id="draft-status"></span>
  <span class="spacer"></span>
  <button class="secondary" type="button" onclick="downloadMD()">Download Markdown</button>
  <button class="secondary" type="button" id="btn-download-yaml" onclick="downloadYAML()">Download YAML</button>
  <button class="primary" type="button" id="btn-submit" style="display:none" onclick="submitToServer()">Submit to architect</button>
</div>

<div id="submit-result" style="display:none; position:fixed; top:80px; right:24px; max-width:380px; background:var(--surface); border:1px solid var(--accent); border-radius:6px; padding:14px 16px; box-shadow:0 4px 16px rgba(0,0,0,0.12); z-index:200;">
  <div style="font-weight:600; color:var(--accent-dark); margin-bottom:6px;">Saved</div>
  <div id="submit-result-body" style="font-size:13px; color:var(--text);"></div>
  <button class="secondary" type="button" style="margin-top:10px;" onclick="document.getElementById('submit-result').style.display='none'">Dismiss</button>
</div>

<script>
// ───────────────────────────────────────────────────────────────────────────
//  Embedded data
// ───────────────────────────────────────────────────────────────────────────
const CATALOG = __CATALOG_JSON__;
const ROUTING = __ROUTING_JSON__;

const SCHEMA = {
  // Maps the form data into the exact YAML structure /solace-intake expects.
};

// ───────────────────────────────────────────────────────────────────────────
//  State helpers
// ───────────────────────────────────────────────────────────────────────────
function setByPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in cur)) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function collectData() {
  const data = {};
  // Single-value fields
  document.querySelectorAll('[data-path]').forEach(el => {
    if (el.type === 'radio') {
      if (el.checked) {
        let v = el.value;
        // Coerce typed inputs: data-bool="1" means store as actual boolean
        // so routing rules with `value: true` (YAML bool) compare correctly.
        if (el.dataset.bool === '1') {
          v = (el.value === 'true');
        }
        setByPath(data, el.dataset.path, v);
      }
    } else if (el.type === 'checkbox') {
      // Handled separately below
    } else {
      const v = (el.value || '').trim();
      if (v) setByPath(data, el.dataset.path, v);
    }
  });

  // Protocols (multi-check)
  const protocols = [];
  document.querySelectorAll('[data-protocol]').forEach(cb => {
    if (cb.checked) protocols.push(cb.dataset.protocol);
  });
  if (protocols.length) setByPath(data, 'landscape.protocols_in_use', protocols);

  // Systems repeater
  const systems = [];
  document.querySelectorAll('#systems-body tr').forEach(tr => {
    const name = tr.querySelector('[data-col=name]').value.trim();
    const role = tr.querySelector('[data-col=role]').value.trim();
    const protocol = tr.querySelector('[data-col=protocol]').value.trim();
    const owner = tr.querySelector('[data-col=owner]').value.trim();
    if (name || role || protocol || owner) {
      systems.push({ name, role, protocol, owner });
    }
  });
  if (systems.length) setByPath(data, 'landscape.systems', systems);

  // Events repeater
  const events = [];
  document.querySelectorAll('#events-body tr').forEach(tr => {
    const name = tr.querySelector('[data-col=name]').value.trim();
    const rate = tr.querySelector('[data-col=rate]').value.trim();
    const delivery = tr.querySelector('[data-col=delivery]').value.trim();
    const payload = tr.querySelector('[data-col=payload]').value.trim();
    const payload_size = tr.querySelector('[data-col=payload_size]').value.trim();
    if (name || rate || delivery || payload || payload_size) {
      events.push({ name, rate, delivery, payload, payload_size });
    }
  });
  if (events.length) setByPath(data, 'landscape.events', events);

  return data;
}

function loadData(data) {
  document.querySelectorAll('[data-path]').forEach(el => {
    const parts = el.dataset.path.split('.');
    let cur = data;
    for (const p of parts) {
      if (cur == null) return;
      cur = cur[p];
    }
    if (cur == null) return;
    if (el.type === 'radio') {
      // data-bool="1" radios store booleans in the draft; coerce back to the
      // string form ("true"/"false") so `el.value === target` matches.
      // Without this, a saved `true` silently reverts to the HTML default
      // checked radio (typically "false") on draft reload.
      const target = el.dataset.bool === '1' ? String(cur) : cur;
      el.checked = (el.value === target);
    } else {
      el.value = cur;
    }
  });
  // Protocols
  const protos = (data.landscape && data.landscape.protocols_in_use) || [];
  document.querySelectorAll('[data-protocol]').forEach(cb => {
    if (protos.includes(cb.dataset.protocol)) cb.checked = true;
  });
  // Systems / events
  const systems = (data.landscape && data.landscape.systems) || [];
  document.getElementById('systems-body').innerHTML = '';
  if (systems.length === 0) addSystemRow();
  systems.forEach(s => addSystemRow(s));
  const events = (data.landscape && data.landscape.events) || [];
  document.getElementById('events-body').innerHTML = '';
  if (events.length === 0) addEventRow();
  events.forEach(e => addEventRow(e));
  onVerticalChange();
  updateProgress();
  updatePreview();
  updateCatalogSummary();
}

// ───────────────────────────────────────────────────────────────────────────
//  Repeater rows
// ───────────────────────────────────────────────────────────────────────────
function addSystemRow(row) {
  row = row || {};
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input data-col="name" type="text" placeholder="e.g. Core Banking" list="catalog-list" value="${esc(row.name || '')}"></td>
    <td>
      <select data-col="role">
        <option value="">—</option>
        <option value="producer" ${row.role === 'producer' ? 'selected' : ''}>Producer</option>
        <option value="consumer" ${row.role === 'consumer' ? 'selected' : ''}>Consumer</option>
        <option value="producer_consumer" ${row.role === 'producer_consumer' ? 'selected' : ''}>Both</option>
      </select>
    </td>
    <td><input data-col="protocol" type="text" placeholder="REST, MQTT..." value="${esc(row.protocol || '')}"></td>
    <td><input data-col="owner" type="text" placeholder="Team / owner" value="${esc(row.owner || '')}"></td>
    <td><button class="row-delete" type="button" onclick="this.closest('tr').remove(); markDirty();">×</button></td>
  `;
  document.getElementById('systems-body').appendChild(tr);
  tr.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', markDirty);
    el.addEventListener('change', markDirty);
  });
  markDirty();
}

function addEventRow(row) {
  row = row || {};
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input data-col="name" type="text" placeholder="e.g. order-created" value="${esc(row.name || '')}"></td>
    <td><input data-col="rate" type="text" placeholder="e.g. 500/sec peak" value="${esc(row.rate || '')}"></td>
    <td>
      <select data-col="delivery">
        <option value="">—</option>
        <option value="direct" ${row.delivery === 'direct' ? 'selected' : ''}>Direct</option>
        <option value="guaranteed" ${row.delivery === 'guaranteed' ? 'selected' : ''}>Guaranteed</option>
      </select>
    </td>
    <td><input data-col="payload" type="text" placeholder="JSON, Avro..." value="${esc(row.payload || '')}"></td>
    <td><input data-col="payload_size" type="text" placeholder="e.g. ~5KB" value="${esc(row.payload_size || '')}"></td>
    <td><button class="row-delete" type="button" onclick="this.closest('tr').remove(); markDirty();">×</button></td>
  `;
  document.getElementById('events-body').appendChild(tr);
  tr.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', markDirty);
    el.addEventListener('change', markDirty);
  });
  markDirty();
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// ───────────────────────────────────────────────────────────────────────────
//  Catalog lookup
// ───────────────────────────────────────────────────────────────────────────
function findCatalogMatch(systemName) {
  if (!systemName) return null;
  const lower = systemName.toLowerCase().trim();
  // Exact match first
  let direct = CATALOG.entries.find(e => e.name.toLowerCase() === lower);
  if (direct) return { type: 'direct', entry: direct };
  // Substring match
  direct = CATALOG.entries.find(e => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase()));
  if (direct) return { type: 'direct', entry: direct };
  // Indirect path match
  for (const ip of (CATALOG.indirect_paths || [])) {
    if (ip.source.toLowerCase().includes(lower) || lower.includes(ip.source.toLowerCase())) {
      return { type: 'indirect', path: ip };
    }
  }
  return null;
}

function updateCatalogSummary() {
  const container = document.getElementById('catalog-summary');
  container.innerHTML = '';
  const systems = collectData().landscape && collectData().landscape.systems;
  if (!systems || systems.length === 0) return;
  systems.forEach(s => {
    if (!s.name) return;
    const m = findCatalogMatch(s.name);
    const div = document.createElement('div');
    if (m && m.type === 'direct') {
      div.className = 'catalog-hint';
      div.innerHTML = `<strong>${esc(s.name)}</strong> → cataloged Micro-Integration available (${esc(m.entry.direction)}, ${esc(m.entry.platform)})`;
    } else if (m && m.type === 'indirect') {
      div.className = 'catalog-hint indirect';
      div.innerHTML = `<strong>${esc(s.name)}</strong> → no direct MI, indirect path via ${esc(m.path.intermediate)}`;
    } else {
      div.className = 'catalog-hint miss';
      div.innerHTML = `<strong>${esc(s.name)}</strong> → no cataloged Micro-Integration found. Your architect will check if a custom one is needed.`;
    }
    container.appendChild(div);
  });
}

// ───────────────────────────────────────────────────────────────────────────
//  Routing preview
// ───────────────────────────────────────────────────────────────────────────
function evaluateCondition(cond, data) {
  const value = readPath(data, cond.field);
  switch (cond.op) {
    case 'equals':
      return value === cond.value;
    case 'in':
      return Array.isArray(cond.value) && cond.value.includes(value);
    case 'not_empty':
      return Array.isArray(value) ? value.length > 0 : !!value;
    case 'contains_any': {
      const targets = (cond.value || []).map(v => String(v).toLowerCase());
      const haystack = collectStrings(value).map(s => s.toLowerCase());
      return haystack.some(s => targets.some(t => s.includes(t)));
    }
    default:
      return false;
  }
}

function collectStrings(v) {
  if (v == null) return [];
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(collectStrings);
  if (typeof v === 'object') return Object.values(v).flatMap(collectStrings);
  return [String(v)];
}

function readPath(obj, path) {
  if (path.includes('[].')) {
    // e.g. landscape.systems[].name → collect all .name values
    const [head, tail] = path.split('[].');
    const arr = readPath(obj, head);
    if (!Array.isArray(arr)) return [];
    return arr.map(item => item && item[tail]).filter(v => v != null);
  }
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function decideIncluded(skill, data) {
  if (skill.trigger === 'always') return true;
  if (!skill.when || skill.when.length === 0) return false;
  return skill.when.some(c => evaluateCondition(c, data));
}

function updatePreview() {
  const data = collectData();
  const container = document.getElementById('preview-content');
  container.innerHTML = '';
  const phases = { design: [], review: [], finalize: [] };
  let included = 0;
  for (const skill of (ROUTING.skills || [])) {
    const isIn = decideIncluded(skill, data);
    if (isIn) included++;
    phases[skill.phase] = phases[skill.phase] || [];
    phases[skill.phase].push({ skill, isIn });
  }
  const phaseLabels = { design: 'Design', review: 'Review', finalize: 'Finalize' };
  for (const key of ['design', 'review', 'finalize']) {
    const list = phases[key] || [];
    if (list.length === 0) continue;
    const ph = document.createElement('div');
    ph.className = 'phase';
    ph.innerHTML = `<div class="phase-title">${phaseLabels[key]}</div>`;
    list.forEach(({ skill, isIn }) => {
      const o = document.createElement('div');
      o.className = 'outcome ' + (isIn ? 'included' : 'conditional-off');
      o.innerHTML = `<span class="marker ${isIn ? '' : 'off'}">${isIn ? '●' : '○'}</span> <span>${esc(skill.outcome)}</span>`;
      ph.appendChild(o);
    });
    container.appendChild(ph);
  }
  document.getElementById('preview-count').textContent = `${included} of ${ROUTING.skills.length} skills will run.`;
}

// ───────────────────────────────────────────────────────────────────────────
//  Vertical → domain section
// ───────────────────────────────────────────────────────────────────────────
function onVerticalChange() {
  const v = document.getElementById('vertical').value;
  const card = document.getElementById('domain-card');
  let anyShown = false;
  document.querySelectorAll('.domain-block').forEach(b => {
    if (b.dataset.domain === v) {
      b.classList.add('active');
      anyShown = true;
    } else {
      b.classList.remove('active');
    }
  });
  card.style.display = anyShown ? 'block' : 'none';
  markDirty();
}

// ───────────────────────────────────────────────────────────────────────────
//  Progress
// ───────────────────────────────────────────────────────────────────────────
function updateProgress() {
  const required = document.querySelectorAll('[data-required="1"]');
  // For radio groups, count by group name
  const seenRadios = new Set();
  let total = 0;
  let filled = 0;
  required.forEach(el => {
    if (el.type === 'radio') {
      if (seenRadios.has(el.name)) return;
      seenRadios.add(el.name);
      total++;
      const checked = document.querySelector(`[name="${el.name}"]:checked`);
      if (checked) filled++;
    } else {
      total++;
      if ((el.value || '').trim()) filled++;
    }
  });
  // Systems row counts as 1 required ("at least one system")
  total++;
  const sysRows = document.querySelectorAll('#systems-body tr');
  let hasSystem = false;
  sysRows.forEach(tr => {
    const nm = tr.querySelector('[data-col=name]');
    if (nm && nm.value.trim()) hasSystem = true;
  });
  if (hasSystem) filled++;

  document.getElementById('prog-label').textContent = `Required ${filled} / ${total}`;
  document.getElementById('prog-fill').style.width = `${(filled / total) * 100}%`;
}

// ───────────────────────────────────────────────────────────────────────────
//  Dirty / autosave to localStorage
// ───────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'solace-intake-draft';
let dirtyTimer = null;
function markDirty() {
  document.getElementById('draft-status').textContent = 'Unsaved changes';
  document.getElementById('draft-status').className = 'draft-status';
  clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(() => {
    saveDraft();
    updateProgress();
    updatePreview();
    updateCatalogSummary();
  }, 400);
}
function saveDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
    const el = document.getElementById('draft-status');
    el.textContent = `Draft saved ${new Date().toLocaleTimeString()}`;
    el.className = 'draft-status saved';
  } catch (e) {
    document.getElementById('draft-status').textContent = 'Save failed: ' + e.message;
  }
}
function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    loadData(JSON.parse(raw));
  } catch (e) {
    console.warn('Could not load draft:', e);
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  Load from existing project — fetches /api/intakable-projects on init and
//  /api/intake/<slug> on selection. Both endpoints are only available when
//  the form is served by scripts/intake-server.ts. When the form is opened
//  as a static file (file://) the fetches fail silently and the bar stays
//  hidden, leaving the standalone form behavior unchanged.
// ───────────────────────────────────────────────────────────────────────────
async function initLoadExistingBar() {
  let projects;
  try {
    const res = await fetch('/api/intakable-projects');
    if (!res.ok) return;
    const body = await res.json();
    projects = body.projects || [];
  } catch (e) {
    // No intake server running (form opened as static file). Bar stays hidden.
    return;
  }
  if (!projects.length) return;
  const sel = document.getElementById('load-existing-select');
  if (!sel) return;
  for (const p of projects) {
    const opt = document.createElement('option');
    opt.value = p.slug;
    opt.textContent = p.display_name + ' (' + p.slug + ')' + (p.intake_reviewed ? ' [reviewed]' : '');
    opt.dataset.intakeFile = p.intake_file;
    opt.dataset.intakeReviewed = p.intake_reviewed ? '1' : '';
    sel.appendChild(opt);
  }
  document.getElementById('load-existing-bar').style.display = 'flex';
}

async function onLoadExistingChange() {
  const sel = document.getElementById('load-existing-select');
  const statusEl = document.getElementById('load-existing-status');
  const slug = sel.value;
  if (!slug) { statusEl.textContent = ''; return; }

  // Confirm overwrite if any form field already has data.
  const current = collectData();
  const hasUserData = current && Object.keys(current).length > 0;
  if (hasUserData) {
    const ok = window.confirm(
      'Loading "' + slug + '" will replace anything you have entered. Continue?'
    );
    if (!ok) {
      sel.value = '';
      return;
    }
  }

  statusEl.textContent = 'Loading…';
  try {
    const res = await fetch('/api/intake/' + encodeURIComponent(slug));
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      statusEl.textContent = 'Failed: ' + (err.error || res.statusText);
      return;
    }
    const body = await res.json();
    loadData(body.data || {});
    // Submit ALWAYS writes intake/<slug>.yaml, even when the form loaded the
    // canonical projects/<slug>/intake.yaml. Claiming it overwrites "that
    // file" would be false in that case, and because the next load prefers
    // the project copy the edit would appear to vanish. Name both files and
    // the step that folds one into the other. The server deliberately does
    // not write the project copy: /solace-intake Import Mode owns it and
    // records provenance in decisions.yaml, so a direct write here would
    // silently clobber review amendments.
    const fromProjectCopy = String(body.intake_file || '').startsWith('projects/');
    let msg = 'Loaded ' + body.intake_file + '. ';
    msg += fromProjectCopy
      ? 'Submitting writes a NEW submission to intake/, not back to this file. Run /solace-intake on that submission to fold your edits into the project copy.'
      : 'Edit and submit will overwrite that file if the project name is unchanged.';
    if (body.intake_reviewed) {
      msg += ' Note: this intake was amended by /solace-intake-review, so values here reflect the reconciled copy; provenance is in the project dashboard (Decisions view).';
    }
    statusEl.textContent = msg;
  } catch (e) {
    statusEl.textContent = 'Failed: ' + (e && e.message ? e.message : e);
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  YAML serializer (subset — handles strings, arrays of objects, scalars)
// ───────────────────────────────────────────────────────────────────────────
function toYAML(data, indent) {
  indent = indent || 0;
  const pad = '  '.repeat(indent);
  const lines = [];
  if (Array.isArray(data)) {
    if (data.length === 0) return pad + '[]';
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        const keys = Object.keys(item);
        if (keys.length === 0) { lines.push(pad + '- {}'); continue; }
        const first = keys[0];
        lines.push(pad + '- ' + first + ': ' + yamlScalar(item[first]));
        for (let i = 1; i < keys.length; i++) {
          lines.push(pad + '  ' + keys[i] + ': ' + yamlScalar(item[keys[i]]));
        }
      } else {
        lines.push(pad + '- ' + yamlScalar(item));
      }
    }
    return lines.join('\n');
  }
  if (typeof data === 'object' && data !== null) {
    for (const k of Object.keys(data)) {
      const v = data[k];
      if (Array.isArray(v)) {
        if (v.length === 0) {
          lines.push(pad + k + ': []');
        } else if (typeof v[0] === 'object') {
          lines.push(pad + k + ':');
          lines.push(toYAML(v, indent + 1));
        } else {
          lines.push(pad + k + ': [' + v.map(yamlScalar).join(', ') + ']');
        }
      } else if (typeof v === 'object' && v !== null) {
        lines.push(pad + k + ':');
        lines.push(toYAML(v, indent + 1));
      } else {
        lines.push(pad + k + ': ' + yamlScalar(v));
      }
    }
    return lines.join('\n');
  }
  return pad + yamlScalar(data);
}
function yamlScalar(v) {
  if (v === null || v === undefined) return '""';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  if (s === '') return '""';
  if (/[:\n#{}\[\]&*!|>%@`'",]/.test(s) || /^\s|\s$/.test(s)) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return s;
}

// ───────────────────────────────────────────────────────────────────────────
//  Download handlers
// ───────────────────────────────────────────────────────────────────────────
function downloadYAML() {
  const data = collectData();
  const header = [
    '# Solace Architect — Intake (HTML form export)',
    `# Generated: ${new Date().toISOString()}`,
    `# Integration catalog snapshot: ${CATALOG.refreshed}`,
    ''
  ].join('\n');
  const yaml = header + toYAML(data) + '\n';
  triggerDownload('solace-intake.yaml', yaml, 'text/yaml');
}

function downloadMD() {
  const data = collectData();
  let md = '# Solace Architect — Intake\n\n';
  md += `> Generated from the HTML form on ${new Date().toISOString().slice(0, 10)}\n`;
  md += `> Integration catalog snapshot: ${CATALOG.refreshed}\n\n`;
  md += '## 1. Project\n\n';
  md += `**Project name:** ${(data.project && data.project.name) || ''}\n\n`;
  md += `**Project type:** ${(data.project && data.project.type) || ''}\n\n`;
  md += '## 2. System landscape\n\n';
  md += '### Systems\n\n| Name | Role | Protocol | Owner |\n|---|---|---|---|\n';
  ((data.landscape && data.landscape.systems) || []).forEach(s => {
    md += `| ${s.name || ''} | ${s.role || ''} | ${s.protocol || ''} | ${s.owner || ''} |\n`;
  });
  md += '\n### Events\n\n| Name | Rate | Delivery | Payload | Payload size |\n|---|---|---|---|---|\n';
  ((data.landscape && data.landscape.events) || []).forEach(e => {
    md += `| ${e.name || ''} | ${e.rate || ''} | ${e.delivery || ''} | ${e.payload || ''} | ${e.payload_size || ''} |\n`;
  });
  md += `\n**Existing messaging:** ${(data.landscape && data.landscape.existing_messaging) || ''}\n\n`;
  md += `**Protocols in use:** ${((data.landscape && data.landscape.protocols_in_use) || []).join(', ')}\n\n`;
  md += `**Aggregate volumes:** ${(data.landscape && data.landscape.volumes) || ''}\n\n`;
  md += `**Schemas:** ${(data.landscape && data.landscape.schemas) || ''}\n\n`;
  md += `**Vertical:** ${(data.landscape && data.landscape.vertical) || ''}\n\n`;
  if (data.domain) {
    md += '## 3. Domain details\n\n';
    for (const k of Object.keys(data.domain)) {
      md += `### ${k}\n\n`;
      for (const f of Object.keys(data.domain[k])) {
        md += `**${f}:** ${data.domain[k][f]}\n\n`;
      }
    }
  }
  md += '## 4. Requirements\n\n';
  for (const k of Object.keys(data.requirements || {})) {
    md += `**${k}:** ${data.requirements[k]}\n\n`;
  }
  md += '## 5. Goals\n\n';
  for (const k of Object.keys(data.goals || {})) {
    md += `**${k}:** ${data.goals[k]}\n\n`;
  }
  md += '## 6. Preferences\n\n';
  for (const k of Object.keys(data.preferences || {})) {
    md += `**${k}:** ${data.preferences[k]}\n\n`;
  }
  triggerDownload('solace-intake.md', md, 'text/markdown');
}

function triggerDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ───────────────────────────────────────────────────────────────────────────
//  Server mode — POST submit
// ───────────────────────────────────────────────────────────────────────────
const SERVER_MODE = (window.location.protocol === 'http:' || window.location.protocol === 'https:');

async function submitToServer() {
  const data = collectData();
  // Quick required-field check
  const required = [
    ['project.name', 'Project name'],
    ['project.type', 'Project type'],
    ['landscape.vertical', 'Industry vertical'],
    ['requirements.delivery_mode', 'Delivery mode'],
    ['requirements.latency_tier', 'Latency tier'],
    ['requirements.topology', 'Topology'],
    ['goals.driver', 'Driver'],
    ['goals.timeline', 'Timeline'],
  ];
  const missing = required.filter(([p, _]) => !readPath(data, p)).map(([_, label]) => label);
  if (!data.landscape || !data.landscape.systems || data.landscape.systems.length === 0) {
    missing.push('At least one system');
  }
  if (missing.length) {
    showSubmitResult(false, 'Missing required fields: ' + missing.join(', '));
    return;
  }

  const yamlHeader = [
    '# Solace Architect — Intake (HTML form submission)',
    `# Generated: ${new Date().toISOString()}`,
    `# Integration catalog snapshot: ${CATALOG.refreshed}`,
    ''
  ].join('\n');
  const yaml = yamlHeader + toYAML(data) + '\n';

  try {
    const resp = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml, data }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      showSubmitResult(false, 'Server error: ' + text);
      return;
    }
    const result = await resp.json();
    showSubmitResult(true, result);
  } catch (e) {
    showSubmitResult(false, 'Submit failed: ' + e.message);
  }
}

function showSubmitResult(ok, payload) {
  const box = document.getElementById('submit-result');
  const body = document.getElementById('submit-result-body');
  box.style.borderColor = ok ? 'var(--accent)' : 'var(--error)';
  box.querySelector('div').style.color = ok ? 'var(--accent-dark)' : 'var(--error)';
  box.querySelector('div').textContent = ok ? 'Saved' : 'Could not save';
  if (ok && typeof payload === 'object') {
    body.innerHTML = `Saved to <code>${esc(payload.path)}</code>.<br><br>` +
      `Your architect can now run:<br>` +
      `<code style="display:block; margin-top:6px; padding:6px 8px; background:var(--chip-bg); border-radius:3px; font-size:12px;">/solace-intake ${esc(payload.path)}</code>`;
  } else {
    body.textContent = String(payload);
  }
  box.style.display = 'block';
}

// ───────────────────────────────────────────────────────────────────────────
//  Boot
// ───────────────────────────────────────────────────────────────────────────
function init() {
  // Server vs standalone mode: swap primary button
  if (SERVER_MODE) {
    document.getElementById('btn-submit').style.display = '';
    const dl = document.getElementById('btn-download-yaml');
    dl.classList.remove('primary');
    dl.classList.add('secondary');
  }
  // Build datalist for system autocomplete
  const datalist = document.createElement('datalist');
  datalist.id = 'catalog-list';
  const names = new Set();
  for (const e of CATALOG.entries) names.add(e.name);
  for (const ip of (CATALOG.indirect_paths || [])) names.add(ip.source);
  Array.from(names).sort().forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    datalist.appendChild(opt);
  });
  document.body.appendChild(datalist);

  // Wire up inputs for live updates
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', markDirty);
    el.addEventListener('change', markDirty);
  });

  // Seed first rows
  if (document.querySelectorAll('#systems-body tr').length === 0) addSystemRow();
  if (document.querySelectorAll('#events-body tr').length === 0) addEventRow();

  // Load any saved draft
  loadDraft();
  updateProgress();
  updatePreview();
  updateCatalogSummary();

  // Discover loadable existing projects (no-op when form runs as static file)
  initLoadExistingBar();
}

document.addEventListener('DOMContentLoaded', init);
</script>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Build pipeline
# ---------------------------------------------------------------------------
def build_html(catalog_md_path: Path, routing_yaml_path: Path) -> str:
    if not catalog_md_path.exists():
        print(f"WARNING: catalog not found at {catalog_md_path} — autocomplete will be empty.", file=sys.stderr)
        catalog = {"refreshed": "unknown", "entries": [], "indirect_paths": []}
    else:
        with open(catalog_md_path, "r", encoding="utf-8") as f:
            catalog_md = f.read()
        catalog = parse_catalog(catalog_md)

    routing = load_routing()

    # Count required fields up front so the template's progress label is accurate.
    # The schema has: project.name, project.type, landscape.vertical,
    # at least 1 system, requirements.delivery_mode, requirements.latency_tier,
    # requirements.topology, goals.driver, goals.timeline = 9
    req_count = 9

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    html = HTML_TEMPLATE
    html = html.replace("__CATALOG_JSON__", json.dumps(catalog, ensure_ascii=False))
    html = html.replace("__ROUTING_JSON__", json.dumps(routing, ensure_ascii=False))
    html = html.replace("__CATALOG_REFRESHED__", catalog["refreshed"])
    html = html.replace("__GENERATED_AT__", generated_at)
    html = html.replace("__REQ_COUNT__", str(req_count))
    return html


def main():
    ap = argparse.ArgumentParser(description="Generate the Solace Architect intake HTML form.")
    ap.add_argument("--output", default="intake/solace-intake-template.html",
                    help="Output HTML path (default: intake/solace-intake-template.html)")
    ap.add_argument("--catalog", default=str(CATALOG_PATH),
                    help="Path to integration-hub-catalog.md")
    ap.add_argument("--routing", default=str(ROUTING_PATH),
                    help="Path to skill-routing.yaml")
    args = ap.parse_args()

    html = build_html(Path(args.catalog), Path(args.routing))

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    size_kb = len(html) / 1024
    print(f"Intake HTML written to: {out_path}")
    print(f"  size: {size_kb:.1f} KB")
    print(f"  catalog entries embedded: present in JSON blob")


if __name__ == "__main__":
    main()
