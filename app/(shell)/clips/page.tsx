export default function ClipsPage() {
  const items = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="h-[calc(100vh-0px)] overflow-y-auto snap-y snap-mandatory bg-background">
      {items.map((i) => (
        <div
          key={i}
          className="flex h-[calc(100vh-4rem)] snap-start flex-col justify-between border-b border-border bg-card p-6"
        >
          <div className="font-mono text-xs text-muted-foreground">CLIP {i + 1}</div>
          <div className="flex flex-1 items-center justify-center">
            <div className="aspect-[9/16] w-full max-w-sm border border-border bg-secondary" />
          </div>
          <div className="text-center text-xs text-muted-foreground">Video placeholder</div>
        </div>
      ))}
    </div>
  );
}
