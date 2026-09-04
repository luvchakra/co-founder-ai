"use server";

import { revalidatePath } from "next/cache";
import {
  addKnowledgeSource,
  addWebsiteKnowledgeSource,
  deleteKnowledgeSource,
} from "@/lib/knowledge/mutations";
import { understandProduct } from "@/lib/ai/understand-product";

function productPath(businessId: string, productId: string) {
  return `/dashboard/businesses/${businessId}/products/${productId}`;
}

export async function addManualSourceAction(
  businessId: string,
  productId: string,
  workspaceId: string,
  formData: FormData,
) {
  const content = String(formData.get("content") ?? "");
  await addKnowledgeSource(workspaceId, {
    sourceType: "manual",
    sourceName: "Founder description",
    content,
  });
  revalidatePath(productPath(businessId, productId));
}

export async function addWebsiteSourceAction(
  businessId: string,
  productId: string,
  workspaceId: string,
  formData: FormData,
) {
  const url = String(formData.get("url") ?? "").trim();
  if (!url) throw new Error("URL is required.");
  await addWebsiteKnowledgeSource(workspaceId, url);
  revalidatePath(productPath(businessId, productId));
}

export async function deleteSourceAction(
  businessId: string,
  productId: string,
  sourceId: string,
) {
  await deleteKnowledgeSource(sourceId);
  revalidatePath(productPath(businessId, productId));
}

export async function generateProductProfileAction(
  businessId: string,
  productId: string,
  formData: FormData,
) {
  const force = formData.get("force") === "true";
  await understandProduct(productId, { force });
  revalidatePath(productPath(businessId, productId));
}
