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

**Option A — admin console (recommended).** Run:

```bash
bun run grounding
```

This opens a local web console (`scripts/grounding-admin.ts`, port 3002) where you add a
reference by pasting text or fetching a URL, and enable/disable/remove entries. It keeps a
structured `manifest.json` (the source of truth, gitignored — it holds *your* org's material)
and regenerates `digest.md` from the active entries. The console also shows the vendored
**platform grounding** docs read-only (with a View link), so you can see the full grounding
picture in one place — your org references applied on top of the authoritative Solace docs. URL fetches are **SSRF-guarded** (public
hosts only; private/loopback/link-local/cloud-metadata addresses are refused) and HTML-stripped.
The digest is capped at 16 KB (oldest-first when over budget).

**Option B — edit `digest.md` by hand.** If you're not using the console:

1. Add a `## <Title>` section. Paste the text, or summarize a URL and record `Source:` + fetch date.
2. Delete the `_No managed references configured._` line once the first reference is in.
3. Keep the whole file under ~16 KB — it loads into all ~25 skills, so size multiplies. Summarize
   long documents rather than pasting them wholesale.

Pick one mode: the console overwrites `digest.md` from `manifest.json`, so it will replace hand
edits (it backs up a hand-written `digest.md` to `digest.md.bak` the first time it takes over).

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

The console (`bun run grounding`) covers add (paste/URL), enable/disable/remove, the SSRF-guarded
fetch, and the 16 KB digest cap. It intentionally omits the parts of the reference SAM
implementation that only make sense as a **multi-user hosted app**: admin-vs-non-admin route
gating, a review-before-active approval workflow, and per-reference audit history. These servers
are single-user and local (like the dashboard and intake servers), so authentication and approval
have nothing to gate. If this ever moves to a shared/hosted deployment, that's when the auth layer
would be worth adding.
