"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createArimanSdk } from "@nullxes/ariman-sdk";
import type { ClipWithPost } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { ClipsFullscreen } from "@/components/clips/clips-fullscreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Identity = { id: string; handle: string; displayName: string };

const fieldClass = "border border-border bg-background text-sm text-foreground shadow-none";

export function ClipsView() {
  const sdk = useMemo(() => createArimanSdk(), []);

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<string | null>(null);
  const [clips, setClips] = useState<ClipWithPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingClips, setLoadingClips] = useState(false);
  const [caption, setCaption] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingMe(true);
    setError(null);
    void (async () => {
      try {
        const d = await sdk.getMe();
        if (cancelled) return;
        const ids = d.identities ?? [];
        setIdentities(ids as Identity[]);
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

  const loadClips = useCallback(
    async (identityId: string) => {
      setLoadingClips(true);
      setError(null);
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

  useEffect(() => {
    if (activeIdentity) void loadClips(activeIdentity);
    else setClips([]);
  }, [activeIdentity, loadClips]);

  async function createClip() {
    if (!activeIdentity || !caption.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await sdk.createClip({ identityId: activeIdentity, body: caption.trim() });
      setCaption("");
      await loadClips(activeIdentity);
      toast.success("Clip created");
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="border-b border-border p-6">
        <Label className="font-mono text-lg tracking-wide text-foreground uppercase">Clips</Label>
        <div className="mt-4">
          <Label className="text-xs tracking-wide text-muted-foreground uppercase">Identity</Label>
          <div className="mt-2 flex flex-wrap gap-2">
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

        <Card className="mt-6 border-border shadow-none ring-1 ring-border">
          <CardHeader className="pb-2">
            <Label className="text-xs tracking-wide text-muted-foreground uppercase">New clip</Label>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption…"
              className={`min-h-18 resize-none ${fieldClass}`}
            />
            <Button
              variant="outline"
              size="sm"
              className="border-border shadow-none"
              disabled={creating || !activeIdentity}
              onClick={() => void createClip()}
            >
              {creating ? "Creating…" : "Create clip"}
            </Button>
          </CardContent>
        </Card>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loadingClips ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
            <Skeleton className="h-64 animate-none rounded-md border border-border bg-muted/30 shadow-none" />
          </div>
        ) : clips.length === 0 ? (
          <Card className="border-border shadow-none ring-1 ring-border">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No clips for this identity.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clips.map(({ clip, post }, idx) => (
              <li key={clip.id}>
                <Card
                  role="button"
                  tabIndex={0}
                  className="h-full cursor-pointer border-border shadow-none ring-1 ring-border transition-colors hover:bg-muted/30"
                  onClick={() => {
                    setViewerIndex(idx);
                    setViewerOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setViewerIndex(idx);
                      setViewerOpen(true);
                    }
                  }}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="aspect-video w-full border border-border bg-muted/20" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{post.authorDisplayName ?? "Member"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">@{post.authorHandle ?? "—"}</p>
                    </div>
                    <p className="line-clamp-4 text-sm leading-relaxed text-foreground">{post.body}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {clip.transcodeState}
                      {clip.createdAt ? ` · ${new Date(clip.createdAt).toLocaleString()}` : null}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ClipsFullscreen
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        clips={clips}
        startIndex={viewerIndex}
      />
    </div>
  );
}
