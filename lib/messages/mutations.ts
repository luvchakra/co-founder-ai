import { createClient } from "@/lib/supabase/server";
import {
  getOrCreateConversation,
  markConversationAwaitingReply,
} from "@/lib/conversations/mutations";
import type { Message } from "./types";

/** Editing content resets an approved message back to draft -- it needs re-approval. */
export async function updateMessageContent(
  messageId: string,
  content: string,
): Promise<Message> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message content is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .update({ content: trimmed, status: "draft" })
    .eq("id", messageId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function approveMessage(messageId: string): Promise<Message> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .update({ status: "approved" })
    .eq("id", messageId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** No send integration yet (blueprint §19) -- this records that the founder sent it
 * themselves after copying the approved content out. Also opens (or re-opens) the
 * conversation thread for this prospect/channel and puts it in "awaiting_reply"
 * (blueprint §21's state machine, Epic 9). */
export async function markMessageSent(messageId: string): Promise<Message> {
  const supabase = await createClient();
  const { data: message, error: fetchError } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .single();
  if (fetchError) throw fetchError;

  const conversation = await getOrCreateConversation(
    message.workspace_id,
    message.prospect_id,
    message.contact_id,
    message.channel,
  );

  const { data, error } = await supabase
    .from("messages")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      conversation_id: conversation.id,
    })
    .eq("id", messageId)
    .select()
    .single();
  if (error) throw error;

  await markConversationAwaitingReply(conversation.id);
  return data;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("messages").delete().eq("id", messageId);
  if (error) throw error;
}
