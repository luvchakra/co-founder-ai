import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { listContacts } from "@/lib/contacts/queries";
import { getProspect } from "@/lib/prospects/queries";
import { getOrCreateConversation, markConversationAwaitingReply } from "@/lib/conversations/mutations";
import type { Message } from "./types";

/** generateOutreachMessage() stores "Subject: X\n\nBody" when the draft has a subject
 * line (see lib/ai/generate-message.ts), and just the body when it doesn't. Split that
 * back apart for the actual send instead of mailing the "Subject:" line as body text. */
function parseEmailContent(content: string): { subject: string | null; body: string } {
  const match = content.match(/^Subject: (.*)\n\n([\s\S]*)$/);
  if (!match) return { subject: null, body: content };
  return { subject: match[1], body: match[2] };
}

/** Sends an approved outbound email via Resend and records the real outcome on the
 * message row (docs/prospects-pipeline-redesign-requirements.md R1/R2) -- status
 * becomes the provider's actual result ('sent' or 'failed' with a reason), never a
 * manual self-report. Only the email channel has a send integration; linkedin/whatsapp
 * messages are still marked sent by the founder by hand after delivering them. */
export async function sendMessage(messageId: string): Promise<Message> {
  const supabase = await createClient();
  const { data: message, error: fetchError } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .single();
  if (fetchError) throw fetchError;

  if (message.channel !== "email") {
    throw new Error("Automatic sending is only available for the email channel.");
  }
  if (message.status !== "approved" && message.status !== "failed") {
    throw new Error("Approve the message before sending.");
  }

  const prospect = await getProspect(message.prospect_id);
  if (!prospect) throw new Error("Prospect not found.");

  const contacts = await listContacts(message.prospect_id);
  const toEmail = message.contact_id
    ? (contacts.find((c) => c.id === message.contact_id)?.email ?? null)
    : (contacts.find((c) => c.email)?.email ?? null);
  if (!toEmail) {
    throw new Error("No contact email on file -- add a contact with an email before sending.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromAddress) {
    throw new Error(
      "Email sending isn't configured yet -- set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }

  const { subject, body } = parseEmailContent(message.content);
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: fromAddress,
    to: toEmail,
    subject: subject ?? `Quick note for ${prospect.company_name}`,
    text: body,
  });

  if (result.error) {
    const { data, error } = await supabase
      .from("messages")
      .update({ status: "failed", failure_reason: result.error.message })
      .eq("id", messageId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

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
      provider_message_id: result.data?.id ?? null,
      failure_reason: null,
    })
    .eq("id", messageId)
    .select()
    .single();
  if (error) throw error;

  await markConversationAwaitingReply(conversation.id);
  return data;
}
