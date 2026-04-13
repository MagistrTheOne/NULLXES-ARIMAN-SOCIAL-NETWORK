"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createArimanSdk, type UserSearchRow } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const fieldClass = "border border-border bg-background text-sm text-foreground shadow-none";

export function NewMessageDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationStarted: (conversationId: string) => void;
}) {
  const { open, onOpenChange, onConversationStarted } = props;
  const sdk = useMemo(() => createArimanSdk(), []);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [users, setUsers] = useState<UserSearchRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selected, setSelected] = useState<UserSearchRow | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    if (!debounced) {
      setUsers([]);
      return;
    }
    setLoadingUsers(true);
    setError(null);
    try {
      const r = await sdk.searchUsers({ search: debounced });
      setUsers(r.users ?? []);
    } catch (e) {
      setError(userFacingApiError(e));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [debounced, sdk]);

  useEffect(() => {
    if (!open) return;
    void loadUsers();
  }, [open, loadUsers]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebounced("");
      setUsers([]);
      setSelected(null);
      setBody("");
      setError(null);
    }
  }, [open]);

  async function send() {
    if (!selected || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const out = await sdk.sendMessage({ peerUserId: selected.id, body: body.trim() });
      onConversationStarted(out.conversationId);
      onOpenChange(false);
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(90vh,32rem)] gap-4 border-border bg-popover shadow-none ring-1 ring-border sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-medium">New message</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Search for a user, then send your first message.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email…"
              className={fieldClass}
              autoFocus
            />
          </div>

          <div className="grid min-h-28 gap-1.5">
            <Label className="text-xs text-muted-foreground">Users</Label>
            <ScrollArea className="h-28 rounded-md border border-border">
              <div className="p-1">
                {loadingUsers ? (
                  <div className="space-y-1 p-1">
                    <Skeleton className="h-8 animate-none bg-muted/40" />
                    <Skeleton className="h-8 animate-none bg-muted/40" />
                  </div>
                ) : users.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">
                    {debounced ? "No matches." : "Type to search."}
                  </p>
                ) : (
                  users.map((u) => (
                    <Button
                      key={u.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-auto w-full justify-start px-2 py-1.5 font-normal shadow-none ${
                        selected?.id === u.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelected(u)}
                    >
                      <div className="min-w-0 text-left">
                        <div className="truncate text-sm">{u.name || u.email}</div>
                        <div className="truncate font-mono text-[10px] text-muted-foreground">{u.email}</div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a message…"
              className={`min-h-18 resize-none ${fieldClass}`}
              disabled={!selected}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="border-border shadow-none" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-border shadow-none"
            disabled={sending || !selected || !body.trim()}
            onClick={() => void send()}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
