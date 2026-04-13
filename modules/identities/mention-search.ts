import { and, eq, ilike, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { identities, users } from "@/lib/db/schema";

export type IdentityMentionRow = {
  userId: string;
  handle: string;
  displayName: string;
};

/** Search other users by identity handle (for @mentions). */
export async function searchIdentitiesForMentions(
  currentUserId: string,
  query: string,
  limit: number,
): Promise<IdentityMentionRow[]> {
  const q = query.trim().replace(/%/g, "").replace(/_/g, "");
  if (q.length < 1) return [];
  const pattern = `%${q.slice(0, 64)}%`;

  const rows = await db
    .select({
      userId: users.id,
      handle: identities.handle,
      displayName: identities.displayName,
    })
    .from(identities)
    .innerJoin(users, eq(users.id, identities.userId))
    .where(and(ne(users.id, currentUserId), ilike(identities.handle, pattern)))
    .limit(limit);

  return rows;
}
