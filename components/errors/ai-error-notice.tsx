import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Custom error properties (AiProviderError's `code`/`provider` from lib/ai/router.ts)
 * don't survive a Server Action error crossing to the client -- only `.message` does.
 * So "is this an AI/BYOK failure" is a heuristic over the message text, matching the
 * fixed phrases toAiProviderError always includes (e.g. "API key could not complete",
 * "Connect an AI provider", "hit a rate limit or quota cap").
 */
function isAiProviderFailure(message: string): boolean {
  return /api key|ai provider|rate limit|quota|model .* isn't available|is currently unavailable|request to \w+ timed out/i.test(
    message,
  );
}

/**
 * Shared "Something went wrong" error boundary body. Every AI-invoking route (product
 * profile, ICP, prospect research/discovery/strategy/messages) can hit an
 * AiProviderError from the BYOK router, and a bare error.message left the founder
 * guessing what to actually do about it -- this always shows the message, and adds a
 * concrete options list whenever the message looks AI/provider-related.
 */
export function AiErrorNotice({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const showAiOptions = isAiProviderFailure(error.message);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>

      {showAiOptions ? (
        <div className="max-w-md rounded-md border bg-muted/40 p-4 text-left text-sm">
          <p className="font-medium">What you can do:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Check your connection under{" "}
              <Link href="/dashboard/settings/ai-provider" className="underline">
                AI Provider settings
              </Link>{" "}
              -- replace the key if it&apos;s expired or revoked.
            </li>
            <li>
              If your provider account hit a rate limit or quota cap, check its billing
              plan, then retry once that&apos;s resolved.
            </li>
            <li>
              You can connect a different provider (OpenAI, Anthropic, or Google) at any
              time from the same settings page.
            </li>
          </ul>
        </div>
      ) : null}

      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
