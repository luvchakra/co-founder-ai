"use server";

import {
  getChatStarterQuestions,
  sendChatMessage,
  type ChatMessage,
  type ChatPageContext,
  type ChatReply,
} from "@/lib/ai/chat";
import { AiProviderError } from "@/lib/ai/router";
import { UsageLimitExceededError } from "@/lib/usage/limits";

export async function sendChatMessageAction(
  messages: ChatMessage[],
  context: ChatPageContext,
): Promise<ChatReply | { error: string }> {
  try {
    return await sendChatMessage(messages, context);
  } catch (error) {
    if (error instanceof AiProviderError || error instanceof UsageLimitExceededError) {
      return { error: error.message };
    }
    console.error("[chat] sendChatMessageAction failed:", error);
    return { error: "Something went wrong. Try again." };
  }
}

export async function getChatStarterQuestionsAction(
  context: ChatPageContext,
): Promise<string[]> {
  try {
    return await getChatStarterQuestions(context);
  } catch (error) {
    console.error("[chat] getChatStarterQuestionsAction failed:", error);
    return [];
  }
}
