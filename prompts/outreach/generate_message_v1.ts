import type { ProductProfile } from "@/lib/ai/schemas";
import type { Prospect } from "@/lib/prospects/types";
import type { Contact } from "@/lib/contacts/types";
import type { OutreachStrategy } from "@/lib/outreach/types";

export const GENERATE_MESSAGE_PROMPT_VERSION = "generate_message_v1";

const CHANNEL_GUIDANCE: Record<OutreachStrategy["channel"], string> = {
  email: "A short, professional cold email. 80-150 words. Include a subject line.",
  linkedin:
    "A short LinkedIn connection/DM message. Under 80 words, casual but professional. No subject line.",
  whatsapp:
    "A very short, casual WhatsApp message. Under 40 words. No subject line, no formal greeting.",
};

export function generateMessagePrompt(input: {
  productName: string;
  productProfile: ProductProfile;
  prospect: Prospect;
  contact: Contact | null;
  strategy: OutreachStrategy;
}): string {
  const contactLine = input.contact
    ? `Writing to: ${[input.contact.first_name, input.contact.last_name].filter(Boolean).join(" ") || "them"}${input.contact.job_title ? `, ${input.contact.job_title}` : ""}.`
    : "No specific contact name -- address them generically (e.g. by role, or omit a name entirely).";

  return `Write a ${input.strategy.channel} outreach message to "${input.prospect.company_name}" from "${input.productName}".

${CHANNEL_GUIDANCE[input.strategy.channel]}

${contactLine}

Approved strategy to follow:
- Why we're reaching out: ${input.strategy.strategy}
- Key message/angle: ${input.strategy.key_message}
- Call to action: ${input.strategy.cta}

Only reference product facts from this profile -- do not invent customers, statistics, integrations, features, or case studies that aren't stated here:
${JSON.stringify(input.productProfile, null, 2)}

Write in a natural, human tone -- not generic sales copy. No placeholder brackets like [Name] -- if you don't have a real name, write around it.`;
}
