"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createArimanSdk } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Identity = { id: string; handle: string; displayName: string };

const fieldClass =
  "border border-border bg-background font-mono text-xs text-foreground shadow-none";

export function ClipsView() {
  const sdk = useMemo(() => createArimanSdk(), []);

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<string | null>(null);
  const [clips, setClips] = useState<
    { clip: { id: string; transcodeState: string; postId: string }; post: { body: string } }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingClips, setLoadingClips] = useState(false);
  const [stubBody, setStubBody] = useState("");
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

  async function createStub() {
    if (!activeIdentity || !stubBody.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await sdk.createClip({ identityId: activeIdentity, body: stubBody.trim() });
      setStubBody("");
      await loadClips(activeIdentity);
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="border-b border-border p-4">
        <Label className="font-mono text-lg tracking-wide text-foreground uppercase">Clips</Label>
        <div className="mt-3">
          <Label className="text-xs tracking-wide text-muted-foreground uppercase">Identity</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {loadingMe ? (
              <Skeleton className="h-8 w-28 animate-none bg-muted/50" />
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
        <Card className="mt-4 shadow-none ring-1 ring-border">
          <CardHeader className="pb-2">
            <Label className="text-xs tracking-wide text-muted-foreground uppercase">New clip stub</Label>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Textarea
              value={stubBody}
              onChange={(e) => setStubBody(e.target.value)}
              placeholder="Caption / stub body…"
              className={`min-h-[64px] ${fieldClass}`}
            />
            <Button
              variant="outline"
              size="sm"
              className="border-border shadow-none"
              disabled={creating || !activeIdentity}
              onClick={() => void createStub()}
            >
              {creating ? "Creating…" : "Create stub"}
            </Button>
          </CardContent>
        </Card>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="h-[calc(100vh-12rem)] overflow-y-auto snap-y snap-mandatory">
        {loadingClips ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-[70vh] animate-none bg-muted/50" />
          </div>
        ) : clips.length === 0 ? (
          <div className="flex h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
            No clips for this identity.
          </div>
        ) : (
          clips.map(({ clip, post }) => (
            <div
              key={clip.id}
              className="flex h-[calc(100vh-12rem)] snap-start flex-col justify-between border-b border-border p-6"
            >
              <div className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                {clip.transcodeState}
              </div>
              <div className="flex flex-1 items-center justify-center py-4">
                <Card className="w-full max-w-sm shadow-none ring-1 ring-border">
                  <CardContent className="space-y-2 pt-6">
                    <div className="aspect-9/16 w-full border border-border bg-background" />
                    <p className="border border-border bg-background px-2 py-2 text-xs text-foreground">
                      {post.body}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">post {clip.postId}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
