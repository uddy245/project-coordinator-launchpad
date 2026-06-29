"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface ConversationSummary {
  conversation_id: string;
  title: string;
  last_message_at: string;
  message_count: number;
}

interface TutorDrawerProps {
  open: boolean;
  setOpen: (v: boolean) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Lesson slug from pathname ─────────────────────────────────────────────────

function useLessonSlug(): string | undefined {
  const pathname = usePathname();
  const match = pathname?.match(/^\/lessons\/([a-zA-Z0-9_-]+)/);
  return match?.[1];
}

// ── Tab from search params ────────────────────────────────────────────────────

type LessonTab = "video" | "read" | "workbook" | "quiz";
const VALID_TABS = new Set<string>(["video", "read", "workbook", "quiz"]);

function useActiveTab(): LessonTab | undefined {
  const params = useSearchParams();
  const tab = params.get("tab");
  return tab && VALID_TABS.has(tab) ? (tab as LessonTab) : undefined;
}

// ── Inner drawer (needs useSearchParams — must be inside Suspense) ────────────

function TutorDrawerInner({ open, setOpen }: TutorDrawerProps) {
  const [view, setView] = useState<"chat" | "conversations">("chat");

  // Chat state — conversationId is generated fresh on each open
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conversations list state
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  const lessonSlug = useLessonSlug();
  const activeTab = useActiveTab();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fresh empty chat on every drawer open
  useEffect(() => {
    if (open) {
      setConversationId(crypto.randomUUID());
      setMessages([]);
      setInput("");
      setError(null);
      setView("chat");
    }
  }, [open]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when in chat view
  useEffect(() => {
    if (open && view === "chat") inputRef.current?.focus();
  }, [open, view]);

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    setOpen(false);
  }, [setOpen]);

  // Open the conversations list and fetch summaries
  const handleOpenConversations = useCallback(async () => {
    setView("conversations");
    setConversationsLoading(true);
    try {
      const res = await fetch("/api/tutor/conversations", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations ?? []);
      }
    } catch {
      // non-critical
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  // Start a brand-new conversation
  const handleNewChat = useCallback(() => {
    setConversationId(crypto.randomUUID());
    setMessages([]);
    setInput("");
    setError(null);
    setView("chat");
  }, []);

  // Load a past conversation by id
  const loadConversation = useCallback(async (cid: string) => {
    setConversationId(cid);
    setMessages([]);
    setError(null);
    setView("chat");
    try {
      const res = await fetch(`/api/tutor?conversationId=${encodeURIComponent(cid)}&limit=100`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setMessages(
          (json.messages ?? []).map(
            (m: { id: string; role: "user" | "assistant"; content: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            })
          )
        );
      }
    } catch {
      // non-critical
    }
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || loading) return;

      setError(null);
      setInput("");

      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
      const assistantId = crypto.randomUUID();
      const placeholder: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, placeholder]);
      setLoading(true);

      // Cap model context to last 15 messages
      const allMessages = [...messages, userMsg]
        .slice(-15)
        .map((m) => ({ role: m.role, content: m.content }));

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch("/api/tutor", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages,
            lessonSlug,
            tab: activeTab,
            conversation_id: conversationId,
          }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? `Error ${res.status}`);
        }

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
          );
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message || "Something went wrong. Please try again.");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "[Error — please retry]", streaming: false } : m
          )
        );
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [input, loading, messages, lessonSlug, activeTab, conversationId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating trigger — hidden while drawer is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI tutor"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-sm border border-[hsl(var(--rule))] bg-[hsl(var(--paper))] px-4 py-2.5 font-mono text-sm text-[hsl(var(--ink))] shadow-sm transition-colors hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]"
          style={{ minHeight: 44 }}
        >
          <span aria-hidden className="text-[hsl(var(--accent))]">
            ✦
          </span>
          <span className="hidden sm:inline">Ask the tutor</span>
        </button>
      )}

      {/* Backdrop — dims page on mobile only; desktop uses push layout */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          aria-hidden
          onClick={handleClose}
        />
      )}

      {/* Drawer — opaque, full-height, pinned to right edge */}
      <div
        role="dialog"
        aria-label="AI Tutor"
        aria-modal="true"
        className={[
          "fixed inset-y-0 right-0 z-50 flex h-screen w-full max-w-md flex-col bg-[hsl(var(--paper))] shadow-xl transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* ── Header: chat view ── */}
        {view === "chat" && (
          <div className="flex shrink-0 items-center justify-between border-b border-[hsl(var(--rule))] px-5 py-4">
            <div>
              <p className="kicker text-[hsl(var(--accent))]">AI TUTOR</p>
              {lessonSlug && (
                <p className="mt-0.5 max-w-[160px] truncate font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
                  {lessonSlug}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                aria-label="Start new chat"
                className="rounded-sm px-2.5 py-1.5 font-mono text-[10px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--ink))]"
              >
                + New chat
              </button>
              <button
                onClick={handleOpenConversations}
                aria-label="View past chats"
                className="rounded-sm px-2.5 py-1.5 font-mono text-[10px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--ink))]"
              >
                Past chats
              </button>
              <button
                onClick={handleClose}
                aria-label="Close tutor"
                className="flex h-9 w-9 items-center justify-center rounded-sm text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--ink))]"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Header: conversations view ── */}
        {view === "conversations" && (
          <div className="flex shrink-0 items-center justify-between border-b border-[hsl(var(--rule))] px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("chat")}
                aria-label="Back to chat"
                className="font-mono text-[10px] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--ink))]"
              >
                ← Back
              </button>
              <p className="kicker text-[hsl(var(--accent))]">PAST CHATS</p>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close tutor"
              className="flex h-9 w-9 items-center justify-center rounded-sm text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--ink))]"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Conversations list ── */}
        {view === "conversations" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-[hsl(var(--rule))] px-5 py-3">
              <button
                onClick={handleNewChat}
                className="flex w-full items-center gap-2 rounded-sm border border-[hsl(var(--rule))] px-4 py-2.5 font-mono text-xs text-[hsl(var(--ink))] transition-colors hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]"
              >
                <span className="text-[hsl(var(--accent))]">+</span>
                New chat
              </button>
            </div>

            {conversationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                  Loading…
                </span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                  No past chats yet.
                </span>
              </div>
            ) : (
              <ul className="divide-y divide-[hsl(var(--rule))]">
                {conversations.map((conv) => (
                  <li key={conv.conversation_id}>
                    <button
                      onClick={() => loadConversation(conv.conversation_id)}
                      className="flex w-full flex-col gap-0.5 px-5 py-3.5 text-left transition-colors hover:bg-[hsl(var(--secondary))]"
                    >
                      <span className="truncate font-mono text-xs text-[hsl(var(--ink))]">
                        {conv.title}
                      </span>
                      <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
                        {relativeTime(conv.last_message_at)} ·{" "}
                        {conv.message_count === 1 ? "1 message" : `${conv.message_count} messages`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Chat messages + input ── */}
        {view === "chat" && (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm">
              {messages.length === 0 && !loading && (
                <div className="mt-16 space-y-2 text-center">
                  <p className="font-mono text-2xl text-[hsl(var(--accent))]">✦</p>
                  <p className="kicker">Ask me anything</p>
                  {lessonSlug && (
                    <p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                      I&apos;ve read the lesson — ask me to explain, quiz you, or go deeper.
                    </p>
                  )}
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={[
                      "max-w-[85%] rounded-sm px-3 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-[hsl(var(--ink))] text-white"
                        : "border border-[hsl(var(--rule))] bg-white text-[hsl(var(--ink))]",
                    ].join(" ")}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_ol]:my-1 [&_p]:my-1 [&_ul]:my-1">
                        <ReactMarkdown>{msg.content || (msg.streaming ? "…" : "")}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.streaming && (
                      <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-[hsl(var(--accent))] align-middle" />
                    )}
                  </div>
                </div>
              ))}

              {error && <p className="text-center font-mono text-xs text-destructive">{error}</p>}

              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex shrink-0 items-end gap-2 border-t border-[hsl(var(--rule))] px-4 pb-4 pt-3"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
                rows={2}
                disabled={loading}
                aria-label="Message to tutor"
                className="flex-1 resize-none rounded-sm border border-[hsl(var(--rule))] bg-white px-3 py-2 font-mono text-sm text-[hsl(var(--ink))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent))] focus:outline-none disabled:opacity-50"
                style={{ minHeight: 44 }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex items-center justify-center rounded-sm bg-[hsl(var(--ink))] px-3 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ minHeight: 44, minWidth: 44 }}
              >
                {loading ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "↑"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}

// ── Public export — wraps inner component in Suspense (required by useSearchParams) ──

export function TutorDrawer({ open, setOpen }: TutorDrawerProps) {
  return (
    <Suspense>
      <TutorDrawerInner open={open} setOpen={setOpen} />
    </Suspense>
  );
}
