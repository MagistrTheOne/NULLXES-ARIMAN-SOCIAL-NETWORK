import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clips, identities, posts } from "@/lib/db/schema";
import { assertIdentityOwned } from "@/modules/posts/service";

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
    .where(eq(posts.authorIdentityId, identityId))
    .orderBy(desc(clips.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    clip: r.clip,
    post: {
      id: r.id,
      authorIdentityId: r.authorIdentityId,
      communityId: r.communityId,
      postKind: r.postKind,
      body: r.body,
      createdAt: r.createdAt,
      authorHandle: r.authorHandle,
      authorDisplayName: r.authorDisplayName,
    },
  }));
}

export async function createClipStub(userId: string, identityId: string, body: string) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");

  const [post] = await db
    .insert(posts)
    .values({ authorIdentityId: identityId, body, postKind: "clip" })
    .returning();

  if (!post) throw new Error("POST_CREATE_FAILED");

  const [clip] = await db
    .insert(clips)
    .values({
      postId: post.id,
      durationMs: 0,
      transcodeState: "pending",
    })
    .returning();

  return { post, clip };
}
