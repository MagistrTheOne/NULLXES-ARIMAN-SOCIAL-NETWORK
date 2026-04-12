"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Identity = { id: string; handle: string; displayName: string };
type Post = { id: string; body: string; createdAt: string };

export function FeedView() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { identities?: Identity[] }) => {
        const ids = d.identities ?? [];
        setIdentities(ids);
        if (ids[0]) setActiveIdentity(ids[0].id);
      });
  }, []);

  const loadPosts = async (identityId: string) => {
    const r = await fetch(`/api/posts?identityId=${encodeURIComponent(identityId)}`, {
      credentials: "include",
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error ?? "Failed to load posts");
      return;
    }
    setPosts(d.posts ?? []);
  };

  useEffect(() => {
    if (activeIdentity) void loadPosts(activeIdentity);
  }, [activeIdentity]);

  async function createPost() {
    if (!activeIdentity) return;
    setError(null);
    const r = await fetch("/api/posts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityId: activeIdentity, body }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error ?? "Failed to create post");
      return;
    }
    setBody("");
    await loadPosts(activeIdentity);
  }

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="font-mono text-lg text-foreground">Feed</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {identities.map((i) => (
          <Button
            key={i.id}
            size="sm"
            variant={activeIdentity === i.id ? "secondary" : "outline"}
            onClick={() => setActiveIdentity(i.id)}
          >
            @{i.handle}
          </Button>
        ))}
      </div>
      <div className="mt-6 space-y-2 border border-border bg-card p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Post body…"
          className="min-h-[80px] border-border bg-secondary"
        />
        <Button onClick={() => void createPost()}>Publish</Button>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <ul className="mt-6 space-y-3">
        {posts.map((p) => (
          <li key={p.id} className="border-b border-border pb-3 text-sm text-foreground">
            <p className="whitespace-pre-wrap">{p.body}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{p.createdAt}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
