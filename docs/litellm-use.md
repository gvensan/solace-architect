# Using LiteLLM with Solace Architect

How to route Solace Architect's model calls through a LiteLLM proxy — what works, what doesn't, and when to use it.

---

## TL;DR

- **Yes, LiteLLM works with this project.** It's a host-level configuration (Claude Code env vars), not a code change to Solace Architect skills.
- **Best use:** centralized access to Claude models — shared auth, cost tracking, fallback routing, audit logging. The natural fit for enterprise deployments.
- **Avoid:** using LiteLLM to route Solace Architect to OpenAI / Gemini / local models. Translation is lossy for the things this project relies on (prompt caching, strict format adherence, low fabrication propensity). The project already supports OpenAI via the Codex host — use that path instead.
- **Security caveat:** LiteLLM PyPI versions `1.82.7` and `1.82.8` were compromised with credential-stealing malware in late 2025. Pin a known-good version. Avoid hosted third-party LiteLLM services; self-host.

---

## Why the distinction matters

Solace Architect is a toolkit of prompt templates (`SKILL.md` files). Skills don't call the model directly. The **AI coding agent host** (Claude Code, Codex CLI, Cursor, etc.) loads the skill, follows its instructions, and calls whichever model the host is configured to use.

So "use LiteLLM" means "point Claude Code at a LiteLLM proxy instead of api.anthropic.com." Nothing inside this repo changes.

```
┌─────────────────────┐    ┌──────────────┐    ┌─────────────────┐
│ Solace Architect    │ →  │ Claude Code  │ →  │ LiteLLM proxy   │ → Claude / OpenAI / …
│ SKILL.md templates  │    │ (the host)   │    │ (the gateway)   │
└─────────────────────┘    └──────────────┘    └─────────────────┘
                                  ↑
                       env vars configure this hop
```

---

## Setup: Claude through LiteLLM (the recommended path)

### 1. Install LiteLLM (pin the version)

```bash
uv tool install 'litellm[proxy]==1.83.0'   # or any version known-good after the compromised range
```

**Do not** install `litellm[proxy]` unpinned. PyPI versions `1.82.7` and `1.82.8` shipped malware that exfiltrated credentials. Anthropic's docs flag this explicitly.

### 2. Minimum config.yaml

```yaml
model_list:
  - model_name: claude-opus-4-7
    litellm_params:
      model: anthropic/claude-opus-4-7
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: claude-sonnet-4-6
    litellm_params:
      model: anthropic/claude-sonnet-4-6
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: claude-haiku-4-5
    litellm_params:
      model: anthropic/claude-haiku-4-5
      api_key: os.environ/ANTHROPIC_API_KEY

litellm_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
```

### 3. Start the proxy

```bash
litellm --config /path/to/config.yaml
# Listens on http://0.0.0.0:4000 by default
```

### 4. Point Claude Code at it

```bash
export ANTHROPIC_BASE_URL="http://0.0.0.0:4000"
export ANTHROPIC_AUTH_TOKEN="$LITELLM_MASTER_KEY"
```

Then run Claude Code normally:

```bash
claude --model claude-opus-4-7
```

Solace Architect skills work unchanged. Every call to Claude flows through LiteLLM, which forwards to Anthropic and returns the response.

---

## What this buys you for Solace Architect engagements

| Capability | Why it matters for SAs / DAs / consultants |
|---|---|
| Centralized auth | One LiteLLM master key per team. No raw Anthropic keys distributed to engineers or contractors. |
| Cost tracking per team / project | Attribute model spend to a specific customer engagement, pre-sales account, or business unit. |
| Fallback routing | Route Opus → Sonnet → Haiku based on task complexity, or fall back to Bedrock / Vertex on regional outages. |
| Audit logs | Every prompt and response can be logged for compliance. Useful for regulated customer engagements. |
| Rate limits and budgets | Cap monthly spend per user or per team. Prevents runaway costs from a misconfigured loop. |
| Enterprise gateway fit | Many enterprises already proxy LLM traffic. LiteLLM compatibility means Solace Architect drops into those environments without an exception request. |

---

## What translates cleanly, what doesn't

LiteLLM's "unified endpoint" (`/v1/messages`) speaks Anthropic Messages format end-to-end when the upstream is Anthropic. Pass-through is transparent.

| Feature | When upstream is Anthropic (via LiteLLM) | When upstream is non-Anthropic (translated) |
|---|---|---|
| Basic chat, streaming, multi-turn | ✓ Identical to direct API | ✓ Works |
| System prompts | ✓ | ✓ |
| Tool / function calling | ✓ | ⚠ Simple cases work; parallel tool calls, very large tool outputs, interleaved text+tool can hit edge cases |
| Prompt caching (`cache_control`) | ✓ Forwarded to Anthropic intact | ✗ Anthropic-specific; lost or partially emulated |
| Vision / image inputs | ✓ | ⚠ Format differences; verify per model |
| Extended thinking / reasoning | ✓ | ⚠ Not 1:1 across providers |
| `anthropic-beta` headers | ✓ (unified endpoint forwards them) | ✗ Provider-specific betas don't translate |
| 1M-token context (Opus 4.7) | ✓ | ✗ GPT-5 caps ~400K, most others lower |

The unified endpoint is preferred over pass-through endpoints (`/anthropic`, `/bedrock`, `/vertex_ai`) because it supports load balancing, fallbacks, and consistent cost tracking. Anthropic's docs recommend unified.

---

## Why we don't recommend LiteLLM for non-Claude models

Technically possible. Practically lossy for this project.

Solace Architect skills depend on five things that don't translate cleanly when LiteLLM routes Claude Code to GPT / Gemini / local models:

1. **Prompt caching.** The 5-minute Anthropic cache TTL is load-bearing for long engagements. A full `/solace-plan` run loads 13 skill files plus accumulated artifact context — easily 100K+ tokens. Without caching, every turn re-processes the full conversation. Slow and expensive.

2. **Format adherence.** The `D<N>` AskUserQuestion brief format, the forbidden-vocabulary list ("delve, crucial, robust, …"), the "architectural inference, not from Solace docs" labels — these are elaborate format constraints. Claude follows them strictly. GPT-5 and Gemini follow them less rigorously, especially as the prompt context grows.

3. **Context window.** Opus 4.7 supports 1M tokens. A long engagement with multiple completed artifacts can exceed 400K. GPT-5 truncates. Gemini 2.5 Pro fits but the format-adherence problem remains.

4. **Fabrication propensity.** The grounding discipline says "do not invent Solace features." Models differ on how they handle "I don't know." Claude is more conservative; GPT confabulates more confidently on platform-specific details. The grounding rule is the hardest thing to enforce on a different model — and it's the rule the entire toolkit's credibility rests on.

5. **Tool-use semantics.** Claude Code's agent loop is built around Anthropic's tool_use protocol. LiteLLM translates to OpenAI's function-calling format. Most cases work; edge cases (parallel tools, large outputs, interleaved responses) hit translation gaps.

### If you want to run Solace Architect on non-Claude models, use the existing path

The project already supports 10 hosts via multi-host generation:

| Host | Skill root |
|---|---|
| Claude Code (primary) | `.claude/skills/solace-architect/` |
| OpenAI Codex | `.agents/skills/solace-architect/` |
| Factory | `.factory/skills/solace-architect/` |
| Cursor | `.cursor/skills/solace-architect/` |
| (and 6 more) | |

`bun run build` regenerates SKILL.md files adapted for each host. To run on OpenAI models, use **Codex CLI directly** — that's a first-class path with host-specific adaptations. Routing Claude Code → LiteLLM → OpenAI adds a translation layer that the Codex path doesn't need.

---

## Recommendation by use case

| Use case | Recommended path |
|---|---|
| Single engineer, single API key, normal use | Direct Anthropic API. LiteLLM adds no value here. |
| Team of SAs / DAs sharing Claude access | LiteLLM proxy + Claude. Centralized auth, cost tracking, audit. |
| Customer engagement with compliance / audit requirements | LiteLLM proxy + Claude. Logs every prompt and response. |
| Enterprise customer with existing LLM gateway | LiteLLM proxy + Claude. Drop into their gateway. |
| Running Solace Architect on GPT / Gemini | Use Codex / Cursor / appropriate host directly. Not LiteLLM-routed. |
| Air-gapped or local-only deployment | Codex with local model, or a local-model host. LiteLLM-routed local models will struggle with the grounding rules. |

---

## Operational notes

### Pinning LiteLLM versions

The PyPI compromise in `1.82.7` / `1.82.8` was credential-stealing malware. The remediation is documented in [BerriAI/litellm#24518](https://github.com/BerriAI/litellm/issues/24518). Operational hygiene:

- Pin to a version after `1.82.8` that has been audited.
- Track LiteLLM's security advisories (the project ships a security policy).
- Treat the LiteLLM proxy host as a credentials-bearing system: hardened OS, least-privilege network, restricted access.

### Self-host, don't use hosted LiteLLM services

Anthropic's docs explicitly say: "LiteLLM is a third-party proxy service. Anthropic doesn't endorse, maintain, or audit LiteLLM's security or functionality."

Run your own LiteLLM. The proxy sits in the path of every model call; a compromised hosted service sees every prompt (including customer architecture details) and every response.

### Prompt caching verification

When you first set up LiteLLM, run a quick sanity check that caching is preserved:

1. Start a Claude Code session through LiteLLM.
2. Run `/solace-help` twice in a row.
3. Check the LiteLLM logs: the second call should show cache hits on the prefix.

If caching is broken, performance and cost on long engagements will degrade significantly. Investigate before relying on the gateway for production engagements.

### Header forwarding

The LiteLLM unified endpoint forwards `anthropic-beta` and `anthropic-version` headers, which Claude Code uses to enable features. Pass-through endpoints are more permissive. Don't strip these headers in any intermediate proxy.

---

## Sources

- [LLM gateway configuration — Claude Code docs](https://code.claude.com/docs/en/llm-gateway)
- [Claude Code Quickstart — LiteLLM docs](https://docs.litellm.ai/docs/tutorials/claude_responses_api)
- [Anthropic provider — LiteLLM docs](https://docs.litellm.ai/docs/providers/anthropic)
- [Use Claude Code with Non-Anthropic Models — LiteLLM docs](https://docs.litellm.ai/docs/tutorials/claude_non_anthropic_models)
- [LiteLLM `/v1/messages` unified endpoint](https://docs.litellm.ai/docs/anthropic_unified/)
- [LiteLLM PyPI compromise advisory (issue #24518)](https://github.com/BerriAI/litellm/issues/24518)
