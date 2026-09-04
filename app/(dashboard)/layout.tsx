import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/tenancy/queries";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const account = await getCurrentAccount();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href="/dashboard" className="font-semibold">
          co-founder-ai
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {account ? <span>{account.name}</span> : null}
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
