import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBusiness,
  listProducts,
  getCurrentAccount,
  listBusinesses,
} from "@/lib/tenancy/queries";
import { createProductAction } from "@/app/(dashboard)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BusinessSwitcher } from "@/components/tenancy/business-switcher";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const business = await getBusiness(businessId);
  if (!business) notFound();

  const account = await getCurrentAccount();
  const [products, businesses] = await Promise.all([
    listProducts(business.id),
    account ? listBusinesses(account.id) : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{business.name}</h1>
        {businesses.length > 1 ? (
          <BusinessSwitcher businesses={businesses} currentBusinessId={business.id} />
        ) : null}
      </div>

      <section>
        <h2 className="font-medium">Products</h2>
        {products.length === 0 ? (
          <p className="mt-2 text-muted-foreground">
            Create a product to get its own GTM workspace.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/dashboard/businesses/${business.id}/products/${product.id}`}
                  className="block rounded-md border p-3 hover:bg-accent"
                >
                  {product.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">Create a product</h2>
        <form
          action={createProductAction.bind(null, business.id)}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" type="url" placeholder="https://" />
          </div>
          <Button type="submit">Create product</Button>
        </form>
      </section>
    </main>
  );
}
