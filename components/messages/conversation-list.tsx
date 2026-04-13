"use client";

import { format } from "date-fns";
import type { ConversationSummaryRow } from "@nullxes/ariman-sdk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatListTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? format(d, "HH:mm") : format(d, "MMM d");
}

export function ConversationList(props: {
  items: ConversationSummaryRow[];
  activeId: string | null;
  loading: boolean;
  onSelect: (conversationId: string) => void;
}) {
  const { items, activeId, loading, onSelect } = props;

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-1.5 p-2">
        {loading ? (
          <>
            <Skeleton className="h-17 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
            <Skeleton className="h-17 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
            <Skeleton className="h-17 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
          </>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs leading-relaxed text-muted-foreground">
            No active signals. Start a conversation.
          </p>
        ) : (
          items.map((c) => {
            const active = activeId === c.conversationId;
            return (
              <Card
                key={c.conversationId}
                className={cn(
                  "border-border p-0 shadow-none ring-0 transition-colors",
                  active ? "bg-muted" : "bg-transparent hover:bg-muted/50",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full flex-col items-stretch gap-1 rounded-md px-3 py-2.5 text-left font-normal shadow-none hover:bg-transparent"
                  onClick={() => onSelect(c.conversationId)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {c.peerDisplayName}
                      {c.kind === "ai" ? (
                        <span className="ml-1.5 align-middle font-mono text-[9px] font-normal text-muted-foreground">
                          AI
                        </span>
                      ) : null}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {c.unreadCount > 0 ? (
                        <Badge variant="outline" className="h-5 min-w-5 border-border px-1.5 text-[10px] font-medium">
                          {c.unreadCount > 99 ? "99+" : c.unreadCount}
                        </Badge>
                      ) : null}
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatListTime(c.lastMessageAt)}
                      </span>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.lastMessagePreview || "—"}</p>
                </Button>
              </Card>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
