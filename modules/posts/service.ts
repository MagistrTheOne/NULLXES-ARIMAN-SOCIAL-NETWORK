import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { identities, posts } from "@/lib/db/schema";

export async function assertIdentityOwned(userId: string, identityId: string) {
  const row = await db.query.identities.findFirst({
    where: and(eq(identities.id, identityId), eq(identities.userId, userId)),
  });
  return row != null;
}

export async function createPost(userId: string, identityId: string, body: string) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");
  const [row] = await db
    .insert(posts)
    .values({ authorIdentityId: identityId, body, postKind: "text" })
    .returning();
  return row;
}

export async function listPostsForIdentity(
  userId: string,
  identityId: string,
  limit: number,
) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");

  return db
    .select()
    .from(posts)
    .where(eq(posts.authorIdentityId, identityId))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
}
