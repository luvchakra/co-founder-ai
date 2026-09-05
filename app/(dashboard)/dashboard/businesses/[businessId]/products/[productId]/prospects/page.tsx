import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getWorkspaceForProduct } from "@/lib/tenancy/queries";
import { listProspects, listProspectIndustries } from "@/lib/prospects/queries";
import type { ProspectStatus } from "@/lib/prospects/types";
import { PROSPECT_STAGES, PROSPECT_STAGE_LABEL, type ProspectStage } from "@/lib/prospects/pipeline";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProspectAction } from "./actions";

const STATUS_OPTIONS: ProspectStatus[] = ["new", "qualified", "disqualified"];

export default async function ProspectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string; productId: string }>;
  searchParams: Promise<{
    status?: string;
    industry?: string;
    search?: string;
    stage?: string;
    sort?: string;
    imported?: string;
    skipped?: string;
    duplicates?: string;
  }>;
}) {
  const { businessId, productId } = await params;
  const { status, industry, search, stage, sort, imported, skipped, duplicates } =
    await searchParams;

  const product = await getProduct(productId);
  if (!product || product.business_id !== businessId) notFound();

  const workspace = await getWorkspaceForProduct(product.id);
  if (!workspace) notFound();

  const sortMode = sort === "stage" ? "stage" : "recent";

  const [prospects, industries] = await Promise.all([
    listProspects(
      workspace.id,
      {
        status: (status as ProspectStatus) || undefined,
        industry: industry || undefined,
        search: search || undefined,
        stage: (stage as ProspectStage) || undefined,
      },
      sortMode,
    ),
    listProspectIndustries(workspace.id),
  ]);

  const basePath = `/dashboard/businesses/${businessId}/products/${productId}/prospects`;

  return (
    <div className="flex flex-col gap-6">
      {imported ? (
        <p className="rounded-md border bg-muted p-3 text-sm">
          Imported {imported} prospect{imported === "1" ? "" : "s"}.
          {skipped && skipped !== "0" ? ` Skipped ${skipped} row(s) missing a name.` : ""}
          {duplicates && duplicates !== "0"
            ? ` Skipped ${duplicates} row(s) already in your pipeline.`
            : ""}
        </p>
      ) : null}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Company name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Any</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stage">Stage</Label>
          <select
            id="stage"
            name="stage"
            defaultValue={stage ?? ""}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Any</option>
            {PROSPECT_STAGES.map((s) => (
              <option key={s} value={s}>
                {PROSPECT_STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {industries.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="industry">Industry</Label>
            <select
              id="industry"
              name="industry"
              defaultValue={industry ?? ""}
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">Any</option>
              {industries.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sort">Sort</Label>
          <select
            id="sort"
            name="sort"
            defaultValue={sortMode}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="recent">Most recent</option>
            <option value="stage">Pipeline stage</option>
          </select>
        </div>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
        {status || industry || search || stage || sort ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={basePath}>Clear</Link>
          </Button>
        ) : null}
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Company</th>
              <th className="py-2 pr-4 font-medium">Industry</th>
              <th className="py-2 pr-4 font-medium">Size</th>
              <th className="py-2 pr-4 font-medium">Location</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Fit score</th>
              <th className="py-2 pr-4 font-medium">Stage</th>
              <th className="py-2 pr-4 font-medium">Next action</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <Link href={`${basePath}/${p.id}`} className="font-medium hover:underline">
                    {p.company_name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-muted-foreground">{p.industry ?? "—"}</td>
                <td className="py-2 pr-4 text-muted-foreground">{p.company_size ?? "—"}</td>
                <td className="py-2 pr-4 text-muted-foreground">{p.location ?? "—"}</td>
                <td className="py-2 pr-4 text-muted-foreground">{p.status}</td>
                <td className="py-2 pr-4 text-muted-foreground">{p.fit_score ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {PROSPECT_STAGE_LABEL[p.stage]}
                  </span>
                  {p.isStuck ? (
                    <span
                      title={`No activity since ${new Date(p.lastActivityAt).toLocaleDateString()}`}
                      className="ml-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
                    >
                      Needs next step
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-4">
                  {p.nextAction ? (
                    <Link href={`${basePath}/${p.id}`} className="text-sm underline underline-offset-4">
                      {p.nextAction}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {prospects.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No prospects match these filters.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="text-sm font-medium">Add a prospect</h2>
        <form
          action={createProspectAction.bind(null, businessId, productId, workspace.id)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" name="companyName" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" type="text" placeholder="https://" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companySize">Company size</Label>
            <Input id="companySize" name="companySize" placeholder="e.g. 50-200 employees" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" />
          </div>
          <SubmitButton size="sm" className="self-start sm:col-span-2" pendingText="Adding...">
            Add prospect
          </SubmitButton>
        </form>
      </div>

      <div className="flex items-center gap-4">
        <Link href={`${basePath}/import`} className="text-sm underline underline-offset-4">
          Import prospects from CSV
        </Link>
        <Link href={`${basePath}/discover`} className="text-sm underline underline-offset-4">
          Discover prospects automatically
        </Link>
      </div>
    </div>
  );
}
