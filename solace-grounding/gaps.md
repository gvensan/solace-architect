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

- **HA/DR replication deep reference:** Dedicated HA/DR replication configuration reference not yet fetched into platform reference.
  - Skill: /solace-ha-dr
  - Workaround: Uses DR replication landing page URLs from canonical sources
  - Date: 2026-04-29

- **Security and authentication deep references:** TLS configuration, OAuth integration, RBAC model, certificate management not yet catalogued.
  - Skill: /solace-security-review
  - Workaround: Directs user to search docs.solace.com for specific security topic
  - Date: 2026-04-29

- **Sizing and capacity planning references:** No dedicated sizing guide fetched.
  - Skill: /solace-broker-select, /solace-ops-review
  - Workaround: General guidance from broker landing pages
  - Date: 2026-04-29

- **Google ADK canonical URL:** Not captured during initial build.
  - Skill: /solace-sam-design
  - Workaround: Noted in canonical sources as unfetched
  - Date: 2026-04-29

- **Solace AI Connector (SAC) documentation URL:** Not captured during initial build.
  - Skill: /solace-sam-design
  - Workaround: SAM architecture page references SAC inline
  - Date: 2026-04-29

- **MCP specification URL:** Not captured during initial build.
  - Skill: /solace-sam-design
  - Workaround: Noted in canonical sources as unfetched
  - Date: 2026-04-29
