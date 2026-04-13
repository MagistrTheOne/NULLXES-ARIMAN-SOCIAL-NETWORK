import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clips, identities, posts } from "@/lib/db/schema";
import { generateClipCaptionAndSummary } from "@/modules/ai/clip-caption";
import { assertIdentityOwned } from "@/modules/posts/service";
import { enrichPosts } from "@/modules/post-interactions/service";

export async function listClipsForIdentity(userId: string, identityId: string, limit: number) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");

  const rows = await db
    .select({
      clip: clips,
      id: posts.id,
      authorIdentityId: posts.authorIdentityId,
      communityId: posts.communityId,
      postKind: posts.postKind,
      body: posts.body,
      createdAt: posts.createdAt,
      authorHandle: identities.handle,
      authorDisplayName: identities.displayName,
    })
    .from(clips)
    .innerJoin(posts, eq(clips.postId, posts.id))
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(and(eq(posts.authorIdentityId, identityId), isNull(posts.deletedAt)))
    .orderBy(desc(clips.createdAt))
    .limit(limit);

  const postIds = rows.map((r) => r.id);
  const aug = await enrichPosts(postIds, identityId);

  return rows.map((r) => {
    const a = aug.get(r.id)!;
    return {
      clip: {
        ...r.clip,
        echoCount: a.echoCount,
      },
      post: {
        id: r.id,
        authorIdentityId: r.authorIdentityId,
        communityId: r.communityId,
        postKind: r.postKind,
        body: r.body,
        createdAt: r.createdAt,
        authorHandle: r.authorHandle,
        authorDisplayName: r.authorDisplayName,
        echoCount: a.echoCount,
        commentCount: a.commentCount,
        saveCount: a.saveCount,
        echoedByViewer: a.echoedByViewer,
        savedByViewer: a.savedByViewer,
      },
    };
  });
}

export async function createClipStub(userId: string, identityId: string, body: string) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");

  let resolvedBody = body.trim();
  if (!resolvedBody) {
    const idRow = await db.query.identities.findFirst({
      where: eq(identities.id, identityId),
      columns: { displayName: true, handle: true },
    });
    if (!idRow) throw new Error("FORBIDDEN_IDENTITY");
    const gen = await generateClipCaptionAndSummary({
      displayName: idRow.displayName,
      handle: idRow.handle,
    });
    resolvedBody = gen.body;
  }

  const [post] = await db
    .insert(posts)
    .values({ authorIdentityId: identityId, body: resolvedBody, postKind: "clip" })
    .returning();

  if (!post) throw new Error("POST_CREATE_FAILED");

  const [clip] = await db
    .insert(clips)
    .values({
      postId: post.id,
      durationMs: 0,
      transcodeState: "pending",
      echoCount: 0,
      viewsCount: 0,
    })
    .returning();

  if (!clip) throw new Error("CLIP_CREATE_FAILED");

  return { post, clip };
}

export async function assertUserOwnsClip(userId: string, identityId: string, clipId: string) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");

  const row = await db
    .select({ clipId: clips.id })
    .from(clips)
    .innerJoin(posts, eq(clips.postId, posts.id))
    .where(and(eq(clips.id, clipId), eq(posts.authorIdentityId, identityId)))
    .limit(1);

  if (!row[0]) throw new Error("CLIP_NOT_FOUND");
}

export async function updateClipFromStreamUpload(
  userId: string,
  identityId: string,
  clipId: string,
  meta: {
    streamPlaybackId: string;
    playbackUrl: string;
    thumbnailUrl: string | null;
    durationMs: number;
    transcodeState: string;
  },
) {
  await assertUserOwnsClip(userId, identityId, clipId);

  const [out] = await db
    .update(clips)
    .set({
      streamPlaybackId: meta.streamPlaybackId,
      playbackUrl: meta.playbackUrl,
      thumbnailUrl: meta.thumbnailUrl,
      durationMs: meta.durationMs,
      transcodeState: meta.transcodeState,
    })
    .where(eq(clips.id, clipId))
    .returning();

  if (!out) throw new Error("CLIP_UPDATE_FAILED");
  return out;
}

export async function incrementClipViewCountForViewer(_userId: string, clipId: string) {
  const row = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, clipId)).limit(1);
  if (!row[0]) throw new Error("CLIP_NOT_FOUND");

  const [updated] = await db
    .update(clips)
    .set({ viewsCount: sql`${clips.viewsCount} + 1` })
    .where(eq(clips.id, clipId))
    .returning({ viewsCount: clips.viewsCount });

  return updated?.viewsCount ?? null;
}
