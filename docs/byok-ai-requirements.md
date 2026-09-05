# BYOK AI Requirements

Status: Draft — for review
Related: `docs/engineering-blueprint.md` §3 (superseded — see below), `docs/ai-usage-cost-requirements.md`

## 1. Context

Supersedes `engineering-blueprint.md` §3's "single AI provider (Anthropic), no
abstraction" decision. The founder supplies their own AI provider + API key (Bring Your
Own Key); the app never uses a company-owned AI account. This is a Jira-driven backlog
(EPIC 3, GTM-020..032) scoped to this codebase's own Epic numbering as "Epic 3: BYOK AI",
reusing the number already used for product understanding — the original product/ICP/etc.
epics from earlier in this project are unaffected and not renumbered.

## 2. User experience

The user never sees model names, temperature, context window, token limits, or model
routing. During settings, they see only:

```
AI Provider
○ OpenAI   ○ Anthropic   ○ Google Gemini

API Key  [ ••••••••••••••••••••••• ]
[ Test Connection ]   ✓ Connected
```

The application, not the user, decides which model serves each operation.

## 3. Provider vs. model

User chooses: provider + API key.
Application chooses: operation → required capability/quality tier → best available
model from that provider.

```
User's API Key → AI Router → { Research Model, Strategy Model, Classification Model, ... }
```

Model IDs are never hardcoded in business logic — only the model registry knows them,
so a model upgrade never requires touching a feature.

## 4. Internal AI model registry

Conceptually, for each of the 3 MVP providers (OpenAI, Anthropic, Google):

```
provider × qualityTier("fast" | "balanced" | "reasoning") → concrete model ID
```

## 5. AI operation registry

Every AI operation declares the capability + quality tier it needs, e.g.
`understand_product` → reasoning/balanced, `generate_icp` → reasoning/balanced,
`research_prospect` / `discover_prospects` → research_synthesis/reasoning (+ web
search), `generate_message` / `generate_strategy` → writing/balanced,
`classify_reply` / `generate_reply` → classification/fast.

The router maps operation → capability/tier → provider (from the account's connected
credential) → concrete model.

## 6. Provider fallback rule (non-negotiable)

If the user's provider/key fails, do **not** silently fall back to a company AI account.
Surface: "Your \{Provider\} API key could not complete this request." with retry /
check-key actions. The user explicitly owns the AI account and its cost.

## 7. Provider connection testing

Validate a newly entered key with the minimum possible cost: a provider's
model-listing REST endpoint (not an LLM generation call).

## 8. Supported providers

MVP: OpenAI, Anthropic, Google Gemini, via the Vercel AI SDK's standardized
provider/model interface. Not OpenRouter (extra intermediary, extra fee, less
architectural ownership). Later/not this session: Mistral, Groq, DeepSeek, xAI, Azure
OpenAI, Bedrock, Vertex.

## 9. Architecture

```
AI Operation → AI Router → Provider Factory → Provider SDK (via `ai` package)
                                             → User's API Key → Selected Model
```

Callers never specify a model:

```ts
ai.execute({ operation: "research_prospect", workspaceId, input })
```

## 10. API key storage

Never: browser localStorage/cookies, returned raw through any API, logged, committed,
put into AI prompts, or included in error messages.

Must: encrypted at rest (`lib/crypto/api-key.ts`, AES-256-GCM), server-side only,
masked in UI (e.g. `••••••••••••ABCD`), support replace/disconnect, record connection
status.

`ai_provider_credentials`: id, account_id, provider, encrypted_api_key,
key_fingerprint, status, last_validated_at, last_error, created_at, updated_at.

## 11. Provider scope

Account-level (not per-business/per-product) for MVP — one connected provider covers
every business/product under that account, so the founder isn't asked to re-enter the
same key repeatedly. Business/product-level overrides are a future enhancement, not
required now.

## 12. AI usage ownership & logging

Usage is billed to the user's own provider account, but the app still tracks
operation, provider, model, input/output tokens, duration, status, and estimated
usage — extend `ai_runs` with `account_id`, `provider`, `duration_ms`, `error_code`.
Never store API keys in `ai_runs`.

## 13. Cost optimization carries over

Deterministic tasks stay in code, not AI. Simple classification/summarization → fast
tier. Complex reasoning → reasoning tier. Repeated operations → cache/dedup (see
`docs/ai-usage-cost-requirements.md` — already shipped input-hash dedup should key on
`input_hash + operation + prompt_version + model`, not just `input_hash + operation`,
now that model varies by account).

## 14. Error handling (GTM-031)

Handle distinctly, surfaced without hidden company-key fallback: invalid key,
expired/revoked key, rate limit, model unavailable, provider outage, timeout.

## 15. Scope of this session

Implementing EPIC 3 (GTM-020..032) only, one story at a time:

- Story A — `ai_provider_credentials` schema + RLS + `ai_runs` extension +
  `lib/crypto/api-key.ts` encryption (GTM-020, GTM-021).
- Story B — model registry, operation registry, provider factory, AI router
  (GTM-026..029).
- Story C — provider connection settings UI: select/connect/disconnect/replace/test,
  masked display, status (GTM-022..025).
- Story D — rewire the non-web-search AI operations to the router (GTM-030, GTM-031
  for those operations).
- Story E — rewire the web-search AI operations (`research_prospect`,
  `discover_prospects`) to the router across all 3 providers, since the user chose to
  build web search for all three now rather than defer it.

Everything else in the source document's backlog (Epics 1-2, 4-15) either already
exists under this project's own epic numbering from earlier sessions or is explicitly
out of scope for this session.
