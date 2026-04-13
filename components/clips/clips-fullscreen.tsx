"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ClipWithPost } from "@nullxes/ariman-sdk";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

export function ClipsFullscreen(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: ClipWithPost[];
  startIndex: number;
}) {
  const { open, onOpenChange, clips, startIndex } = props;
  const [index, setIndex] = useState(startIndex);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setIndex(Math.min(Math.max(0, startIndex), Math.max(0, clips.length - 1)));
  }, [open, startIndex, clips.length]);

  const current = clips[index];
  const hasPrev = index > 0;
  const hasNext = index < clips.length - 1;

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        const n = i + dir;
        if (n < 0 || n >= clips.length) return i;
        return n;
      });
    },
    [clips.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "j") go(1);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "k") go(-1);
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open || !current) return null;

  const { clip, post } = current;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-background ring-1 ring-border">
      <div className="absolute inset-0 bg-black/40" aria-hidden onClick={() => onOpenChange(false)} />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col bg-background">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Clip {index + 1} / {clips.length}
            </p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              @{post.authorHandle ?? "—"} · {post.authorDisplayName ?? "Member"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="shrink-0 border-border shadow-none"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </header>
        <div
          className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
          onWheel={(e) => {
            if (e.deltaY > 40 && hasNext) {
              e.preventDefault();
              go(1);
            } else if (e.deltaY < -40 && hasPrev) {
              e.preventDefault();
              go(-1);
            }
          }}
        >
          <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 py-10">
            <div className="aspect-video w-full max-w-4xl border border-border bg-muted/20" />
            <p className="max-w-2xl whitespace-pre-wrap text-center text-sm text-foreground">{post.body}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {clip.transcodeState}
              {clip.createdAt ? ` · ${new Date(clip.createdAt).toLocaleString()}` : ""}
            </p>
          </div>
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border shadow-none"
            disabled={!hasPrev}
            onClick={() => go(-1)}
          >
            Previous
          </Button>
          <span className="font-mono text-[10px] text-muted-foreground">Scroll or arrows</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border shadow-none"
            disabled={!hasNext}
            onClick={() => go(1)}
          >
            Next
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
