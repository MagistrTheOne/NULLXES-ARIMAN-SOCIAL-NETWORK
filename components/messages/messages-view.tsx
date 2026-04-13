"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createArimanSdk,
  type ConversationSummaryRow,
  type MentionCandidatesResponse,
  type MessageRow,
} from "@nullxes/ariman-sdk";
import { format } from "date-fns";
import {
  ArrowDown,
  Loader2,
  Mic,
  MoreHorizontal,
  Pencil,
  Send,
  Square,
  Trash2,
} from "lucide-react";
import { userFacingApiError } from "@/lib/http-error-message";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { shouldRouteToAiChat } from "@/lib/ai-mention";
import { mentionQueryAtCaret } from "@/lib/mentions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConversationList } from "@/components/messages/conversation-list";
import { NewMessageDialog } from "@/components/messages/new-message-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NEAR_BOTTOM_PX = 100;
const DELETED_LABEL = "Message deleted";

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
    ? DELETED_LABEL
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

function formatRecordingDuration(ms: number) {
  const totalS = Math.floor(ms / 1000);
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const c = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of c) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
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
  const [jumpVisible, setJumpVisible] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const editTaRef = useRef<HTMLTextAreaElement | null>(null);
  const stickToBottomRef = useRef(true);
  const prevTailIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordMimeRef = useRef("");
  const recordStartedAtRef = useRef(0);
  const recordTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    stickToBottomRef.current = true;
    setJumpVisible(false);
    prevTailIdRef.current = null;
  }, [activeId]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const updateStickFromScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = gap <= NEAR_BOTTOM_PX;
    if (stickToBottomRef.current) setJumpVisible(false);
  }, []);

  const stopRecordingCleanup = useCallback(async () => {
    if (recordTickRef.current) {
      clearInterval(recordTickRef.current);
      recordTickRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      await new Promise<void>((resolve) => {
        rec.addEventListener("stop", () => resolve(), { once: true });
        try {
          rec.stop();
        } catch {
          resolve();
        }
      });
    }
    mediaRecorderRef.current = null;
    mediaChunksRef.current = [];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
    setRecordingMs(0);
  }, []);

  useLayoutEffect(() => {
    if (!activeId || loadingMessages) return;
    const el = viewportRef.current;
    if (!el || rows.length === 0) {
      prevTailIdRef.current = null;
      return;
    }
    const tailId = rows[rows.length - 1]!.id;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      setJumpVisible(false);
      prevTailIdRef.current = tailId;
    } else {
      if (prevTailIdRef.current !== null && tailId !== prevTailIdRef.current) {
        setJumpVisible(true);
      }
      prevTailIdRef.current = tailId;
    }
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

  useEffect(() => {
    return () => {
      void stopRecordingCleanup();
    };
  }, [stopRecordingCleanup]);

  async function toggleMic() {
    if (!activeId || sending) return;
    if (recording) {
      const rec = mediaRecorderRef.current;
      if (!rec || rec.state === "inactive") {
        await stopRecordingCleanup();
        return;
      }
      await new Promise<void>((resolve) => {
        rec.addEventListener("stop", () => resolve(), { once: true });
        rec.stop();
      });
      if (recordTickRef.current) {
        clearInterval(recordTickRef.current);
        recordTickRef.current = null;
      }
      const mime = recordMimeRef.current || "audio/webm";
      const blob = new Blob(mediaChunksRef.current, { type: mime });
      mediaRecorderRef.current = null;
      mediaChunksRef.current = [];
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setRecording(false);
      setRecordingMs(0);
      if (blob.size < 256) {
        toast.message("Recording too short");
        return;
      }
      const ext = mime.includes("webm") ? "webm" : "m4a";
      const file = new File([blob], `voice.${ext}`, { type: mime });
      setSending(true);
      setError(null);
      try {
        await sdk.sendVoiceMessage({ conversationId: activeId, file });
        stickToBottomRef.current = true;
        await loadMessages(activeId, { silent: true });
        await refreshSummaries();
        toast.success("Voice sent");
      } catch (e) {
        setError(userFacingApiError(e));
      } finally {
        setSending(false);
      }
      return;
    }

    const mime = pickRecorderMime();
    recordMimeRef.current = mime;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaChunksRef.current = [];
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) mediaChunksRef.current.push(ev.data);
      };
      rec.start(250);
      recordStartedAtRef.current = Date.now();
      setRecordingMs(0);
      setRecording(true);
      recordTickRef.current = setInterval(() => {
        setRecordingMs(Date.now() - recordStartedAtRef.current);
      }, 200);
    } catch {
      toast.error("Microphone access denied or unavailable");
      await stopRecordingCleanup();
    }
  }

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
    stickToBottomRef.current = true;
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

  function onJumpLatest() {
    stickToBottomRef.current = true;
    scrollToBottom("smooth");
    setJumpVisible(false);
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
            className="border-border shadow-none transition-colors duration-150"
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

        <div className="relative min-h-0 flex-1">
          <div
            ref={viewportRef}
            onScroll={updateStickFromScroll}
            className="h-full overflow-y-auto overflow-x-hidden scroll-smooth px-4 py-3"
          >
            {!activeId ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-2 py-12 text-center">
                <p className="text-sm text-muted-foreground">No active signals.</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Start a conversation from the inbox, open New message, or use the AI tab.
                </p>
              </div>
            ) : loadingMessages ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full max-w-md border border-border bg-muted/30 shadow-none" />
                <Skeleton className="h-14 w-full max-w-md border border-border bg-muted/30 shadow-none" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                No messages in this thread yet.
              </div>
            ) : (
              <div className="space-y-2 pb-2">
                {rows.map((m) => {
                  const isAi = m.senderType === "ai";
                  const mine = !isAi && m.senderUserId === myId;
                  const deleted = !!m.deletedAt;
                  const isVoice = m.messageType === "voice" && !deleted;
                  const canEdit =
                    mine && !isAi && !deleted && m.messageType === "text" && !m.pending && !m.optimistic;

                  return (
                    <div
                      key={m.id}
                      className={cn("flex transition-opacity duration-150", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "group relative max-w-[min(100%,28rem)] transition-[opacity,transform] duration-150",
                          m.optimistic && "opacity-70",
                        )}
                      >
                        {canEdit && editingId !== m.id ? (
                          <div
                            className={cn(
                              "absolute right-1.5 top-1.5 z-1 flex items-center gap-0.5 transition-opacity duration-150",
                              "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                            )}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                type="button"
                                className={cn(
                                  buttonVariants({ variant: "ghost", size: "icon" }),
                                  "h-7 w-7 border border-border bg-background/90 text-foreground shadow-none backdrop-blur-sm transition-colors duration-150 hover:bg-muted",
                                )}
                                aria-label="Message actions"
                              >
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-36 border-border shadow-none ring-1 ring-border">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingId(m.id);
                                    setEditDraft(m.text === DELETED_LABEL ? "" : m.text);
                                    requestAnimationFrame(() => editTaRef.current?.focus());
                                  }}
                                >
                                  <Pencil className="size-3.5" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => void removeMessage(m.id)}
                                  className="text-foreground"
                                >
                                  <Trash2 className="size-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : null}

                        <Card
                          className={cn(
                            "border px-3 py-2 shadow-none transition-[border-color,background-color] duration-150",
                            isAi
                              ? "border-dashed border-foreground/25 bg-muted/30"
                              : "border-border bg-card",
                            mine && !isAi && "bg-muted",
                            deleted && "border-dashed border-foreground/20 bg-muted/20",
                          )}
                        >
                          {isAi ? (
                            <div className="mb-1.5 flex items-center gap-2">
                              <span className="rounded border border-foreground/20 bg-background px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                                AI
                              </span>
                              {m.aiAgentName ? (
                                <span className="font-mono text-[10px] text-muted-foreground">{m.aiAgentName}</span>
                              ) : null}
                            </div>
                          ) : null}

                          {isVoice && m.audioUrl ? (
                            <audio
                              className="mb-2 w-full max-w-[min(100%,18rem)] grayscale"
                              controls
                              src={m.audioUrl}
                              preload="metadata"
                            />
                          ) : null}

                          {editingId === m.id ? (
                            <Textarea
                              ref={editTaRef}
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  void saveEdit(m.id);
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  setEditingId(null);
                                }
                              }}
                              className="min-h-20 resize-none border border-border bg-background text-sm shadow-none transition-colors duration-150"
                            />
                          ) : (
                            <p
                              className={cn(
                                "whitespace-pre-wrap text-sm transition-colors duration-150",
                                deleted ? "italic text-muted-foreground" : "text-foreground",
                              )}
                            >
                              {m.text}
                            </p>
                          )}

                          <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                            {m.editedAt && !deleted ? (
                              <span className="text-[10px] text-muted-foreground">edited</span>
                            ) : null}
                            {m.pending ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Loader2 className="size-3 animate-spin" />
                                Sending…
                              </span>
                            ) : null}
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {formatBubbleTime(m.createdAt)}
                            </span>
                          </div>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={bottomAnchorRef} className="h-px w-full shrink-0" aria-hidden />
          </div>

          {activeId && jumpVisible ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="pointer-events-auto gap-1.5 rounded-full border-foreground/20 bg-background/95 px-3 text-foreground shadow-sm backdrop-blur-sm transition-opacity duration-150 hover:bg-muted"
                onClick={onJumpLatest}
              >
                <ArrowDown className="size-3.5" />
                New messages
              </Button>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="border-t border-border px-4 py-2 text-sm text-muted-foreground">{error}</p>
        ) : null}

        <div className="relative border-t border-border p-3">
          {recording ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground transition-colors duration-150">
              <span className="inline-flex items-center gap-2 font-mono">
                <span className="inline-block size-2 rounded-full bg-foreground transition-opacity duration-300" />
                Recording… {formatRecordingDuration(recordingMs)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-border px-2 shadow-none"
                onClick={() => void toggleMic()}
                disabled={sending}
              >
                <Square className="size-3.5" />
                Stop &amp; send
              </Button>
            </div>
          ) : null}

          {mq && mentionHits ? (
            <div className="absolute bottom-full left-3 right-3 z-10 mb-1 max-h-48 overflow-auto rounded-md border border-border bg-card text-xs shadow-sm transition-opacity duration-150">
              {mentionHits.agents.map((a) => (
                <button
                  key={`a-${a.id}`}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 border-b border-border px-2 py-1.5 text-left transition-colors duration-150 hover:bg-muted"
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
                  className="flex w-full items-center justify-between gap-2 border-b border-border px-2 py-1.5 text-left transition-colors duration-150 hover:bg-muted last:border-b-0"
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

          <div className="flex items-end gap-2">
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
                activeId
                  ? "Write a message… @oracle @analyst @writer — mention people with @handle. Enter to send · Shift+Enter newline"
                  : "Select a conversation"
              }
              disabled={!activeId || sending || recording}
              className="min-h-18 flex-1 resize-none border border-border bg-background text-sm shadow-none transition-colors duration-150"
            />
            <div className="flex shrink-0 flex-col gap-1.5 pb-0.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "size-10 border-border shadow-none transition-colors duration-150",
                  recording && "border-foreground/40 bg-muted",
                )}
                disabled={!activeId || sending}
                onClick={() => void toggleMic()}
                aria-label={recording ? "Stop recording" : "Record voice"}
              >
                {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 border-border shadow-none transition-colors duration-150"
                disabled={sending || !activeId || !draft.trim() || recording}
                onClick={() => void send()}
                aria-label="Send"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <NewMessageDialog open={newOpen} onOpenChange={setNewOpen} onConversationStarted={onConversationStarted} />
    </div>
  );
}
