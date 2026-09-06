import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/tenancy/queries";
import { getAccountUsageAndProspects, getAccountWorkspaceEntries } from "@/lib/dashboard/queries";
import { creditsUsedPercent } from "@/lib/usage/format";
import { FREE_TIER_MONTHLY_COST_LIMIT_USD } from "@/lib/usage/limits";
import { deriveAccountAlerts } from "@/lib/alerts/derive";
import { signOut } from "@/app/(auth)/actions";
import { createBusinessAction } from "@/app/(dashboard)/dashboard/actions";
import { Sidebar } from "@/components/tenancy/sidebar";
import { SidebarProvider } from "@/components/tenancy/sidebar-context";
import { SidebarToggle } from "@/components/tenancy/sidebar-toggle";
import { BusinessSelector } from "@/components/tenancy/business-selector";
import { AiChatWidget } from "@/components/chat/ai-chat-widget";
import { AlertBell } from "@/components/alerts/alert-bell";
import { LogoMark } from "@/components/ui/logo-mark";

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
  // getAccountWorkspaceEntries/getAccountUsageAndProspects are React cache()-wrapped by
  // accountId, so when the /dashboard page below also calls them in the same request,
  // it reuses this exact result instead of re-running its own full account scan.
  const { businesses, productsByBusiness, entries } = account
    ? await getAccountWorkspaceEntries(account.id)
    : { businesses: [], productsByBusiness: {}, entries: [] };
  const { usageByWorkspace, prospects } = account
    ? await getAccountUsageAndProspects(account.id)
    : { usageByWorkspace: {}, prospects: [] };

  const totalCost = Object.values(usageByWorkspace).reduce((sum, u) => sum + u.totalCost, 0);
  const creditsPercent = creditsUsedPercent(
    totalCost,
    FREE_TIER_MONTHLY_COST_LIMIT_USD * Math.max(entries.length, 1),
  );
  const alerts = deriveAccountAlerts({ entries, usageByWorkspace, prospects });

  const metadata = user.user_metadata ?? {};
  const displayName = (metadata.full_name || metadata.name || null) as string | null;
  const avatarUrl = (metadata.avatar_url || metadata.picture || null) as string | null;

  return (
    <SidebarProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <header className="relative z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarToggle />
            <Link
              href="/dashboard"
              aria-label="co-founder-ai"
              className="flex shrink-0 items-center transition-transform duration-100 active:scale-95"
            >
              <LogoMark className="h-8 w-auto" />
            </Link>
            {account ? (
              <BusinessSelector
                businesses={businesses}
                createBusinessAction={createBusinessAction.bind(null, account.id)}
              />
            ) : null}
          </div>
          <AlertBell alerts={alerts} />
          <AiChatWidget />
        </header>
        <Sidebar
          businesses={businesses}
          productsByBusiness={productsByBusiness}
          creditsUsedPercent={creditsPercent}
          accountName={displayName}
          accountEmail={user.email ?? ""}
          accountAvatarUrl={avatarUrl}
          signOutAction={signOut}
        />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </SidebarProvider>
  );
}
