"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createArimanSdk, type ConversationSummaryRow, type MessageRow } from "@nullxes/ariman-sdk";
import { format } from "date-fns";
import { userFacingApiError } from "@/lib/http-error-message";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
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
  senderUserId: string;
  text: string;
  createdAt: string;
  pending?: boolean;
  optimistic?: boolean;
};

function mapServerMessage(m: MessageRow): ChatRow {
  const text =
    m.body?.trim() ||
    (m.encryptionVersion > 0 && m.ciphertext ? "[Encrypted message]" : "—");
  return {
    id: m.id,
    senderUserId: m.senderUserId,
    text,
    createdAt: m.createdAt,
  };
}

function formatBubbleTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "HH:mm");
}

export function MessagesView() {
  const sdk = useMemo(() => createArimanSdk(), []);
  const { user: currentUser } = useCurrentUser();
  const myId = currentUser?.id ?? "";

  const [summaries, setSummaries] = useState<ConversationSummaryRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

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

  const activeTitle = useMemo(() => {
    if (!activeId) return "Messages";
    const s = summaries.find((x) => x.conversationId === activeId);
    return s?.peerDisplayName ?? "Conversation";
  }, [activeId, summaries]);

  async function send() {
    if (!activeId || !draft.trim() || !myId) return;
    const text = draft.trim();
    const tempId = `local-${crypto.randomUUID()}`;
    const optimistic: ChatRow = {
      id: tempId,
      senderUserId: myId,
      text,
      createdAt: new Date().toISOString(),
      pending: true,
      optimistic: true,
    };
    setRows((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);
    setError(null);
    try {
      await sdk.sendMessage({ conversationId: activeId, body: text });
      await loadMessages(activeId, { silent: true });
      await refreshSummaries();
    } catch (e) {
      setRows((prev) => prev.filter((r) => r.id !== tempId));
      setDraft(text);
      setError(userFacingApiError(e));
    } finally {
      setSending(false);
    }
  }

  function onConversationStarted(conversationId: string) {
    void refreshSummaries();
    setActiveId(conversationId);
    toast.success("Conversation opened");
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
          onSelect={(id) => setActiveId(id)}
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
                <p className="max-w-sm text-xs text-muted-foreground">Start a conversation from the inbox, or open New message.</p>
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
                const mine = m.senderUserId === myId;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <Card
                      className={cn(
                        "max-w-[min(100%,28rem)] border-border px-3 py-2 shadow-none",
                        mine ? "bg-muted" : "bg-card",
                        m.optimistic && "opacity-80",
                      )}
                    >
                      <p className="whitespace-pre-wrap text-sm text-foreground">{m.text}</p>
                      <div className="mt-1 flex items-center justify-end gap-2">
                        {m.pending ? (
                          <span className="text-[10px] text-muted-foreground">Sending…</span>
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

        <div className="border-t border-border p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={activeId ? "Message…" : "Select a conversation"}
            disabled={!activeId || sending}
            className="min-h-18 resize-none border border-border bg-background text-sm shadow-none"
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2 border-border shadow-none"
            disabled={sending || !activeId || !draft.trim()}
            onClick={() => void send()}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>

      <NewMessageDialog open={newOpen} onOpenChange={setNewOpen} onConversationStarted={onConversationStarted} />
    </div>
  );
}
