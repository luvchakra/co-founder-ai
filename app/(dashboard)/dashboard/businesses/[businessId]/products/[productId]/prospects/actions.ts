"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createProspect } from "@/lib/prospects/mutations";
import { findDuplicateProspect } from "@/lib/prospects/duplicates";

function prospectsPath(businessId: string, productId: string) {
  return `/dashboard/businesses/${businessId}/products/${productId}/prospects`;
}

export async function createProspectAction(
  businessId: string,
  productId: string,
  workspaceId: string,
  formData: FormData,
) {
  const companyName = String(formData.get("companyName") ?? "");
  const website = String(formData.get("website") ?? "");

  const duplicate = await findDuplicateProspect(workspaceId, { companyName, website });
  if (duplicate) {
    revalidatePath(prospectsPath(businessId, productId));
    redirect(`${prospectsPath(businessId, productId)}/${duplicate.id}?duplicate=1`);
  }

  const prospect = await createProspect(workspaceId, {
    companyName,
    website,
    industry: String(formData.get("industry") ?? ""),
    companySize: String(formData.get("companySize") ?? ""),
    location: String(formData.get("location") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  revalidatePath(prospectsPath(businessId, productId));
  redirect(`${prospectsPath(businessId, productId)}/${prospect.id}`);
}
