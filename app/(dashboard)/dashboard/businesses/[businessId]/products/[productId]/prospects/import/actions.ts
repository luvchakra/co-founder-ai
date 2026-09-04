"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseProspectsCsv } from "@/lib/prospects/csv";
import { createProspectsBulk } from "@/lib/prospects/mutations";

export async function importProspectsAction(
  businessId: string,
  productId: string,
  workspaceId: string,
  formData: FormData,
) {
  const csv = String(formData.get("csv") ?? "");
  const { rows, errors } = parseProspectsCsv(csv);

  if (rows.length === 0) {
    throw new Error(errors[0] ?? "No valid rows to import.");
  }

  const inserted = await createProspectsBulk(workspaceId, rows);

  const prospectsPath = `/dashboard/businesses/${businessId}/products/${productId}/prospects`;
  revalidatePath(prospectsPath);
  redirect(`${prospectsPath}?imported=${inserted}&skipped=${errors.length}`);
}
