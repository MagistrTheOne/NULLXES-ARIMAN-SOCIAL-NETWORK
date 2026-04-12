import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/server-origin";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) redirect("/login");

  const origin = await getRequestOrigin();
  const res = await fetch(`${origin}/api/users/me`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });
  const data = res.ok ? ((await res.json()) as { userId: string; identities: unknown[] }) : null;

  return (
    <div className="p-6">
      <h1 className="font-mono text-lg text-foreground">Profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">Signed in as {session.user.email}</p>
      {data ? (
        <pre className="mt-4 overflow-auto rounded border border-border bg-secondary p-4 font-mono text-xs text-muted-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p className="mt-4 text-sm text-destructive">Could not load /api/users/me</p>
      )}
    </div>
  );
}
