import type { OperationCostSample } from "./types";

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Pre-action cost hint text for an expensive operation's trigger button. Never a
 * hardcoded dollar figure -- with no run history yet, says so instead of guessing. */
export function formatCostHint(sample: OperationCostSample | null): string {
  if (!sample) return "Searches the live web -- cost shown here after your first run.";
  const range =
    sample.min === sample.max
      ? currencyFormat.format(sample.min)
      : `${currencyFormat.format(sample.min)}–${currencyFormat.format(sample.max)}`;
  return `Typically ${range} -- searches the live web.`;
}
