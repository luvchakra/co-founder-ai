import { notFound } from "next/navigation";
import { getProduct, listProducts } from "@/lib/tenancy/queries";
import { ProductSwitcher } from "@/components/tenancy/product-switcher";
import { ProductNav } from "@/components/tenancy/product-nav";

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessId: string; productId: string }>;
}) {
  const { businessId, productId } = await params;
  const product = await getProduct(productId);
  if (!product || product.business_id !== businessId) notFound();

  const products = await listProducts(businessId);
  const basePath = `/dashboard/businesses/${businessId}/products/${productId}`;

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
      <ProductNav basePath={basePath} />
      {children}
    </main>
  );
}
