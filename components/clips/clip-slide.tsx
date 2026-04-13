"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createArimanSdk, type ClipWithPost } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PLAY_THRESHOLD = 0.55;

function attachHls(video: HTMLVideoElement, src: string): (() => void) | void {
  if (src.endsWith(".m3u8")) {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }
    let hls: {
      loadSource: (s: string) => void;
      attachMedia: (v: HTMLVideoElement) => void;
      destroy: () => void;
    } | null = null;
    let cancelled = false;
    void import("hls.js").then(({ default: HlsCtor }) => {
      if (cancelled || !HlsCtor.isSupported()) {
        video.src = src;
        return;
      }
      hls = new HlsCtor({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
    });
    return () => {
      cancelled = true;
      hls?.destroy();
      hls = null;
    };
  }
  video.src = src;
}

export function ClipSlide(props: {
  item: ClipWithPost;
  scrollRoot: HTMLElement | null;
  viewerIdentityId: string | null;
  onPostUpdated: () => void;
  /** Slide height fills scrollport */
  slideMinHeight: string;
}) {
  const { item, scrollRoot, viewerIdentityId, onPostUpdated, slideMinHeight } = props;
  const { clip, post } = item;
  const sdk = useMemo(() => createArimanSdk(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const viewReported = useRef(false);
  useEffect(() => {
    viewReported.current = false;
  }, [clip.id]);

  const [viewsCount, setViewsCount] = useState(clip.viewsCount ?? 0);
  const [echoCount, setEchoCount] = useState(post.echoCount ?? 0);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
  const [saveCount, setSaveCount] = useState(post.saveCount ?? 0);
  const [echoed, setEchoed] = useState(!!post.echoedByViewer);
  const [saved, setSaved] = useState(!!post.savedByViewer);
  const [echoBusy, setEchoBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    setViewsCount(clip.viewsCount ?? 0);
    setEchoCount(post.echoCount ?? 0);
    setCommentCount(post.commentCount ?? 0);
    setSaveCount(post.saveCount ?? 0);
    setEchoed(!!post.echoedByViewer);
    setSaved(!!post.savedByViewer);
  }, [clip.id, clip.viewsCount, post.id, post.echoCount, post.commentCount, post.saveCount, post.echoedByViewer, post.savedByViewer]);

  const playbackUrl = clip.playbackUrl ?? "";
  const hasVideo = Boolean(playbackUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;
    return attachHls(video, playbackUrl) ?? undefined;
  }, [playbackUrl]);

  const setPlayingFromIO = useCallback(
    (wantPlay: boolean) => {
      const el = videoRef.current;
      if (!el || !hasVideo) return;
      if (wantPlay) {
        void el.play().catch(() => {});
      } else {
        el.pause();
      }
    },
    [hasVideo],
  );

  useEffect(() => {
    const target = shellRef.current;
    if (!target || !scrollRoot) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        const ratio = e.intersectionRatio;
        const on = e.isIntersecting && ratio >= PLAY_THRESHOLD;
        setPlayingFromIO(on);
        if (on && !viewReported.current) {
          viewReported.current = true;
          void sdk
            .recordClipView(clip.id)
            .then((r) => setViewsCount(r.viewsCount))
            .catch(() => {
              viewReported.current = false;
            });
        }
      },
      { root: scrollRoot, threshold: [0, 0.25, 0.45, PLAY_THRESHOLD, 0.7, 0.9, 1] },
    );

    io.observe(target);
    return () => io.disconnect();
  }, [clip.id, scrollRoot, setPlayingFromIO, sdk]);

  async function onEcho() {
    if (!viewerIdentityId) {
      toast.message("Pick an identity in the header.");
      return;
    }
    setEchoBusy(true);
    try {
      const out = await sdk.toggleEcho(post.id, viewerIdentityId);
      setEchoCount(out.echoCount);
      setCommentCount(out.commentCount);
      setSaveCount(out.saveCount);
      setEchoed(out.echoedByViewer);
      setSaved(out.savedByViewer);
      await onPostUpdated();
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setEchoBusy(false);
    }
  }

  async function onSave() {
    if (!viewerIdentityId) {
      toast.message("Pick an identity in the header.");
      return;
    }
    setSaveBusy(true);
    try {
      const out = await sdk.toggleSave(post.id, viewerIdentityId);
      setEchoCount(out.echoCount);
      setCommentCount(out.commentCount);
      setSaveCount(out.saveCount);
      setEchoed(out.echoedByViewer);
      setSaved(out.savedByViewer);
      await onPostUpdated();
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setSaveBusy(false);
    }
  }

  async function submitComment() {
    if (!viewerIdentityId || !commentDraft.trim()) return;
    setPostingComment(true);
    try {
      await sdk.createComment(post.id, { identityId: viewerIdentityId, body: commentDraft.trim() });
      setCommentDraft("");
      setCommentCount((c) => c + 1);
      await onPostUpdated();
      toast.success("Comment added");
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setPostingComment(false);
    }
  }

  const handle = post.authorHandle ?? "—";

  return (
    <section
      ref={shellRef}
      className={cn("relative w-full snap-start snap-always shrink-0 overflow-hidden bg-black")}
      style={{ minHeight: slideMinHeight, height: slideMinHeight }}
      aria-label={`Clip by @${handle}`}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 size-full object-cover"
          playsInline
          muted
          loop
          controls={false}
          poster={clip.thumbnailUrl ?? undefined}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/30 px-6 text-center">
          <p className="text-sm text-muted-foreground">No video yet</p>
          <p className="font-mono text-[10px] text-muted-foreground">{clip.transcodeState}</p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/50 via-transparent to-black/70" />

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 pb-6">
        <div>
          <p className="font-mono text-sm font-medium text-white">@{handle}</p>
          {post.body ? (
            <p className="mt-1 line-clamp-6 max-w-md text-sm leading-snug text-white/95">{post.body}</p>
          ) : null}
          <p className="mt-1 font-mono text-[10px] text-white/60">
            {`${viewsCount} views`}
            {clip.durationMs > 0 ? ` · ${(clip.durationMs / 1000).toFixed(0)}s` : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-0 bg-white/15 text-white hover:bg-white/25"
            disabled={echoBusy}
            onClick={() => void onEcho()}
          >
            Echo{echoCount > 0 ? ` · ${echoCount}` : ""}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-0 bg-white/15 text-white hover:bg-white/25"
            onClick={() => setReplyOpen((v) => !v)}
          >
            Reply{commentCount > 0 ? ` · ${commentCount}` : ""}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={cn(
              "border-0 bg-white/15 text-white hover:bg-white/25",
              saved && "bg-white/30",
            )}
            disabled={saveBusy}
            onClick={() => void onSave()}
          >
            Save{saveCount > 0 ? ` · ${saveCount}` : ""}
          </Button>
        </div>

        {replyOpen ? (
          <div className="rounded-md border border-white/20 bg-black/50 p-3 backdrop-blur-sm">
            <Textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder={viewerIdentityId ? "Write a comment…" : "Select an identity above"}
              disabled={!viewerIdentityId}
              className="min-h-16 resize-none border-white/20 bg-black/40 text-sm text-white placeholder:text-white/50"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2 border-0 bg-white/20 text-white hover:bg-white/30"
              disabled={!viewerIdentityId || postingComment || !commentDraft.trim()}
              onClick={() => void submitComment()}
            >
              {postingComment ? "Posting…" : "Post comment"}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
