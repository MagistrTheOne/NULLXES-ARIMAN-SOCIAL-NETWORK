"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createArimanSdk,
  type ConversationSummaryRow,
  type MentionCandidatesResponse,
  type MessageRow,
} from "@nullxes/ariman-sdk";
import { format } from "date-fns";
import { userFacingApiError } from "@/lib/http-error-message";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { shouldRouteToAiChat } from "@/lib/ai-mention";
import { mentionQueryAtCaret } from "@/lib/mentions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConversationList } from "@/components/messages/conversation-list";
import { NewMessageDialog } from "@/components/messages/new-message-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ChatRow = {
  id: string;
  senderUserId: string | null;
  senderType: string;
  aiAgentName?: string | null;
  messageType: string;
  text: string;
  transcript?: string | null;
  audioUrl?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  pending?: boolean;
  optimistic?: boolean;
};

function shortMentionFromAgentHandle(handle: string) {
  return handle.includes(".") ? (handle.split(".")[0] ?? handle) : handle;
}

function mapServerMessage(m: MessageRow): ChatRow {
  const deleted = !!m.deletedAt;
  const text = deleted
    ? "[Deleted]"
    : m.messageType === "voice"
      ? (m.transcript?.trim() || m.body?.trim() || "Voice message")
      : m.body?.trim() ||
        (m.encryptionVersion > 0 && m.ciphertext ? "[Encrypted message]" : "—");
  return {
    id: m.id,
    senderUserId: m.senderUserId ?? null,
    senderType: m.senderType ?? "user",
    aiAgentName: m.aiAgentName ?? null,
    messageType: m.messageType ?? "text",
    text,
    transcript: m.transcript ?? null,
    audioUrl: m.audioUrl ?? null,
    editedAt: m.editedAt ?? null,
    deletedAt: m.deletedAt ?? null,
    createdAt: m.createdAt,
  };
}

function formatBubbleTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "HH:mm");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function MessagesView() {
  const sdk = useMemo(() => createArimanSdk(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useCurrentUser();
  const myId = currentUser?.id ?? "";

  const [summaries, setSummaries] = useState<ConversationSummaryRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [caret, setCaret] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [mentionHits, setMentionHits] = useState<MentionCandidatesResponse | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const voiceInputRef = useRef<HTMLInputElement | null>(null);

  const refreshSummaries = useCallback(async () => {
    setError(null);
    try {
      const d = await sdk.listConversationSummaries();
      setSummaries(d.conversations ?? []);
    } catch (e) {
      setError(userFacingApiError(e));
    }
  }, [sdk]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSummaries(true);
    void (async () => {
      try {
        await refreshSummaries();
      } finally {
        if (!cancelled) setLoadingSummaries(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSummaries]);

  useEffect(() => {
    const c = searchParams.get("conversation");
    if (!c || !UUID_RE.test(c)) return;
    setActiveId(c);
  }, [searchParams]);

  const loadMessages = useCallback(
    async (conversationId: string, opts?: { silent?: boolean }) => {
      const silent = opts?.silent;
      if (!silent) {
        setLoadingMessages(true);
        setError(null);
      }
      try {
        const d = await sdk.getMessages({ conversationId });
        const list = d.messages ?? [];
        const chronological = list.slice().reverse();
        setRows(chronological.map(mapServerMessage));
      } catch (e) {
        if (!silent) setError(userFacingApiError(e));
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [sdk],
  );

  useEffect(() => {
    if (!activeId) {
      setRows([]);
      return;
    }
    void loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (!activeId) return;
    void sdk.markConversationRead(activeId).catch(() => {});
    void refreshSummaries();
  }, [activeId, sdk, refreshSummaries]);

  useEffect(() => {
    if (!activeId) return;
    const id = window.setInterval(() => {
      void loadMessages(activeId, { silent: true });
    }, 2500);
    return () => window.clearInterval(id);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [rows, activeId, loadingMessages]);

  const mq = mentionQueryAtCaret(draft, caret);
  useEffect(() => {
    if (!mq) {
      setMentionHits(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const d = await sdk.listMentionCandidates({ q: mq.query, limit: 12 });
        if (!cancelled) setMentionHits(d);
      } catch {
        if (!cancelled) setMentionHits(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draft, caret, mq?.query, mq?.start, sdk]);

  const activeTitle = useMemo(() => {
    if (!activeId) return "Messages";
    const s = summaries.find((x) => x.conversationId === activeId);
    return s?.peerDisplayName ?? "Conversation";
  }, [activeId, summaries]);

  const activeSummary = useMemo(
    () => summaries.find((x) => x.conversationId === activeId),
    [summaries, activeId],
  );

  function buildSendPayload(raw: string) {
    let text = raw.trim();
    if (
      activeSummary?.kind === "ai" &&
      activeSummary.aiAgentHandle &&
      !shouldRouteToAiChat(text)
    ) {
      const short = shortMentionFromAgentHandle(activeSummary.aiAgentHandle);
      text = `@${short} ${text}`;
    }
    return text;
  }

  async function send() {
    if (!activeId || !draft.trim() || !myId) return;
    const textToSend = buildSendPayload(draft);
    const tempId = `local-${crypto.randomUUID()}`;
    const optimistic: ChatRow = {
      id: tempId,
      senderUserId: myId,
      senderType: "user",
      messageType: "text",
      text: textToSend,
      createdAt: new Date().toISOString(),
      pending: true,
      optimistic: true,
    };
    setRows((prev) => [...prev, optimistic]);
    setDraft("");
    setMentionHits(null);
    setSending(true);
    setError(null);
    try {
      if (shouldRouteToAiChat(textToSend)) {
        await sdk.sendAiChat({ conversationId: activeId, message: textToSend });
      } else {
        await sdk.sendMessage({ conversationId: activeId, body: textToSend });
      }
      await loadMessages(activeId, { silent: true });
      await refreshSummaries();
    } catch (e) {
      setRows((prev) => prev.filter((r) => r.id !== tempId));
      setDraft(textToSend);
      setError(userFacingApiError(e));
    } finally {
      setSending(false);
    }
  }

  function insertMention(label: string) {
    const m = mentionQueryAtCaret(draft, caret);
    if (!m) return;
    const insertText = `@${label} `;
    const next = `${draft.slice(0, m.start)}${insertText}${draft.slice(caret)}`;
    setDraft(next);
    setCaret(m.start + insertText.length);
    setMentionHits(null);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (el) {
        el.focus();
        const pos = m.start + insertText.length;
        el.setSelectionRange(pos, pos);
      }
    });
  }

  async function onVoiceFile(file: File | null) {
    if (!file || !activeId) return;
    setSending(true);
    setError(null);
    try {
      await sdk.sendVoiceMessage({ conversationId: activeId, file });
      await loadMessages(activeId, { silent: true });
      await refreshSummaries();
      toast.success("Voice message sent");
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setSending(false);
      if (voiceInputRef.current) voiceInputRef.current.value = "";
    }
  }

  function onConversationStarted(conversationId: string) {
    void refreshSummaries();
    setActiveId(conversationId);
    router.replace(`/messages?conversation=${encodeURIComponent(conversationId)}`);
    toast.success("Conversation opened");
  }

  async function saveEdit(messageId: string) {
    const t = editDraft.trim();
    if (!t) return;
    setSending(true);
    setError(null);
    try {
      await sdk.patchMessage(messageId, { body: t });
      setEditingId(null);
      if (activeId) await loadMessages(activeId, { silent: true });
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setSending(false);
    }
  }

  async function removeMessage(messageId: string) {
    if (!window.confirm("Delete this message?")) return;
    setSending(true);
    setError(null);
    try {
      await sdk.deleteMessage(messageId);
      if (activeId) await loadMessages(activeId, { silent: true });
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] min-h-0">
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border p-3">
          <Label className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Inbox</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border shadow-none"
            onClick={() => setNewOpen(true)}
          >
            New message
          </Button>
        </div>
        <ConversationList
          items={summaries}
          activeId={activeId}
          loading={loadingSummaries}
          onSelect={(id) => {
            setActiveId(id);
            router.replace(`/messages?conversation=${encodeURIComponent(id)}`);
          }}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="border-b border-border px-4 py-3">
          <h2 className="truncate text-sm font-medium text-foreground">{activeTitle}</h2>
          {!activeId ? (
            <p className="mt-0.5 text-xs text-muted-foreground">Select a conversation or start a new message.</p>
          ) : null}
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 p-4">
            {!activeId ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">No active signals.</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Start a conversation from the inbox, open New message, or use the AI tab.
                </p>
              </div>
            ) : loadingMessages ? (
              <>
                <Skeleton className="h-14 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
                <Skeleton className="h-14 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
              </>
            ) : rows.length === 0 ? (
              <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                No messages in this thread yet.
              </div>
            ) : (
              rows.map((m) => {
                const isAi = m.senderType === "ai";
                const mine = !isAi && m.senderUserId === myId;
                const deleted = !!m.deletedAt;
                const canEdit = mine && !isAi && !deleted && m.messageType === "text" && !m.pending;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <Card
                      className={cn(
                        "max-w-[min(100%,28rem)] border-border px-3 py-2 shadow-none",
                        mine ? "bg-muted" : "bg-card",
                        isAi && "border-dashed bg-muted/40",
                        m.optimistic && "opacity-80",
                        deleted && "opacity-60",
                      )}
                    >
                      {isAi ? (
                        <div className="mb-1 flex items-center gap-2">
                          <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                            AI
                          </span>
                          {m.aiAgentName ? (
                            <span className="font-mono text-[10px] text-muted-foreground">{m.aiAgentName}</span>
                          ) : null}
                        </div>
                      ) : null}
                      {m.messageType === "voice" && m.audioUrl && !deleted ? (
                        <audio className="mb-2 w-full max-w-xs" controls src={m.audioUrl} preload="metadata" />
                      ) : null}
                      {editingId === m.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            className="min-h-16 resize-none border border-border bg-background text-sm shadow-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-border shadow-none"
                              onClick={() => void saveEdit(m.id)}
                              disabled={sending || !editDraft.trim()}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="shadow-none"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-foreground">{m.text}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                        {m.editedAt ? (
                          <span className="text-[10px] text-muted-foreground">edited</span>
                        ) : null}
                        {m.pending ? (
                          <span className="text-[10px] text-muted-foreground">Sending…</span>
                        ) : null}
                        {canEdit && editingId !== m.id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-muted-foreground shadow-none"
                            onClick={() => {
                              setEditingId(m.id);
                              setEditDraft(m.text);
                            }}
                          >
                            Edit
                          </Button>
                        ) : null}
                        {mine && !m.pending && !deleted ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-muted-foreground shadow-none"
                            onClick={() => void removeMessage(m.id)}
                          >
                            Delete
                          </Button>
                        ) : null}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatBubbleTime(m.createdAt)}
                        </span>
                      </div>
                    </Card>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {error ? <p className="border-t border-border px-4 py-2 text-sm text-destructive">{error}</p> : null}

        <div className="relative border-t border-border p-3">
          {mq && mentionHits ? (
            <div className="absolute bottom-full left-3 right-3 z-10 mb-1 max-h-48 overflow-auto rounded-md border border-border bg-card text-xs shadow-sm">
              {mentionHits.agents.map((a) => (
                <button
                  key={`a-${a.id}`}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 border-b border-border px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => insertMention(a.shortHandle)}
                >
                  <span className="font-medium text-foreground">{a.name}</span>
                  <span className="font-mono text-muted-foreground">@{a.shortHandle}</span>
                </button>
              ))}
              {mentionHits.users.map((u) => (
                <button
                  key={`u-${u.userId}`}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 border-b border-border px-2 py-1.5 text-left hover:bg-muted last:border-b-0"
                  onClick={() => insertMention(u.handle)}
                >
                  <span className="font-medium text-foreground">{u.displayName}</span>
                  <span className="font-mono text-muted-foreground">@{u.handle}</span>
                </button>
              ))}
              {mentionHits.agents.length === 0 && mentionHits.users.length === 0 ? (
                <div className="px-2 py-2 text-muted-foreground">No matches</div>
              ) : null}
            </div>
          ) : null}

          <Textarea
            ref={taRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
            }}
            onSelect={(e) => {
              const t = e.currentTarget;
              setCaret(t.selectionStart ?? t.value.length);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={
              activeId ? "Message… (@oracle, @analyst, @writer for AI). Enter to send, Shift+Enter newline." : "Select a conversation"
            }
            disabled={!activeId || sending}
            className="min-h-18 resize-none border border-border bg-background text-sm shadow-none"
          />
          <input
            ref={voiceInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => void onVoiceFile(e.target.files?.[0] ?? null)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-border shadow-none"
              disabled={sending || !activeId || !draft.trim()}
              onClick={() => void send()}
            >
              {sending ? "Sending…" : "Send"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-border shadow-none"
              disabled={sending || !activeId}
              onClick={() => voiceInputRef.current?.click()}
            >
              Voice
            </Button>
          </div>
        </div>
      </div>

      <NewMessageDialog open={newOpen} onOpenChange={setNewOpen} onConversationStarted={onConversationStarted} />
    </div>
  );
}
