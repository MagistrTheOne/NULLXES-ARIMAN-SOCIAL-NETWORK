"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShellUserMenu } from "@/components/shell/shell-user-menu";
import { useCurrentUser } from "@/lib/hooks/use-current-user";

const nav = [
  { href: "/profile", label: "Profile" },
  { href: "/messages", label: "Messages" },
  { href: "/feed", label: "Feed" },
  { href: "/clips", label: "Clips" },
  { href: "/community/demo", label: "Communities" },
  { href: "/settings", label: "Settings" },
];

export function ShellChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isPending, displayName, primaryHandle } = useCurrentUser();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <div className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            NULLXES ARIMAN
          </div>
          {!isPending && user ? (
            <div className="mt-1 space-y-0.5">
              <div className="truncate text-xs font-medium text-foreground">{displayName}</div>
              {primaryHandle ? (
                <div className="truncate font-mono text-[10px] text-muted-foreground">@{primaryHandle}</div>
              ) : (
                <div className="truncate font-mono text-[10px] text-muted-foreground">—</div>
              )}
            </div>
          ) : null}
        </div>
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const onCommunity =
                pathname === "/community" || pathname.startsWith("/community/");
              const active =
                item.href.startsWith("/community") && onCommunity
                  ? true
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                      size: "sm",
                    }),
                    "justify-start border-border font-normal shadow-none",
                    active ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <Separator />
        <ShellUserMenu />
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border">{children}</main>
    </div>
  );
}
