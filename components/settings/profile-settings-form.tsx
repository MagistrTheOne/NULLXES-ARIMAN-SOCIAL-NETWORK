"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createArimanSdk } from "@nullxes/ariman-sdk";
import type { Identity } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const fieldClass = "border border-border bg-background text-sm text-foreground shadow-none";

export function ProfileSettingsForm() {
  const sdk = useMemo(() => createArimanSdk(), []);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await sdk.getMe();
      const first = d.identities?.[0] ?? null;
      setIdentity(first);
      if (first) {
        setDisplayName(first.displayName);
        setBio(first.bio ?? "");
      }
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!identity) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await sdk.patchMe({
        identityId: identity.id,
        displayName: displayName.trim() || identity.displayName,
        bio: bio.trim() === "" ? null : bio.trim(),
      });
      await load();
      setSaved(true);
      toast.success("Profile saved");
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="border-border shadow-none ring-1 ring-border">
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-9 animate-none border border-border bg-muted/30 shadow-none" />
          <Skeleton className="h-24 animate-none border border-border bg-muted/30 shadow-none" />
        </CardContent>
      </Card>
    );
  }

  if (!identity) {
    return <p className="text-sm text-muted-foreground">No identity to edit.</p>;
  }

  return (
    <Card className="border-border shadow-none ring-1 ring-border">
      <CardHeader className="pb-2">
        <Label className="text-xs tracking-wide text-muted-foreground uppercase">Primary identity</Label>
        <p className="font-mono text-xs text-muted-foreground">@{identity.handle}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-1.5">
          <Label htmlFor="settings-display" className="text-xs text-muted-foreground">
            Display name
          </Label>
          <Input
            id="settings-display"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-bio" className="text-xs text-muted-foreground">
            Bio
          </Label>
          <Textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short introduction…"
            className={`min-h-24 resize-none ${fieldClass}`}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {saved ? <p className="text-xs text-muted-foreground">Saved.</p> : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-border shadow-none"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
