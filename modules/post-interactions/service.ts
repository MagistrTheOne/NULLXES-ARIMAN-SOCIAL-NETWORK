import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { clips, identities, postComments, postEchoes, postSaves, posts } from "@/lib/db/schema";
import { isUndefinedRelationError } from "@/lib/db/pg-relation-error";
import { assertIdentityOwned } from "@/modules/identities/access";

export type PostInteractionAugment = {
  echoCount: number;
  commentCount: number;
  saveCount: number;
  echoedByViewer: boolean;
  savedByViewer: boolean;
};

function emptyAug(): PostInteractionAugment {
  return {
    echoCount: 0,
    commentCount: 0,
    saveCount: 0,
    echoedByViewer: false,
    savedByViewer: false,
  };
}

export async function enrichPosts(
  postIds: string[],
  viewerIdentityId: string | null,
): Promise<Map<string, PostInteractionAugment>> {
  const map = new Map<string, PostInteractionAugment>();
  for (const id of postIds) map.set(id, emptyAug());
  if (postIds.length === 0) return map;

  try {
    const echoAgg = await db
      .select({ postId: postEchoes.postId, n: count() })
      .from(postEchoes)
      .where(inArray(postEchoes.postId, postIds))
      .groupBy(postEchoes.postId);
    for (const r of echoAgg) {
      const m = map.get(r.postId);
      if (m) m.echoCount = Number(r.n);
    }

    const commentAgg = await db
      .select({ postId: postComments.postId, n: count() })
      .from(postComments)
      .where(inArray(postComments.postId, postIds))
      .groupBy(postComments.postId);
    for (const r of commentAgg) {
      const m = map.get(r.postId);
      if (m) m.commentCount = Number(r.n);
    }

    const saveAgg = await db
      .select({ postId: postSaves.postId, n: count() })
      .from(postSaves)
      .where(inArray(postSaves.postId, postIds))
      .groupBy(postSaves.postId);
    for (const r of saveAgg) {
      const m = map.get(r.postId);
      if (m) m.saveCount = Number(r.n);
    }

    if (viewerIdentityId) {
      const myEchoes = await db
        .select({ postId: postEchoes.postId })
        .from(postEchoes)
        .where(and(inArray(postEchoes.postId, postIds), eq(postEchoes.identityId, viewerIdentityId)));
      for (const r of myEchoes) {
        const m = map.get(r.postId);
        if (m) m.echoedByViewer = true;
      }
      const mySaves = await db
        .select({ postId: postSaves.postId })
        .from(postSaves)
        .where(and(inArray(postSaves.postId, postIds), eq(postSaves.identityId, viewerIdentityId)));
      for (const r of mySaves) {
        const m = map.get(r.postId);
        if (m) m.savedByViewer = true;
      }
    }
  } catch (e) {
    if (isUndefinedRelationError(e)) return map;
    throw e;
  }

  return map;
}

async function syncClipEchoCountForPost(postId: string) {
  try {
    const clip = await db.query.clips.findFirst({
      where: eq(clips.postId, postId),
      columns: { id: true },
    });
    if (!clip) return;
    const [{ n }] = await db
      .select({ n: count() })
      .from(postEchoes)
      .where(eq(postEchoes.postId, postId));
    await db.update(clips).set({ echoCount: Number(n) }).where(eq(clips.postId, postId));
  } catch (e) {
    if (isUndefinedRelationError(e)) return;
    // Clips table may not be migrated yet (missing echo_count, etc.)
    console.warn("[syncClipEchoCountForPost]", e);
  }
}

export async function assertPostExists(postId: string) {
  const row = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  return row != null;
}

export async function toggleEcho(userId: string, postId: string, identityId: string) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");
  if (!(await assertPostExists(postId))) throw new Error("NOT_FOUND");

  try {
  const [existing] = await db
    .select()
    .from(postEchoes)
    .where(and(eq(postEchoes.postId, postId), eq(postEchoes.identityId, identityId)))
    .limit(1);
  if (existing) {
    await db.delete(postEchoes).where(and(eq(postEchoes.postId, postId), eq(postEchoes.identityId, identityId)));
  } else {
    await db.insert(postEchoes).values({ postId, identityId });
  }
  await syncClipEchoCountForPost(postId);
  const aug = await enrichPosts([postId], identityId);
  return aug.get(postId) ?? emptyAug();
  } catch (e) {
    if (isUndefinedRelationError(e)) throw new Error("INTERACTIONS_SCHEMA_MISSING");
    throw e;
  }
}

export async function toggleSave(userId: string, postId: string, identityId: string) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");
  if (!(await assertPostExists(postId))) throw new Error("NOT_FOUND");

  try {
  const [existing] = await db
    .select()
    .from(postSaves)
    .where(and(eq(postSaves.postId, postId), eq(postSaves.identityId, identityId)))
    .limit(1);
  if (existing) {
    await db.delete(postSaves).where(and(eq(postSaves.postId, postId), eq(postSaves.identityId, identityId)));
  } else {
    await db.insert(postSaves).values({ postId, identityId });
  }
  const aug = await enrichPosts([postId], identityId);
  return aug.get(postId) ?? emptyAug();
  } catch (e) {
    if (isUndefinedRelationError(e)) throw new Error("INTERACTIONS_SCHEMA_MISSING");
    throw e;
  }
}

export async function listCommentsForPost(postId: string, limit: number) {
  try {
  return await db
    .select({
      id: postComments.id,
      postId: postComments.postId,
      authorIdentityId: postComments.authorIdentityId,
      body: postComments.body,
      createdAt: postComments.createdAt,
      authorHandle: identities.handle,
      authorDisplayName: identities.displayName,
    })
    .from(postComments)
    .innerJoin(identities, eq(postComments.authorIdentityId, identities.id))
    .where(eq(postComments.postId, postId))
    .orderBy(asc(postComments.createdAt))
    .limit(limit);
  } catch (e) {
    if (isUndefinedRelationError(e)) return [];
    throw e;
  }
}

export async function createCommentOnPost(userId: string, postId: string, identityId: string, body: string) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");
  if (!(await assertPostExists(postId))) throw new Error("NOT_FOUND");
  try {
    const [row] = await db
      .insert(postComments)
      .values({ postId, authorIdentityId: identityId, body })
      .returning();
    if (!row) throw new Error("COMMENT_CREATE_FAILED");
    return row;
  } catch (e) {
    if (isUndefinedRelationError(e)) throw new Error("INTERACTIONS_SCHEMA_MISSING");
    throw e;
  }
}
