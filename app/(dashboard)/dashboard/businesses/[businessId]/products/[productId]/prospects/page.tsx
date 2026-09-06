import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Upload } from "lucide-react";
import { getProduct, getWorkspaceForProduct } from "@/lib/tenancy/queries";
import { listProspects, listProspectIndustries } from "@/lib/prospects/queries";
import type { ProspectStatus } from "@/lib/prospects/types";
import type { ProspectStage } from "@/lib/prospects/pipeline";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { ProspectFilters } from "@/components/prospects/prospect-filters";
import { ProspectsTable } from "@/components/prospects/prospects-table";
import { createProspectAction, bulkResearchAction, bulkScoreAction } from "./actions";

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
    bulkAction?: string;
    bulkCompleted?: string;
    bulkSkipped?: string;
    bulkLimit?: string;
  }>;
}) {
  const { businessId, productId } = await params;
  const {
    status,
    industry,
    search,
    stage,
    sort,
    imported,
    skipped,
    duplicates,
    bulkAction,
    bulkCompleted,
    bulkSkipped,
    bulkLimit,
  } = await searchParams;

  const product = await getProduct(productId);
  if (!product || product.business_id !== businessId) notFound();

  const workspace = await getWorkspaceForProduct(product.id);
  if (!workspace) notFound();

  const sortMode = sort === "stage" || sort === "priority" ? sort : "recent";

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
  const hasActiveFilters = Boolean(status || industry || search || stage || sort);
  const hasAdvancedFilters = Boolean(status || stage || industry || sort);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Prospects</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/import`}>
              <Upload className="size-4" aria-hidden="true" />
              Import CSV
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/discover`}>
              <Sparkles className="size-4" aria-hidden="true" />
              Discover
            </Link>
          </Button>
        </div>
      </div>

      {imported ? (
        <p className="rounded-md border bg-muted p-3 text-sm">
          Imported {imported} prospect{imported === "1" ? "" : "s"}.
          {skipped && skipped !== "0" ? ` Skipped ${skipped} row(s) missing a name.` : ""}
          {duplicates && duplicates !== "0"
            ? ` Skipped ${duplicates} row(s) already in your pipeline.`
            : ""}
        </p>
      ) : null}
      {bulkAction ? (
        <p className="rounded-md border bg-muted p-3 text-sm">
          {bulkAction === "research" ? "Researched" : "Scored"} {bulkCompleted ?? 0} prospect
          {bulkCompleted === "1" ? "" : "s"}.
          {bulkSkipped && bulkSkipped !== "0"
            ? ` Skipped ${bulkSkipped} (not eligible for this step, or failed).`
            : ""}
          {bulkLimit === "1"
            ? " Stopped early -- this workspace hit its free-tier monthly AI usage limit."
            : ""}
        </p>
      ) : null}

      <ProspectFilters
        basePath={basePath}
        search={search ?? ""}
        status={status ?? ""}
        stage={stage ?? ""}
        industry={industry ?? ""}
        sort={sort ?? "recent"}
        industries={industries}
        defaultAdvancedOpen={hasAdvancedFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {prospects.length === 0 ? (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          {hasActiveFilters ? "No prospects match these filters." : "No prospects yet."}
        </p>
      ) : (
        <ProspectsTable
          prospects={prospects}
          basePath={basePath}
          bulkResearchAction={bulkResearchAction.bind(null, businessId, productId, workspace.id)}
          bulkScoreAction={bulkScoreAction.bind(null, businessId, productId, workspace.id)}
        />
      )}

      <CollapsibleCard label="Add a prospect">
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
      </CollapsibleCard>
    </div>
  );
}
