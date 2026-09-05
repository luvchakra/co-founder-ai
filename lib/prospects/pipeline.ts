import type { OutreachStrategyStatus } from "@/lib/outreach/types";
import type { ConversationStatus } from "@/lib/conversations/types";

/**
 * Derived pipeline stage (docs/prospects-pipeline-redesign-requirements.md R3/R4) --
 * never stored, always computed from the same child tables the rest of the app already
 * reads (prospect_research, prospect_scores, outreach_strategies, messages,
 * conversations). No new AI call and no new column: a rescore or a new message changes
 * this on the next read for free.
 */
export const PROSPECT_STAGES = [
  "new",
  "researched",
  "scored",
  "strategized",
  "messaged",
  "sent",
  "replied",
  "closed",
] as const;

export type ProspectStage = (typeof PROSPECT_STAGES)[number];

export const PROSPECT_STAGE_LABEL: Record<ProspectStage, string> = {
  new: "New",
  researched: "Researched",
  scored: "Scored",
  strategized: "Strategized",
  messaged: "Messaged",
  sent: "Sent",
  replied: "Replied",
  closed: "Closed",
};

/** A prospect sitting in the same stage this long without moving gets a "needs next
 * step" indicator on the list -- long enough that a same-day research-then-score
 * sequence never triggers it, short enough to actually surface neglected prospects. */
export const STAGE_STUCK_THRESHOLD_DAYS = 7;

export type ProspectPipelineSignals = {
  hasResearch: boolean;
  hasScore: boolean;
  latestStrategyStatus: OutreachStrategyStatus | null;
  hasUnsentMessage: boolean;
  hasFailedMessage: boolean;
  hasSentMessage: boolean;
  latestConversationStatus: ConversationStatus | null;
  /** Most recent timestamp across the prospect row and every child table below --
   * drives the "stuck for N days" indicator regardless of which stage it's stuck in. */
  lastActivityAt: string;
};

export type ProspectPipelineState = {
  stage: ProspectStage;
  /** Label for the single primary CTA a founder should take next; null once the
   * prospect has reached a stage with no further app-driven action (sent -- waiting on
   * the prospect -- or closed). */
  nextAction: string | null;
  lastActivityAt: string;
  isStuck: boolean;
};

export function deriveProspectPipelineState(
  signals: ProspectPipelineSignals,
): ProspectPipelineState {
  const {
    hasResearch,
    hasScore,
    latestStrategyStatus,
    hasUnsentMessage,
    hasFailedMessage,
    hasSentMessage,
    latestConversationStatus,
    lastActivityAt,
  } = signals;

  let stage: ProspectStage;
  let nextAction: string | null;

  if (latestConversationStatus === "closed") {
    stage = "closed";
    nextAction = null;
  } else if (latestConversationStatus === "replied") {
    stage = "replied";
    nextAction = "Generate reply";
  } else if (hasSentMessage || latestConversationStatus === "awaiting_reply") {
    stage = "sent";
    nextAction = null;
  } else if (hasUnsentMessage) {
    stage = "messaged";
    nextAction = hasFailedMessage ? "Retry send" : "Review message";
  } else if (latestStrategyStatus === "approved") {
    stage = "strategized";
    nextAction = "Generate message";
  } else if (latestStrategyStatus === "draft") {
    stage = "strategized";
    nextAction = "Approve strategy";
  } else if (hasScore) {
    stage = "scored";
    nextAction = hasResearch ? "Generate strategy" : "Research";
  } else if (hasResearch) {
    stage = "researched";
    nextAction = "Score";
  } else {
    stage = "new";
    nextAction = "Research";
  }

  const ageMs = Date.now() - new Date(lastActivityAt).getTime();
  const isStuck =
    stage !== "closed" &&
    stage !== "replied" &&
    ageMs > STAGE_STUCK_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  return { stage, nextAction, lastActivityAt, isStuck };
}

/** Latest timestamp across a set of ISO strings, ignoring nulls/undefined. */
export function latestTimestamp(...timestamps: Array<string | null | undefined>): string {
  return timestamps
    .filter((t): t is string => Boolean(t))
    .reduce((latest, t) => (t > latest ? t : latest));
}
