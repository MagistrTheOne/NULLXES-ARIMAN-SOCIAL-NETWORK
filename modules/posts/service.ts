import { and, desc, eq, isNull } from "drizzle-orm";
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
      editedAt: posts.editedAt,
      createdAt: posts.createdAt,
      authorHandle: identities.handle,
      authorDisplayName: identities.displayName,
    })
    .from(posts)
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(and(eq(posts.authorIdentityId, identityId), isNull(posts.deletedAt)))
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

async function loadPostOwnershipRow(postId: string) {
  const [row] = await db
    .select({
      postId: posts.id,
      authorUserId: identities.userId,
      deletedAt: posts.deletedAt,
    })
    .from(posts)
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(eq(posts.id, postId))
    .limit(1);
  return row ?? null;
}

export async function updatePostBodyForOwner(userId: string, postId: string, body: string) {
  const row = await loadPostOwnershipRow(postId);
  if (!row || row.authorUserId !== userId) throw new Error("FORBIDDEN_POST");
  if (row.deletedAt) throw new Error("POST_DELETED");
  const trimmed = body.trim();
  if (!trimmed) throw new Error("EMPTY_BODY");
  await db
    .update(posts)
    .set({ body: trimmed, editedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function softDeletePostForOwner(userId: string, postId: string) {
  const row = await loadPostOwnershipRow(postId);
  if (!row || row.authorUserId !== userId) throw new Error("FORBIDDEN_POST");
  if (row.deletedAt) throw new Error("POST_DELETED");
  await db
    .update(posts)
    .set({ deletedAt: new Date(), body: "" })
    .where(eq(posts.id, postId));
}
