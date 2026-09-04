# AI GTM Co-Founder — Master Product Blueprint

> Original document: "AI GTM Co-Founder — Engineering Product Blueprint" (130 sections).
> This is the full product vision. For the MVP-scoped architecture actually being built,
> see `docs/engineering-blueprint.md` — that document supersedes this one on stack/
> infrastructure choices (modular monolith, no Prisma/Redis/BullMQ/agent-framework/etc).
> This document remains the source of truth for product scope, domain concepts, data
> model vocabulary, and long-term direction.

## 1. Product Definition

Multi-tenant SaaS platform that acts as an AI Go-To-Market Co-Founder. A founder can
create multiple businesses under one account; each business can have multiple products;
each product has an entirely independent GTM environment.

The platform helps the founder: understand a product; research the market; define ICP;
find potential companies; find relevant decision makers; research each prospect; identify
buying signals; develop a prospect-specific strategy; generate marketing/sales material;
generate personalized outreach; allow founder approval; send communication; track
responses; understand conversations using AI; recommend responses; follow up; manage
opportunities; schedule meetings; track conversion; learn from outcomes.

## 2. Critical Architectural Principle

The platform MUST NOT be `User → Campaigns`. It MUST be:

```
Account
├── Business A
│   ├── Product A1 → GTM Workspace (Research, ICP, Prospects, Contacts, Campaigns,
│   │                                Conversations, Opportunities, Content, AI Memory,
│   │                                Analytics)
│   └── Product A2 → GTM Workspace
└── Business B
    └── Product B1 → GTM Workspace
```

**Hard requirement**: marketing data for Product A1 must never be available to Product A2;
marketing data for Business A must never be available to Business B. Isolation must exist
at: database, API, application/service, AI context, vector search, file/document,
background job, analytics, and integration levels.

## 3. Tenancy Model

`Account → Business → Product → GTM Workspace`

- **Account**: platform-level customer (e.g. "Kunal").
- **Business**: a company/venture owned by the account (e.g. "Acme Cybersecurity").
- **Product**: a product sold by that business (e.g. "AI Identity Governance Platform").
- **GTM Workspace**: the isolated marketing/sales environment for that product.

## 4. Multi-Tenant Security Model

Every business object must have tenant identifiers (minimum: `account_id`, `business_id`,
`product_id`, `workspace_id` where applicable). Never rely solely on frontend filtering —
the backend must enforce access. Every request resolves:
`authenticated_user → account → business → product → workspace`, verified server-side
before returning data.

## 5–9. Stack, Monorepo, Domain Modules, DB Model, User/Account Model

The original document proposed a monorepo (`/apps/web`, `/apps/worker`, `/packages/*`),
Prisma, Redis/BullMQ, Clerk auth, and a full AI-agent orchestrator. **These infrastructure
choices were superseded** — see `docs/engineering-blueprint.md`. The domain concepts below
(modules, entities) remain valid; only the implementation stack changed.

Domain modules: Identity, Tenancy, Businesses, Products, Resources, Research, Product
Intelligence, ICP, Prospecting, Contact Intelligence, Campaigns, Content, Messaging,
Conversations, AI Agents, Opportunities, Meetings, Analytics, Integrations, Billing,
Notifications, Audit. Do not build one giant service containing everything.

Full entity list envisioned long-term: User, Account, Business, BusinessMember, Product,
ProductMember, GTMWorkspace, Resource, ResourceChunk, Embedding, ProductProfile,
MarketProfile, ICP, ICPVersion, Persona, Company, CompanySignal, CompanyResearch, Contact,
ContactResearch, Prospect, ProspectScore, Campaign, CampaignStep, CampaignRecipient,
Message, MessageVariant, Conversation, ConversationMessage, AIRecommendation, AIAction,
Opportunity, OpportunityStage, Meeting, MeetingNote, ContentAsset, Template, Integration,
EmailAccount, CalendarAccount, UsageRecord, AuditLog, Notification. The MVP database
(`docs/engineering-blueprint.md` §9) is a deliberately small subset of this.

A user can have one account (initially); design allows multi-user organizations later.

## 10–13. Business / Product / Workspace / Resources

Business fields: id, account_id, name, legal_name, website, description, industry,
country, timezone, logo_url, status, created_at, updated_at. Settings: default_currency,
default_language, brand_voice, company_description, target_geographies,
compliance_settings.

Product fields: id, business_id, name, slug, website, description, category,
pricing_model, status, created_at, updated_at.

GTM Workspace fields: id, product_id, name, description, status, timezone,
default_language, created_at, updated_at. All GTM objects must belong to a workspace.

Product resources: Documents (PDF/DOCX/PPTX/TXT/CSV), URLs (website/product pages/docs/
blogs/competitor pages), Video (YouTube/demo), Text (founder notes/product description/
customer interviews).

## 14. Resource Pipeline

`UPLOAD → STORE → PARSE → CLEAN → CHUNK → EMBED → INDEX → EXTRACT FACTS → UPDATE PRODUCT
KNOWLEDGE`. Never perform expensive processing inside a synchronous HTTP request. (MVP
simplification: see engineering blueprint §12 — start with a simple structured product
profile before building a full RAG pipeline.)

## 15–16. Knowledge Architecture & AI Context Isolation

Two memory types: structured knowledge (Postgres: Product, ICP, Persona, Competitor,
Customer, Pricing, Feature, UseCase) and semantic knowledge (pgvector: documents,
research, emails, meeting notes, product docs). The AI combines both.

**Critical**: when AI works on Product A, it may access only Product A's resources,
research, ICP, prospects, conversations, campaigns, analytics — never Product B or
Business B data. Vector searches must always include `account_id`, `business_id`,
`product_id`, `workspace_id` as metadata filters.

## 17–18. Product Intelligence Engine & Versioning

Input: product website + documents + founder input. Output — Product Profile: category,
problem, solution, features, benefits, target industries, target personas, use cases,
differentiators, competitors, pricing, value propositions, proof points, claims,
unsupported claims, buyer objections.

Never overwrite product intelligence blindly — create `ProductProfileVersion` records.
Founder can review/edit/approve/roll back. AI must know which version is active.

## 19–20. ICP Engine & Versioning

Input: Product Profile, market research, founder preferences, existing customers. Output:
ICP (industries, company size, geography, industry, technology, buying signals — e.g.
"Enterprise Banks, 2,000–50,000 employees, India, Banking, Cloud + enterprise IAM").

ICP must be versioned (the system should learn that ICP v1 → poor conversion, v2 → better
conversion). Never destroy historical ICP data.

## 21. Persona Engine

For every ICP, generate personas (e.g. CISO, CIO, Head of IAM, IAM Director, Security
Architecture Lead). Per persona: role, responsibilities, pain points, goals, KPIs,
objections, buying authority, influence, preferred messaging.

## 22–27. Prospecting Engine

Do not assume a single search API can solve prospect discovery — use a
`ProspectingProvider` abstraction (search engine, company database, contact enrichment,
news, website crawler, job listings, CRM, founder-provided lists).

Pipeline: `ICP → Search Strategy → Company Discovery → Deduplication → Company Enrichment
→ Buying Signal Discovery → Contact Discovery → Contact Enrichment → ICP Scoring →
Prospect Ranking`.

Search strategy generation: AI should generate multiple search strategies (e.g. "Enterprise
banks in India", "Banks hiring IAM architects", "Banks migrating to cloud",
"Banks implementing SailPoint", "Banks with recent security modernization") rather than one
generic query.

Company entity resolution: same company may appear under different names/domains — build
canonical company identity (canonical_name, domain, linkedin_url, country, industry,
employee_count, revenue_range), using domain as a strong identifier.

Contact entity resolution: dedupe by email, linkedin_url, or name+company.

Prospect vs Company: a company is an entity; a prospect represents
`Company + Contact + Product + ICP + Reason for targeting`. The same company can be a
prospect for multiple products, but each product's prospect relationship is independent.

## 28–29. Buying Signal Engine & Freshness

Company signals: funding, acquisition, executive change, hiring, technology adoption,
product launch, expansion, regulatory pressure, security incident, cloud migration,
transformation program. Contact signals: new role, promotion, new responsibility, public
announcement, conference appearance, article, interview.

Each signal: type, description, source, source_url, detected_at, confidence, expiry.
Signals become stale — `signal.expires_at` must exist (e.g. "new CISO appointed" freshness
90 days); reduce scoring weight after expiration.

## 30–31. Prospect Scoring & Explanation

Configurable weighted factors (example): ICP Fit 30%, Company Fit 20%, Persona Fit 15%,
Buying Signals 20%, Technology Fit 10%, Data Confidence 5%. Score 0–100; store individual
components, not just the final number. Every score must be explainable (e.g. "+ Excellent
industry fit, + Company size matches ICP, + Recently hired IAM leadership... Risks: no
confirmed active project").

## 32–33. Research Report & Evidence Model

Report structure: Company Overview, Business Model, Industry, Technology, Recent
Developments, Potential Pain Points, Relevant Buying Signals, Decision Makers, Potential
Use Cases, Competitors, Recommended Approach, Evidence, Confidence.

Never let AI treat unsupported statements as facts. Store per claim: Claim, Source, Source
Type, Source URL, Published Date, Retrieved Date, Confidence. AI should distinguish FACT /
INFERENCE / ASSUMPTION / UNKNOWN.

## 34. "Why This Customer?" Engine

For every prospect generate: `why_now`, `why_company`, `why_person`, `why_product`,
`recommended_angle` — e.g. "Why this company? The company is expanding its cloud
environment and has recently hired IAM specialists. Why now? Recent transformation
activity indicates a possible window... Recommended angle: focus on reducing manual access
review during cloud transformation."

## 35–39. Outreach Strategy, Content, Claim Safety, Brand Voice, Message Generation

Outreach strategy per prospect: objective, primary persona, pain point, buying signal,
message angle, proof point, CTA, channel strategy, follow-up strategy.

Content engine (`ContentGenerator`) supports: email, LinkedIn, WhatsApp, one-pager, case
study, blog, whitepaper, product description, landing page, proposal, follow-up, meeting
agenda — generated only from approved product knowledge.

**Claim safety**: AI must never invent customers, revenue, statistics, certifications,
integrations, features, case studies, or testimonials. Only `ApprovedClaim` records may be
used in outbound content unless explicitly marked as an AI-generated hypothesis.

Brand voice hierarchy: Business Brand Voice → Product Voice → Campaign Voice.

Message generation must use: Product Context + ICP Context + Persona Context + Company
Research + Buying Signals + Previous Conversation + Brand Voice — never just
"Company Name + Generic Template".

## 40–42. Campaign Engine, Human Approval, AI Autonomy Levels

Campaign: name, product_id, workspace_id, ICP_id, strategy, status, with `CampaignStep`
sequences (e.g. Day 0 email → Day 3 follow-up → Day 7 LinkedIn → ...). AI should eventually
adjust the next step dynamically.

Every AI action has a state: `DRAFT → READY_FOR_REVIEW → APPROVED → SCHEDULED → SENT`
(alternatives: REJECTED, EDITED, PAUSED, CANCELLED).

AI autonomy levels (workspace setting `AUTONOMY_LEVEL`): 0 = research only, 1 = draft only,
2 = human approval required, 3 = auto-execute low-risk actions, 4 = autonomous within
guardrails. **MVP supports levels 0–2 only.** Do not build autonomous outbound as default.

## 43–54. Channels (Email, WhatsApp, LinkedIn)

Email: support Gmail + Microsoft 365 via OAuth, encrypted token storage, `EmailProvider`
abstraction (send/schedule/fetchMessages/fetchThread/markRead). Conversations preserve
`provider_thread_id` / `provider_message_id`.

Channel abstraction (`ChannelProvider`): Email / LinkedIn / WhatsApp / SMS providers — MVP
implements email only, but the architecture should not be email-specific.

WhatsApp should eventually use the official Business API — never browser automation.
LinkedIn: build an abstraction for a future compliant integration; never scrape or
automate the LinkedIn UI.

## 45–51. Conversation Engine, State Machine, Follow-Up, Stop Conditions

AI context must include the entire relevant thread. Conversation states: NEW, CONTACTED,
ENGAGED, INTERESTED, QUALIFYING, MEETING_REQUESTED, MEETING_BOOKED, DEMO, PROPOSAL,
NEGOTIATION, WON, LOST, NURTURE, UNSUBSCRIBED, NOT_A_FIT. AI may recommend transitions; the
system controls the actual transition.

Inbound reply classification: POSITIVE, NEGATIVE, QUESTION, PRICING, DEMO_REQUEST,
MEETING_REQUEST, OBJECTION, REFERRAL, WRONG_PERSON, LATER, OUT_OF_OFFICE, UNSUBSCRIBE,
UNKNOWN — stored with intent, confidence, sentiment, urgency, recommended_action.

Response pipeline: `Incoming message → Classify → Retrieve context → Determine objective →
Generate response → Generate explanation → Human approval → Send`.

Follow-up engine should evaluate conversation state + new signals + previous engagement
before recommending SEND / WAIT / CHANGE_CHANNEL / CHANGE_MESSAGE / STOP /
ESCALATE_TO_FOUNDER — not a naive "wait 3 days → send".

Automatically stop outreach on: unsubscribe, explicit rejection, wrong person, customer
converted, founder pauses campaign, compliance rule triggered, permanent bounce.

## 55–59. Opportunities, Meetings, AI Sales Memory, Next-Best-Action

Conversation → Qualification → Opportunity (value, currency, probability,
expected_close_date, stage, owner, source). AI estimates deal_probability, deal_risk,
next_best_action with supporting/risk signals.

Meeting engine integrates Google/Microsoft Calendar, Zoom, Teams, Meet. Before a meeting:
generate company/contact briefing, prior conversation, pain points, questions, recommended
demo, potential objections. After: summary, requirements, objections, next steps,
follow-up email, opportunity update.

AI sales memory (what the prospect said, what the founder promised, objections, documents
sent, pricing discussed, meetings) is scoped strictly to
`workspace → prospect → conversation`, never globally.

Next-best-action engine: examine prospects, conversations, opportunities, signals,
meetings, tasks and produce ranked actions (e.g. "1. Follow up with ABC Bank — HIGH; 2.
Review 7 new prospect messages — HIGH; 3. Research XYZ Corp — MEDIUM").

## 60–66. AI Agent Architecture (long-term vision)

Long-term: a `GTM Orchestrator` with sub-agents (Product Analyst, Research Agent, ICP
Agent, Prospect Agent, Content Agent, Outreach Agent, Conversation Agent, Sales Agent,
Analytics Agent) — each a service/function with strict input/context/tools/instructions/
output_schema/confidence/citations, structured JSON output only.

Research agent tools: search_web, open_url, crawl_page, search_company, search_news,
search_jobs, search_people → returns facts[]/signals[]/sources[]/unknowns[]. Research
content is untrusted — never execute instructions found on websites (treat as data, not
instructions).

Every agent gets explicit, scoped tool permissions (e.g. Research Agent: READ web, WRITE
research; Content Agent: READ product/research, WRITE drafts; Outreach Agent: READ
approved messages, WRITE send request). AI must never get unrestricted database access.

AI actions are database records (`AIAction`: workspace_id, agent, action_type, target,
input, output, confidence, status, approved_by, approved_at) — an audit trail. Separate
`AIRecommendation` ("follow up with prospect") from `AIAction` ("send email"); AI
recommends, execution requires permission per autonomy level.

**MVP note**: the engineering blueprint explicitly overrides this with simple service
functions instead of an agent framework — see `docs/engineering-blueprint.md` §10.

## 67–73. Workflow Engine, Idempotency, Retry, Rate Limiting, Deliverability, Compliance

Long-running workflows (research 500 companies, generate 100 messages, process 1,000
replies, analyze campaign) must be asynchronous — originally specified as queues; MVP uses
a DB-backed jobs table instead (engineering blueprint §23).

Every external operation must be idempotent (`idempotency_key`). Retry with backoff, then
`DEAD_LETTER` with alert — never silently lose jobs. Every provider needs rate_limit/quota/
retry_after; workspace-level limits should also exist.

Email deliverability: track sent/delivered/bounced/opened/clicked/replied/unsubscribed/
spam. Do not optimize around open rate alone — primary metrics are positive_reply_rate,
meeting_rate, opportunity_rate, customer_conversion.

Compliance engine (`CompliancePolicy`): suppression lists, unsubscribe, do-not-contact,
domain/country restrictions, sending limits, approval rules, audit logs — evaluated before
every send. Campaign send pipeline: `Campaign → Recipient → Eligibility Check →
Suppression Check → Compliance Check → Approval Check → Rate Limit Check → Send → Record
Provider ID → Track Result`.

## 74–78. Content Library, Templates, Analytics, Campaign Analyst, Learning Loop

Each product has an asset library (one-pagers, case studies, presentations, pricing,
whitepapers, demos, website) that AI can recommend per prospect. Templates hierarchy:
Business → Product → Workspace → Campaign, personalized per prospect without mutating the
global template.

Track events (PRODUCT_CREATED, RESOURCE_UPLOADED, ICP_CREATED, PROSPECT_FOUND,
PROSPECT_RESEARCHED, MESSAGE_GENERATED/APPROVED/SENT/DELIVERED/REPLIED, MEETING_BOOKED,
OPPORTUNITY_CREATED, DEAL_WON) event-driven.

AI Campaign Analyst: input campaign metrics/prospect attributes/ICP/signals/messages/
replies/conversions → output what worked, what failed, why, recommended change,
confidence.

Learning loop: `Observed Result → AI Insight → Recommendation → Founder Approval →
Strategy Version` — never let AI silently change core strategy; founder clicks
"Apply Insight" to create new ICP/messaging versions.

## 79–92. UX / Navigation / Onboarding (product vision)

Dashboard is action-oriented (high-fit prospects, messages awaiting approval, new replies,
meetings, pipeline, customers, "What should I do today?"). Business switcher and product
switcher in top navigation — switching reloads the entire GTM context, and the user must
never be uncertain which product's data they're viewing.

Primary navigation: Dashboard, Product Intelligence, Research, ICP & Personas, Prospects,
Campaigns, Inbox, Opportunities, Content, Meetings, Analytics, AI Co-Founder, Settings.

Prospects screen: columns Company/Contact/ICP Score/Buying Signal/Persona/Status/Last
Activity/Next Action; filters ICP/Industry/Country/Size/Score/Signal/Campaign/Status.

Prospect detail sections: Overview, Why This Company, Company Research, Buying Signals,
Contact, AI Strategy, Messages, Conversation, Timeline, Opportunity, AI Recommendations.

Approval Queue is a signature UI: cards showing score, why-contact, recommended angle,
message draft, with Approve/Edit/Regenerate/Reject actions for rapid founder review.

Unified inbox aggregates channels (email now; WhatsApp/LinkedIn later) while keeping each
channel's data separate internally.

Onboarding flagship flow — **"Find My First Customers"**: tell us about your product →
upload website/documents → "who do you think should buy?" (I know my ICP / find my ICP) →
"find my first 10 customers", with a visible pipeline:
`Product submitted → Product analysis → Market analysis → ICP proposal → Founder approval
→ Prospect search → Prospect scoring → Top 10 selection → Research → Strategy →
Personalized messages → Approval queue`. This should be the product's flagship workflow.

## 93. Do Not Over-Automate MVP

MVP = AI research + AI recommendation + human approval + human-controlled sending. Avoid
autonomous outbound at scale until the platform has compliance, deliverability,
monitoring, confidence controls, abuse prevention, and provider integrations in place.

## 94–99. API Design, Authorization, RLS, Audit, Billing (long-term vision)

REST under `/api/v1` (long-term full surface across Business/Product/Research/ICP/
Prospects/Campaigns/Conversations). Every endpoint must resolve
`authenticated user → membership → business → product → workspace → resource`
server-side — never accept a bare `product_id` and query blindly. RLS is defense-in-depth
alongside application-level authorization, not a replacement for it.

Audit log every sensitive action (AI approvals, sending, campaign/integration/business
changes, permission changes): user, action, resource, old_value, new_value, timestamp,
device metadata.

Billing/usage: credits for research/AI/prospect/contact-enrichment/email/storage, recorded
per account_id/business_id/product_id/usage_type/quantity/timestamp. Billing occurs at
Account level; usage is reported per Business/Product (multi-business billing).

## 100–104. Notifications, Security, Webhooks, Event Bus, Observability

Notification events: new reply, AI response ready, approval required, meeting booked,
research completed, campaign completed, opportunity changed, high-value buying signal —
in-app + email (Slack later).

Minimum security baseline: HTTPS, encryption at rest, OAuth, secure token storage, RBAC,
tenant isolation, audit logging, rate limiting, CSRF/XSS protection, input validation,
secrets management, webhook signature verification.

Webhook processing: `Provider → Webhook → Verify signature → Store raw event → Queue
processing → Normalize → Update conversation → AI classification → Create recommendation`
— never do AI processing directly inside the webhook request.

Internal event bus (long-term): ProspectCreated, ResearchCompleted, MessageApproved/Sent/
Received, ConversationClassified, MeetingBooked, OpportunityCreated, DealWon — modules
subscribe, keeping the system loosely coupled. (MVP: explicit non-goal per engineering
blueprint §41; call functions directly instead.)

Observability: structured logging, error tracking, job monitoring, API/AI latency, AI
cost, provider/email failures — AI cost tracked by account/business/product/workspace/
agent/model.

## 105–112. AI Cost Control, Caching, Data Separation, Prompt Management, Structured Output

Every AI workflow gets a budget (max_tokens, max_tool_calls, max_research_depth,
max_pages, max_sources) — e.g. prospect research capped around $0.05 target cost; stop or
request deeper research explicitly if exceeded.

Cache company research, website content, common market research, company metadata — but
respect tenant context in cache keys where data is tenant-specific. Separate
`PublicKnowledge` (company facts, public news/website info — potentially infra-shareable)
from `TenantKnowledge` (product, strategy, pricing, customer conversations, internal
documents, proprietary research — never mixed across tenants).

Research sources stored with url/title/publisher/published_at/retrieved_at/content_hash/
source_type/trust_score, deduplicated by URL/content hash.

Prompts must never be hard-coded inline throughout the app — use a versioned
`PromptRegistry` (e.g. `research_prospect_v1`). AI output must use validated schemas (Zod);
retry/repair on invalid JSON. Every important AI result carries a `confidence` (0–1); low
confidence triggers "needs review" rather than autonomous action.

AI decision policy (`CanAIExecute(action, context)`) — examples: generate email → yes,
research company → yes, change ICP → no, send email → depends on autonomy level, delete
prospect → no, mark unsubscribe → yes, send WhatsApp → approval required.

## 113–115. MVP Scope & Success Criteria

Build only: Tenant Management (Account/Business/Product/Workspace); Product Intelligence
(onboarding, website ingestion, document upload, AI analysis); ICP (generation, persona
generation, approval); Prospecting (company search, contact discovery, research, scoring,
buying signals); Outreach (AI strategy, email generation, approval, Gmail/Microsoft
sending); Conversation (reply ingestion, classification, AI response draft, human
approval); Pipeline (prospect, conversation, opportunity, basic analytics).

Do not build: full CRM, full marketing automation, autonomous LinkedIn/WhatsApp, complex
SEO, social publishing, advanced proposal generation, voice agent, full meeting-recording
infra, enterprise SSO, complex billing tiers, multi-model optimization — these come later.

Success criterion: a founder can go end-to-end — create account → business → product →
upload website → AI understands product → generate/approve ICP → find 10 prospects →
research → generate personalized outreach → approve → send → receive reply → AI
understands reply → generate/approve response → continue conversation → create
opportunity — reliably.

## 116–130. Phases, Claude Code Rules, Testing, Tenant Isolation Tests (original plan)

The original document's 7-phase plan (Foundation, Product Intelligence, ICP, Prospect
Intelligence, Outreach, Conversation, Pipeline) and its Phase-0 kickoff prompt have been
**superseded by the 11-epic sequence** in `docs/engineering-blueprint.md` §40, which is the
authoritative backlog for this MVP.

Rules that still apply verbatim: tenant isolation tests are mandatory and must run in CI
(user A cannot access business B; product A's AI/vector search cannot retrieve product B's
data; product A's campaign cannot use product B's contacts; business A's analytics cannot
include business B); every DB query must have an explicit, server-resolved tenant scope;
foreign keys should enforce `Business → Account`, `Product → Business`,
`Workspace → Product`, and workspace-scoped tables should cascade from `Workspace`; use
soft delete (`deleted_at`) for conversations/audit logs — never hard-delete casually.

**Design principle** (unchanged): the app should feel less like a CRM and more like an
*AI operating system for acquiring customers* — the UI should keep answering: **Who**
should I contact? **Why**? **What** should I say? **When**? **What next**? **Why did it
work?**

**The product loop** (the actual product, not any single feature):

```
PRODUCT → ICP → PROSPECT → RESEARCH → WHY THEM? → MESSAGE → HUMAN APPROVAL → OUTREACH →
REPLY → AI UNDERSTANDS → NEXT BEST ACTION → CONVERSATION → MEETING → OPPORTUNITY →
CUSTOMER → LEARNING → BETTER ICP → BETTER PROSPECTS → BETTER MESSAGES → MORE CUSTOMERS
```
