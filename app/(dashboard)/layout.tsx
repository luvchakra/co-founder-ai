import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount, listBusinesses, listProducts } from "@/lib/tenancy/queries";
import type { Product } from "@/lib/tenancy/types";
import { signOut } from "@/app/(auth)/actions";
import { createBusinessAction } from "@/app/(dashboard)/dashboard/actions";
import { Sidebar } from "@/components/tenancy/sidebar";
import { BusinessSelector } from "@/components/tenancy/business-selector";
import { UserMenu } from "@/components/tenancy/user-menu";

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
  const productsByBusiness: Record<string, Product[]> = {};
  for (const business of businesses) {
    productsByBusiness[business.id] = await listProducts(business.id);
  }

  const metadata = user.user_metadata ?? {};
  const displayName = (metadata.full_name || metadata.name || null) as string | null;
  const avatarUrl = (metadata.avatar_url || metadata.picture || null) as string | null;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="font-semibold">
            co-founder-ai
          </Link>
          {account ? (
            <BusinessSelector
              businesses={businesses}
              createBusinessAction={createBusinessAction.bind(null, account.id)}
            />
          ) : null}
        </div>
        <UserMenu
          name={displayName}
          email={user.email ?? ""}
          avatarUrl={avatarUrl}
          signOutAction={signOut}
        />
      </header>
      <div className="flex flex-1">
        <Sidebar businesses={businesses} productsByBusiness={productsByBusiness} />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
