"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createArimanSdk } from "@nullxes/ariman-sdk";
import type { CommunityDetailResponse } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { FeedPost } from "@/components/feed/post";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Identity = { id: string; handle: string; displayName: string };

export function CommunityView({ slug }: { slug: string }) {
  const sdk = useMemo(() => createArimanSdk(), []);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<string | null>(null);
  const [data, setData] = useState<CommunityDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMe, setLoadingMe] = useState(true);
  const [joining, setJoining] = useState(false);
  const [composer, setComposer] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingMe(true);
    void (async () => {
      try {
        const d = await sdk.getMe();
        if (cancelled) return;
        const ids = (d.identities ?? []) as Identity[];
        setIdentities(ids);
        if (ids[0]) setActiveIdentity(ids[0].id);
      } catch {
        if (!cancelled) setIdentities([]);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sdk]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await sdk.getCommunity(slug, {
        identityId: activeIdentity ?? undefined,
      });
      setData(d);
    } catch (e) {
      setData(null);
      setError(userFacingApiError(e));
    } finally {
      setLoading(false);
    }
  }, [sdk, slug, activeIdentity]);

  useEffect(() => {
    void load();
  }, [load]);

  async function join() {
    setJoining(true);
    setError(null);
    try {
      const out = await sdk.joinCommunity(slug);
      await load();
      if (out.joined) toast.success("Joined community");
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setJoining(false);
    }
  }

  async function publish() {
    if (!data?.community.id || !activeIdentity || !composer.trim() || !data.member) return;
    setPublishing(true);
    try {
      await sdk.createPost({
        identityId: activeIdentity,
        body: composer.trim(),
        communityId: data.community.id,
      });
      setComposer("");
      await load();
      toast.success("Posted to community");
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setPublishing(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64 animate-none border border-border bg-muted/30 shadow-none" />
        <Skeleton className="h-9 w-28 animate-none border border-border bg-muted/30 shadow-none" />
        <Skeleton className="h-32 w-full animate-none border border-border bg-muted/30 shadow-none" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error ?? "Community not found."}</p>
      </div>
    );
  }

  const { community, member, memberCount, posts } = data;

  return (
    <div className="p-6">
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-foreground">{community.title}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            /{community.slug} · {memberCount ?? 0} {(memberCount ?? 0) === 1 ? "member" : "members"}
          </p>
          {community.description ? (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{community.description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-border shadow-none"
          disabled={member || joining}
          onClick={() => void join()}
        >
          {member ? "Joined" : joining ? "Joining…" : "Join"}
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        <Label className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Post as</Label>
        <div className="flex flex-wrap gap-2">
          {loadingMe ? (
            <Skeleton className="h-8 w-28 animate-none border border-border bg-muted/30 shadow-none" />
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

      {member ? (
        <Card className="mt-6 border-border shadow-none ring-1 ring-border">
          <CardHeader className="pb-2">
            <Label className="text-xs tracking-wide text-muted-foreground uppercase">Community post</Label>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder="Share with this community…"
              disabled={!activeIdentity}
              className="min-h-20 resize-none border border-border bg-background text-sm shadow-none"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border shadow-none"
              disabled={publishing || !activeIdentity || !composer.trim()}
              onClick={() => void publish()}
            >
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6 border-border shadow-none ring-1 ring-border">
          <CardContent className="py-6 text-sm text-muted-foreground">
            Join this community to post here. You can still read the feed below.
          </CardContent>
        </Card>
      )}

      <h2 className="mt-10 font-mono text-xs tracking-wide text-muted-foreground uppercase">Posts</h2>
      <ul className="mt-3 space-y-3">
        {loading && posts.length === 0 ? (
          <>
            <Skeleton className="h-36 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
            <Skeleton className="h-36 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
          </>
        ) : posts.length === 0 ? (
          <Card className="border-border shadow-none ring-1 ring-border">
            <CardContent className="space-y-2 py-10 text-center">
              <p className="text-sm text-foreground">No signals in this channel yet.</p>
              <p className="text-xs text-muted-foreground">
                {member
                  ? "Be the first to publish above."
                  : "Join to contribute, or check back after members post."}
              </p>
            </CardContent>
          </Card>
        ) : (
          posts.map((p) => (
            <li key={p.id}>
              <FeedPost
                post={p}
                viewerIdentityId={activeIdentity}
                onPostUpdated={() => void load()}
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
