import { notFound } from "next/navigation";
import { getProduct } from "@/lib/tenancy/queries";
import { ProductNav } from "@/components/tenancy/product-nav";
import { EditableName } from "@/components/tenancy/editable-name";
import { renameProductAction } from "./actions";

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

  const basePath = `/dashboard/businesses/${businessId}/products/${productId}`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <EditableName
        name={product.name}
        action={renameProductAction.bind(null, businessId, productId)}
        headingClassName="text-xl font-semibold"
      />
      <ProductNav basePath={basePath} />
      {children}
    </main>
  );
}
