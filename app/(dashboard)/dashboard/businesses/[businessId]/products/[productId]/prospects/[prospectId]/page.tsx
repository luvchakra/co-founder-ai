import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getWorkspaceForProduct } from "@/lib/tenancy/queries";
import { getProspect } from "@/lib/prospects/queries";
import { listContacts } from "@/lib/contacts/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateProspectAction,
  updateProspectStatusAction,
  addContactAction,
  deleteContactAction,
} from "./actions";

const STATUS_OPTIONS = ["new", "qualified", "disqualified"] as const;

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ businessId: string; productId: string; prospectId: string }>;
}) {
  const { businessId, productId, prospectId } = await params;
  const product = await getProduct(productId);
  if (!product || product.business_id !== businessId) notFound();

  const workspace = await getWorkspaceForProduct(product.id);
  if (!workspace) notFound();

  const prospect = await getProspect(prospectId);
  if (!prospect || prospect.workspace_id !== workspace.id) notFound();

  const contacts = await listContacts(prospect.id);
  const basePath = `/dashboard/businesses/${businessId}/products/${productId}/prospects`;

  return (
    <div className="flex flex-col gap-8">
      <Link href={basePath} className="text-sm text-muted-foreground hover:underline">
        ← Back to prospects
      </Link>

      <section className="flex flex-col gap-4 rounded-md border p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium">{prospect.company_name}</h2>
          <form
            action={updateProspectStatusAction.bind(null, businessId, productId, prospect.id)}
            className="flex items-center gap-2"
          >
            <select
              name="status"
              defaultValue={prospect.status}
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="outline">
              Update status
            </Button>
          </form>
        </div>

        <form
          action={updateProspectAction.bind(null, businessId, productId, prospect.id)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={prospect.company_name}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={prospect.website ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" defaultValue={prospect.industry ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companySize">Company size</Label>
            <Input
              id="companySize"
              name="companySize"
              defaultValue={prospect.company_size ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={prospect.location ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={prospect.description ?? ""}
            />
          </div>
          <Button type="submit" size="sm" className="self-start sm:col-span-2">
            Save changes
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Contacts</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || "(no name)"}
                    {c.job_title ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {c.job_title}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {[c.email, c.phone, c.linkedin_url].filter(Boolean).join(" · ") ||
                      "No contact details"}
                  </p>
                </div>
                <form
                  action={deleteContactAction.bind(
                    null,
                    businessId,
                    productId,
                    prospect.id,
                    c.id,
                  )}
                >
                  <Button variant="ghost" size="sm" type="submit">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 rounded-md border p-4">
          <h3 className="text-sm font-medium">Add a contact</h3>
          <form
            action={addContactAction.bind(
              null,
              businessId,
              productId,
              workspace.id,
              prospect.id,
            )}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="jobTitle">Job title</Label>
              <Input id="jobTitle" name="jobTitle" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input id="linkedinUrl" name="linkedinUrl" type="url" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <Button type="submit" size="sm" className="self-start sm:col-span-2">
              Add contact
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
