import { notFound } from "next/navigation";
import { getProduct, getWorkspaceForProduct } from "@/lib/tenancy/queries";
import { listProductKnowledge } from "@/lib/knowledge/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addManualSourceAction,
  addWebsiteSourceAction,
  deleteSourceAction,
  generateProductProfileAction,
} from "./actions";

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ businessId: string; productId: string }>;
}) {
  const { businessId, productId } = await params;
  const product = await getProduct(productId);
  if (!product || product.business_id !== businessId) notFound();

  const workspace = await getWorkspaceForProduct(product.id);
  if (!workspace) notFound();

  const sources = await listProductKnowledge(workspace.id);
  const profile = product.product_profile;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Product profile</h2>
          <form action={generateProductProfileAction.bind(null, businessId, productId)}>
            {profile ? <input type="hidden" name="force" value="true" /> : null}
            <Button type="submit" size="sm" disabled={sources.length === 0}>
              {profile ? "Regenerate" : "Generate profile"}
            </Button>
          </form>
        </div>

        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a knowledge source below first.
          </p>
        ) : !profile ? (
          <p className="text-sm text-muted-foreground">
            Not generated yet. Click &quot;Generate profile&quot; to have AI analyze the
            sources below.
          </p>
        ) : (
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium">Category</dt>
              <dd className="text-muted-foreground">{profile.category}</dd>
            </div>
            <div>
              <dt className="font-medium">Problem</dt>
              <dd className="text-muted-foreground">{profile.problem}</dd>
            </div>
            <div>
              <dt className="font-medium">Solution</dt>
              <dd className="text-muted-foreground">{profile.solution}</dd>
            </div>
            {profile.features.length > 0 ? (
              <div>
                <dt className="font-medium">Features</dt>
                <dd className="text-muted-foreground">{profile.features.join(", ")}</dd>
              </div>
            ) : null}
            {profile.differentiators.length > 0 ? (
              <div>
                <dt className="font-medium">Differentiators</dt>
                <dd className="text-muted-foreground">
                  {profile.differentiators.join(", ")}
                </dd>
              </div>
            ) : null}
            {profile.target_industries.length > 0 ? (
              <div>
                <dt className="font-medium">Target industries</dt>
                <dd className="text-muted-foreground">
                  {profile.target_industries.join(", ")}
                </dd>
              </div>
            ) : null}
            {profile.target_roles.length > 0 ? (
              <div>
                <dt className="font-medium">Target roles</dt>
                <dd className="text-muted-foreground">
                  {profile.target_roles.join(", ")}
                </dd>
              </div>
            ) : null}
            {profile.use_cases.length > 0 ? (
              <div>
                <dt className="font-medium">Use cases</dt>
                <dd className="text-muted-foreground">{profile.use_cases.join(", ")}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium">Pricing</dt>
              <dd className="text-muted-foreground">
                {profile.pricing_summary ?? "Not mentioned in sources"}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Competitive positioning</dt>
              <dd className="text-muted-foreground">{profile.competitive_positioning}</dd>
            </div>
            <div>
              <dt className="font-medium">Confidence</dt>
              <dd className="text-muted-foreground">
                {Math.round(profile.confidence * 100)}%
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Knowledge sources</h2>

        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sources yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sources.map((source) => (
              <li
                key={source.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {source.source_name}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({source.source_type})
                    </span>
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {truncate(source.content, 200)}
                  </p>
                </div>
                <form
                  action={deleteSourceAction.bind(null, businessId, productId, source.id)}
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
          <h3 className="text-sm font-medium">Add a description</h3>
          <form
            action={addManualSourceAction.bind(null, businessId, productId, workspace.id)}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="content">What does this product do?</Label>
              <Textarea id="content" name="content" rows={4} required />
            </div>
            <Button type="submit" size="sm" className="self-start">
              Add
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-3 rounded-md border p-4">
          <h3 className="text-sm font-medium">Add a website</h3>
          <form
            action={addWebsiteSourceAction.bind(null, businessId, productId, workspace.id)}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">URL</Label>
              <Input id="url" name="url" type="url" placeholder="https://" required />
            </div>
            <Button type="submit" size="sm" className="self-start">
              Fetch and add
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
