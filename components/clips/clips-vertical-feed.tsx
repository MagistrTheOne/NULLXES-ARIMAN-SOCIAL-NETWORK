"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ClipWithPost } from "@nullxes/ariman-sdk";
import { ClipSlide } from "@/components/clips/clip-slide";

export function ClipsVerticalFeed(props: {
  clips: ClipWithPost[];
  viewerIdentityId: string | null;
  onPostUpdated: () => void;
}) {
  const { clips, viewerIdentityId, onPostUpdated } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [slidePx, setSlidePx] = useState(480);

  useLayoutEffect(() => {
    setRoot(scrollRef.current);
    const ro = new ResizeObserver(() => {
      const h = scrollRef.current?.clientHeight ?? 0;
      if (h > 0) setSlidePx(h);
    });
    if (scrollRef.current) ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  if (clips.length === 0) return null;

  const h = `${Math.max(slidePx, 320)}px`;

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
    >
      {clips.map((item) => (
        <ClipSlide
          key={item.clip.id}
          item={item}
          scrollRoot={root}
          viewerIdentityId={viewerIdentityId}
          onPostUpdated={onPostUpdated}
          slideMinHeight={h}
        />
      ))}
    </div>
  );
}
