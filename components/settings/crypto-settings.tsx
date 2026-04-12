"use client";

import { useEffect, useState } from "react";
import { generateKeyPair, publicKeyToBase64 } from "@/lib/crypto/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRIV = "ariman_x25519_private_b64";
const PUB = "ariman_x25519_public_b64";

export function CryptoSettings() {
  const [pub, setPub] = useState("");

  useEffect(() => {
    const p = sessionStorage.getItem(PUB);
    setPub(p ?? "");
  }, []);

  function regenerate() {
    const kp = generateKeyPair();
    const privB64 = btoa(String.fromCharCode(...kp.privateKey));
    sessionStorage.setItem(PRIV, privB64);
    const pubB64 = publicKeyToBase64(kp.publicKey);
    sessionStorage.setItem(PUB, pubB64);
    setPub(pubB64);
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">
        X25519 keys are stored in sessionStorage for this browser session only. Share your public
        key with peers so they can encrypt DM payloads to you.
      </p>
      <div className="space-y-2">
        <Label className="text-xs tracking-wide text-muted-foreground uppercase">Public key (base64)</Label>
        <Input
          readOnly
          value={pub}
          className="border border-border bg-background font-mono text-xs text-foreground shadow-none"
        />
      </div>
      <Button variant="outline" className="border-border bg-transparent shadow-none" onClick={regenerate}>
        Regenerate keys
      </Button>
    </div>
  );
}
