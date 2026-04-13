"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createArimanSdk } from "@nullxes/ariman-sdk";
import type { PostRow } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { toast } from "sonner";
import { FeedPost } from "@/components/feed/post";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Identity = { id: string; handle: string; displayName: string };

export function FeedView() {
  const sdk = useMemo(() => createArimanSdk(), []);

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingMe(true);
    setError(null);
    void (async () => {
      try {
        const d = await sdk.getMe();
        if (cancelled) return;
        const ids = d.identities ?? [];
        setIdentities(ids);
        if (ids[0]) setActiveIdentity(ids[0].id);
      } catch (e) {
        if (!cancelled) setError(userFacingApiError(e));
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sdk]);

  const loadPosts = useCallback(
    async (identityId: string) => {
      setLoadingPosts(true);
      setError(null);
      try {
        const d = await sdk.getPosts({ identityId });
        setPosts(d.posts ?? []);
      } catch (e) {
        setError(userFacingApiError(e));
      } finally {
        setLoadingPosts(false);
      }
    },
    [sdk],
  );

  useEffect(() => {
    if (activeIdentity) void loadPosts(activeIdentity);
    else setPosts([]);
  }, [activeIdentity, loadPosts]);

  async function publish() {
    if (!activeIdentity) return;
    setPublishing(true);
    setError(null);
    try {
      await sdk.createPost({ identityId: activeIdentity, body });
      setBody("");
      await loadPosts(activeIdentity);
      toast.success("Published");
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <Label className="font-mono text-lg tracking-wide text-foreground uppercase">Feed</Label>

      <div className="mt-4">
        <Label className="text-xs tracking-wide text-muted-foreground uppercase">Identity</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {loadingMe ? (
            <>
              <Skeleton className="h-8 w-24 animate-none bg-muted/50" />
              <Skeleton className="h-8 w-24 animate-none bg-muted/50" />
            </>
          ) : (
            identities.map((i) => (
              <Button
                key={i.id}
                size="sm"
                variant="outline"
                className={`border-border shadow-none ${
                  activeIdentity === i.id ? "bg-muted text-foreground" : "bg-transparent"
                }`}
                onClick={() => setActiveIdentity(i.id)}
              >
                @{i.handle}
              </Button>
            ))
          )}
        </div>
      </div>

      <Card className="mt-6 shadow-none ring-1 ring-border">
        <CardHeader className="space-y-1 pb-2">
          <Label className="text-xs tracking-wide text-muted-foreground uppercase">Composer</Label>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Post body…"
            className="min-h-20 border border-border bg-background text-foreground shadow-none"
          />
          <Button
            variant="outline"
            className="border-border shadow-none"
            disabled={publishing || !activeIdentity}
            onClick={() => void publish()}
          >
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </CardContent>
      </Card>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <Label className="mt-6 text-xs tracking-wide text-muted-foreground uppercase">Posts</Label>
      <ul className="mt-2 space-y-3">
        {loadingPosts ? (
          <>
            <Skeleton className="h-28 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
            <Skeleton className="h-28 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
          </>
        ) : (
          posts.map((p) => (
            <li key={p.id}>
              <FeedPost
                post={p}
                viewerIdentityId={activeIdentity}
                onPostUpdated={() => (activeIdentity ? void loadPosts(activeIdentity) : undefined)}
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
