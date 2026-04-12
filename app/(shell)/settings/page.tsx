import { CryptoSettings } from "@/components/settings/crypto-settings";

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="font-mono text-lg text-foreground">Settings</h1>
      <div className="mt-6">
        <CryptoSettings />
      </div>
    </div>
  );
}
