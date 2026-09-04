"use server";

import { revalidatePath } from "next/cache";
import { updateProspect, updateProspectStatus } from "@/lib/prospects/mutations";
import type { ProspectStatus } from "@/lib/prospects/types";
import { createContact, deleteContact } from "@/lib/contacts/mutations";

function prospectPath(businessId: string, productId: string, prospectId: string) {
  return `/dashboard/businesses/${businessId}/products/${productId}/prospects/${prospectId}`;
}

export async function updateProspectAction(
  businessId: string,
  productId: string,
  prospectId: string,
  formData: FormData,
) {
  await updateProspect(prospectId, {
    companyName: String(formData.get("companyName") ?? ""),
    website: String(formData.get("website") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    companySize: String(formData.get("companySize") ?? ""),
    location: String(formData.get("location") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function updateProspectStatusAction(
  businessId: string,
  productId: string,
  prospectId: string,
  formData: FormData,
) {
  const status = String(formData.get("status") ?? "new") as ProspectStatus;
  await updateProspectStatus(prospectId, status);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function addContactAction(
  businessId: string,
  productId: string,
  workspaceId: string,
  prospectId: string,
  formData: FormData,
) {
  await createContact(workspaceId, prospectId, {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    jobTitle: String(formData.get("jobTitle") ?? ""),
    email: String(formData.get("email") ?? ""),
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function deleteContactAction(
  businessId: string,
  productId: string,
  prospectId: string,
  contactId: string,
) {
  await deleteContact(contactId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}
