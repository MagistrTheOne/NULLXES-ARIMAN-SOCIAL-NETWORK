"use client";

import { useCallback, useEffect, useState } from "react";
import {
  decryptMessage,
  encryptMessage,
  privateKeyFromBase64,
  publicKeyToBase64,
  generateKeyPair,
} from "@/lib/crypto/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

const PRIV = "ariman_x25519_private_b64";
const PUB = "ariman_x25519_public_b64";

function peerPubKeyStorageKey(peerUserId: string) {
  return `ariman_peer_x25519_pub_${peerUserId}`;
}

export function MessagesView() {
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
    void fetch("/api/conversations", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { conversations?: typeof conversations }) => {
        setConversations(d.conversations ?? []);
      })
      .catch(() => setError("Failed to load conversations"));
  }, [ensureKeys]);

  useEffect(() => {
    if (!activeId) {
      setPeerUserId(null);
      return;
    }
    void fetch(`/api/conversations/${activeId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { peerUserId?: string | null }) => {
        setPeerUserId(d.peerUserId ?? null);
        if (d.peerUserId) {
          const stored = sessionStorage.getItem(peerPubKeyStorageKey(d.peerUserId));
          setPeerPubInput(stored ?? "");
        }
      });
  }, [activeId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const r = await fetch(
      `/api/messages?conversationId=${encodeURIComponent(conversationId)}`,
      { credentials: "include" },
    );
    const d = await r.json();
    if (!r.ok) {
      setError(d.error ?? "Failed to load messages");
      return;
    }
    const privB64 = sessionStorage.getItem(PRIV);
    const priv = privB64 ? privateKeyFromBase64(privB64) : null;
    const list = (d.messages ?? []) as {
      id: string;
      body: string | null;
      ciphertext: string | null;
      encryptionVersion: number | null;
    }[];
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
  }, []);

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
  }, [activeId, loadMessages]);

  function savePeerPub() {
    if (!peerUserId) return;
    sessionStorage.setItem(peerPubKeyStorageKey(peerUserId), peerPubInput.trim());
  }

  async function send() {
    setError(null);
    const privB64 = sessionStorage.getItem(PRIV);
    if (!privB64) {
      setError("Missing local X25519 key");
      return;
    }
    const priv = privateKeyFromBase64(privB64);

    if (activeId) {
      if (!peerUserId) {
        setError("Missing peer");
        return;
      }
      const peerPub =
        peerPubInput.trim() || sessionStorage.getItem(peerPubKeyStorageKey(peerUserId)) || "";
      if (!peerPub) {
        setError("Set recipient X25519 public key (base64) for this peer");
        return;
      }
      const { ciphertext, sender_public_key } = encryptMessage(draft, peerPub.trim(), priv);
      const r = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          ciphertext,
          encryption_version: 1,
          sender_public_key,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "Send failed");
        return;
      }
      setDraft("");
      await loadMessages(activeId);
      return;
    }

    if (!newPeer.trim() || !newPeerPub.trim()) {
      setError("Peer user id and peer public key required for new DM");
      return;
    }
    const { ciphertext, sender_public_key } = encryptMessage(draft, newPeerPub.trim(), priv);
    const r = await fetch("/api/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        peerUserId: newPeer.trim(),
        ciphertext,
        encryption_version: 1,
        sender_public_key,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error ?? "Send failed");
      return;
    }
    setDraft("");
    setActiveId(d.conversationId);
    setNewPeer("");
    setNewPeerPub("");
    const convRes = await fetch("/api/conversations", { credentials: "include" });
    const convData = await convRes.json();
    setConversations(convData.conversations ?? []);
    await loadMessages(d.conversationId);
  }

  return (
    <div className="flex h-[calc(100vh-0px)] min-h-0">
      <div className="flex w-72 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-3 font-mono text-xs text-muted-foreground">
          Conversations
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {conversations.map((c) => (
              <Button
                key={c.conversationId}
                variant={activeId === c.conversationId ? "secondary" : "ghost"}
                className="justify-start font-mono text-xs"
                onClick={() => setActiveId(c.conversationId)}
              >
                {c.conversationId.slice(0, 8)}…
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border p-3">
          {activeId ? (
            <div className="space-y-2">
              <p className="font-mono text-xs text-muted-foreground">Conversation {activeId}</p>
              {peerUserId ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Peer X25519 public key (base64)"
                    value={peerPubInput}
                    onChange={(e) => setPeerPubInput(e.target.value)}
                    className="border-border bg-secondary font-mono text-xs"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={savePeerPub}>
                    Save
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">New DM (peer user id + their public key)</p>
              <Input
                placeholder="Peer user UUID"
                value={newPeer}
                onChange={(e) => setNewPeer(e.target.value)}
                className="border-border bg-secondary font-mono text-xs"
              />
              <Input
                placeholder="Peer X25519 public key (base64)"
                value={newPeerPub}
                onChange={(e) => setNewPeerPub(e.target.value)}
                className="border-border bg-secondary font-mono text-xs"
              />
            </div>
          )}
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {rows.map((m) => (
              <div
                key={m.id}
                className="rounded border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              >
                {m.plaintext ?? m.raw}
              </div>
            ))}
          </div>
        </ScrollArea>
        {error ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
        <div className="border-t border-border p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            className="min-h-[72px] border-border bg-secondary"
          />
          <Button className="mt-2" onClick={() => void send()}>
            Send encrypted
          </Button>
        </div>
      </div>
    </div>
  );
}
