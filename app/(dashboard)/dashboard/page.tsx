import { redirect } from "next/navigation";
import { getCurrentAccount, listBusinesses, listProducts } from "@/lib/tenancy/queries";
import type { Product } from "@/lib/tenancy/types";
import { BusinessList } from "@/components/tenancy/business-list";

export default async function DashboardPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");

  const businesses = await listBusinesses(account.id);
  const productsByBusiness: Record<string, Product[]> = {};
  for (const business of businesses) {
    productsByBusiness[business.id] = await listProducts(business.id);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <section>
        <h1 className="text-xl font-semibold">Your businesses</h1>
        {businesses.length === 0 ? (
          <p className="mt-2 text-muted-foreground">
            Use the business selector in the header to create your first business and
            start building a GTM workspace for a product.
          </p>
        ) : (
          <div className="mt-4">
            <BusinessList businesses={businesses} productsByBusiness={productsByBusiness} />
          </div>
        )}
      </section>
    </main>
  );
}
