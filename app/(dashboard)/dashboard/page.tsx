import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAccount, listBusinesses } from "@/lib/tenancy/queries";
import { createBusinessAction } from "@/app/(dashboard)/dashboard/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function DashboardPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");

  const businesses = await listBusinesses(account.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <section>
        <h1 className="text-xl font-semibold">Your businesses</h1>
        {businesses.length === 0 ? (
          <p className="mt-2 text-muted-foreground">
            Create your first business to start building a GTM workspace for a product.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {businesses.map((business) => (
              <li key={business.id}>
                <Link
                  href={`/dashboard/businesses/${business.id}`}
                  className="block rounded-md border p-3 hover:bg-accent"
                >
                  <span className="font-medium">{business.name}</span>
                  {business.industry ? (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {business.industry}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">Create a business</h2>
        <form
          action={createBusinessAction.bind(null, account.id)}
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" />
          </div>
          <SubmitButton pendingText="Creating...">Create business</SubmitButton>
        </form>
      </section>
    </main>
  );
}
