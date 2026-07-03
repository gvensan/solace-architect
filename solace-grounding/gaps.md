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

### Platform Services (Layer 3) — highest impact

- **Solace Cloud Console:** Not referenced in any skill template. No guidance on Console-based provisioning, management workflows, or team/role configuration.
  - Skill: none
  - Workaround: None
  - Priority: Medium
  - Date: 2026-05-03

- **Event Mesh Visualizer:** Not mentioned anywhere in grounding docs or skills.
  - Skill: none
  - Workaround: None
  - Priority: Low
  - Date: 2026-05-03

### Application Services (Layer 2)

- **Kafka Connect (PubSub+ Connector) configuration:** Listed in Integration Hub catalog but no specific configuration guidance for Source/Sink connectors.
  - Skill: /solace-integration, /solace-migration
  - Workaround: Generic MI guidance applied
  - Priority: Medium
  - Date: 2026-05-03

### Event Mesh (Layer 1)

- **Topic Endpoints:** No guidance on when to use topic endpoints vs. queues. Platform reference defines them but no skill recommends or designs them.
  - Skill: /solace-topic-design
  - Workaround: All durable subscriptions default to queues
  - Priority: Medium
  - Date: 2026-05-03

- **Transactions (XA, local):** Platform reference now documents transaction types. No skill asks about transactional requirements or designs transaction boundaries.
  - Skill: /solace-discovery, /solace-architect-review
  - Workaround: Grounding available; skill extension needed (Phase 5)
  - Priority: Medium
  - Date: 2026-05-03

- **Queue configuration parameters:** No per-queue sizing recommendations — max spool, max redelivery, max TTL, reject-on-max-spool, partition count. Broker provisioning artifact is generic.
  - Skill: /solace-blueprint
  - Workaround: Default values assumed
  - Priority: Medium
  - Date: 2026-05-03

- **Priority messaging:** Platform reference now documents message priority (0-9). No skill asks about or designs priority-based message flows.
  - Skill: /solace-topic-design, /solace-protocol-select
  - Workaround: Grounding available; skill extension needed (Phase 5)
  - Priority: Low
  - Date: 2026-05-03

- **Message VPN Bridges:** Platform reference now documents bridge topology. No skill designs bridge topology between VPNs.
  - Skill: /solace-mesh-design
  - Workaround: Grounding available; skill extension needed (Phase 5)
  - Priority: Low
  - Date: 2026-05-03

- **Distributed Tracing / OpenTelemetry strategy:** Checklist item only — no tracing design. Which spans to capture, which backends to forward to, OpenTelemetry Collector with Solace receiver, context propagation patterns.
  - Skill: /solace-ops-review
  - Workaround: "Is Distributed Tracing configured?" question
  - Priority: Medium
  - Date: 2026-05-03

### Security

- **Kerberos, LDAP, RADIUS authentication:** Platform reference documents all three. No skill asks about enterprise identity provider integration or recommends configuration.
  - Skill: /solace-security-review
  - Workaround: OAuth and client certificate auth covered; enterprise IdP patterns missing
  - Priority: Medium
  - Phase: 4 (extend /solace-security-review)
  - Date: 2026-05-03

- **Rate limiting / Connection limits:** Platform reference mentions per-VPN quotas and client profile rate limits. No skill designs rate limiting strategy.
  - Skill: /solace-security-review, /solace-ops-review
  - Workaround: None
  - Priority: Medium
  - Phase: 4 (extend /solace-security-review)
  - Date: 2026-05-03

- **Client profile configuration:** Mentioned in security review but no skill generates specific client profile configs (max connections, max subscriptions, rate limits, guaranteed messaging properties).
  - Skill: /solace-security-review, /solace-blueprint
  - Workaround: Generic "per-client profile" recommendation
  - Priority: Medium
  - Phase: 4 (extend /solace-security-review)
  - Date: 2026-05-03

### Operational

- **Backup / restore:** Not addressed by any skill. No mention of broker configuration backup, spool backup, or disaster recovery procedures beyond replication.
  - Skill: /solace-ha-dr, /solace-ops-review
  - Workaround: DR replication covers data loss; configuration backup is missing
  - Priority: Medium
  - Date: 2026-05-03

- **Network architecture:** No skill addresses load balancer configuration, DNS failover, firewall rules for broker ports, or NAT traversal for DMR links.
  - Skill: /solace-mesh-design, /solace-ha-dr
  - Workaround: None
  - Priority: Medium
  - Date: 2026-05-03

- **Kubernetes Operator:** Platform reference expanded with Operator details, Helm chart config, and canonical URLs. No skill references the Operator for deployment design.
  - Skill: /solace-broker-select
  - Workaround: Grounding available; skill extension needed (Phase 3)
  - Priority: Medium
  - Date: 2026-05-03

- **Upgrade / patching procedures:** Asked about but no specific Solace upgrade path guidance (rolling upgrades, version compatibility, K8s Operator upgrade flows).
  - Skill: /solace-ops-review
  - Workaround: Generic "how are upgrades performed?" question
  - Priority: Medium
  - Date: 2026-05-03

### Integration Patterns

- **Request-reply topology:** Platform reference now documents request-reply patterns. No skill designs reply-to topics, temporary topics, correlation IDs, timeout handling.
  - Skill: /solace-protocol-select, /solace-topic-design
  - Workaround: Grounding available; skill extension needed (Phase 5)
  - Priority: Medium
  - Date: 2026-05-03

- **Event sourcing / CQRS:** Platform reference now documents event sourcing and CQRS patterns. No skill asks about or designs these patterns.
  - Skill: /solace-discovery, /solace-topic-design
  - Workaround: Grounding available; skill extension needed (Phase 5)
  - Priority: Low
  - Date: 2026-05-03

- **Saga / Choreography patterns:** Platform reference now documents saga and choreography patterns. No skill designs distributed transaction patterns using Solace topics and Guaranteed messaging.
  - Skill: /solace-discovery, /solace-integration
  - Workaround: Grounding available; skill extension needed (Phase 5)
  - Priority: Low
  - Date: 2026-05-03

## Resolved gaps

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
