import { notFound } from "next/navigation";
import { getBusiness, getProduct } from "@/lib/tenancy/queries";
import { ProductNav } from "@/components/tenancy/product-nav";
import { EditableName } from "@/components/tenancy/editable-name";
import { ExpandableText } from "@/components/ui/expandable-text";
import { Breadcrumbs } from "@/components/tenancy/breadcrumbs";
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

  const business = await getBusiness(businessId);
  if (!business) notFound();

  const basePath = `/dashboard/businesses/${businessId}/products/${productId}`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: business.name, href: `/dashboard/businesses/${businessId}` },
          { label: product.name },
        ]}
      />
      <div className="flex flex-col gap-1">
        <EditableName
          name={product.name}
          action={renameProductAction.bind(null, businessId, productId)}
          headingClassName="text-xl font-semibold"
        />
        {product.description ? (
          <ExpandableText text={product.description} className="text-sm text-muted-foreground" />
        ) : null}
      </div>
      <ProductNav basePath={basePath} />
      {children}
    </main>
  );
}
