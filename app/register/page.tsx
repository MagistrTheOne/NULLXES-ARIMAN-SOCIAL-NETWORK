"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldClass =
  "border border-border bg-background text-foreground shadow-none";

export default function RegisterPage() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (data?.user) {
      router.replace("/messages");
      router.refresh();
    }
  }, [isPending, data?.user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const trimmed = displayName.trim();
    const local = email.trim().split("@")[0] || "User";
    const name = trimmed || local;
    const { error: err } = await signUp.email({
      email: email.trim(),
      password,
      name,
    });
    setLoading(false);
    if (err) {
      setError(err.message ?? "Request failed");
      return;
    }
    router.replace("/messages");
    router.refresh();
  }

  const busy = loading || isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border border-border bg-card shadow-none ring-1 ring-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-center font-mono text-sm tracking-wide text-muted-foreground uppercase">
            Ariman
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs tracking-wide text-muted-foreground uppercase">
                Display name
              </Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Optional — defaults to email prefix"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs tracking-wide text-muted-foreground uppercase">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs tracking-wide text-muted-foreground uppercase">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={fieldClass}
              />
              <p className="font-mono text-[10px] text-muted-foreground">Minimum 8 characters</p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="submit"
              variant="outline"
              disabled={busy}
              className="w-full border-border bg-transparent shadow-none"
            >
              {busy ? "Please wait…" : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border pt-0">
          <Link
            href="/login"
            className="font-mono text-[10px] text-muted-foreground underline underline-offset-2"
          >
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
