# Solace Antipattern Library

Extracted from reference architectures and Solace documentation. Every validation
skill and technical domain skill should check output against these patterns.

## Topic design antipatterns

### Environment names in topics
**What's wrong:** Encoding `dev`, `qa`, `prod` in topic strings (e.g., `prod/orders/created/v1`).
**What to do instead:** Use environment-separated brokers, message VPNs, or namespaces.
**Source:** Topic Architecture Best Practices (`docs.solace.com/Messaging/Topic-Architecture-Best-Practices.htm`), Pattern 1 antipatterns.

### Encoding tracing or audit IDs in topics
**What's wrong:** Putting correlation IDs, trace IDs, or audit trail identifiers in topic strings.
**What to do instead:** Use message properties or Distributed Tracing. Topics are routing instruments, not metadata carriers.
**Source:** Topic Architecture Best Practices, Pattern 2 antipatterns.

### Overly broad wildcard subscriptions across DMR
**What's wrong:** Subscribing to `marketdata/>` or similar broad wildcards when connected via DMR external links. Subscriptions propagate across links, pulling all matching data across the WAN.
**What to do instead:** Use fine-grained subscriptions that filter by instrument, asset class, or region. Each wildcard is a real bandwidth cost across DMR external links.
**Source:** Pattern 2 key design decisions (subscription hygiene).

### Plant/line/machine ID in topic root instead of properties
**What's wrong:** Structuring topics as `plant01/line03/machine07/temperature/read/v1` instead of using the recommended taxonomy.
**What to do instead:** Topic root should be `Domain/Noun/Verb/Version`. Plant, line, and machine are properties ordered least-specific to most-specific: `manufacturing/temperature/read/v1/plant01/line03/machine07`.
**Source:** Topic Architecture Best Practices, Pattern 3 antipatterns.

## SAM antipatterns

### Agents skipping the orchestrator
**What's wrong:** Domain agents calling each other directly without OrchestratorAgent awareness for cross-domain tasks.
**What to do instead:** Use peer delegation through `PeerAgentTool`, which the OrchestratorAgent tracks. Direct agent-to-agent calls defeat workflow management and observability.
**Source:** Pattern 1 antipatterns.

### Hardcoded backend credentials in agent YAML
**What's wrong:** Embedding database passwords, API keys, or service account credentials directly in SAM agent configuration files.
**What to do instead:** Use the AuthorizationService and Micro-Integration credential management. Agent YAML should be safe to store in version control.
**Source:** Pattern 1 antipatterns.

### Environment names in SAM namespace
**What's wrong:** Using `{namespace}` values like `prod-banking` or `dev-assistant` that encode the deployment environment.
**What to do instead:** Use environment-separated deployments. The namespace identifies the logical domain, not the environment.
**Source:** Pattern 1 antipatterns.

### Synchronous request/response thinking for agent calls
**What's wrong:** Treating SAM agent invocations as blocking RPC calls. Designing architectures that assume synchronous responses from agents.
**What to do instead:** SAM is asynchronous and event-driven by design. Design for eventual responses, status updates, and failure handling that doesn't block the caller.
**Source:** Pattern 1 antipatterns.

### Custom gateway when a standard one fits
**What's wrong:** Building a custom Gateway implementation when an existing Gateway type (HTTP SSE, REST, Slack, Teams) covers the channel.
**What to do instead:** Use the framework's built-in Gateways. Custom Gateways are appropriate only when the channel itself is novel, not for small protocol variations.
**Source:** Pattern 1 antipatterns.

## Mesh topology antipatterns

### Single global broker for the whole enterprise
**What's wrong:** Running one broker instance for all applications, sites, and environments.
**What to do instead:** Federate with DMR. Place brokers at scaling boundaries (per site, per region, per business domain). Single-broker topologies don't survive WAN partitions and concentrate risk.
**Source:** Pattern 3 antipatterns.

### Plant-floor systems calling cloud APIs synchronously
**What's wrong:** OT systems making direct synchronous REST/gRPC calls to cloud services for control or data submission.
**What to do instead:** Decouple via the event mesh. Publish events to the local edge broker. The mesh handles WAN transport, buffering during disconnection, and retry.
**Source:** Pattern 3 antipatterns.

### Treating the cloud apex as system of record for plant data
**What's wrong:** Designing the cloud as the authoritative source for plant-floor events.
**What to do instead:** The plant floor is the system of record for plant events. The cloud is a derived view. Architectures that invert this lose data when cloud connectivity drops and fail audits.
**Source:** Pattern 3 antipatterns.

### Symmetric high-volume bidirectional flows over DMR external links
**What's wrong:** Designing symmetric high-volume bidirectional flows with Guaranteed messaging over DMR external links without explicit per-direction traffic class design.
**What to do instead:** Make each direction's traffic class explicit. Asymmetric flows (e.g., US-to-Europe market data, Europe-to-US order routing) are the norm. Symmetric high-volume bidirectional is a design smell that warrants review of whether each direction truly requires external-link transport.
**Source:** Pattern 2 antipatterns.

## Delivery mode antipatterns

### Mixing Direct and Guaranteed on the same critical path
**What's wrong:** A subscriber bound to a queue (Guaranteed messaging) downstream of a Direct messaging publisher, expecting persistence.
**What to do instead:** Each leg's delivery mode must be designed explicitly. A queue subscription does not retroactively add persistence to an upstream Direct publisher. Design the full path: if the consumer needs Guaranteed, the publisher must also use Guaranteed on that topic.
**Source:** Pattern 2 antipatterns.

### Treating the mesh as request/response for fan-out data
**What's wrong:** Designing per-subscriber heartbeats, acknowledgments, or round trips for high-volume fan-out data like market data or telemetry.
**What to do instead:** Fan-out data is one-to-many by nature. Use Direct messaging with topic-based subscriptions. Per-subscriber interactions collapse under volume.
**Source:** Pattern 2 antipatterns.

## General integration antipatterns

### Bidirectional Kafka bridge on the same topic
**What's wrong:** Bridging events from Solace to Kafka and from Kafka back to Solace on the same topic or subject.
**What to do instead:** Pick one direction of authority per topic. Bidirectional bridging without explicit loop-prevention design produces infinite message loops.
**Source:** Pattern 3 antipatterns.

### Custom client library when a Solace API exists
**What's wrong:** Building a custom messaging client library when Solace publishes an API for that language (11 supported language APIs).
**What to do instead:** Use the published Solace API. The official APIs are tested at the volumes enterprise deployments demand. Custom clients introduce risk that compounds at scale.
**Source:** Pattern 2 antipatterns.

### Skipping Schema Registry for "simple" OT data
**What's wrong:** Assuming sensor/telemetry data is too simple to need schema management.
**What to do instead:** OT data evolves as sensors are added, replaced, or recalibrated. Without versioning discipline in Solace Schema Registry, downstream consumers break silently when event shapes change.
**Source:** Pattern 3 antipatterns.

### Deploying SAM without the event mesh foundation
**What's wrong:** Starting with SAM agents before establishing the underlying event mesh topology, topic taxonomy, and broker infrastructure.
**What to do instead:** The event mesh is the foundation. SAM is an extension. Build the mesh first, validate connectivity and delivery modes, then add the agent layer on top.
**Source:** Pattern 3 key design decisions (where SAM enters).
