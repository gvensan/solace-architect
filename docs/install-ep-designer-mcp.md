# Installing the Solace Event Portal Designer MCP

The Solace Event Portal Designer MCP is the bridge between Claude Code (or any other MCP host) and the Solace Cloud Event Portal Designer REST API. The `/solace-ep-provision` skill uses this MCP to create application domains, schemas, events, and applications in a live Solace Cloud tenant.

This guide covers installation, configuration, verification, troubleshooting, and security practices. The MCP is currently **Early Access** — intended for use with AI assistants in a controlled environment with human oversight, not for unattended automation.

Reference: https://github.com/SolaceLabs/solace-platform-mcp/tree/main/solace-event-portal-designer-mcp

---

## Prerequisites

| Item | Purpose | How to verify |
|------|---------|---------------|
| `uv` / `uvx` | Python tool runner that fetches and runs the MCP package | `uvx --version` |
| Solace Cloud account | Hosts the Event Portal tenant the MCP will write to | Log in at https://console.solace.cloud |
| Solace Cloud API token | Authorizes the MCP's REST calls | Generate in step 1 below |
| Claude Code (or another MCP host) | Loads and invokes the MCP | `claude --version` |

Install `uv` if missing:

```bash
# macOS / Linux
brew install uv

# or with pip
pip install uv
```

---

## Step 1: Generate a Solace Cloud API token

1. Open **Solace Cloud Console** → **Account** → **Token Management**.
2. Click **Create Token**.
3. Name it something traceable, e.g. `claude-ep-designer-<your-handle>`.
4. **Permissions required:**
   - `Event Portal > Designer > Read`
   - `Event Portal > Designer > Write`
5. Set an expiration appropriate for your environment (90 days is reasonable for development).
6. Copy the token immediately. Solace does not show it again.

**Token hygiene:**
- Treat the token like a password. Never paste it into chat, screenshots, or shared docs.
- Use a secret manager (1Password, macOS Keychain, AWS Secrets Manager, etc.) rather than a plain file when possible.
- Rotate immediately if the token is ever exposed in logs, terminals, or transcripts.

---

## Step 2: Choose a config scope

Claude Code reads MCP configuration from three places, in order of specificity:

| Scope | File | Applies to |
|-------|------|------------|
| Project | `<repo>/.claude/mcp.json` | Sessions launched inside this directory |
| User | `~/.claude/mcp.json` | All sessions for this user |
| CLI-registered | Managed via `claude mcp add ...` | All sessions, persisted |

**Recommendation:** Use the **user** scope (`~/.claude/mcp.json`) for the EP Designer MCP. Reasons:
- The token is per-user, not per-repo.
- Project-scoped config files have a higher risk of being accidentally committed.
- The MCP is useful across multiple Solace Architect projects.

If you must use the project scope, ensure `.claude/mcp.json` is in `.gitignore`:

```bash
echo '.claude/mcp.json' >> .gitignore
git status .gitignore
```

---

## Step 3: Add the MCP configuration

### Option A — User scope (recommended)

Edit `~/.claude/mcp.json`. If it doesn't exist, create it:

```json
{
  "mcpServers": {
    "solace-event-portal-designer": {
      "command": "uvx",
      "args": [
        "--from",
        "solace-event-portal-designer-mcp",
        "solace-ep-designer-mcp"
      ],
      "env": {
        "SOLACE_API_TOKEN": "<paste-your-token-here>",
        "SOLACE_API_BASE_URL": "https://api.solace.cloud"
      }
    }
  }
}
```

`SOLACE_API_BASE_URL` is only required for non-US tenants. Pick the URL that matches your Solace Cloud region:

| Region | Base URL |
|--------|----------|
| US (default) | `https://api.solace.cloud` |
| EU | `https://api.solace.cloud/eu` |
| AU | `https://api.solace.cloud/au` |
| SG | `https://api.solace.cloud/sg` |

If your tenant is on the US region, you can omit `SOLACE_API_BASE_URL` entirely — the MCP defaults to it.

If `~/.claude/mcp.json` already has other MCP servers, merge the `solace-event-portal-designer` entry into the existing `mcpServers` object. Do not overwrite the file.

### Option B — Project scope

Same JSON shape, place the file at `<repo>/.claude/mcp.json`. Then immediately:

```bash
echo '.claude/mcp.json' >> .gitignore
git add .gitignore
git commit -m "Ignore .claude/mcp.json (contains MCP credentials)"
```

### Option C — CLI-registered

```bash
claude mcp add solace-event-portal-designer \
  --command uvx \
  --args "--from solace-event-portal-designer-mcp solace-ep-designer-mcp"
```

Then set the env vars via Claude Code's MCP environment management. The exact mechanism depends on your Claude Code version — check `claude mcp --help` for the supported flags.

---

## Step 4: Verify the package installs

Before relying on Claude Code to launch the MCP, confirm `uvx` can fetch and run it from a normal terminal:

```bash
uvx --from solace-event-portal-designer-mcp solace-ep-designer-mcp --help
```

Expected outcome: a help message (or at minimum, no `package not found` error). The first run may take 10-30 seconds while `uvx` downloads dependencies into its cache.

**If you get `package not found` or a similar error:**

The PyPI package name may differ. Check the Solace Labs repo for the current install path:

```bash
git clone https://github.com/SolaceLabs/solace-platform-mcp.git
cd solace-platform-mcp/solace-event-portal-designer-mcp
cat README.md | grep -A5 "install\|pypi"
```

If the package is not yet on PyPI, install from the local clone:

```bash
uvx --from /absolute/path/to/solace-platform-mcp/solace-event-portal-designer-mcp solace-ep-designer-mcp --help
```

Then adjust the `args` in your `mcp.json` to point at the local path instead of the PyPI name.

---

## Step 5: Restart Claude Code

**This is the step that is easy to miss.** Claude Code loads its MCP catalog **at session startup**, not on demand. Adding `mcp.json` mid-session does not register the MCP with the running process.

1. **Quit** Claude Code entirely (not just close the chat — exit the application or kill the process).
2. **Relaunch** Claude Code from a fresh terminal in your project directory.
3. The MCP is loaded during startup. You should see no error messages related to `solace-event-portal-designer`.

---

## Step 6: Verify Claude Code sees the MCP

In a fresh terminal:

```bash
claude mcp list
```

Expected output should include `solace-event-portal-designer` alongside any other MCPs you have configured. Example:

```
solace-event-portal-designer: uvx --from solace-event-portal-designer-mcp solace-ep-designer-mcp - ✓ Connected
claude.ai Gmail: https://gmailmcp.googleapis.com/mcp/v1 - ! Needs authentication
```

If you see `! Needs authentication` for the Solace MCP, the token is wrong or the API base URL doesn't match the tenant.

If you don't see `solace-event-portal-designer` at all:
- Confirm `mcp.json` is at the right path for the scope you chose.
- Confirm JSON validity: `cat ~/.claude/mcp.json | python3 -m json.tool`
- Confirm `uvx` is on PATH for the user running Claude Code: `which uvx`

---

## Step 7: Verify inside a Claude Code session

Once `claude mcp list` shows the MCP as connected, launch a new Claude session. The MCP's tools should be available — they typically appear with names like `mcp__solace-event-portal-designer__list_application_domains`, etc.

The fastest way to verify from inside a Claude session is to invoke the `/solace-ep-provision` skill. Its **Step 1** runs a read-only `list-application-domains` call which surfaces any issue with token, region, or MCP registration without writing anything to your tenant.

If you have a project ready to provision, run:

```
/solace-ep-provision
```

The skill's first action will be the verification call. Success means proceed to provisioning. Any failure surfaces a structured error you can fix.

---

## Troubleshooting

### "Tool not found" inside Claude Code

The MCP isn't registered. Recheck:
1. The file path matches the scope you chose.
2. The JSON is valid.
3. Claude Code was fully restarted after the file was added.
4. `claude mcp list` shows the MCP.

### "Authentication failed" / 401 / 403

The token is missing, expired, wrong scope, or for the wrong tenant.
1. Confirm the env var is set in `mcp.json`.
2. Recreate the token in Solace Cloud Console with `Event Portal > Designer > Read+Write`.
3. Update `mcp.json` with the new token.
4. Restart Claude Code.

### "Region error" / 404 on list calls

The `SOLACE_API_BASE_URL` doesn't match your tenant's region. Verify the region in Solace Cloud Console (top-right corner of the console shows the region). Update `SOLACE_API_BASE_URL` and restart Claude Code.

### `uvx: command not found`

`uv` is not installed or not on the PATH that Claude Code sees. Install with `brew install uv` (macOS), `curl -LsSf https://astral.sh/uv/install.sh | sh` (Linux), or `pip install uv`. Then restart your terminal and Claude Code.

### MCP starts but immediately exits / "broken pipe"

Likely an MCP package version mismatch with the Python version `uvx` chose. Try pinning a Python version:

```json
"args": [
  "--python", "3.11",
  "--from", "solace-event-portal-designer-mcp",
  "solace-ep-designer-mcp"
]
```

### Multiple Claude Code installations

If you have `claude` on `$PATH` from a Homebrew install AND a `~/.local/bin/claude` from a script-based install, they may have different config search paths. Run `which claude` and ensure you're configuring the one that actually runs your sessions.

---

## Security checklist

Before committing or sharing anything:

- [ ] `~/.claude/mcp.json` is NOT in any git repo.
- [ ] `.claude/mcp.json` (project-scoped) is in `.gitignore`.
- [ ] The token has the minimum required scope (`Event Portal > Designer > Read+Write` only — not full Solace Cloud admin).
- [ ] The token has an expiration date set (90 days max for dev tokens).
- [ ] Token rotation reminder is on the calendar for the expiration date.
- [ ] No screenshot, transcript, or chat log has the token visible.
- [ ] `git log --all -S 'SOLACE_API_TOKEN'` returns nothing.

If you ever expose the token (in chat, in a log, in a screenshot):
1. Go to Solace Cloud Console → Account → Token Management.
2. Revoke the token immediately.
3. Generate a new one.
4. Update `mcp.json`.
5. Restart Claude Code.

---

## What the MCP can and cannot do

**Can do (via Event Portal Designer REST API):**
- List, get, create, update application domains, schemas, events, and applications.
- Manage versions for schemas, events, and applications.
- Export AsyncAPI documents per application version.
- Apply tags to event versions.

**Cannot do (these require Solace Cloud Console UI or a different API):**
- Configure runtime broker connections (done through Console UI).
- Manage Event Portal environments themselves (Console UI).
- Manage tenant-level governance roles and permissions.
- Provision actual event broker services or VPNs.

**Architectural inference, not from Solace docs — verify the exact MCP tool inventory against the Solace Labs repo before relying on a specific capability.**

---

## Removing the MCP

If you want to uninstall:

1. Remove the `solace-event-portal-designer` entry from `mcp.json` (or remove the whole file if it has no other entries).
2. Revoke the API token in Solace Cloud Console.
3. Restart Claude Code.
4. Optional: clean up the `uvx` cache for the package:
   ```bash
   uv cache clean solace-event-portal-designer-mcp
   ```

---

## Where this fits in the Solace Architect workflow

The MCP is only used by one skill: `/solace-ep-provision`. The full workflow looks like:

```
/solace-intake or /solace-discovery
  → /solace-topic-design
    → /solace-broker-select, /solace-protocol-select, /solace-integration
      → /solace-event-portal         [paper design]
        → /solace-ep-provision       [uses this MCP to write the design to Solace Cloud]
          → reviews + validate + blueprint + executive
```

The skill is gated by `decisions.yaml`'s `provision_event_portal: true` flag set at intake. If the gate is off, `/solace-plan` does not include the provisioning step at all — the engagement is design-only.

If the gate is on but the MCP isn't loaded, `/solace-ep-provision` records a BLOCKED status with the exact reason and stops without touching your tenant. You can resolve the MCP, restart Claude Code, and re-run the skill — the design artifacts from `/solace-event-portal` are preserved.
