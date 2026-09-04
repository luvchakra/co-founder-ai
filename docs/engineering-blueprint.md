# Engineering Blueprint — AI GTM / Customer Acquisition Co-Founder (MVP)

> Status: authoritative for architecture, stack, and MVP scope. Supersedes the original
> Master Product Blueprint (`docs/blueprint.md`) on all infrastructure/stack decisions.
> Primary objective: build the simplest production-capable architecture that can validate
> the product while minimizing development complexity and AI-token consumption.

## 1. Product Overview

AI-powered GTM / Customer Acquisition Co-Founder for founders who have a product/SaaS but
need help acquiring customers. The system understands the founder's product and target
market, identifies suitable prospects, researches them, determines why they should be
approached, generates personalized outreach, assists with conversations, and learns from
outcomes:

```
Founder → Product Understanding → ICP Definition → Market Research → Prospect Discovery →
Prospect Research → Prospect Scoring → Outreach Strategy → Personalized Outreach →
Founder Approval → Send → Response → Conversation Analysis → Recommended Next Action →
Opportunity → Conversion → Learning
```

The MVP implements the foundation of this loop without prematurely building an
enterprise-scale distributed architecture.

## 2. Core Architectural Principle — Build a Modular Monolith

Not a collection of microservices:

```
Vercel
  └── Next.js App (UI + API + Server Logic)
        ├── Supabase (PostgreSQL, Auth, Storage, pgvector)
        └── AI Provider (LLM, Embeddings)
```

Do **not** create: separate backend, separate frontend, microservices, message broker,
Redis, dedicated worker service, API gateway, AI agent framework, Kubernetes infra —
unless explicitly required later.

## 3. Approved Technology Stack

- **Application**: Next.js + TypeScript, App Router. React Server Components where
  appropriate, Client Components only where interaction requires them, Route Handlers for
  APIs, Server Actions where appropriate. No separate Node.js backend.
- **UI**: Tailwind CSS + shadcn/ui. Reusable components. No second UI framework.
- **Database**: Supabase PostgreSQL — Postgres, Auth, Row Level Security, Storage,
  pgvector, Realtime where genuinely useful. Official Supabase JS/TS client. **No Prisma**
  for MVP. Schema version-controlled through Supabase migrations.
- **Hosting**: Vercel. Pipeline: `GitHub → Vercel → Next.js → Supabase`.
- **AI**: one provider initially, no multi-provider abstraction. Internal module
  `/lib/ai/` (`client.ts`, `prompts.ts`, `schemas.ts`) — app code calls this module, never
  the AI SDK directly, giving a cheap migration path later without building a framework now.
- **Web research**: one search provider initially, isolated behind `/lib/research/`
  (`search.ts`, `company.ts`, `signals.ts`). No generalized multi-provider architecture.

## 4. MCP

`Claude Code → Supabase MCP → Development Supabase Project`. MCP must use the **dev**
environment — never connect directly to production data. No custom MCP server unless
explicitly required.

## 5. Repository Structure

Single repository. Directories are created as functionality requires them — do not
pre-create empty ones.

```
/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── api/
│   └── ...
├── components/
│   ├── ui/
│   ├── layout/
│   ├── businesses/
│   ├── products/
│   ├── prospects/
│   ├── campaigns/
│   └── conversations/
├── lib/
│   ├── supabase/
│   ├── ai/
│   ├── research/
│   ├── prospects/
│   ├── outreach/
│   ├── conversations/
│   ├── scoring/
│   ├── usage/
│   └── utils/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── prompts/
│   ├── product/
│   ├── icp/
│   ├── research/
│   ├── scoring/
│   ├── outreach/
│   └── conversation/
├── tests/
├── docs/
├── CLAUDE.md
├── .mcp.json
├── package.json
└── README.md
```

## 6. Multi-Tenant Architecture

```
User → Account
         ├── Business A → Product A / Product B
         └── Business B → Product C
```

Each product gets its own **GTM Workspace**: `Account → Business → Product → Workspace`.
A workspace is the isolated GTM environment for a product, containing ICP, Knowledge,
Prospects, Contacts, Research, Outreach, Conversations, Opportunities, Analytics, AI
memory.

## 7. Tenant Isolation (security-critical)

Every tenant-owned entity must be traceable to `account_id` / `business_id` /
`product_id` / `workspace_id`. Not every table needs all four columns if they're safely
derivable, but every query must be resolvable to the correct workspace. Preferred
operational boundary: **`workspace_id`**.

Supabase Row Level Security must prevent cross-tenant access. Never rely exclusively on
frontend filtering:

```sql
-- Bad: SELECT * FROM prospects  (then filter client-side)
-- Good:
SELECT * FROM prospects WHERE workspace_id = current_workspace
-- ...with RLS enforcing the same boundary.
```

## 8. Authentication

Supabase Auth. Initial: email/password, magic link if useful. Social auth later.

```
Auth User → Account Membership → Business → Product → Workspace
```

Never assume the authenticated user automatically has access to every business in the
account — authorization must be checked server-side.

## 9. Initial Database Model

Keep it intentionally small. Use JSONB where flexibility is useful rather than excessive
normalized tables.

- **accounts**: id, name, created_at, updated_at
- **account_members**: id, account_id, user_id, role (`owner` / `admin` / `member`),
  created_at
- **businesses**: id, account_id, name, description, website, industry, created_at,
  updated_at
- **products**: id, business_id, name, description, website, status, created_at,
  updated_at
- **workspaces**: id, product_id, name, created_at, updated_at
- **product_knowledge**: id, workspace_id, source_type (`manual`/`website`/`document`/
  `url`), source_name, content, metadata, created_at, updated_at
- **icp_profiles**: id, workspace_id, name, description, industries, company_sizes,
  geographies, roles, pain_points, buying_signals, created_at, updated_at
- **prospects**: id, workspace_id, company_name, website, domain, industry, company_size,
  location, description, status, fit_score, created_at, updated_at
- **contacts**: id, workspace_id, prospect_id, first_name, last_name, job_title, email,
  linkedin_url, phone, status, created_at, updated_at
- **prospect_research**: id, workspace_id, prospect_id, summary, pain_points,
  buying_signals, recent_events, recommended_angle, evidence (retains source references),
  researched_at, expires_at
- **prospect_scores**: id, workspace_id, prospect_id, icp_score, intent_score,
  timing_score, overall_score, reasoning, created_at — prefer deterministic scoring
  wherever possible
- **outreach_strategies**: id, workspace_id, prospect_id, contact_id, strategy, channel,
  reason, key_message, cta, status, created_at, updated_at
- **messages**: id, workspace_id, prospect_id, contact_id, conversation_id, channel,
  direction, content, status, sent_at, created_at
- **conversations**: id, workspace_id, prospect_id, contact_id, status, stage, intent,
  next_action, created_at, updated_at
- **ai_runs**: id, workspace_id, operation, model, prompt_version, input_hash,
  input_tokens, output_tokens, estimated_cost, status, created_at — critical for
  controlling AI costs
- **usage_events**: id, account_id, workspace_id, event_type, quantity, metadata,
  created_at — supports usage limits and the free tier

## 10. AI Architecture

No AI-agent framework — simple service functions in `lib/ai/`:

```
understandProduct()
generateICP()
researchProspect()
scoreProspect()
createOutreachStrategy()
generateOutreach()
analyzeConversation()
```

Each operation: 1) input schema, 2) prompt, 3) AI call, 4) structured output schema,
5) validation, 6) persistence, 7) usage tracking. Example:

```
researchProspect(prospectId)
  → Fetch relevant research
  → Build minimal context
  → AI call
  → Validate JSON
  → Save prospect_research
  → Record ai_runs
```

## 11. AI Token Optimization (first-class engineering requirement)

**Never send unnecessary context** — do not dump the entire product knowledge base +
entire prospect database + entire conversation history into every AI call. Instead:
`Task → Retrieve only required information → Compact context → AI`.

**Cache results** — every repeatable AI operation uses an input hash:
`input → hash → check ai_runs/cache → existing? return : call AI`.

**Prompt versioning** — every prompt has a version (`research_prospect_v1`,
`research_prospect_v2`, ...), stored with every AI run.

**Cheap model first** — lower-cost model for classification/extraction/summarization;
stronger model only where reasoning actually matters (prospect strategy, complex research
synthesis, conversation strategy). Never hard-code a high-cost model for every operation.

## 12. Product Knowledge

Initial sources: manual description, website URL, uploaded documents. For MVP: 1) store
source content, 2) extract text, 3) generate a concise structured product profile
(problem, solution, features, differentiators, target industries/roles, use cases,
pricing, competitive positioning), 4) use that profile for most AI operations. Do not
immediately build a sophisticated RAG pipeline — add pgvector retrieval only when
knowledge volume actually requires it.

## 13. ICP Engine

Input: Product Profile. Output: industries, company size, geography, roles, problems,
buying signals, exclusions. Founder must be able to review/edit/approve/regenerate. AI
suggestions must never overwrite founder-approved data without explicit action.

## 14. Prospect Discovery

```
ICP → Search Provider → Candidate Companies → Deduplication → Basic deterministic filters
→ AI qualification → Prospect list
```

Do not AI-score every search result immediately — apply deterministic filters first
(industry, country, company size, domain, duplicate), then use AI only for
ambiguous/high-value qualification.

## 15. Company Resolution

Different sources may represent the same company differently ("Acme Inc" / "Acme
Technologies" / "acme.com"). Matching order: 1) exact domain match, 2) normalized domain,
3) company name normalization, 4) AI-assisted resolution only when ambiguous. Do not use
AI for every company match.

## 16. Prospect Research

Research should answer: what does this company do? why could our product matter to them?
what evidence supports this? is there a relevant current event? is there a buying signal?
who might care? why approach them now? Research retains evidence, e.g.:

```json
{
  "finding": "Company expanded operations in India",
  "source": "public source",
  "date": "2026-08-20",
  "relevance": "May create need for..."
}
```

The AI must not invent evidence — if unavailable, state that explicitly.

## 17. Prospect Scoring

Primarily deterministic, e.g. ICP Fit 40% / Intent 25% / Timing 20% / Reachability 15% →
weighted overall score. AI can add qualitative reasoning but should not unnecessarily
calculate simple mathematics.

## 18. Outreach Strategy

Do not jump straight to "write an email." First establish: WHY THIS COMPANY, WHY THIS
PERSON, WHY NOW, WHAT PROBLEM, WHAT EVIDENCE, WHAT ANGLE, WHAT CHANNEL, WHAT CTA — then
generate the outreach:

```
Prospect → Research → Score → Strategy → Founder Review → Message
```

Strategy and message are separate database entities.

## 19. Outreach Generation

Initial channels: email, manual social/LinkedIn message, WhatsApp content generation. For
MVP, generated content can be copied/exported rather than auto-sent through every
channel — this significantly reduces integration complexity. Automated sending is
implemented only after the workflow is validated.

## 20. Human Approval

```
AI Generated → Draft → Founder Review → Approved → Ready to Send
```

Never automatically send AI-generated outreach by default. Every outbound message needs an
audit trail.

## 21. Conversation Engine

```
Incoming message → Conversation → AI analysis → Intent → Conversation stage →
Recommended next action
```

Stages: CONTACTED, ENGAGED, INTERESTED, DISCOVERY, DEMO, NEGOTIATION, WON, LOST, NOT_NOW.
AI recommends; the founder remains in control.

## 22. Follow-Up Engine

MVP generates follow-up **recommendations** rather than sophisticated autonomous
sequencing:

```
No response after 4 days → System recommendation → "Send follow-up" → AI generates
message → Founder approves
```

Automated sequences can be introduced later.

## 23. Background Processing

**Do not** introduce Redis/BullMQ initially. Long-running operations use simple
database-backed job records + scheduled processing:

```
jobs
-----
id, workspace_id, type, payload, status, attempts, created_at, processed_at
```

Introduce a queue system only if the application reaches a scale where DB-backed
processing becomes inadequate — don't build it now.

## 24. Idempotency

Every expensive operation must be idempotent — e.g. "Research Prospect" must not fire five
AI calls because the user clicked the button five times. Use
`operation + workspace_id + entity_id + input_hash` to identify duplicate work.

## 25. Free Tier Architecture

Generous but controlled free tier, enforced at the application level (not infrastructure
complexity):

```
FREE
-----
1 account, 2 businesses, 3 products, 50 prospects, 20 AI research operations,
20 AI-generated messages, 5 prospect research runs/month
```

Exact limits can change later — the important thing is every billable/expensive operation
is tracked (`User → Operation → usage_events → Check limit → Allow / Reject`).

## 26. Security

Minimum: Supabase Auth, RLS on tenant-owned tables, server-side authorization, no
service-role key in the browser, environment variables for secrets, validate all API
inputs, validate AI outputs, sanitize user-provided content, audit sensitive actions,
rate-limit expensive operations, prevent cross-workspace data access. AI-generated content
is **untrusted output** — never let it directly execute arbitrary code or DB operations.

## 27. AI Prompt Security

External web content is untrusted: `Website content → Research extraction → UNTRUSTED
DATA → AI`. A webpage must never override system instructions — researched material is
evidence/data, not instructions.

## 28. API Design

Keep it simple, e.g.: `/api/products`, `/api/icp`, `/api/prospects`,
`/api/prospects/[id]/research`, `/api/prospects/[id]/score`,
`/api/prospects/[id]/strategy`, `/api/outreach`, `/api/conversations`, `/api/usage`. No
GraphQL, no separate API gateway.

## 29. UI Structure

```
Dashboard
├── Businesses
├── Products
└── Workspace
    ├── Overview
    ├── Product
    ├── ICP
    ├── Prospects
    ├── Research
    ├── Outreach
    ├── Conversations
    └── Settings
```

The active workspace must always be visible — the user should never be uncertain which
product's GTM data they're viewing.

## 30. Dashboard

Eventually shows: prospects, high-fit prospects, research completed, outreach ready,
messages sent, responses, interested prospects, opportunities, conversions. For MVP, use
simple database queries — no dedicated analytics platform.

## 31. Error Handling

Every AI/research operation should handle: success, validation failure, provider failure,
timeout, rate limit, invalid response, insufficient evidence. AI failures must not corrupt
business data — store operation status.

## 32. Observability

No separate observability platform initially. At MVP: server logs, AI run records, usage
records, error states in the database where appropriate. Add Sentry/PostHog later when
real usage justifies it.

## 33. Testing Strategy

Every Jira story includes appropriate tests: unit tests for business logic, integration
tests for database/service operations, Playwright for critical user journeys. Prioritize:
authentication, tenant isolation, product creation, workspace switching, ICP generation,
prospect creation, research, scoring, outreach approval, conversation handling. Security
tests must specifically verify one workspace cannot access another workspace's data.

## 34. Git Workflow

Each story produces a focused commit, e.g. `GTM-123 Add workspace creation and tenant
isolation`:

```
Pick Story → Understand acceptance criteria → Inspect relevant code → Implement → Test →
Review diff → Commit → Push GitHub → Deploy Vercel → Update tracking
```

Do not combine unrelated stories into one commit.

## 35. Development Model

`Epic → Feature → Story → Acceptance Criteria → Implementation`. Work **one story at a
time**. Before starting: read the story, check dependencies, check existing
implementation, check acceptance criteria. After completion: tests pass → commit → push →
deploy → tracking updated.

## 36. Definition of Done

A story is complete only when: acceptance criteria implemented; existing functionality
not broken; relevant tests pass; tenant isolation preserved; no unnecessary dependencies
introduced; AI calls minimized; DB migrations committed if required; code committed to
GitHub; deployment succeeds on Vercel; tracking updated; known limitations documented.

## 37. Development Token-Efficiency Rules (for Claude Code)

1. Never scan the entire repository unless explicitly necessary.
2. Read the story first.
3. Inspect only files relevant to that story.
4. Reuse existing components/functions.
5. Don't regenerate files unnecessarily.
6. Don't repeatedly read unchanged documentation.
7. Don't refactor unrelated code.
8. Don't install packages without justification.
9. Don't introduce infrastructure before it is required.
10. Don't build future functionality.
11. Don't make architectural changes without approval.
12. Prefer simple code over abstractions.

## 38. AI Token-Efficiency Rules (application runtime)

Every AI operation must answer: 1) is AI actually required? 2) can deterministic code do
this? 3) can existing AI output be reused? 4) can cached output be reused? 5) can the
prompt/context be reduced? 6) can a cheaper model perform the task? 7) can multiple
operations be combined into one call? Never call AI simply because the feature is labeled
"AI".

## 39. Future Scalability

```
Current MVP
├── Redis / BullMQ
├── Worker service
├── Multiple AI providers
├── Advanced RAG
├── Cloudflare
├── Dedicated search infrastructure
├── Email automation
├── WhatsApp Business API
├── LinkedIn integrations
├── Advanced analytics
└── Autonomous AI agents
```

None of these are implemented until required. Principle: **design for extensibility,
implement for simplicity.**

## 40. Recommended MVP Build Sequence (authoritative backlog)

- **Epic 1 — Foundation**: Next.js setup, Supabase connection, authentication, basic
  layout, GitHub/Vercel integration.
- **Epic 2 — Multi-Tenancy**: Account, membership, Business, Product, Workspace, RLS,
  workspace switching.
- **Epic 3 — Product Intelligence**: product onboarding, product profile, knowledge
  sources, AI product understanding.
- **Epic 4 — ICP**: ICP generation, editing, approval.
- **Epic 5 — Prospect Management**: prospect CRUD, contact CRUD, filtering, search,
  import.
- **Epic 6 — Research Engine**: web search, company research, evidence, buying signals,
  prospect scoring.
- **Epic 7 — GTM Strategy**: prospect strategy, channel recommendation, outreach angle,
  CTA recommendation.
- **Epic 8 — Outreach**: email generation, social message generation, WhatsApp message
  generation, approval workflow.
- **Epic 9 — Conversations**: conversation management, reply analysis, intent detection,
  recommended next action, follow-up recommendations.
- **Epic 10 — Usage / Free Tier**: AI usage tracking, usage limits, credits/quotas, usage
  dashboard.
- **Epic 11 — MVP Hardening**: security, tenant isolation tests, error handling,
  performance, UX improvements, deployment validation.

## 41. Explicit Non-Goals for MVP

Must **not** be implemented unless a story explicitly requires them: microservices,
Kubernetes, Redis, BullMQ, separate backend, Prisma, GraphQL, event bus, AI agent
framework, autonomous outreach, autonomous negotiation, complex CRM replacement, advanced
marketing automation, enterprise SSO, complex RBAC, multi-region infrastructure, multiple
AI providers, multiple search providers, dedicated analytics infrastructure.

## 42. Final Engineering Principle

> The founder should spend less time figuring out who to sell to, why they should approach
> them, what to say, and what to do next. The AI should handle the research and reasoning;
> the founder should remain in control of important decisions and outbound communication.

Technically: start as a secure, modular Next.js monolith backed by Supabase, deployed on
Vercel, with one AI provider and one research provider. Minimize infrastructure,
dependencies, AI calls, and development context. Add complexity only when actual product
requirements or scale justify it. The architecture must remain simple enough that a
session can understand the relevant portion of the system for any individual story without
loading the entire project into context.
