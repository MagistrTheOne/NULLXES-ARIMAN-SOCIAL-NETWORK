"use client";

import { useEffect, useMemo, useState } from "react";
import { createArimanSdk, type MeResponse } from "@nullxes/ariman-sdk";
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

  const sdk = useMemo(() => createArimanSdk(), []);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setMe(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const m = await sdk.getMe();
        if (!cancelled) setMe(m);
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, sdk]);

  const displayName =
    me?.identities?.[0]?.displayName?.trim() ||
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  const primaryHandle = me?.identities?.[0]?.handle?.trim() || null;

  return {
    user,
    session: session ?? null,
    me,
    displayName,
    primaryHandle,
    isPending,
    isRefetching,
    error,
    refetch,
  };
}
