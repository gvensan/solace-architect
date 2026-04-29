# Grounding Document Maintenance Manifest

This document tracks all external resources that Solace Architect depends on and their refresh cadence. Stale grounding documents produce stale recommendations. Periodic scanning keeps skills aligned with the latest Solace platform changes.

---

## Refresh schedule

| Resource | Location | Refresh cadence | Last checked | What to look for |
|---|---|---|---|---|
| **Integration Hub catalog** | `solace.com/integration-hub/` | Monthly | 2026-04-29 | New Micro-Integrations, renamed entries, retired entries. Update `integration-hub-catalog.md`. |
| **Canonical source URLs** | `solace-canonical-sources.md` | Monthly | 2026-04-29 | 404s, redirects, new docs pages. Run `bun run url:check`. |
| **SAM documentation versions** | `solacelabs.github.io/solace-agent-mesh/` | Monthly | 2026-04-29 | Architecture page version (was v1.19.0), Gateways (v1.19.1), Agents (v1.18.35), OrchestratorAgent (v1.18.29). Version bumps may affect SAM skill content. |
| **SAM project releases** | `github.com/SolaceLabs/solace-agent-mesh/releases` | Monthly | 2026-04-29 | New releases, breaking changes, new components. May affect `/solace-sam-design` recommendations. |
| **Solace Cloud release notes** | `docs.solace.com/Release-Notes/PubSub-Cloud-Release-Notes.htm` | Monthly | 2026-04-29 | New broker features, new Micro-Integrations in Cloud, capacity changes. May affect multiple skills. |
| **Event Portal updates** | `docs.solace.com/Cloud/Event-Portal/event-portal-overview.htm` | Quarterly | 2026-04-29 | New features (AI Design Assistant changes, new object types). Affects `/solace-topic-design`, `/solace-dev-review`. |
| **Solace Schema Registry** | `docs.solace.com/Schema-Registry/schema-registry-overview.htm` | Quarterly | 2026-04-29 | New schema formats, deployment changes. Affects `/solace-dev-review`. |
| **Solace Insights dashboards** | `docs.solace.com/Cloud/Insights/Insights.htm` | Quarterly | 2026-04-29 | New metrics, new dashboard types. Affects `/solace-ops-review`. |
| **Platform reference coverage** | `solace-platform-reference.md` | Quarterly | 2026-04-29 | Known depth gaps: security/auth, HA/DR replication, sizing. Fetch dedicated references as skills mature. |
| **Reference architectures** | `solace-reference-architectures.md` | As needed | 2026-04-29 | New Solace-published reference architectures or case studies. Add as Pattern 4+. |
| **Antipatterns library** | `antipatterns.md` | As needed | 2026-04-29 | New antipatterns discovered during engagements. |
| **Google ADK docs** | `google.github.io/adk-docs/` | Quarterly | 2026-04-29 | Breaking changes, new features. Affects SAM agent design recommendations. |
| **MCP specification** | `modelcontextprotocol.io/` | Quarterly | 2026-04-29 | Protocol changes, new capabilities. Affects SAM tool integration recommendations. |
| **Solace AI Connector (SAC)** | `solacelabs.github.io/solace-ai-connector/` | Monthly | 2026-04-29 | New features, configuration changes. SAC is the SAM runtime. |

---

## How to run a refresh

### Quick check (monthly, ~5 minutes)

```bash
# 1. Check all canonical source URLs for health
bun run url:check

# 2. Check Integration Hub for new entries
# Visit solace.com/integration-hub/ and compare against integration-hub-catalog.md

# 3. Check SAM release page
# Visit github.com/SolaceLabs/solace-agent-mesh/releases

# 4. Check Solace Cloud release notes
# Visit docs.solace.com/Release-Notes/PubSub-Cloud-Release-Notes.htm
```

### Deep refresh (quarterly, ~30 minutes)

1. Run the quick check above.
2. Fetch any new/updated pages from `docs.solace.com` for the known depth gaps in `solace-platform-reference.md` (security, HA/DR, sizing).
3. Check Event Portal, Schema Registry, and Insights docs for feature changes.
4. Review `solace-grounding/gaps.md` for gaps that can now be filled.
5. Update the "Last checked" column in this file.

### After each engagement

1. Record any systems that were not in `integration-hub-catalog.md` but have Micro-Integrations.
2. Record any grounding gaps hit during the engagement in `gaps.md`.
3. Record any new antipatterns discovered in `antipatterns.md`.
4. If feedback reveals a skill improvement pattern, add it to `IMPROVEMENTS.md`.

---

## Signals that trigger an immediate refresh

- Solace announces a major platform release (new broker version, new cloud region)
- SAM releases a new major version
- A skill consistently hits a grounding gap (3+ engagements)
- A user reports that a Micro-Integration recommendation is wrong (renamed, retired, or new)
- Solace documentation restructures URLs (canonical sources will 404)

---

## Version tracking

Track version numbers of key external dependencies so changes are detectable:

| Component | Version | As of |
|---|---|---|
| SAM Architecture docs | v1.19.0 | 2026-04-29 |
| SAM Gateways docs | v1.19.1 | 2026-04-29 |
| SAM Agents docs | v1.18.35 | 2026-04-29 |
| SAM OrchestratorAgent docs | v1.18.29 | 2026-04-29 |
| Solace Architect | 0.1.0 | 2026-04-29 |
