# Grounding Document Gaps

When a skill can't find what it needs in the grounding documents, record the gap here. This helps prioritize grounding document updates.

Format:
```
- **Topic:** What was needed
  - Skill: /skill-name
  - Workaround: What the skill did instead
  - Date: YYYY-MM-DD
```

---

## Known gaps

> Wave-4 status (2026-07-03): the remaining gaps need grounding fetched into the platform
> reference before a skill can consume them. **Backup / restore** — the canonical docs.solace.com
> URL wasn't resolvable in a quick pass (needs a maintainer to grab it from docs search).
> **Kafka Connect connectors** — config lives on github.com/SolaceProducts, outside the grounding
> allowlist (a maintainer decision on whether to widen the allowlist). **Network architecture** —
> the ports/firewall portion is now grounded; only LB / DNS-failover / NAT-for-DMR remain, and
> those are deployment-environment specifics. Left open deliberately rather than fabricated.

### Platform Services (Layer 3) — highest impact

<!-- Resolved 2026-07-03 (Wave 4): "Event Mesh Visualizer" is not a standalone doc topic —
     topology visualization is delivered through Event Portal (Designer / Runtime Event Manager
     graph) and Solace Insights, both already grounded and skill-covered. No separate grounding
     needed. Moved to Resolved. -->

### Application Services (Layer 2)

- **Kafka Connect (PubSub+ Connector) configuration:** Listed in Integration Hub catalog but no specific configuration guidance for Source/Sink connectors.
  - Skill: /solace-integration, /solace-migration
  - Workaround: Generic MI guidance applied
  - Priority: Medium
  - Date: 2026-05-03

### Operational

- **Backup / restore:** Not addressed by any skill. No mention of broker configuration backup, spool backup, or disaster recovery procedures beyond replication.
  - Skill: /solace-ha-dr, /solace-ops-review
  - Workaround: DR replication covers data loss; configuration backup is missing
  - Priority: Medium
  - Date: 2026-05-03

- **Network architecture (partial):** Firewall rules for broker ports are now grounded (platform reference "Default ports and firewall" + canonical URL) and /solace-mesh-design references them for external links. Still open: load-balancer configuration, DNS failover, and NAT traversal for DMR links — these are deployment-environment specifics needing the customer's network context or dedicated Solace networking docs.
  - Skill: /solace-mesh-design, /solace-ha-dr
  - Workaround: Ports/firewall grounded; LB/DNS/NAT stated as requirements, deferred to the network team
  - Priority: Low (was Medium — ports portion closed)
  - Date: 2026-05-03 (updated 2026-07-03)

## Resolved gaps
- **~~Event Mesh Visualizer~~:** Not a standalone grounding topic — topology visualization is delivered through Event Portal (Designer / Runtime Event Manager graph) and Solace Insights, both already grounded and skill-covered. No separate work needed.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 4 — reclassified as covered)

- **~~Network architecture: firewall/ports~~ (partial):** Platform reference gained a "Default ports and firewall" subsection (SW + Appliance default ports, DMR-over-SMF, privileged-port note) with a canonical URL; /solace-mesh-design references it for external-link firewall rules. Remaining LB/DNS-failover/NAT sub-parts stay open as a downgraded Low gap.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 4 — ports portion grounded from docs.solace.com Default-Port-Numbers)

- **~~Upgrade / patching procedures~~:** Platform reference gained an "Upgrade and patching" subsection (redundant/HA upgrade, version-compatibility rules, two-sequential-HA-upgrade caveat for large/old deployments, spool/config preserved, Operator rolling upgrade) with a canonical URL; /solace-ops-review Step 4 now applies it.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 4 — grounded from docs.solace.com SW-Broker-Upgrade)
- **~~Topic Endpoints~~:** /solace-topic-design Step 3 now chooses queue vs topic endpoint per Guaranteed consumer (queue default; topic endpoint only for the single-subscription case).
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3)

- **~~Priority messaging~~:** /solace-topic-design assigns priority (0-9, default 4) as a flow property for fast-lane cases; /solace-protocol-select confirms protocol/SDK support and that priority is queue-scoped.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3)

- **~~Request-reply topology~~:** /solace-topic-design and /solace-protocol-select now lay out reply-to (temporary) topics + correlation IDs in message properties (not in the topic), REST native support, client-side timeout handling.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3)

- **~~Event sourcing / CQRS~~ and ~~Saga / Choreography~~:** /solace-discovery elicits the pattern signals; /solace-topic-design lays out the topic namespaces (CQRS command vs query; saga compensating-event topics + DMQ) per the Integration patterns grounding.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3)

- **~~Transactions (XA, local)~~:** /solace-discovery now probes atomic multi-message / XA requirements and carries the signal into the brief for downstream design.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3)

- **~~Message VPN Bridges~~:** /solace-mesh-design Step 2 covers bridges vs DMR (bridge only for connecting specific VPNs / older deployments; DMR is the default; don't scale a web of bridges).
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3)

- **~~Kerberos, LDAP, RADIUS authentication~~:** /solace-security-review Step 1 now recommends the matching enterprise-IdP method when the brief names an existing directory/realm, per-VPN.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3)

- **~~Rate limiting / Connection limits~~ and ~~Client profile configuration~~:** /solace-security-review recommends concrete client-profile values (max connections/subscriptions, GM permissions, ingress/egress rates) + per-VPN quotas as the two rate-limiting levers; /solace-blueprint emits per-client-profile provisioning parameters.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3)

- **~~Queue configuration parameters~~:** /solace-blueprint now enumerates per-queue provisioning params (max spool, redelivery, DMQ, TTL, reject-on-discard, partition count) instead of a generic queues line.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3)

- **~~Distributed Tracing / OpenTelemetry strategy~~:** /solace-ops-review Step 1 designs the tracing strategy (OTel Collector + Solace receiver, which flows to trace, production-key and local-transaction caveats).
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3 — collector config specifics still verified at runtime)

- **~~Kubernetes Operator~~ and ~~Solace Cloud Console~~:** /solace-broker-select names the PubSub+ Kubernetes Operator (StatefulSets, Helm, rolling upgrades) for self-managed K8s deployments and the Solace Cloud Console for event broker service management.
  - Resolved: 2026-07-03 (uplift/sam-parity, Wave 3)

- **~~Sizing and capacity planning in skills~~:** /solace-broker-select Step 4 now computes the sizing methodology from the platform reference (connection count, peak rate × size, spool = size × retention × rate, service-class/edition mapping) and writes an explicit `sizing` block; /solace-ops-review Step 3 now produces a capacity baseline table (need vs limit vs headroom vs scaling trigger).
  - Resolved: 2026-07-03 (uplift/sam-parity — skill extensions consuming existing grounding)

- **~~Message VPN design guidance~~:** /solace-broker-select Step 4 now designs the VPN layout: count + rationale (multi-tenancy unit), naming convention, per-VPN quotas, multiple-VPNs-vs-multiple-brokers (no VPN-level failover), and states the single-VPN case explicitly.
  - Resolved: 2026-07-03 (uplift/sam-parity)

- **~~SEMP v2 for infrastructure-as-code~~:** /solace-ops-review Step 4 now requires a config-as-code story: SEMP Config API provisioning from version-controlled definitions in the project's CI/CD tooling, SEMP Monitor API for custom dashboards; absence is an Important finding.
  - Resolved: 2026-07-03 (uplift/sam-parity)

- **~~Performance tuning~~:** /solace-dev-review Step 2 now gives concrete client tuning direction per the platform reference tuning areas (connection pooling/session reuse, consumer prefetch, publisher flow control under backpressure, batching); absence is an Advisory finding.
  - Resolved: 2026-07-03 (uplift/sam-parity)

- **~~Solace Insights monitoring strategy~~:** /solace-ops-review Step 1 now designs the strategy, not just checks presence: dashboard tier, monitor categories to enable (canonical source fetched for the current 50+ list), threshold table tied to the project's sizing, notification routing, and forwarding to the team's observability platform; SEMP Monitor API noted as the self-managed alternative.
  - Resolved: 2026-07-03 (uplift/sam-parity — specific monitor names still come from a runtime canonical fetch)

- **~~Schema Registry design~~:** /solace-dev-review Step 4 now designs the registry setup: artifact/group-ID organization mapped to application domains, validity/compatibility rules per event, schema-governor role, deployment shape (container vs HA Kubernetes/Helm) with Basic/OIDC auth, and SERDES wiring — with a canonical fetch for configuration depth.
  - Resolved: 2026-07-03 (uplift/sam-parity — configuration specifics still verified against docs at runtime)

- **~~SDKPerf~~:** Now referenced by /solace-broker-select (validate throughput/latency baseline before committing an edition) and /solace-ops-review (validate the capacity baseline before production).
  - Resolved: 2026-07-03 (uplift/sam-parity)

- **~~Event Portal integration workflow~~:** New `/solace-event-portal` skill created. 8-step template: application domains, event objects, schema attachments, applications, runtime connections, catalog organization, REST API provisioning. Produces `13-event-portal/` artifacts. All surrounding files updated: dependency map, plan orchestrator, help skill, CLAUDE.md, dashboard, settings, setup script.
  - Resolved: 2026-05-03 (Phase 2)

- **~~Eliding, Solace Cache/CacheInstance, shared subscriptions~~:** Added to platform reference as dedicated sections with descriptions, use cases, and configuration concepts. Canonical URLs added to solace-canonical-sources.md.
  - Resolved: 2026-05-03 (Phase 1)

- **~~Integration patterns (event sourcing, CQRS, saga, fan-out, request-reply)~~:** Added to platform reference as a new "Integration patterns" section with Solace-specific implementation guidance for each pattern.
  - Resolved: 2026-05-03 (Phase 1 — grounding docs; skill extensions pending Phase 5)

- **~~Performance and sizing methodology~~:** Added to platform reference with sizing dimensions, per-service-class limits, spool calculation, and tuning areas. Canonical URLs added for service class limits and SW broker system requirements.
  - Resolved: 2026-05-03 (Phase 1 — grounding docs; skill extensions pending Phase 3)

- **~~Kubernetes Operator expanded~~:** Platform reference expanded with Operator lifecycle, Helm chart configuration, scaling. Canonical URLs added for Operator docs and Helm chart.
  - Resolved: 2026-05-03 (Phase 1 — grounding docs; skill extension pending Phase 3)

- **~~Message VPN Bridges~~:** Added to platform reference with bridge types, use cases, and configuration scope. Canonical URL added.
  - Resolved: 2026-05-03 (Phase 1 — grounding docs; skill extension pending Phase 5)

- **~~Message Priority~~:** Added to platform reference with priority levels (0-9), delivery behavior, and use cases. Canonical URL already present.
  - Resolved: 2026-05-03 (Phase 1 — grounding docs; skill extension pending Phase 5)

- **~~Transactions (XA, local)~~:** Added to platform reference with local and XA transaction types, scope, and limitations. Canonical URL added.
  - Resolved: 2026-05-03 (Phase 1 — grounding docs; skill extension pending Phase 5)

- **~~HA/DR replication deep reference~~:** Added to platform reference. Three-node HA model, Config-Sync, mate links, client reconnection, DMR link types, Guaranteed messaging across DMR.
  - Resolved: 2026-04-30

- **~~Security and authentication deep references~~:** Added to platform reference and canonical sources. OAuth 2.0, Kerberos, LDAP, RADIUS, client certificates, CRL/OCSP, VPN isolation, SEMP security.
  - Resolved: 2026-04-30

- **~~Message VPN architecture~~:** Added to platform reference and canonical sources. Multi-tenancy, isolation, replication scope, DMR participation, per-VPN configuration.
  - Resolved: 2026-04-30

- **~~Partitioned queues, consumer groups, message replay~~:** Added to platform reference and canonical sources. Exclusive/non-exclusive queues, partitioned queues, DMQ configuration, message replay modes.
  - Resolved: 2026-04-30

- **~~REST Delivery Points (RDPs)~~:** Added to platform reference and canonical sources. RDP components, behavior, retry, relationship to Broker Integrated MIs.
  - Resolved: 2026-04-30

- **~~SEMP v2 for monitoring and management~~:** Added to platform reference. Config API, Monitor API, authentication, availability across broker types.
  - Resolved: 2026-04-30

- **~~Google ADK canonical URL~~:** URL present in solace-canonical-sources.md.
  - Resolved: 2026-04-30

- **~~Solace AI Connector (SAC) documentation URL~~:** URL present in solace-canonical-sources.md.
  - Resolved: 2026-04-30

- **~~MCP specification URL~~:** URL present in solace-canonical-sources.md.
  - Resolved: 2026-04-30
