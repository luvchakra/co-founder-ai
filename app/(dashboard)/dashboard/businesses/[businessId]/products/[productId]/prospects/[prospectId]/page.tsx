import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getWorkspaceForProduct } from "@/lib/tenancy/queries";
import { getProspect } from "@/lib/prospects/queries";
import { listContacts } from "@/lib/contacts/queries";
import { getProspectResearch } from "@/lib/research/queries";
import { getProspectScore } from "@/lib/scoring/queries";
import { getLatestOutreachStrategy } from "@/lib/outreach/queries";
import { listMessages } from "@/lib/messages/queries";
import { listConversations } from "@/lib/conversations/queries";
import type { Message } from "@/lib/messages/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateProspectAction,
  updateProspectStatusAction,
  addContactAction,
  deleteContactAction,
  researchProspectAction,
  scoreProspectAction,
  generateStrategyAction,
  approveStrategyAction,
  generateMessageAction,
  updateMessageContentAction,
  approveMessageAction,
  markMessageSentAction,
  deleteMessageAction,
  generateReplyAction,
  closeConversationAction,
} from "./actions";

const CONFIDENCE_LABEL: Record<string, string> = {
  fact: "Fact",
  inference: "Inference",
  assumption: "Assumption",
  unknown: "Unknown",
};

const STATUS_OPTIONS = ["new", "qualified", "disqualified"] as const;

const MESSAGE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  sent: "Sent",
};

const CONVERSATION_STATUS_LABEL: Record<string, string> = {
  awaiting_reply: "Awaiting reply",
  replied: "Needs response",
  closed: "Closed",
};

const CLASSIFICATION_LABEL: Record<string, string> = {
  interested: "Interested",
  not_interested: "Not interested",
  question: "Question",
  objection: "Objection",
  out_of_office: "Out of office",
  unsubscribe: "Unsubscribe",
  other: "Other",
};

function OutboundMessageCard({
  message,
  businessId,
  productId,
  prospectId,
}: {
  message: Message;
  businessId: string;
  productId: string;
  prospectId: string;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {message.channel} · {MESSAGE_STATUS_LABEL[message.status] ?? message.status}
        </span>
        <form
          action={deleteMessageAction.bind(null, businessId, productId, prospectId, message.id)}
        >
          <Button variant="ghost" size="sm" type="submit">
            Delete
          </Button>
        </form>
      </div>

      <form
        action={updateMessageContentAction.bind(
          null,
          businessId,
          productId,
          prospectId,
          message.id,
        )}
        className="flex flex-col gap-2"
      >
        <Textarea
          name="content"
          defaultValue={message.content}
          rows={5}
          disabled={message.status === "sent"}
        />
        {message.status !== "sent" ? (
          <Button type="submit" size="sm" variant="outline" className="self-start">
            Save edits
          </Button>
        ) : null}
      </form>

      <div className="flex items-center gap-2">
        {message.status === "draft" ? (
          <form
            action={approveMessageAction.bind(null, businessId, productId, prospectId, message.id)}
          >
            <Button type="submit" size="sm">
              Approve
            </Button>
          </form>
        ) : null}
        {message.status === "approved" ? (
          <form
            action={markMessageSentAction.bind(
              null,
              businessId,
              productId,
              prospectId,
              message.id,
            )}
          >
            <Button type="submit" size="sm">
              Mark sent
            </Button>
          </form>
        ) : null}
        {message.status === "sent" && message.sent_at ? (
          <span className="text-xs text-muted-foreground">
            Sent {new Date(message.sent_at).toLocaleString()}
          </span>
        ) : null}
      </div>
    </li>
  );
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ businessId: string; productId: string; prospectId: string }>;
}) {
  const { businessId, productId, prospectId } = await params;
  const product = await getProduct(productId);
  if (!product || product.business_id !== businessId) notFound();

  const workspace = await getWorkspaceForProduct(product.id);
  if (!workspace) notFound();

  const prospect = await getProspect(prospectId);
  if (!prospect || prospect.workspace_id !== workspace.id) notFound();

  const [contacts, research, score, strategy, messages, conversations] = await Promise.all([
    listContacts(prospect.id),
    getProspectResearch(prospect.id),
    getProspectScore(prospect.id),
    getLatestOutreachStrategy(prospect.id),
    listMessages(prospect.id),
    listConversations(prospect.id),
  ]);
  const drafts = messages.filter((m) => !m.conversation_id);
  const threadForConversation = (conversationId: string) =>
    messages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const basePath = `/dashboard/businesses/${businessId}/products/${productId}/prospects`;

  return (
    <div className="flex flex-col gap-8">
      <Link href={basePath} className="text-sm text-muted-foreground hover:underline">
        ← Back to prospects
      </Link>

      <section className="flex flex-col gap-4 rounded-md border p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium">{prospect.company_name}</h2>
          <form
            action={updateProspectStatusAction.bind(null, businessId, productId, prospect.id)}
            className="flex items-center gap-2"
          >
            <select
              name="status"
              defaultValue={prospect.status}
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="outline">
              Update status
            </Button>
          </form>
        </div>

        <form
          action={updateProspectAction.bind(null, businessId, productId, prospect.id)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={prospect.company_name}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={prospect.website ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" defaultValue={prospect.industry ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companySize">Company size</Label>
            <Input
              id="companySize"
              name="companySize"
              defaultValue={prospect.company_size ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={prospect.location ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={prospect.description ?? ""}
            />
          </div>
          <Button type="submit" size="sm" className="self-start sm:col-span-2">
            Save changes
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Research</h2>
          <form action={researchProspectAction.bind(null, businessId, productId, prospect.id)}>
            <Button type="submit" size="sm">
              {research ? "Re-research" : "Research"}
            </Button>
          </form>
        </div>

        {!research ? (
          <p className="text-sm text-muted-foreground">
            Not researched yet. Uses web search -- may take a moment.
          </p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p>{research.summary}</p>
            {research.pain_points.length > 0 ? (
              <div>
                <p className="font-medium">Pain points</p>
                <p className="text-muted-foreground">{research.pain_points.join(", ")}</p>
              </div>
            ) : null}
            {research.buying_signals.length > 0 ? (
              <div>
                <p className="font-medium">Buying signals</p>
                <p className="text-muted-foreground">{research.buying_signals.join(", ")}</p>
              </div>
            ) : null}
            {research.recent_events.length > 0 ? (
              <div>
                <p className="font-medium">Recent events</p>
                <p className="text-muted-foreground">{research.recent_events.join(", ")}</p>
              </div>
            ) : null}
            {research.recommended_angle ? (
              <div>
                <p className="font-medium">Recommended angle</p>
                <p className="text-muted-foreground">{research.recommended_angle}</p>
              </div>
            ) : null}
            {research.evidence.length > 0 ? (
              <div>
                <p className="font-medium">Evidence</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {research.evidence.map((item, i) => (
                    <li key={i} className="text-muted-foreground">
                      <span className="rounded bg-muted px-1 text-xs">
                        {CONFIDENCE_LABEL[item.confidence] ?? item.confidence}
                      </span>{" "}
                      {item.claim}
                      {item.source_url ? (
                        <>
                          {" — "}
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-4"
                          >
                            source
                          </a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Score</h2>
          <form action={scoreProspectAction.bind(null, businessId, productId, prospect.id)}>
            <Button type="submit" size="sm">
              {score ? "Rescore" : "Score"}
            </Button>
          </form>
        </div>

        {!score ? (
          <p className="text-sm text-muted-foreground">
            Not scored yet. Requires an approved ICP.
          </p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-2xl font-semibold">{score.overall_score}</p>
            <p className="text-muted-foreground">
              ICP fit {score.icp_score} · Intent {score.intent_score} · Timing{" "}
              {score.timing_score}
            </p>
            {score.reasoning ? (
              <pre className="whitespace-pre-wrap font-sans text-muted-foreground">
                {score.reasoning}
              </pre>
            ) : null}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Outreach strategy</h2>
          {strategy?.status === "approved" ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Approved
            </span>
          ) : null}
        </div>

        <form
          action={generateStrategyAction.bind(null, businessId, productId, prospect.id)}
          className="flex items-center gap-2"
        >
          {contacts.length > 0 ? (
            <select
              name="contactId"
              defaultValue=""
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">No specific contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.id}
                </option>
              ))}
            </select>
          ) : null}
          <Button type="submit" size="sm" disabled={!research}>
            {strategy ? "Generate new strategy" : "Generate strategy"}
          </Button>
        </form>

        {!research ? (
          <p className="text-sm text-muted-foreground">Research this prospect first.</p>
        ) : !strategy ? (
          <p className="text-sm text-muted-foreground">No strategy yet.</p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="font-medium">Why / strategy</p>
              <p className="text-muted-foreground">{strategy.strategy}</p>
            </div>
            <div>
              <p className="font-medium">Channel</p>
              <p className="text-muted-foreground">{strategy.channel}</p>
            </div>
            <div>
              <p className="font-medium">Key message</p>
              <p className="text-muted-foreground">{strategy.key_message}</p>
            </div>
            <div>
              <p className="font-medium">Call to action</p>
              <p className="text-muted-foreground">{strategy.cta}</p>
            </div>
            {strategy.status === "draft" ? (
              <form
                action={approveStrategyAction.bind(
                  null,
                  businessId,
                  productId,
                  prospect.id,
                  strategy.id,
                )}
              >
                <Button type="submit" size="sm" variant="outline">
                  Approve strategy
                </Button>
              </form>
            ) : null}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Messages</h2>
          {strategy?.status === "approved" ? (
            <form
              action={generateMessageAction.bind(
                null,
                businessId,
                productId,
                prospect.id,
                strategy.id,
              )}
            >
              <Button type="submit" size="sm">
                Generate message
              </Button>
            </form>
          ) : null}
        </div>

        {strategy?.status !== "approved" ? (
          <p className="text-sm text-muted-foreground">Approve an outreach strategy first.</p>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No draft messages yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {drafts.map((m) => (
              <OutboundMessageCard
                key={m.id}
                message={m}
                businessId={businessId}
                productId={productId}
                prospectId={prospect.id}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-md border p-4">
        <h2 className="font-medium">Conversations</h2>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No conversations yet -- mark a message sent to start one.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {conversations.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{c.channel} thread</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {CONVERSATION_STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    {c.status !== "closed" ? (
                      <form
                        action={closeConversationAction.bind(
                          null,
                          businessId,
                          productId,
                          prospect.id,
                          c.id,
                        )}
                      >
                        <Button type="submit" size="sm" variant="ghost">
                          Close
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>

                <ul className="flex flex-col gap-2">
                  {threadForConversation(c.id).map((m) =>
                    m.direction === "inbound" ? (
                      <li
                        key={m.id}
                        className="flex flex-col gap-1 rounded-md bg-muted/50 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase text-muted-foreground">
                            Inbound
                          </span>
                          {m.classification ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {CLASSIFICATION_LABEL[m.classification] ?? m.classification}
                            </span>
                          ) : null}
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        {m.recommended_action ? (
                          <p className="text-xs text-muted-foreground">
                            Suggested next step: {m.recommended_action}
                          </p>
                        ) : null}
                      </li>
                    ) : (
                      <OutboundMessageCard
                        key={m.id}
                        message={m}
                        businessId={businessId}
                        productId={productId}
                        prospectId={prospect.id}
                      />
                    ),
                  )}
                </ul>

                {c.status === "replied" ? (
                  <form
                    action={generateReplyAction.bind(
                      null,
                      businessId,
                      productId,
                      prospect.id,
                      c.id,
                    )}
                  >
                    <Button type="submit" size="sm">
                      Generate reply
                    </Button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Contacts</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || "(no name)"}
                    {c.job_title ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {c.job_title}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {[c.email, c.phone, c.linkedin_url].filter(Boolean).join(" · ") ||
                      "No contact details"}
                  </p>
                </div>
                <form
                  action={deleteContactAction.bind(
                    null,
                    businessId,
                    productId,
                    prospect.id,
                    c.id,
                  )}
                >
                  <Button variant="ghost" size="sm" type="submit">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 rounded-md border p-4">
          <h3 className="text-sm font-medium">Add a contact</h3>
          <form
            action={addContactAction.bind(
              null,
              businessId,
              productId,
              workspace.id,
              prospect.id,
            )}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="jobTitle">Job title</Label>
              <Input id="jobTitle" name="jobTitle" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input id="linkedinUrl" name="linkedinUrl" type="url" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <Button type="submit" size="sm" className="self-start sm:col-span-2">
              Add contact
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
