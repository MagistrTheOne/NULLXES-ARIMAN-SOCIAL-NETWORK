"use client";

import { useSession } from "@/lib/auth-client";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type SessionData = {
  user: SessionUser;
  session?: unknown;
};

export function useCurrentUser() {
  const { data, isPending, error, refetch, isRefetching } = useSession();
  const session = data as SessionData | null | undefined;
  const user = session?.user ?? null;

  return {
    user,
    session: session ?? null,
    isPending,
    isRefetching,
    error,
    refetch,
  };
}
