import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/ai/chat";

export type PersistedChatMessage = ChatMessage & { followUp: string | null };

/** Full conversation for a workspace, oldest first -- see
 * supabase/migrations/20260906070000_chat_messages_schema.sql. Append-only: nothing in
 * the app deletes or edits a row here. */
export async function listChatMessages(workspaceId: string): Promise<PersistedChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content, follow_up")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return data.map((row) => ({
    role: row.role as ChatMessage["role"],
    content: row.content,
    followUp: row.follow_up,
  }));
}

export async function appendChatMessage(
  workspaceId: string,
  message: { role: ChatMessage["role"]; content: string; followUp?: string | null },
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("chat_messages").insert({
    workspace_id: workspaceId,
    role: message.role,
    content: message.content,
    follow_up: message.followUp ?? null,
  });
  if (error) throw error;
}
