import { notFound } from "next/navigation";
import { getProduct, getWorkspaceForProduct, listProducts } from "@/lib/tenancy/queries";
import { ProductSwitcher } from "@/components/tenancy/product-switcher";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ businessId: string; productId: string }>;
}) {
  const { businessId, productId } = await params;
  const product = await getProduct(productId);
  if (!product || product.business_id !== businessId) notFound();

  const [workspace, products] = await Promise.all([
    getWorkspaceForProduct(product.id),
    listProducts(businessId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{product.name}</h1>
        {products.length > 1 ? (
          <ProductSwitcher
            businessId={businessId}
            products={products}
            currentProductId={product.id}
          />
        ) : null}
      </div>
      <p className="text-muted-foreground">
        GTM workspace: {workspace?.name ?? "—"}. Product intelligence, ICP, prospects, and
        outreach land here starting in Epic 3.
      </p>
    </main>
  );
}
