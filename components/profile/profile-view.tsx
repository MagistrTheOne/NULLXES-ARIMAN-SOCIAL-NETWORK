"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createArimanSdk,
  type ClipWithPost,
  type Identity,
  type PostRow,
  type ProfileStatsResponse,
} from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { FeedPost } from "@/components/feed/post";
import { EditProfileSheet, readAvatarDataUrl } from "@/components/profile/edit-profile-sheet";
import { ProfileClipCard } from "@/components/profile/profile-clip-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  if (p.length >= 2) return (p[0]![0] + p[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function mergeIdentity(prev: Identity, patch: Partial<Pick<Identity, "displayName" | "bio" | "avatarUrl">>): Identity {
  return {
    ...prev,
    ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
    ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
    ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
  };
}

export function ProfileView() {
  const sdk = useMemo(() => createArimanSdk(), []);
  const [primary, setPrimary] = useState<Identity | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [stats, setStats] = useState<ProfileStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingClips, setLoadingClips] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("posts");
  const revertRef = useRef<Identity | null>(null);

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

  const [clips, setClips] = useState<ClipWithPost[]>([]);

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

  const loadStats = useCallback(
    async (identityId: string) => {
      setLoadingStats(true);
      try {
        const s = await sdk.getProfileStats({ identityId });
        setStats(s);
      } catch (e) {
        setError(userFacingApiError(e));
        setStats(null);
      } finally {
        setLoadingStats(false);
      }
    },
    [sdk],
  );

  useEffect(() => {
    if (!primary?.id) {
      setPosts([]);
      setClips([]);
      setStats(null);
      return;
    }
    void loadPosts(primary.id);
    void loadClips(primary.id);
    void loadStats(primary.id);
  }, [primary?.id, loadPosts, loadClips, loadStats]);

  const persistProfile = useCallback(
    async (patch: { displayName?: string; bio?: string | null; avatarUrl?: string | null }) => {
      if (!primary) return;
      const prev = primary;
      revertRef.current = prev;
      setPrimary(mergeIdentity(primary, patch));
      setError(null);
      try {
        const res = await sdk.patchMe({ identityId: primary.id, ...patch });
        const next = res.identity ?? res.identities?.find((i) => i.id === primary.id) ?? null;
        if (next) setPrimary(next);
        else await loadMe();
        void loadStats(primary.id);
      } catch (e) {
        if (revertRef.current) setPrimary(revertRef.current);
        throw e;
      }
    },
    [primary, sdk, loadMe, loadStats],
  );

  const removePostFromList = useCallback((postId: string) => {
    setPosts((list) => list.filter((p) => p.id !== postId));
    if (primary?.id) void loadStats(primary.id);
  }, [primary?.id, loadStats]);

  if (loadingMe) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-48 w-full animate-none border border-border bg-muted/20 shadow-none" />
        <Skeleton className="h-10 w-64 animate-none border border-border bg-muted/20 shadow-none" />
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
    <div className="p-6 pb-16">
      {error ? <p className="mb-6 text-sm text-destructive">{error}</p> : null}

      <section className="relative border border-border bg-card/40 px-6 py-10 sm:px-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          <div className="relative shrink-0">
            <label className="group/avatar-change relative block cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(ev) => {
                  const file = ev.target.files?.[0] ?? null;
                  ev.target.value = "";
                  if (!file) return;
                  void (async () => {
                    try {
                      const dataUrl = await readAvatarDataUrl(file);
                      await persistProfile({ avatarUrl: dataUrl });
                      toast.success("Avatar updated");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : userFacingApiError(err));
                    }
                  })();
                }}
              />
              <Avatar size="lg" className="size-24! sm:size-28!">
                {primary.avatarUrl ? <AvatarImage src={primary.avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-muted text-lg font-medium text-muted-foreground sm:text-xl">
                  {initials(primary.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-foreground/0 text-xs font-medium text-background opacity-0 transition-opacity duration-150 group-hover/avatar-change:bg-foreground/85 group-hover/avatar-change:opacity-100">
                Change
              </span>
            </label>
          </div>

          <div className="min-w-0 flex-1 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">{primary.displayName}</h1>
              <p className="font-mono text-sm text-muted-foreground">@{primary.handle}</p>
              {bio ? (
                <p className="max-w-2xl text-sm leading-relaxed text-foreground/90 line-clamp-3 whitespace-pre-wrap">
                  {bio}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No bio yet.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-x-10 gap-y-4 font-mono text-xs tracking-wide text-muted-foreground uppercase">
              <div>
                <p className="text-2xl font-medium text-foreground tabular-nums normal-case tracking-normal">
                  {loadingStats ? "—" : stats?.postCount ?? "—"}
                </p>
                <p className="mt-1">Posts</p>
              </div>
              <div>
                <p className="text-2xl font-medium text-foreground tabular-nums normal-case tracking-normal">
                  {loadingStats ? "—" : stats?.clipCount ?? "—"}
                </p>
                <p className="mt-1">Clips</p>
              </div>
              <div>
                <p className="text-2xl font-medium text-foreground tabular-nums normal-case tracking-normal">
                  {loadingStats ? "—" : stats?.connectionCount ?? "—"}
                </p>
                <p className="mt-1">Connections</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border shadow-none"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" />
                Edit profile
              </Button>
              <Link
                href="/messages"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-border shadow-none no-underline",
                )}
              >
                Message
              </Link>
            </div>
          </div>
        </div>
      </section>

      <EditProfileSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        identity={primary}
        onPersist={persistProfile}
      />

      <Tabs value={tab} onValueChange={(v) => v && setTab(v)} className="mt-10">
        <TabsList variant="line" className="h-11 w-full max-w-md border-b border-border bg-transparent p-0">
          <TabsTrigger value="posts" className="rounded-none border-0 shadow-none data-active:shadow-none">
            Posts
          </TabsTrigger>
          <TabsTrigger value="clips" className="rounded-none border-0 shadow-none data-active:shadow-none">
            Clips
          </TabsTrigger>
        </TabsList>

        <div
          className="mt-6 min-h-112 transition-opacity duration-200 motion-reduce:transition-none"
          role="tabpanel"
          id={`profile-tab-${tab}`}
        >
          {tab === "posts" ? (
            loadingPosts ? (
              <div className="space-y-3">
                <Skeleton className="h-28 animate-none rounded-md border border-border bg-muted/20 shadow-none" />
                <Skeleton className="h-28 animate-none rounded-md border border-border bg-muted/20 shadow-none" />
              </div>
            ) : posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posts yet.</p>
            ) : (
              <ul className="space-y-4">
                {posts.map((p) => (
                  <li key={p.id}>
                    <FeedPost
                      post={p}
                      viewerIdentityId={primary.id}
                      layout="compact"
                      showOwnerActions
                      onPostUpdated={() => void loadPosts(primary.id)}
                      onPostRemoved={() => removePostFromList(p.id)}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : loadingClips ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-64 animate-none rounded-md border border-border bg-muted/20 shadow-none" />
              <Skeleton className="h-64 animate-none rounded-md border border-border bg-muted/20 shadow-none" />
            </div>
          ) : clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clips yet.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((row) => (
                <li key={row.clip.id}>
                  <ProfileClipCard item={row} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Tabs>
    </div>
  );
}
