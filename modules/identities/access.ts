import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { identities } from "@/lib/db/schema";

export async function assertIdentityOwned(userId: string, identityId: string) {
  const row = await db.query.identities.findFirst({
    where: and(eq(identities.id, identityId), eq(identities.userId, userId)),
  });
  return row != null;
}
