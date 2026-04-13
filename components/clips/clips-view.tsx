"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createArimanSdk, type ClipWithPost } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { ClipsVerticalFeed } from "@/components/clips/clips-vertical-feed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Identity = { id: string; handle: string; displayName: string };

const fieldClass = "border border-border bg-background text-sm text-foreground shadow-none";

export function ClipsView() {
  const sdk = useMemo(() => createArimanSdk(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<string | null>(null);
  const [clips, setClips] = useState<ClipWithPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingClips, setLoadingClips] = useState(false);
  const [caption, setCaption] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

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

  async function createClipWithOptionalUpload() {
    if (!activeIdentity) return;
    setCreating(true);
    setError(null);
    try {
      const created = await sdk.createClip({ identityId: activeIdentity, body: caption.trim() });
      if (pendingFile) {
        await sdk.uploadClipVideo({
          identityId: activeIdentity,
          clipId: created.clip.id,
          file: pendingFile,
        });
        toast.success("Clip published with video");
      } else {
        toast.success("Clip created — add a video from the list or create another with a file");
      }
      setCaption("");
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadClips(activeIdentity);
    } catch (e) {
      setError(userFacingApiError(e));
      toast.error(userFacingApiError(e));
    } finally {
      setCreating(false);
    }
  }

  async function uploadToExistingClip(clipId: string, file: File) {
    if (!activeIdentity) return;
    setError(null);
    try {
      await sdk.uploadClipVideo({ identityId: activeIdentity, clipId, file });
      toast.success("Video attached");
      await loadClips(activeIdentity);
    } catch (e) {
      toast.error(userFacingApiError(e));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="shrink-0 border-b border-border p-4 md:p-6">
        <Label className="font-mono text-lg tracking-wide text-foreground uppercase">Clips</Label>
        <div className="mt-3">
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

        <Card className="mt-4 border-border shadow-none ring-1 ring-border md:mt-6">
          <CardHeader className="pb-2">
            <Label className="text-xs tracking-wide text-muted-foreground uppercase">New clip</Label>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption…"
              className={`min-h-18 resize-none ${fieldClass}`}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                ref={fileRef}
                type="file"
                accept="video/*"
                className={`cursor-pointer text-xs ${fieldClass}`}
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
              />
              {pendingFile ? (
                <span className="truncate font-mono text-[10px] text-muted-foreground">{pendingFile.name}</span>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border shadow-none"
              disabled={creating || !activeIdentity}
              onClick={() => void createClipWithOptionalUpload()}
            >
              {creating ? "Publishing…" : "Publish clip"}
            </Button>
          </CardContent>
        </Card>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {loadingClips ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <Skeleton className="h-[min(70vh,520px)] w-full max-w-md animate-none rounded-lg border border-border bg-muted/30 shadow-none" />
          </div>
        ) : clips.length === 0 ? (
          <Card className="m-4 border-border shadow-none ring-1 ring-border md:m-6">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No clips for this identity.
            </CardContent>
          </Card>
        ) : (
          <>
            <ul className="hidden shrink-0 gap-2 border-b border-border px-4 py-2 md:block">
              {clips
                .filter((c) => !c.clip.playbackUrl)
                .map(({ clip, post }) => (
                  <li
                    key={clip.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
                  >
                    <span className="truncate text-muted-foreground">
                      Pending video · {post.body.slice(0, 48)}
                      {post.body.length > 48 ? "…" : ""}
                    </span>
                    <label className="cursor-pointer">
                      <span className="rounded border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-wide hover:bg-muted">
                        Upload video
                      </span>
                      <input
                        type="file"
                        accept="video/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) void uploadToExistingClip(clip.id, f);
                        }}
                      />
                    </label>
                  </li>
                ))}
            </ul>
            <ClipsVerticalFeed
              clips={clips}
              viewerIdentityId={activeIdentity}
              onPostUpdated={() => (activeIdentity ? void loadClips(activeIdentity) : undefined)}
            />
          </>
        )}
      </div>
    </div>
  );
}
