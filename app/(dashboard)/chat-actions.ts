"use server";

import { sendChatMessage, type ChatMessage } from "@/lib/ai/chat";
import { AiProviderError } from "@/lib/ai/router";
import { UsageLimitExceededError } from "@/lib/usage/limits";

export async function sendChatMessageAction(
  messages: ChatMessage[],
): Promise<{ reply: string } | { error: string }> {
  try {
    const reply = await sendChatMessage(messages);
    return { reply };
  } catch (error) {
    if (error instanceof AiProviderError || error instanceof UsageLimitExceededError) {
      return { error: error.message };
    }
    console.error("[chat] sendChatMessageAction failed:", error);
    return { error: "Something went wrong. Try again." };
  }
}
