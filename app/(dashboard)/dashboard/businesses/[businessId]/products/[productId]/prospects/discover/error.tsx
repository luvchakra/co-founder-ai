"use client";

import { AiErrorNotice } from "@/components/errors/ai-error-notice";

export default function DiscoverError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AiErrorNotice error={error} reset={reset} />;
}
