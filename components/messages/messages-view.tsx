"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createArimanSdk } from "@nullxes/ariman-sdk";
import {
  decryptMessage,
  encryptMessage,
  privateKeyFromBase64,
  publicKeyToBase64,
  generateKeyPair,
} from "@/lib/crypto/client";
import { userFacingApiError } from "@/lib/http-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const PRIV = "ariman_x25519_private_b64";
const PUB = "ariman_x25519_public_b64";

const fieldClass =
  "border border-border bg-background font-mono text-xs text-foreground shadow-none";

function peerPubKeyStorageKey(peerUserId: string) {
  return `ariman_peer_x25519_pub_${peerUserId}`;
}

export function MessagesView() {
  const sdk = useMemo(() => createArimanSdk(), []);

  const [conversations, setConversations] = useState<{ conversationId: string; joinedAt: string }[]>(
    [],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [peerUserId, setPeerUserId] = useState<string | null>(null);
  const [peerPubInput, setPeerPubInput] = useState("");
  const [rows, setRows] = useState<
    { id: string; plaintext?: string; raw?: string; encryptionVersion: number | null }[]
  >([]);
  const [draft, setDraft] = useState("");
  const [newPeer, setNewPeer] = useState("");
  const [newPeerPub, setNewPeerPub] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingPeer, setLoadingPeer] = useState(false);
  const [sending, setSending] = useState(false);

  const ensureKeys = useCallback(() => {
    if (typeof window === "undefined") return;
    let priv = sessionStorage.getItem(PRIV);
    if (!priv) {
      const kp = generateKeyPair();
      priv = btoa(String.fromCharCode(...kp.privateKey));
      sessionStorage.setItem(PRIV, priv);
      sessionStorage.setItem(PUB, publicKeyToBase64(kp.publicKey));
    }
  }, []);

  useEffect(() => {
    ensureKeys();
    let cancelled = false;
    setLoadingConversations(true);
    setError(null);
    void (async () => {
      try {
        const d = await sdk.listConversations();
        if (!cancelled) setConversations(d.conversations ?? []);
      } catch (e) {
        if (!cancelled) setError(userFacingApiError(e));
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ensureKeys, sdk]);

  useEffect(() => {
    if (!activeId) {
      setPeerUserId(null);
      setPeerPubInput("");
      return;
    }
    let cancelled = false;
    setLoadingPeer(true);
    void (async () => {
      try {
        const d = await sdk.getConversation(activeId);
        if (cancelled) return;
        setPeerUserId(d.peerUserId ?? null);
        if (d.peerUserId) {
          const stored = sessionStorage.getItem(peerPubKeyStorageKey(d.peerUserId));
          setPeerPubInput(stored ?? "");
        } else {
          setPeerPubInput("");
        }
      } catch (e) {
        if (!cancelled) setError(userFacingApiError(e));
      } finally {
        if (!cancelled) setLoadingPeer(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, sdk]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true);
      setError(null);
      try {
        const d = await sdk.getMessages({ conversationId });
        const privB64 = sessionStorage.getItem(PRIV);
        const priv = privB64 ? privateKeyFromBase64(privB64) : null;
        const list = d.messages ?? [];
        const mapped = list.map((m) => {
          if (m.encryptionVersion === 1 && m.ciphertext && priv) {
            try {
              return {
                id: m.id,
                plaintext: decryptMessage(m.ciphertext, priv),
                encryptionVersion: m.encryptionVersion,
              };
            } catch {
              return { id: m.id, raw: "[decrypt error]", encryptionVersion: m.encryptionVersion };
            }
          }
          if (m.body) {
            return { id: m.id, plaintext: m.body, encryptionVersion: m.encryptionVersion ?? 0 };
          }
          return { id: m.id, raw: "[encrypted]", encryptionVersion: m.encryptionVersion };
        });
        setRows(mapped.reverse());
      } catch (e) {
        setError(userFacingApiError(e));
      } finally {
        setLoadingMessages(false);
      }
    },
    [sdk],
  );

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
    else setRows([]);
  }, [activeId, loadMessages]);

  function savePeerPub() {
    if (!peerUserId) return;
    sessionStorage.setItem(peerPubKeyStorageKey(peerUserId), peerPubInput.trim());
  }

  async function send() {
    setError(null);
    const privB64 = sessionStorage.getItem(PRIV);
    if (!privB64) {
      setError("Request failed");
      return;
    }
    const priv = privateKeyFromBase64(privB64);

    if (activeId) {
      if (!peerUserId) {
        setError("Request failed");
        return;
      }
      const peerPub =
        peerPubInput.trim() || sessionStorage.getItem(peerPubKeyStorageKey(peerUserId)) || "";
      if (!peerPub) {
        setError("Request failed");
        return;
      }
      setSending(true);
      try {
        const { ciphertext, sender_public_key } = encryptMessage(draft, peerPub.trim(), priv);
        await sdk.sendMessage({
          conversationId: activeId,
          ciphertext,
          encryption_version: 1,
          sender_public_key,
        });
        setDraft("");
        await loadMessages(activeId);
      } catch (e) {
        setError(userFacingApiError(e));
      } finally {
        setSending(false);
      }
      return;
    }

    if (!newPeer.trim() || !newPeerPub.trim()) {
      setError("Request failed");
      return;
    }
    setSending(true);
    try {
      const { ciphertext, sender_public_key } = encryptMessage(draft, newPeerPub.trim(), priv);
      const out = await sdk.sendMessage({
        peerUserId: newPeer.trim(),
        ciphertext,
        encryption_version: 1,
        sender_public_key,
      });
      setDraft("");
      setActiveId(out.conversationId);
      setNewPeer("");
      setNewPeerPub("");
      const convData = await sdk.listConversations();
      setConversations(convData.conversations ?? []);
      await loadMessages(out.conversationId);
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] min-h-0">
      <div className="flex w-72 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-3">
          <Label className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            Conversations
          </Label>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {loadingConversations ? (
              <>
                <Skeleton className="h-8 animate-none bg-muted/50" />
                <Skeleton className="h-8 animate-none bg-muted/50" />
                <Skeleton className="h-8 animate-none bg-muted/50" />
              </>
            ) : (
              conversations.map((c) => (
                <Button
                  key={c.conversationId}
                  variant="outline"
                  size="sm"
                  className={`justify-start border-border font-mono text-xs shadow-none ${
                    activeId === c.conversationId ? "bg-muted text-foreground" : "bg-transparent"
                  }`}
                  onClick={() => setActiveId(c.conversationId)}
                >
                  {c.conversationId.slice(0, 8)}…
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border p-3">
          {activeId ? (
            <div className="space-y-2">
              <Label className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                Thread
              </Label>
              <p className="font-mono text-xs text-muted-foreground">{activeId}</p>
              {loadingPeer ? (
                <Skeleton className="h-9 animate-none bg-muted/50" />
              ) : peerUserId ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Peer X25519 public key (base64)"
                    value={peerPubInput}
                    onChange={(e) => setPeerPubInput(e.target.value)}
                    className={fieldClass}
                  />
                  <Button type="button" variant="outline" size="sm" className="shadow-none" onClick={savePeerPub}>
                    Save
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs tracking-wide text-muted-foreground uppercase">New DM</Label>
              <p className="text-xs text-muted-foreground">Peer user id and peer public key</p>
              <Input
                placeholder="Peer user UUID"
                value={newPeer}
                onChange={(e) => setNewPeer(e.target.value)}
                className={fieldClass}
              />
              <Input
                placeholder="Peer X25519 public key (base64)"
                value={newPeerPub}
                onChange={(e) => setNewPeerPub(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {loadingMessages ? (
              <>
                <Skeleton className="h-14 animate-none bg-muted/50" />
                <Skeleton className="h-14 animate-none bg-muted/50" />
              </>
            ) : (
              rows.map((m) => (
                <div
                  key={m.id}
                  className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground shadow-none"
                >
                  {m.plaintext ?? m.raw}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
        <div className="border-t border-border p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            className={`min-h-[72px] ${fieldClass}`}
          />
          <Button
            variant="outline"
            className="mt-2 border-border shadow-none"
            disabled={sending}
            onClick={() => void send()}
          >
            {sending ? "Sending…" : "Send encrypted"}
          </Button>
        </div>
      </div>
    </div>
  );
}
