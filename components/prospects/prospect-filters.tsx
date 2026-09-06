"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ProspectStatus } from "@/lib/prospects/types";
import { PROSPECT_STAGES, PROSPECT_STAGE_LABEL } from "@/lib/prospects/pipeline";

const STATUS_OPTIONS: ProspectStatus[] = ["new", "qualified", "disqualified"];

/**
 * Compact by default: just the search box. "Advanced" reveals status/stage/industry/sort
 * -- kept mounted (hidden, not unmounted) while collapsed so an already-active advanced
 * filter isn't silently dropped from the next search-box submit.
 */
export function ProspectFilters({
  basePath,
  search,
  status,
  stage,
  industry,
  sort,
  industries,
  defaultAdvancedOpen,
  hasActiveFilters,
}: {
  basePath: string;
  search: string;
  status: string;
  stage: string;
  industry: string;
  sort: string;
  industries: string[];
  defaultAdvancedOpen: boolean;
  hasActiveFilters: boolean;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(defaultAdvancedOpen);

  return (
    <form method="get" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by company name..."
            className="pl-8"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="shrink-0 gap-1.5"
        >
          Advanced
          <ChevronDown
            className={cn("size-4 transition-transform duration-150", advancedOpen && "rotate-180")}
            aria-hidden="true"
          />
        </Button>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-end gap-3 rounded-md border p-3",
          !advancedOpen && "hidden",
        )}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={status}>
            <option value="">Any</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stage">Stage</Label>
          <Select id="stage" name="stage" defaultValue={stage}>
            <option value="">Any</option>
            {PROSPECT_STAGES.map((s) => (
              <option key={s} value={s}>
                {PROSPECT_STAGE_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
        {industries.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Select id="industry" name="industry" defaultValue={industry}>
              <option value="">Any</option>
              {industries.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sort">Sort</Label>
          <Select id="sort" name="sort" defaultValue={sort}>
            <option value="recent">Most recent</option>
            <option value="stage">Pipeline stage</option>
            <option value="priority">Priority (highest fit, needs action)</option>
          </Select>
        </div>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
        {hasActiveFilters ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={basePath}>Clear</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
