"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createArimanSdk } from "@nullxes/ariman-sdk";
import type { ActivityItemDto, ClipWithPost, Identity, PostRow } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { FeedPost } from "@/components/feed/post";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  if (p.length >= 2) return (p[0]![0] + p[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export function ProfileView() {
  const sdk = useMemo(() => createArimanSdk(), []);
  const [primary, setPrimary] = useState<Identity | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [clips, setClips] = useState<ClipWithPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingClips, setLoadingClips] = useState(false);
  const [activity, setActivity] = useState<ActivityItemDto[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const loadMe = useCallback(async () => {
    setLoadingMe(true);
    setError(null);
    try {
      const d = await sdk.getMe();
      const first = d.identities?.[0] ?? null;
      setPrimary(first);
    } catch (e) {
      setError(userFacingApiError(e));
      setPrimary(null);
    } finally {
      setLoadingMe(false);
    }
  }, [sdk]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const loadPosts = useCallback(
    async (identityId: string) => {
      setLoadingPosts(true);
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

  const loadClips = useCallback(
    async (identityId: string) => {
      setLoadingClips(true);
      try {
        const d = await sdk.getClips({ identityId });
        setClips(d.clips ?? []);
      } catch (e) {
        setError(userFacingApiError(e));
      } finally {
        setLoadingClips(false);
      }
    },
    [sdk],
  );

  const loadActivity = useCallback(
    async (identityId: string) => {
      setLoadingActivity(true);
      try {
        const d = await sdk.getActivity({ identityId, limit: 40 });
        setActivity(d.items ?? []);
      } catch (e) {
        setError(userFacingApiError(e));
      } finally {
        setLoadingActivity(false);
      }
    },
    [sdk],
  );

  useEffect(() => {
    if (!primary?.id) {
      setPosts([]);
      setClips([]);
      setActivity([]);
      return;
    }
    void loadPosts(primary.id);
    void loadClips(primary.id);
    void loadActivity(primary.id);
  }, [primary?.id, loadPosts, loadClips, loadActivity]);

  if (loadingMe) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-48 animate-none border border-border bg-muted/30 shadow-none" />
        <Skeleton className="h-32 w-full animate-none border border-border bg-muted/30 shadow-none" />
      </div>
    );
  }

  if (!primary) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error ?? "No identity on this account."}</p>
      </div>
    );
  }

  const bio = primary.bio?.trim();

  return (
    <div className="p-6">
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <Card className="border-border shadow-none ring-1 ring-border">
        <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-start">
          <Avatar className="size-20 shrink-0">
            <AvatarFallback className="bg-secondary text-lg font-medium text-muted-foreground">
              {initials(primary.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h1 className="text-xl font-medium tracking-tight text-foreground">{primary.displayName}</h1>
              <p className="font-mono text-sm text-muted-foreground">@{primary.handle}</p>
              <p className="text-xs text-muted-foreground">0 connections</p>
            </div>
            {bio ? <p className="max-w-2xl text-sm leading-relaxed text-foreground/90">{bio}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Link
                href="/messages"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-border shadow-none no-underline",
                )}
              >
                Message
              </Link>
              <Button variant="outline" size="sm" className="border-border shadow-none" disabled title="Coming soon">
                Connect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="mt-8">
        <TabsList variant="line" className="w-full max-w-md border-b border-border bg-transparent p-0">
          <TabsTrigger value="posts" className="rounded-none border-0 shadow-none data-active:shadow-none">
            Posts
          </TabsTrigger>
          <TabsTrigger value="clips" className="rounded-none border-0 shadow-none data-active:shadow-none">
            Clips
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-none border-0 shadow-none data-active:shadow-none">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {loadingPosts ? (
            <div className="space-y-3">
              <Skeleton className="h-28 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
              <Skeleton className="h-28 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => (
                <li key={p.id}>
                  <FeedPost
                    post={p}
                    viewerIdentityId={primary.id}
                    onPostUpdated={() => void loadPosts(primary.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="clips" className="mt-4">
          {loadingClips ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-56 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
              <Skeleton className="h-56 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
            </div>
          ) : clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clips yet.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map(({ clip, post }) => (
                <li key={clip.id}>
                  <Card className="h-full border-border shadow-none ring-1 ring-border">
                    <CardContent className="space-y-3 p-4">
                      <div
                        className="aspect-video w-full border border-border bg-muted/20 bg-cover bg-center"
                        style={
                          clip.thumbnailUrl ? { backgroundImage: `url(${clip.thumbnailUrl})` } : undefined
                        }
                      />
                      <div>
                        <p className="text-xs font-medium text-foreground">{post.authorDisplayName ?? "Member"}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">@{post.authorHandle ?? "—"}</p>
                      </div>
                      <p className="line-clamp-3 text-sm text-foreground">{post.body}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {clip.transcodeState} · {new Date(clip.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          {loadingActivity ? (
            <div className="space-y-2">
              <Skeleton className="h-16 animate-none border border-border bg-muted/30 shadow-none" />
              <Skeleton className="h-16 animate-none border border-border bg-muted/30 shadow-none" />
            </div>
          ) : activity.length === 0 ? (
            <Card className="border-border shadow-none ring-1 ring-border">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No posts or replies yet for this identity.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {activity.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Card className="border-border shadow-none ring-1 ring-border">
                    <CardContent className="space-y-1 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                          {item.kind === "post" ? "Post" : "Reply"}
                        </span>
                        <time className="font-mono text-[10px] text-muted-foreground">
                          {format(new Date(item.createdAt), "MMM d, yyyy · HH:mm")}
                        </time>
                      </div>
                      {item.kind === "reply" ? (
                        <p className="text-[10px] text-muted-foreground">On: {item.postPreview}</p>
                      ) : null}
                      <p className="whitespace-pre-wrap text-sm text-foreground">{item.body}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
