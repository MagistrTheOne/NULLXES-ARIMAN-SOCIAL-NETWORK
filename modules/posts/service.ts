import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { identities, posts } from "@/lib/db/schema";
import { assertIdentityOwned } from "@/modules/identities/access";
import { enrichPosts } from "@/modules/post-interactions/service";
import { isCommunityMember } from "@/modules/communities/service";

export { assertIdentityOwned } from "@/modules/identities/access";

export async function createPost(
  userId: string,
  identityId: string,
  body: string,
  opts?: { communityId?: string | null },
) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");
  const communityId = opts?.communityId ?? null;
  if (communityId) {
    const member = await isCommunityMember(userId, communityId);
    if (!member) throw new Error("NOT_COMMUNITY_MEMBER");
  }
  const [row] = await db
    .insert(posts)
    .values({ authorIdentityId: identityId, body, postKind: "text", communityId })
    .returning();
  return row;
}

export async function listPostsForIdentity(userId: string, identityId: string, limit: number) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");

  const rows = await db
    .select({
      id: posts.id,
      authorIdentityId: posts.authorIdentityId,
      communityId: posts.communityId,
      postKind: posts.postKind,
      body: posts.body,
      createdAt: posts.createdAt,
      authorHandle: identities.handle,
      authorDisplayName: identities.displayName,
    })
    .from(posts)
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(eq(posts.authorIdentityId, identityId))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const aug = await enrichPosts(
    rows.map((r) => r.id),
    identityId,
  );
  return rows.map((r) => {
    const a = aug.get(r.id)!;
    return {
      ...r,
      echoCount: a.echoCount,
      commentCount: a.commentCount,
      saveCount: a.saveCount,
      echoedByViewer: a.echoedByViewer,
      savedByViewer: a.savedByViewer,
    };
  });
}
