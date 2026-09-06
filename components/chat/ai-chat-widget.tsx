"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { useDismiss } from "@/hooks/use-dismiss";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getActiveIdsFromPath } from "@/lib/tenancy/active-path";
import {
  getChatStarterQuestionsAction,
  sendChatMessageAction,
} from "@/app/(dashboard)/chat-actions";
import type { ChatMessage } from "@/lib/ai/chat";
import { ChatMarkdown } from "./chat-markdown";

/**
 * Header AI assistant: a message-icon trigger that opens a slide-over chat panel, same
 * dismiss pattern (outside click / Escape) as the sidebar and account menus. Grounded in
 * whichever business/product the URL currently points at (lib/tenancy/active-path.ts),
 * so answers and starter questions reflect that pipeline's actual state. History is
 * ephemeral -- kept in this component's state only, never persisted.
 */
export function AiChatWidget() {
  const pathname = usePathname();
  const context = getActiveIdsFromPath(pathname);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [starterQuestions, setStarterQuestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(panelRef, open, () => setOpen(false));

  useEffect(() => {
    if (!open || messages.length > 0) return;
    let cancelled = false;
    getChatStarterQuestionsAction(context).then((questions) => {
      if (!cancelled) setStarterQuestions(questions);
    });
    return () => {
      cancelled = true;
    };
    // Only re-fetch when the panel opens fresh with no history yet -- re-running this on
    // every pathname change while a conversation is already underway would be jarring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send(text: string) {
    if (!text.trim() || pending) return;

    const next = [...messages, { role: "user", content: text.trim() } satisfies ChatMessage];
    setMessages(next);
    setInput("");
    setFollowUp(null);
    setError(null);
    setPending(true);

    const result = await sendChatMessageAction(next, context);
    setPending(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setMessages([...next, { role: "assistant", content: result.answer }]);
    setFollowUp(result.followUp);
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ask the AI assistant"
        aria-expanded={open}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <MessageCircle className="size-5" aria-hidden="true" />
      </Button>

      {open ? (
        <>
          <div
            className="fixed inset-0 top-14 z-30 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="AI assistant"
            className="fixed top-14 right-0 bottom-0 z-40 flex w-full max-w-sm flex-col border-l bg-background shadow-2xl sm:w-96"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-primary" aria-hidden="true" />
                <span className="font-medium">AI Assistant</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close AI assistant"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    Ask about GTM strategy, your ICP, prospects, or how to use
                    co-founder-ai.
                  </p>
                  {starterQuestions.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {starterQuestions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setInput(q)}
                          className="rounded-md border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[85%] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "mr-auto max-w-[90%] rounded-md bg-muted px-3 py-2 text-sm"
                    }
                  >
                    {m.role === "assistant" ? (
                      <ChatMarkdown text={m.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                ))
              )}
              {pending ? <p className="text-xs text-muted-foreground">Thinking...</p> : null}
              {error ? (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              ) : null}
              {!pending && followUp ? (
                <button
                  type="button"
                  onClick={() => setInput(followUp)}
                  className="mr-auto max-w-[90%] rounded-md border border-dashed px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {followUp}
                </button>
              ) : null}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                aria-label="Message"
              />
              <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send">
                <Send className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </>
      ) : null}
    </>
  );
}
