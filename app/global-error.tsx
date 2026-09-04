"use client";

// Catches errors in the root layout itself, which app/error.tsx cannot -- this replaces
// the entire document, so it defines its own <html>/<body> and avoids importing anything
// that could itself be implicated in a root-layout crash.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Something went wrong</h2>
        <p style={{ maxWidth: "28rem", fontSize: "0.875rem", color: "#666" }}>{error.message}</p>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #ccc",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
