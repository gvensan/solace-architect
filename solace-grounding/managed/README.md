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

The reference SAM implementation had a hosted admin console: URL ingestion (SSRF-guarded), a
review/approve workflow, per-reference audit history, and admin-gated API routes. This minimal
version omits it **because hand-editing `digest.md` already works** — the console is convenience,
not a requirement.

It is not omitted for lack of a server. The toolkit already runs local HTTP servers
(`scripts/dashboard.ts`, `scripts/intake-server.ts`, both `Bun.serve`), and an admin page for
managed grounding would be a third one in that family — the server, the URL fetch, and the SSRF
guard all port cleanly. What genuinely does *not* map is the reference's **multi-user auth layer**:
admin-vs-non-admin gating and review-before-active approval only make sense with multiple users
and authentication, whereas these servers are single-user and local, where those concepts are moot.

If a non-technical maintainer ever needs the UI, the v1 is small: a `scripts/grounding-admin.ts`
server plus a static page with add (paste/URL) and enable/disable, writing to this directory. The
approval workflow and audit history are the expensive extras and can stay dropped. Tracked as an
optional future enhancement.
