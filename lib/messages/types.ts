export type MessageChannel = "email" | "linkedin" | "whatsapp";
export type MessageDirection = "outbound" | "inbound";
export type MessageStatus = "draft" | "approved" | "sent";

export type Message = {
  id: string;
  workspace_id: string;
  prospect_id: string;
  contact_id: string | null;
  channel: MessageChannel;
  direction: MessageDirection;
  content: string;
  status: MessageStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};
