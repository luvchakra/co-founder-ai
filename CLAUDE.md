# co-founder-ai — AI GTM Co-Founder (MVP)

AI-powered Go-To-Market / Customer Acquisition Co-Founder for founders. Understands a
founder's product, defines ICP, discovers and researches prospects, builds a
prospect-specific outreach strategy, generates outreach for human approval, and learns
from conversation outcomes.

Full context: see `docs/blueprint.md` (product) and `docs/engineering-blueprint.md`
(architecture) — read only the relevant section for the story at hand, not the whole file.

## Development principles

1. Prefer the simplest implementation that works.
2. Do not introduce a new dependency unless necessary.
3. Do not create a service when a Next.js module will suffice.
4. Do not use an LLM for deterministic operations.
5. Minimize LLM calls.
6. Cache all repeatable AI operations (`ai_runs`, keyed by `input_hash` + `prompt_version`).
7. Prefer structured JSON AI responses, validated with Zod.
8. Keep prompts short and versioned (`prompts/<domain>/<name>_v1.ts`).
9. Never send unnecessary context to an LLM.
10. Never implement speculative functionality — build only what the current story requires.
11. Every database entity must have an explicit tenant boundary (`workspace_id`, enforced by
    Supabase RLS — never frontend-only filtering).
12. Every feature must have tests (tenant isolation tests are mandatory for anything
    touching workspace-scoped data).
13. Do not refactor unrelated code.
14. Do not modify architecture without explicit approval from the user.
15. Development must use Supabase MCP against the **dev** project only — never production.

## Architecture (locked decisions — do not change without approval)

- **Modular monolith**: single Next.js (App Router + TypeScript) app on Vercel. No
  separate backend, no microservices, no worker service, no Redis/BullMQ, no Prisma, no
  GraphQL, no AI agent framework, no event bus — see full non-goals list in
  `docs/engineering-blueprint.md` §41.
- **Database/Auth/Storage**: Supabase (Postgres, Auth, RLS, Storage, pgvector). Schema is
  version-controlled via `supabase/migrations/`.
- **UI**: Tailwind CSS + shadcn/ui (manually vendored — this environment's egress policy
  blocks `ui.shadcn.com`, so new components are hand-added under `components/ui/`, not
  fetched via `npx shadcn add`).
- **AI**: one provider, called only through `lib/ai/` (never call the AI SDK directly from
  route handlers or components). Functions, not agents: `understandProduct()`,
  `generateICP()`, `researchProspect()`, `scoreProspect()`, `createOutreachStrategy()`,
  `generateOutreach()`, `analyzeConversation()`.
- **Research**: one web/search provider, called only through `lib/research/`.
- **Background work**: DB-backed `jobs` table + scheduled processing. No queue
  infrastructure until scale requires it.
- **Tenancy hierarchy**: `Account → Business → Product → Workspace`. `workspace_id` is the
  primary operational boundary. Every workspace-owned table needs RLS that resolves through
  authenticated `auth.uid()` → account membership → business → product → workspace. Never
  trust a client-supplied `workspace_id` without server-side authorization.

## Repository structure

Directories are created as stories require them — don't pre-create empty folders. Expected
shape as the app grows:

```
app/            route handlers + pages (App Router)
proxy.ts        root-level request middleware (Next.js 16 renamed middleware.ts ->
                proxy.ts; exported function is `proxy`, not `middleware`)
components/ui/  shadcn/ui primitives (hand-vendored)
components/     feature components, grouped by domain
lib/supabase/   client.ts (browser), server.ts (server components/actions), admin.ts
                (service-role, server-only), middleware.ts (session refresh helper)
lib/ai/         client.ts, prompts.ts, schemas.ts
lib/research/   search.ts, company.ts, signals.ts
lib/<domain>/   prospects, outreach, conversations, scoring, usage
prompts/        versioned prompt text, one subfolder per domain
supabase/migrations/
tests/
docs/
```

## Workflow

One story at a time (see `docs/engineering-blueprint.md` §40 for the Epic 1–11 backlog).
Before starting a story: read only the files it touches. After finishing: tests pass,
typecheck/lint clean, focused commit, tenant isolation preserved, no unapproved
dependencies or architecture changes.

## Environment

- `.env.local` (gitignored) holds real dev Supabase keys — never commit it, never log its
  contents, never put secrets in code comments or commit messages.
- `.env.example` documents required variable names with placeholder values only.
