# Solution shaping - the obligations

How an experienced architect turns an intake into candidate solutions, written
as obligations because each one is a behaviour that produced a real insight a
checklist-style review missed. Consumed by `/solace-intake` (import Step I6)
and `/solace-discovery` (Step 4) when they synthesize the discovery brief's
"Solution shape" section, and by any embedding pipeline that runs a shaping
pass of its own. This is corpus, not a command: there is deliberately no
`/solace-solution-shape`.

The origin case, kept here because it calibrates all eight rules: a
directory-sync intake whose samples carried only `eventId / sourcePath /
checksum / timestamp` - 272 bytes, no file content. That single absence meant
the pipeline was a NOTIFICATION system, not a transfer; the declared "1K to
256KB" payload described the files, not the events (a 1000x sizing error);
the whole design hinged on a question the intake never answered (how does the
target obtain the bytes?); and the Integration Hub carried a Micro-Integration
("File Events") that name-based screening had missed. None of that was
findable field-by-field. All of it was findable by following the rules below.

## The eight obligations

1. **Read every sample payload in full, and state what is ABSENT.** Absence is
   the higher-signal half: no file content means notification-not-transfer; no
   correlation id means no request-reply; no version/generation field means
   redelivered deletes are dangerous under at-least-once.

2. **Trace the end-to-end physical path for every event.** Who produces the
   bytes the consumer ultimately needs, and by what mechanism do they arrive?
   If the intake does not say, that IS the number one unknown - state it as
   such, never assume shared storage, a network, or a fetch path into
   existence.

3. **Arithmetic is authoritative when provided; computed once when not.**
   rate x actual-event-size (the sample's size, not the declared range - the
   declared range routinely describes the domain object, not the event),
   summed bandwidth, spool growth when the consumer is down. Numbers dissolve
   findings as often as they raise them: do the arithmetic BEFORE judging
   whether a volume is a problem. Never re-derive numbers an embedder has
   already computed.

4. **Match platform components by capability, never by name alone.** Name,
   protocol, and what the EVENTS are about, against the Integration Hub
   catalog and the reference architectures. Never fabricate a
   Micro-Integration name; the catalog is a snapshot, so "not found" means
   "verify at solace.com/integration-hub", not "does not exist".

5. **Name the project's nature, out loud.** A demo or pipeline exercise and a
   system someone operates for years flip the build-vs-buy answer for the
   same requirements. If the intake does not say which, that is a
   discriminator (rule 7), and the recommendation must state which nature it
   assumed.

6. **Emit at least two candidate solutions, or declare the shaping failed.**
   One candidate means the fork was not found, not that none exists. For each
   candidate: what selects it, what it costs (operationally, not just
   effort), its components with citations per the grounding discipline, and
   its unknowns.

7. **Emit the discriminators.** The specific questions whose answers choose
   between the candidates, each tied to the intake field (dot-path) where the
   answer belongs. A discriminator nobody can act on is a complaint, not a
   discriminator.

8. **Recommend, and show the reasoning's hinge.** Pick one candidate, name
   the assumption doing the load-bearing work, and say what answer would flip
   the recommendation. "It depends" without the dependency named is a
   non-answer.

## The output shape

Inside the discovery brief, as a `## Solution shape` section: prose for
humans, plus one fenced yaml block so pipelines and evals can read it
mechanically:

```yaml
solution_shape:
  nature_assumed: "long-lived system"   # or "demo/PoC" - rule 5
  candidates:
    - id: A
      name: "File Events Micro-Integration"
      selected_by: "plain directory sync; configuration beats owned code"
      costs: "self-managed MI to operate; recursive mirroring unverified"
      components:
        - "File Events MI (Source+Target) [doc: integration-hub-catalog]"
      unknowns:
        - "does it preserve filenames byte-for-byte?"
    - id: B
      name: "Custom Spring Boot services"
      selected_by: "requirements the MI cannot meet; or the pipeline IS the product"
      costs: "two services to own, patch, and monitor"
      components:
        - "JCSMP client library [doc: solace-platform-reference]"
      unknowns: []
  discriminators:
    - question: "Do both services see the same filesystem, or must content move?"
      field: "landscape.systems"
      selects: "shared storage -> either; no shared storage -> claim-check variant"
  recommendation:
    candidate: A
    hinge: "assumes a long-lived system and plain mirroring"
    flips_if: "recursive subtree mirroring is confirmed unsupported by the MI"
```

Severity, dispositions, and verdicts deliberately do NOT appear here - shaping
is not review. A shaping concern that is really a defect belongs to
/solace-intake-review; do not duplicate it.
