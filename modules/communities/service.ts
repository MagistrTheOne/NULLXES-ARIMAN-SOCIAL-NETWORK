import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { communities, communityMembers, identities, posts } from "@/lib/db/schema";
import { enrichPosts } from "@/modules/post-interactions/service";

/** Ensures at least the `demo` community exists for first-run UX. */
export async function ensureBootstrapCommunities() {
  await db
    .insert(communities)
    .values({
      slug: "demo",
      title: "NULLXES Demo",
      description: "Default space for early builds.",
    })
    .onConflictDoNothing({ target: communities.slug });
}

export async function getCommunityBySlug(slug: string) {
  await ensureBootstrapCommunities();
  return db.query.communities.findFirst({
    where: eq(communities.slug, slug),
  });
}

export async function isCommunityMember(userId: string, communityId: string) {
  const row = await db.query.communityMembers.findFirst({
    where: and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)),
  });
  return row != null;
}

export async function joinCommunity(userId: string, communityId: string) {
  const exists = await db.query.communities.findFirst({
    where: eq(communities.id, communityId),
  });
  if (!exists) throw new Error("NOT_FOUND");
  const already = await isCommunityMember(userId, communityId);
  if (already) return { ok: true as const, joined: false };
  await db.insert(communityMembers).values({ communityId, userId }).onConflictDoNothing();
  return { ok: true as const, joined: true };
}

export async function countCommunityMembers(communityId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(communityMembers)
    .where(eq(communityMembers.communityId, communityId));
  return Number(row?.n ?? 0);
}

export async function listPostsForCommunity(
  communityId: string,
  limit: number,
  viewerIdentityId: string | null,
) {
  const rows = await db
    .select({
      id: posts.id,
      authorIdentityId: posts.authorIdentityId,
      postKind: posts.postKind,
      body: posts.body,
      createdAt: posts.createdAt,
      communityId: posts.communityId,
      authorHandle: identities.handle,
      authorDisplayName: identities.displayName,
    })
    .from(posts)
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(eq(posts.communityId, communityId))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const aug = await enrichPosts(
    rows.map((r) => r.id),
    viewerIdentityId,
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
