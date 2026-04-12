import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  return session.user.id as string;
}
