import { createClient } from "@/lib/supabase/server";
import { getOpenConversation } from "./queries";
import type { Conversation, ConversationChannel } from "./types";

/** Conversations are created lazily -- the first outbound send or inbound reply on a
 * prospect/channel opens one; there's never an empty thread. */
export async function getOrCreateConversation(
  workspaceId: string,
  prospectId: string,
  contactId: string | null,
  channel: ConversationChannel,
): Promise<Conversation> {
  const existing = await getOpenConversation(prospectId, channel);
  if (existing) return existing;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      prospect_id: prospectId,
      contact_id: contactId,
      channel,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markConversationReplied(conversationId: string): Promise<Conversation> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ status: "replied", last_message_at: new Date().toISOString() })
    .eq("id", conversationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markConversationAwaitingReply(
  conversationId: string,
): Promise<Conversation> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ status: "awaiting_reply", last_message_at: new Date().toISOString() })
    .eq("id", conversationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function closeConversation(conversationId: string): Promise<Conversation> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ status: "closed" })
    .eq("id", conversationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
