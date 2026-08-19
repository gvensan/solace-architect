#!/usr/bin/env python3
"""
Parse a filled Solace Architect intake DOCX into structured YAML.

Usage:
    python3 scripts/parse-intake-docx.py path/to/filled-intake.docx [output.yaml]

Reads every Structured Document Tag (SDT) in the DOCX — dropdowns and text
content controls — and maps them by alias/tag into a structured intake dict.
Tables (systems, events) are extracted row-by-row.

The output YAML is the canonical input for the intake skill's import mode.
"""

import sys
import os
import json
from datetime import datetime, timezone

try:
    from docx import Document
except ImportError:
    print("ERROR: python-docx is required. Install with: pip install python-docx")
    sys.exit(1)

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'


def _extract_sdts(element):
    """Extract all SDTs from an XML element tree. Returns list of (alias, tag, type, value)."""
    results = []
    for sdt in element.iter(f'{{{W}}}sdt'):
        pr = sdt.find(f'{{{W}}}sdtPr')
        if pr is None:
            continue

        alias_el = pr.find(f'{{{W}}}alias')
        tag_el = pr.find(f'{{{W}}}tag')
        alias = alias_el.get(f'{{{W}}}val', '') if alias_el is not None else ''
        tag = tag_el.get(f'{{{W}}}val', '') if tag_el is not None else ''

        ddl = pr.find(f'{{{W}}}dropDownList')
        txt = pr.find(f'{{{W}}}text')

        content = sdt.find(f'{{{W}}}sdtContent')
        value = ''
        if content is not None:
            runs = content.findall(f'.//{{{W}}}t')
            value = ''.join(r.text or '' for r in runs).strip()

        if ddl is not None:
            items = []
            for li in ddl:
                items.append({
                    'display': li.get(f'{{{W}}}displayText', ''),
                    'value': li.get(f'{{{W}}}value', ''),
                })
            selected_value = ''
            for item in items:
                if item['display'] == value:
                    selected_value = item['value']
                    break
            if selected_value in ('', None) or value in ('Select one...', 'Select...'):
                results.append((alias, tag, 'dropdown', None))
            else:
                results.append((alias, tag, 'dropdown', selected_value))
        elif txt is not None:
            showing = pr.find(f'{{{W}}}showingPlcHdr')
            if showing is not None:
                results.append((alias, tag, 'text', None))
            else:
                results.append((alias, tag, 'text', value if value else None))
        else:
            if value:
                results.append((alias, tag, 'text', value))

    return results


def _extract_table(table, dropdown_cols=None):
    """Extract table data as list of dicts, keyed by header text."""
    if len(table.rows) < 2:
        return []

    headers = []
    for cell in table.rows[0].cells:
        headers.append(cell.text.strip())

    rows = []
    for row_idx in range(1, len(table.rows)):
        row_data = {}
        empty = True
        for col_idx, cell in enumerate(table.rows[row_idx].cells):
            header = headers[col_idx] if col_idx < len(headers) else f'col_{col_idx}'
            sdts = _extract_sdts(cell._tc)
            if sdts:
                for _, _, stype, sval in sdts:
                    if sval is not None:
                        row_data[header] = sval
                        empty = False
                    else:
                        row_data[header] = None
            else:
                text = cell.text.strip()
                row_data[header] = text if text else None
                if text:
                    empty = False
        if not empty:
            rows.append(row_data)
    return rows


FIELD_MAP = {
    # S1: Contact
    'contact_name': 'contact.name',
    'contact_role': 'contact.role',
    'contact_email': 'contact.email',
    'contact_phone': 'contact.phone',
    'contact_org': 'contact.organization',
    'contact_date': 'contact.date',

    # S2: Project
    'project_name': 'project.name',
    'project_type': 'project.type',
    's2_other': 'project.notes',
    's2_references': 'project.references',

    # S3: System Landscape
    'existing_messaging': 'landscape.existing_messaging',
    'protocols_in_use': 'landscape.protocols_in_use',
    'aggregate_volumes': 'landscape.volumes',
    'schemas': 'landscape.schemas',
    'industry_vertical': 'landscape.vertical',
    'vertical_other': 'landscape.vertical_other',
    's3_other': 'landscape.notes',
    's3_references': 'landscape.references',

    # S4: Domain — Banking
    'banking_regulatory': 'domain.banking.regulatory_constraints',
    'banking_messaging': 'domain.banking.existing_messaging_infrastructure',
    'banking_auth': 'domain.banking.authorization_model',
    'banking_data_class': 'domain.banking.data_classification',
    'banking_audience': 'domain.banking.internal_vs_customer_facing',

    # S4: Domain — Capital Markets
    'capmkts_latency': 'domain.capital_markets.latency_budget',
    'capmkts_topology': 'domain.capital_markets.global_topology',
    'capmkts_feeds': 'domain.capital_markets.feed_infrastructure',
    'capmkts_messaging': 'domain.capital_markets.existing_messaging',
    'capmkts_compliance': 'domain.capital_markets.compliance_and_replay',

    # S4: Domain — Manufacturing
    'mfg_ot_protocols': 'domain.manufacturing.ot_protocol_inventory',
    'mfg_edge': 'domain.manufacturing.edge_constraints',
    'mfg_telemetry': 'domain.manufacturing.telemetry_vs_command',
    'mfg_historians': 'domain.manufacturing.existing_historians_mes',

    # S4: Domain — Healthcare
    'hc_hipaa': 'domain.healthcare.hipaa_phi',
    'hc_interop': 'domain.healthcare.interoperability_standards',
    'hc_realtime': 'domain.healthcare.realtime_vs_batch',

    # S4: Domain — Retail
    'retail_systems': 'domain.retail.order_inventory_systems',
    'retail_peak': 'domain.retail.peak_traffic',
    'retail_omnichannel': 'domain.retail.omnichannel',
    'retail_realtime': 'domain.retail.personalization_realtime',

    # S4: Domain — Telecom
    'telco_events': 'domain.telecom.network_event_types',
    'telco_oss_bss': 'domain.telecom.oss_bss_integration',
    'telco_scale': 'domain.telecom.subscriber_scale',
    'telco_5g': 'domain.telecom.five_g_edge',

    # S4: Domain — Logistics
    'logistics_tracking': 'domain.logistics.tracking_visibility',
    'logistics_partners': 'domain.logistics.partner_integration',
    'logistics_warehouse': 'domain.logistics.warehouse_systems',
    'logistics_custody': 'domain.logistics.chain_of_custody',

    # S4: Domain — Energy
    'energy_scada': 'domain.energy.scada_grid',
    'energy_meters': 'domain.energy.smart_meters',
    'energy_nerc': 'domain.energy.regulatory_nerc',
    'energy_der': 'domain.energy.renewable_der',

    # S4: Domain — Government
    'gov_classification': 'domain.government.classification_level',
    'gov_interagency': 'domain.government.interagency_sharing',
    'gov_citizen': 'domain.government.citizen_services',
    'gov_compliance': 'domain.government.compliance_frameworks',
    'other_regulatory': 'domain.other.regulatory_constraints',
    'other_sensitivity': 'domain.other.data_sensitivity',
    'other_platform': 'domain.other.platform_constraints',
    'other_rules': 'domain.other.domain_rules',

    's4_other': 'domain.notes',
    's4_references': 'domain.references',

    # S5: Migration
    'source_platform': 'migration.source_platform',
    'source_platform_other': 'migration.source_platform_other',
    'source_version': 'migration.source_version',
    'migration_artifact_count': 'migration.artifact_count',
    'migration_app_count': 'migration.app_count',
    'migration_driver': 'migration.driver',
    'coexistence': 'migration.coexistence_strategy',
    'coexistence_duration': 'migration.coexistence_duration',
    'migration_constraints': 'migration.constraints',
    'data_migration': 'migration.data_migration',
    's5_other': 'migration.notes',
    's5_references': 'migration.references',

    # S6: SAM
    'sam_use_case': 'sam.use_case',
    'llm_provider': 'sam.llm_provider',
    'sam_agent_count': 'sam.agent_count',
    'sam_capabilities': 'sam.capabilities',
    'sam_backends': 'sam.backends',
    'sam_channels': 'sam.channels',
    'sam_channels_list': 'sam.channels_list',
    'sam_existing_ai': 'sam.existing_ai',
    'sam_volume': 'sam.volume',
    's6_other': 'sam.notes',
    's6_references': 'sam.references',

    # S7: Security
    'auth_method': 'security.authentication',
    'tls': 'security.tls',
    'encryption_at_rest': 'security.encryption_at_rest',
    'security_network': 'security.network_isolation',
    'security_acl': 'security.access_control',
    'security_audit': 'security.audit_compliance',
    'security_gateway': 'security.api_gateway',
    'security_secrets': 'security.secret_management',
    's7_other': 'security.notes',
    's7_references': 'security.references',

    # S8: Technical Requirements
    'delivery_mode': 'requirements.delivery_mode',
    'ordering': 'requirements.ordering',
    'processing_guarantee': 'requirements.processing_guarantee',
    'latency_tier': 'requirements.latency_tier',
    'topology': 'requirements.topology',
    'sites_regions': 'requirements.sites_and_regions',
    'it_ot_boundary': 'requirements.it_ot_boundary',
    'growth': 'requirements.growth_expectations',
    'data_residency': 'requirements.data_residency',
    'ops_team': 'requirements.operations_team',
    'solace_experience': 'requirements.solace_experience',
    'observability': 'requirements.observability',
    'cicd': 'requirements.cicd',
    's8_other': 'requirements.notes',
    's8_references': 'requirements.references',

    # S9: Goals
    'goal_driver': 'goals.driver',
    'goal_timeline': 'goals.timeline',
    'goal_budget': 'goals.budget',
    'goal_team_size': 'goals.team_size',
    'goal_org_constraints': 'goals.organizational_constraints',
    's9_other': 'goals.notes',
    's9_references': 'goals.references',

    # S10: Preferences
    'execution_mode': 'preferences.execution_mode',
    'provision_event_portal': 'preferences.provision_event_portal',

    # S11: Additional
    'additional_notes': 'additional.notes',
    'additional_references': 'additional.references',
}


def _set_nested(d, dotted_key, value):
    """Set a value in a nested dict using dot notation."""
    parts = dotted_key.split('.')
    for part in parts[:-1]:
        if part not in d:
            d[part] = {}
        d = d[part]
    d[parts[-1]] = value


def parse_intake_docx(filepath):
    """Parse a filled intake DOCX and return structured dict."""
    doc = Document(filepath)

    # 1. Extract all paragraph-level SDTs
    para_sdts = _extract_sdts(doc.element.body)

    # 2. Build tag -> value map (skip table-row SDTs by deduplicating)
    tag_map = {}
    for alias, tag, stype, value in para_sdts:
        if not tag or tag.startswith('system_name_r') or tag.startswith('event_name_r'):
            continue
        clean_tag = tag.lower().strip()
        if ' r' in clean_tag and clean_tag.split(' r')[-1].isdigit():
            continue
        if value is not None:
            tag_map[clean_tag] = value

    # 3. Extract tables
    systems_table = None
    events_table = None
    for table in doc.tables:
        headers = [cell.text.strip().lower() for cell in table.rows[0].cells]
        if 'system name' in headers:
            systems_table = _extract_table(table)
        elif 'event name' in headers:
            events_table = _extract_table(table)

    # 4. Map to structured output
    intake = {}

    # Paths whose dropdown values should be coerced from the strings stored in
    # the DOCX SDT ("true"/"false") to native YAML booleans so downstream
    # routing rules can compare against `value: true`/`false` directly.
    _BOOL_PATHS = {
        'preferences.provision_event_portal',
    }

    for tag_key, dotted_path in FIELD_MAP.items():
        if tag_key in tag_map:
            value = tag_map[tag_key]
            if dotted_path in _BOOL_PATHS:
                # Accept "true"/"false" (case-insensitive). Anything else → False.
                value = str(value).strip().lower() == 'true'
            _set_nested(intake, dotted_path, value)

    # Add table data
    if systems_table:
        _set_nested(intake, 'landscape.systems', systems_table)
    if events_table:
        _set_nested(intake, 'landscape.events', events_table)

    # 5. Compute completeness
    required = ['project.name', 'project.type', 'landscape.vertical']
    important = [
        'requirements.delivery_mode', 'requirements.topology',
        'requirements.latency_tier', 'goals.driver', 'goals.timeline',
    ]

    def _get_nested(d, key):
        parts = key.split('.')
        for p in parts:
            if isinstance(d, dict) and p in d:
                d = d[p]
            else:
                return None
        return d

    populated = 0
    empty = 0
    for tag_key, dotted_path in FIELD_MAP.items():
        val = _get_nested(intake, dotted_path)
        if val is not None:
            populated += 1
        else:
            empty += 1

    missing_required = [k for k in required if _get_nested(intake, k) is None]
    missing_important = [k for k in important if _get_nested(intake, k) is None]

    has_systems = bool(systems_table and len(systems_table) > 0)
    if not has_systems:
        missing_required.append('landscape.systems (at least 1)')

    intake['_meta'] = {
        'source_file': os.path.basename(filepath),
        'parsed_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'fields_populated': populated,
        'fields_empty': empty,
        'missing_required': missing_required,
        'missing_important': missing_important,
        'ready': len(missing_required) == 0,
    }

    return intake


def _clean_for_output(d):
    """Remove None values recursively for cleaner output."""
    if isinstance(d, dict):
        return {k: _clean_for_output(v) for k, v in d.items() if v is not None}
    elif isinstance(d, list):
        return [_clean_for_output(i) for i in d if i is not None]
    return d


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 parse-intake-docx.py <intake.docx> [output.yaml]")
        sys.exit(1)

    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        print(f"ERROR: File not found: {filepath}")
        sys.exit(1)

    intake = parse_intake_docx(filepath)
    cleaned = _clean_for_output(intake)

    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    if HAS_YAML:
        output = yaml.dump(cleaned, default_flow_style=False, sort_keys=False, allow_unicode=True)
    else:
        output = json.dumps(cleaned, indent=2, ensure_ascii=False)

    if output_path:
        output_dir = os.path.dirname(os.path.abspath(output_path))
        if not os.path.isdir(output_dir):
            print(f"ERROR: Output directory does not exist: {output_dir}")
            sys.exit(1)
        with open(output_path, 'w') as f:
            f.write(output)
        print(f"Parsed intake written to: {output_path}")
    else:
        print(output)

    meta = intake.get('_meta', {})
    print(f"\n--- Completeness ---")
    print(f"Fields populated: {meta.get('fields_populated', 0)}")
    print(f"Fields empty:     {meta.get('fields_empty', 0)}")
    if meta.get('missing_required'):
        print(f"Missing REQUIRED: {', '.join(meta['missing_required'])}")
    if meta.get('missing_important'):
        print(f"Missing IMPORTANT: {', '.join(meta['missing_important'])}")
    print(f"Ready for plan:   {'YES' if meta.get('ready') else 'NO — fill required fields first'}")


if __name__ == '__main__':
    main()
