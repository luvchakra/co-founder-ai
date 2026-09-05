# AI Usage Cost Requirements

Status: Draft — for review
Owner: Kunal
Related: `docs/engineering-blueprint.md` §3 (single AI provider), §9 (ai_runs ledger), §11
(cheap model first), §22 (usage limits)

## 1. Context

`ai_runs` already logs every model call with token counts and `estimated_cost`, and
`lib/usage/queries.ts` already aggregates that into a per-workspace, per-operation monthly
total (surfaced on `/usage`). The infrastructure to control cost exists. It is not being
used to actually control anything — it only reports after the fact.

Evidence from production `ai_runs` rows (2026-09-05):

- `discover_prospects`: 230K–321K input tokens per call → $0.62–$0.78/run.
- `research_prospect`: 119K–158K input tokens per call → $0.27–$0.39/run.
- `understand_product`: same product, same input, called 3× within 25 seconds → 3×
  $0.03 for one piece of work.
- All non-web-search operations (`generate_icp`, `generate_message`,
  `understand_product`) sit at ~3–4K input tokens and cost $0.02–$0.03/run — cheap and
  not the problem.

Conclusion: the cost driver is (a) uncontrolled web-search token volume on
`research_prospect`/`discover_prospects`, and (b) zero caching/dedup, not model tier
selection. Model tiers are already assigned sensibly per `lib/ai/client.ts`
(fast/balanced/reasoning), matching the blueprint's own "cheap model first" rule.

## 2. Non-goals

- **Not** adding a second AI provider (Gemini/GPT-4o-mini/Llama) for this pass.
  `engineering-blueprint.md` §3 deliberately scoped MVP to one provider; the
  research/discovery features also depend on Anthropic's built-in `web_search` tool for
  grounding, which a provider switch would need to re-solve, not just re-price. Revisit
  only if §5's cost controls are in place and volume genuinely outgrows Anthropic pricing
  at scale.
- **Not** re-tiering models away from what's already assigned — Haiku/Sonnet/Opus usage
  is already correctly matched to task complexity.

## 3. Requirements

### R1 — Use the existing input hash to skip duplicate paid calls

**Problem:** `hashInput()` is computed and stored in `ai_runs.input_hash` for every
operation but never queried before making a call. Identical input (e.g. re-clicking
"Generate product profile", or a retried form submit) always re-runs and re-bills.

**Requirement:** Before calling the model in each `lib/ai/*.ts` operation, check for a
succeeded `ai_runs` row with the same operation + `input_hash` within a per-operation
freshness window (reuse the existing stored result instead of re-deriving one — for
operations that persist output to a table, e.g. `understand_product` → `products`,
`generate_icp` → `icp_profiles`, read the existing row instead of calling the model).

**Acceptance:** Clicking the same generate/research action twice in a row with no
underlying data change produces one `ai_runs` charge, not two.

### R2 — Cap spend, not just run count

**Problem:** `assertWithinUsageLimit` only checks `totalRuns >= 200`. `totalCost` is
already computed by `getWorkspaceUsage` and displayed on `/usage`, but never enforced. A
workspace can hit $50+ from 60 `discover_prospects` runs while still "within limit."

**Requirement:** Add a monthly cost ceiling per workspace (config value, e.g. $20/month
for free tier) enforced in `assertWithinUsageLimit` alongside the existing run-count
check — whichever limit is hit first blocks further AI calls.

**Acceptance:** A workspace whose `totalCost` crosses the ceiling gets the same
`UsageLimitExceededError` treatment as hitting the run cap, even with runs remaining.

### R3 — Bound web-search cost per call

**Problem:** `discover_prospects` (`max_uses: 10`) and `research_prospect`
(`max_uses: 5`) let the model search up to N times with no cap on how much content each
search pulls back, which is why input tokens hit 300K+.

**Requirement:**

- Lower `discover_prospects` to `max_uses: 6` (10 was sized before real cost data
  existed; 6 covers 10 companies in practice).
- Add an explicit prompt instruction to stop searching once enough evidence is gathered
  rather than exhausting the budget by default.
- Log `search_count` actually used (available on the response) into `ai_runs` so future
  tuning has real data instead of guesses.

**Acceptance:** Median `discover_prospects` input tokens drop measurably (target: under
150K) without a drop in suggestion quality.

### R4 — Show cost before expensive actions, not just after

**Problem:** Nothing on the "Discover prospects" or "Research" buttons tells the founder
these are the two most expensive operations in the app before they click.

**Requirement:** Add a one-line cost hint next to `discoverProspects` and
`researchProspect` triggers (e.g. "Typically $0.30–$0.80 — searches the live web"),
sourced from a rolling average of that operation's last N `ai_runs.estimated_cost` rows
rather than a hardcoded number.

**Acceptance:** The hint updates as real averages shift; no hardcoded dollar figure ships
in the UI.

### R5 — Close the usage-page gap

**Problem:** `/usage`'s `OPERATION_LABEL` map doesn't include `discover_prospects` (added
after that map was written), so it falls back to the raw operation string, and the
progress bar is driven by `totalRuns` even though `totalCost` is the number that actually
matters per R2.

**Requirement:** Add the missing label; switch the primary progress bar to show cost
against the new R2 ceiling, with run count as secondary detail.

### R6 — Server-side idempotency, not just a disabled button

**Problem:** The pending-state button work (previous pass) stops a second click while a
request is in flight, but a network retry or resubmitted form after a timeout can still
trigger a duplicate server action. R1's hash check covers most of this, but purely
time-based operations (e.g. `discover_prospects`, which has no persisted "input" to hash
against besides the ICP + known-companies list) need an explicit in-flight lock per
workspace so two overlapping discovery runs can't both bill.

**Acceptance:** Firing the same action twice in quick succession (simulated) results in
one AI call, one `ai_runs` row.

## 4. Priority

- **P0** (do first, highest $ impact, no architecture change): R1, R2.
- **P1:** R3, R6.
- **P2** (polish): R4, R5.
