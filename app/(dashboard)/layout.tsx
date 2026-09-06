import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentAccount,
  getWorkspaceForProduct,
  listBusinesses,
  listProducts,
} from "@/lib/tenancy/queries";
import type { Product, Workspace } from "@/lib/tenancy/types";
import { getWorkspaceUsage } from "@/lib/usage/queries";
import { creditsUsedPercent } from "@/lib/usage/format";
import { FREE_TIER_MONTHLY_COST_LIMIT_USD } from "@/lib/usage/limits";
import { signOut } from "@/app/(auth)/actions";
import { createBusinessAction } from "@/app/(dashboard)/dashboard/actions";
import { Sidebar } from "@/components/tenancy/sidebar";
import { SidebarProvider } from "@/components/tenancy/sidebar-context";
import { SidebarToggle } from "@/components/tenancy/sidebar-toggle";
import { BusinessSelector } from "@/components/tenancy/business-selector";
import { AiChatWidget } from "@/components/chat/ai-chat-widget";

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
  const businesses = account ? await listBusinesses(account.id) : [];
  const productLists = await Promise.all(
    businesses.map((business) => listProducts(business.id)),
  );
  const productsByBusiness: Record<string, Product[]> = {};
  businesses.forEach((business, i) => {
    productsByBusiness[business.id] = productLists[i];
  });

  const allProducts = productLists.flat();
  const workspaces = (
    await Promise.all(allProducts.map((product) => getWorkspaceForProduct(product.id)))
  ).filter((w): w is Workspace => w !== null);
  const totalCost = (
    await Promise.all(workspaces.map((w) => getWorkspaceUsage(w.id)))
  ).reduce((sum, u) => sum + u.totalCost, 0);
  const creditsPercent = creditsUsedPercent(
    totalCost,
    FREE_TIER_MONTHLY_COST_LIMIT_USD * Math.max(workspaces.length, 1),
  );

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
              <Image
                src="/logo-mark.png"
                alt=""
                width={442}
                height={350}
                priority
                className="h-8 w-auto"
              />
            </Link>
            {account ? (
              <BusinessSelector
                businesses={businesses}
                createBusinessAction={createBusinessAction.bind(null, account.id)}
              />
            ) : null}
          </div>
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
