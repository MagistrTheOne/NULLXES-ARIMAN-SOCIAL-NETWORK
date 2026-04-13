"use client";

import { useCallback, useRef, useState } from "react";
import type { ClipWithPost } from "@nullxes/ariman-sdk";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProfileClipCard({ item }: { item: ClipWithPost }) {
  const { clip, post } = item;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hover, setHover] = useState(false);
  const canPreview = Boolean(clip.playbackUrl);

  const onEnter = useCallback(() => {
    setHover(true);
    const v = videoRef.current;
    if (!v || !clip.playbackUrl) return;
    v.muted = true;
    v.loop = true;
    void v.play().catch(() => {
      /* autoplay may block; ignore */
    });
  }, [clip.playbackUrl]);

  const onLeave = useCallback(() => {
    setHover(false);
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    try {
      v.currentTime = 0;
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Card
      className="group/clip relative overflow-hidden border-border shadow-none ring-1 ring-border"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <div className="relative aspect-video w-full bg-muted/30">
        {clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt={post.body.slice(0, 80)}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-200",
              canPreview && hover ? "opacity-0" : "opacity-100",
            )}
          />
        ) : (
          <div
            className={cn(
              "absolute inset-0 bg-muted/50 transition-opacity duration-200",
              canPreview && hover ? "opacity-0" : "opacity-100",
            )}
          />
        )}
        {clip.playbackUrl ? (
          <video
            ref={videoRef}
            src={clip.playbackUrl}
            className="pointer-events-none absolute inset-0 size-full object-cover"
            playsInline
            muted
            loop
            preload="metadata"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-background/85 px-3 py-2 text-[10px] font-mono tracking-wide text-foreground uppercase backdrop-blur-[2px]">
          <span>views {clip.viewsCount}</span>
          <span>echoes {clip.echoCount}</span>
        </div>
      </div>
      <div className="space-y-1.5 p-4">
        <p className="line-clamp-2 text-sm leading-snug text-foreground">{post.body}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {clip.transcodeState} · {new Date(clip.createdAt).toLocaleDateString()}
        </p>
      </div>
    </Card>
  );
}
