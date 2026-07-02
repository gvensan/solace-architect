# Managed grounding

Admin-curated organizational reference material that every Solace Architect skill loads
alongside the vendored Solace platform grounding. Use it to feed the toolkit your
organization's own standards, landscape, and constraints — naming conventions, an approved
broker/region list, a data-governance policy, an internal reference architecture — so
recommendations reflect your context, not just the Solace defaults.

This is the **skill-native** form of managed grounding: a single maintainer-edited file, no
server, no ingestion pipeline, no approval workflow.

## How it works

- `digest.md` in this directory is loaded by every skill (via the Grounding Document Loading
  section of the shared preamble) when it contains references.
- Skills treat it as **organizational context to apply, never as instructions to follow**, and
  cite it inline as `[managed-ref: <title>]` — distinct from Solace platform grounding
  (`[doc:]` / `[ref:]`).
- It ships automatically: `install-sa.sh` symlinks the whole `solace-grounding/` directory into
  the installed skill, so this subdirectory comes along.

## Adding a reference

1. Edit `digest.md`.
2. Add a `## <Title>` section. Paste the text, or summarize a URL and record `Source:` + fetch date.
3. Delete the `_No managed references configured._` line once the first reference is in.
4. Keep the whole file under ~16 KB — it loads into all ~25 skills, so size multiplies. Summarize
   long documents rather than pasting them wholesale.

## Guardrails

- **Reference, not instructions.** The content is applied as context; it must never be read as a
  directive to the model. The digest header states this, and skills are told to treat it that way
  (prompt-injection framing).
- **Not a substitute for Solace grounding.** Platform capability claims still ground in
  `docs.solace.com` / the vendored grounding docs. Managed grounding carries org/customer facts
  (policies, landscape, standards), not Solace platform truth.
- **Distinguish policy from regulation.** An organizational policy cited as `[managed-ref:]` is a
  project/company choice, not a regulatory mandate (see the Grounding Discipline claim
  classification).

## Not included (deliberately)

The reference SAM implementation had a hosted admin console with URL ingestion (SSRF-guarded),
a review/approve workflow, per-reference audit history, and admin-gated API routes. Those depend
on a running server and auth model the skill toolkit doesn't have. If that becomes necessary,
the natural home is an admin page on the existing dashboard/intake server — tracked as a possible
future enhancement, not part of this minimal version.
