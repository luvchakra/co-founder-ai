import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">co-founder-ai</h1>
      <p className="max-w-md text-muted-foreground">
        AI GTM / Customer Acquisition Co-Founder — foundation is up. Auth, accounts, and
        workspaces land in Epic 2.
      </p>
      <Button disabled>Sign in (coming in Epic 2)</Button>
    </main>
  );
}
