# Prospects Pipeline Redesign — Requirements

Status: Draft — for review, then handed to Claude Code epic-by-epic
Scope: everything under `app/.../prospects/**`,
`lib/{prospects,contacts,research,scoring,outreach,messages,conversations}/**`
Method: read against `main` (commit `0e84cb7`) — every requirement below traces to a
specific file, not a general impression.

## 0. Current pipeline (as built)

```
add/import/discover → Research (AI+web) → Score (formula) → Generate strategy (AI)
  → Approve strategy → Generate message (AI) → Approve message → "Mark sent" (DB flag only)
  → [wait for real-world reply] → inbound webhook → classify (AI) → Generate reply (AI) → repeat
```

Every arrow is a separate manual button click, one prospect at a time. The only
automation is AI drafting -- nothing in the loop actually moves a message to the
outside world.

## 1. Problem statement

The app promises an "AI GTM co-founder" but the outbound half doesn't exist yet, and
the parts that do exist don't scale past a handful of prospects worked by hand. This
redesign closes both gaps without discarding what's already correct (review-before-send
discipline, the evidence/confidence model in research, the cost controls already
shipped).

## 2. Non-goals

- Not replacing AI drafting quality/prompts (`prompts/**`).
- Not touching the BYOK provider router or cost-control system (`docs/byok-ai-requirements.md`,
  `docs/ai-usage-cost-requirements.md`).
- Not building a CRM-grade pipeline (deal stages, forecasting) -- stay scoped to what a
  solo founder doing outbound actually needs.

## 3. Requirements

### P0 — Close the loop: outreach can't stop at drafting

- **R1. Real outbound sending.** A real email-send integration (Resend, chosen for this
  build) behind "Approve message." On approve, the message sends via the provider using
  the prospect's primary `contact.email`; `markMessageSent` becomes
  webhook/send-response-driven, not a manual self-report. No contact email -> block
  "Send" with an inline prompt to add one. Files: `lib/messages/send.ts`,
  `app/api/webhooks/email-status/route.ts`, rewire `markMessageSentAction`.
- **R2. Bounce/failure handling.** A send can fail. `messages.status` gains `'failed'`
  with a visible reason and a "Retry" action -- never stuck in `approved` looking unsent.

### P0 — Make pipeline state visible

- **R3. Surface pipeline stage on the prospects list.** Derived stage per prospect --
  `new -> researched -> scored -> strategized -> messaged -> sent -> replied -> closed`
  -- computed from existing child tables (no new AI call, a join/aggregate in
  `listProspects`). Sortable/filterable; a prospect stuck for >N days gets a "needs next
  step" indicator.
- **R4. "Next action" per prospect.** List and detail page show what to do next (e.g.
  "Generate strategy" as the primary CTA), not a wall of equally-weighted buttons. UI
  consequence of R3's data.

### P0 — Fix the discovery-to-pipeline handoff

- **R5. Carry `match_reason` and `source_url` into the real pipeline.**
  `approveProspectSuggestions` currently drops both. Seed a `prospect_research` row from
  them on approval (preferred over new prospect columns) so research starts from "why we
  sourced this" instead of nothing.

### P1 — Scale past one-at-a-time

- **R6. Bulk progression actions.** "Research all new," "Score all researched," etc.
  from the prospects list (checkbox selection, mirroring `discover/page.tsx`'s
  approve-selected flow). Orchestration only, reusing existing per-prospect actions.
  Respect existing cost/usage limits; a batch that would exceed the monthly ceiling
  stops partway and reports how many completed.
- **R7. A prioritized work queue.** Sort/view ordering prospects by `fit_score desc`,
  surfacing the highest-fit prospect needing the next action first.

### P1 — Fix data integrity gaps

- **R8. Score history instead of overwrite.** `prospect_scores` is upserted on
  `prospect_id`, destroying prior scores. Make it append-only; `getProspectScore`
  returns the latest; show a trend (previous vs current) on the detail page.
- **R9. Duplicate detection across all three entry points.** Manual add, CSV import, and
  AI discovery each check duplicates differently (or not at all). One shared
  `findDuplicateProspect(workspaceId, {companyName, domain})`, matching normalized
  domain first, name second.

### P1 — Navigation

- **R12. Sidebar for Business → Product drill-down.** Replace the two flat
  business/product `<select>` switchers with a persistent collapsible sidebar: top
  level lists businesses, expanding one lists its products, selecting a product
  navigates into its dashboard.

### P1 — Fields and validation

- **R13. Company-level socials, and stop over-validating URLs.** Add `linkedin_url`,
  `twitter_url`, `company_email` to `prospects`. Every URL-ish input in the app uses
  `type="url"`, which rejects a bare domain like `acme.com` -- change all six to
  `type="text"` and rely on the existing lenient server-side normalization
  (`extractDomain`); no new client-side URL regex.

### P2 — Quality and transparency

- **R10. Make the scoring formula visible.** Show the three sub-scores and weights on
  the detail page (data already exists in `ProspectScore`).
- **R11. Contact-aware message generation.** Verify `generate-message.ts` personalizes
  to the selected contact (name, role), not just company-level research; thread contact
  through the prompt inputs if it doesn't already.

## 4. Sequencing (as built)

1. R3 + R4 (visibility) -- cheapest, no schema risk beyond read-side joins.
2. R13's validation fix + R12 (sidebar) -- pure UX/navigation, no pipeline dependency;
   R12 makes every other page easier to reach while testing the rest.
3. R5 (fix data loss) -- small, contained.
4. R1 + R2 (real sending via Resend) -- the core gap; before R6/R7 so bulk actions
   operate on a pipeline that actually completes.
5. R9 (dedup) -- contained, prevents pollution while R6/R7 land.
6. R6 + R7 (scale).
7. R8, R10, R11, R13's new fields -- polish, land anytime after R3.
