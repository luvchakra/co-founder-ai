"use server";

import { revalidatePath } from "next/cache";
import { updateProspect, updateProspectStatus } from "@/lib/prospects/mutations";
import type { ProspectStatus } from "@/lib/prospects/types";
import { createContact, deleteContact } from "@/lib/contacts/mutations";
import { researchProspect } from "@/lib/ai/research-prospect";
import { scoreProspect } from "@/lib/scoring/score-prospect";
import { generateOutreachStrategy } from "@/lib/ai/generate-strategy";
import { approveOutreachStrategy } from "@/lib/outreach/mutations";
import { generateOutreachMessage } from "@/lib/ai/generate-message";
import { generateReply } from "@/lib/ai/generate-reply";
import {
  updateMessageContent,
  approveMessage,
  markMessageSent,
  deleteMessage,
} from "@/lib/messages/mutations";
import { closeConversation } from "@/lib/conversations/mutations";

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

export async function researchProspectAction(
  businessId: string,
  productId: string,
  prospectId: string,
) {
  await researchProspect(prospectId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function scoreProspectAction(
  businessId: string,
  productId: string,
  prospectId: string,
) {
  await scoreProspect(prospectId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function generateStrategyAction(
  businessId: string,
  productId: string,
  prospectId: string,
  formData: FormData,
) {
  const contactId = String(formData.get("contactId") ?? "") || null;
  await generateOutreachStrategy(prospectId, contactId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function approveStrategyAction(
  businessId: string,
  productId: string,
  prospectId: string,
  strategyId: string,
) {
  await approveOutreachStrategy(strategyId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function generateMessageAction(
  businessId: string,
  productId: string,
  prospectId: string,
  strategyId: string,
) {
  await generateOutreachMessage(strategyId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function updateMessageContentAction(
  businessId: string,
  productId: string,
  prospectId: string,
  messageId: string,
  formData: FormData,
) {
  await updateMessageContent(messageId, String(formData.get("content") ?? ""));
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function approveMessageAction(
  businessId: string,
  productId: string,
  prospectId: string,
  messageId: string,
) {
  await approveMessage(messageId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function markMessageSentAction(
  businessId: string,
  productId: string,
  prospectId: string,
  messageId: string,
) {
  await markMessageSent(messageId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function deleteMessageAction(
  businessId: string,
  productId: string,
  prospectId: string,
  messageId: string,
) {
  await deleteMessage(messageId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function generateReplyAction(
  businessId: string,
  productId: string,
  prospectId: string,
  conversationId: string,
) {
  await generateReply(conversationId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}

export async function closeConversationAction(
  businessId: string,
  productId: string,
  prospectId: string,
  conversationId: string,
) {
  await closeConversation(conversationId);
  revalidatePath(prospectPath(businessId, productId, prospectId));
}
