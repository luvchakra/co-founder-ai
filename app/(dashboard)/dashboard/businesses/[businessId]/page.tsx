import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusiness, listProducts } from "@/lib/tenancy/queries";
import { createProductAction } from "@/app/(dashboard)/dashboard/actions";
import { renameBusinessAction, updateBusinessDescriptionAction } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditableName } from "@/components/tenancy/editable-name";
import { EditableText } from "@/components/tenancy/editable-text";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const business = await getBusiness(businessId);
  if (!business) notFound();

  const products = await listProducts(business.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <div className="flex flex-col gap-2">
        <EditableName
          name={business.name}
          action={renameBusinessAction.bind(null, business.id)}
          headingClassName="text-xl font-semibold"
        />
        <EditableText
          value={business.description}
          action={updateBusinessDescriptionAction.bind(null, business.id)}
          placeholder="Add a description for this business"
          multiline
          textClassName="text-sm text-muted-foreground"
        />
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
            <Input id="website" name="website" type="text" placeholder="https://" />
          </div>
          <SubmitButton pendingText="Creating...">Create product</SubmitButton>
        </form>
      </section>
    </main>
  );
}
