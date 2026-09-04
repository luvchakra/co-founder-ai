"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createProspect } from "@/lib/prospects/mutations";

function prospectsPath(businessId: string, productId: string) {
  return `/dashboard/businesses/${businessId}/products/${productId}/prospects`;
}

export async function createProspectAction(
  businessId: string,
  productId: string,
  workspaceId: string,
  formData: FormData,
) {
  const prospect = await createProspect(workspaceId, {
    companyName: String(formData.get("companyName") ?? ""),
    website: String(formData.get("website") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    companySize: String(formData.get("companySize") ?? ""),
    location: String(formData.get("location") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  revalidatePath(prospectsPath(businessId, productId));
  redirect(`${prospectsPath(businessId, productId)}/${prospect.id}`);
}
