import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { identities } from "@/lib/db/schema";

export async function assertIdentityOwned(userId: string, identityId: string) {
  const row = await db.query.identities.findFirst({
    where: and(eq(identities.id, identityId), eq(identities.userId, userId)),
  });
  return row != null;
}

/** First identity for the user (by creation time), for AI actions when none specified. */
export async function getFirstIdentityIdForUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: identities.id })
    .from(identities)
    .where(eq(identities.userId, userId))
    .orderBy(asc(identities.createdAt))
    .limit(1);
  return row?.id ?? null;
}
