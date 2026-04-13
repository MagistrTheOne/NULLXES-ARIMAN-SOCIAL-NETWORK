import { CryptoSettings } from "@/components/settings/crypto-settings";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-10 p-6">
      <div>
        <h1 className="font-mono text-lg tracking-wide text-foreground uppercase">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account, security, and device crypto.</p>
      </div>

      <section className="space-y-3">
        <Label className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Profile</Label>
        <ProfileSettingsForm />
      </section>

      <Separator />

      <section className="space-y-3">
        <Label className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Security</Label>
        <Card className="border-border shadow-none ring-1 ring-border">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-foreground">Account security</p>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 text-sm text-muted-foreground">
            <p>Password and passkey management use your existing sign-in flow.</p>
            <p className="text-xs">Session-based protections apply to API routes automatically.</p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-3">
        <Label className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Crypto</Label>
        <Card className="border-border shadow-none ring-1 ring-border">
          <CardContent className="pt-6">
            <CryptoSettings />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
