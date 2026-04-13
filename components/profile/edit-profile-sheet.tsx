"use client";

import { useEffect, useState } from "react";
import type { Identity } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_AVATAR_DATA_URL_CHARS = 520_000;

export function readAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/i)) {
      reject(new Error("Use PNG, JPEG, or WebP."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? "");
      if (!/^data:image\/(png|jpeg|webp);base64,/i.test(s)) {
        reject(new Error("Invalid image data."));
        return;
      }
      if (s.length > MAX_AVATAR_DATA_URL_CHARS) {
        reject(new Error("Image is too large. Try a smaller file."));
        return;
      }
      resolve(s);
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export function EditProfileSheet({
  open,
  onOpenChange,
  identity,
  onPersist,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identity: Identity;
  onPersist: (patch: {
    displayName?: string;
    bio?: string | null;
    avatarUrl?: string | null;
  }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(identity.displayName);
  const [bio, setBio] = useState(identity.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [avatarHint, setAvatarHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName(identity.displayName);
    setBio(identity.bio ?? "");
    setAvatarHint(null);
  }, [open, identity.displayName, identity.bio, identity.id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dn = displayName.trim();
    if (!dn) {
      toast.error("Display name is required.");
      return;
    }
    const bioVal = bio.trim() === "" ? null : bio.trim();
    setBusy(true);
    try {
      await onPersist({
        displayName: dn,
        bio: bioVal,
      });
      onOpenChange(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(userFacingApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onAvatarFile(file: File | null) {
    if (!file) return;
    setAvatarHint(null);
    setBusy(true);
    try {
      const dataUrl = await readAvatarDataUrl(file);
      await onPersist({ avatarUrl: dataUrl });
      toast.success("Avatar updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : userFacingApiError(err);
      setAvatarHint(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-border sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>Update how you appear across the network.</SheetDescription>
        </SheetHeader>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 flex flex-col gap-6 px-4 pb-8">
          <div className="space-y-2">
            <Label htmlFor="profile-avatar-file" className="text-xs font-medium tracking-wide uppercase">
              Avatar (optional)
            </Label>
            <Input
              id="profile-avatar-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              className="cursor-pointer border-border text-xs shadow-none file:mr-3 file:border-0 file:bg-transparent file:text-xs file:text-foreground"
              onChange={(ev) => {
                const f = ev.target.files?.[0] ?? null;
                ev.target.value = "";
                void onAvatarFile(f);
              }}
            />
            {avatarHint ? <p className="text-xs text-destructive">{avatarHint}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-display" className="text-xs font-medium tracking-wide uppercase">
              Display name
            </Label>
            <Input
              id="profile-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={120}
              disabled={busy}
              className="border-border shadow-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-bio" className="text-xs font-medium tracking-wide uppercase">
              Bio
            </Label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={4000}
              rows={5}
              disabled={busy}
              placeholder="A few lines about your node…"
              className="resize-none border-border shadow-none"
            />
            <p className="font-mono text-[10px] text-muted-foreground">{bio.length}/4000</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="outline" disabled={busy} className="border-border shadow-none">
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="shadow-none"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
