"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  if (p.length >= 2) return (p[0]![0] + p[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export function ShellUserMenu() {
  const router = useRouter();
  const { user, displayName, isPending } = useCurrentUser();

  if (isPending || !user) {
    return (
      <div className="border-t border-border p-2">
        <div className="flex h-10 items-center gap-2 px-2 text-xs text-muted-foreground">…</div>
      </div>
    );
  }

  const email = user.email ?? "";
  const image = user.image ?? undefined;

  return (
    <div className="border-t border-border p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            "h-auto w-full justify-start gap-2 border-border bg-transparent px-2 py-2 shadow-none hover:bg-muted",
          )}
        >
          <Avatar>
            {image ? <AvatarImage src={image} alt="" /> : null}
            <AvatarFallback className="bg-secondary text-[10px] font-medium text-muted-foreground">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-xs font-medium text-foreground">{displayName}</div>
            <div className="truncate font-mono text-[10px] text-muted-foreground">{email}</div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="min-w-40 border-border bg-popover shadow-none ring-1 ring-border"
        >
          <DropdownMenuItem onClick={() => router.push("/profile")}>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              void signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/login");
                    router.refresh();
                  },
                },
              })
            }
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
