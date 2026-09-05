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
import { sendMessage } from "@/lib/messages/send";
import { closeConversation } from "@/lib/conversations/mutations";
import { runAiAction, type AiActionState } from "@/lib/actions/ai-action-state";

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
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
    twitterUrl: String(formData.get("twitterUrl") ?? ""),
    companyEmail: String(formData.get("companyEmail") ?? ""),
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
): Promise<AiActionState> {
  return runAiAction(async () => {
    await researchProspect(prospectId);
    revalidatePath(prospectPath(businessId, productId, prospectId));
  });
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
  _prevState: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  return runAiAction(async () => {
    const contactId = String(formData.get("contactId") ?? "") || null;
    await generateOutreachStrategy(prospectId, contactId);
    revalidatePath(prospectPath(businessId, productId, prospectId));
  });
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
): Promise<AiActionState> {
  return runAiAction(async () => {
    await generateOutreachMessage(strategyId);
    revalidatePath(prospectPath(businessId, productId, prospectId));
  });
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

/** Email-channel "Approve" (docs/prospects-pipeline-redesign-requirements.md R1) --
 * approving an email message sends it immediately via lib/messages/send.ts instead of
 * waiting for a separate manual "Mark sent" click. A pre-flight failure (no contact
 * email, sending not configured) surfaces through AiActionState rather than throwing,
 * same as the AI actions above; a real provider-side send failure is recorded on the
 * message row itself (status 'failed') and read back on revalidate, not thrown here. */
export async function approveAndSendMessageAction(
  businessId: string,
  productId: string,
  prospectId: string,
  messageId: string,
): Promise<AiActionState> {
  return runAiAction(async () => {
    await approveMessage(messageId);
    await sendMessage(messageId);
    revalidatePath(prospectPath(businessId, productId, prospectId));
  });
}

/** Retries sending an already-approved (or previously failed) email message -- R2's
 * "Retry" action. */
export async function sendMessageAction(
  businessId: string,
  productId: string,
  prospectId: string,
  messageId: string,
): Promise<AiActionState> {
  return runAiAction(async () => {
    await sendMessage(messageId);
    revalidatePath(prospectPath(businessId, productId, prospectId));
  });
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
): Promise<AiActionState> {
  return runAiAction(async () => {
    await generateReply(conversationId);
    revalidatePath(prospectPath(businessId, productId, prospectId));
  });
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
