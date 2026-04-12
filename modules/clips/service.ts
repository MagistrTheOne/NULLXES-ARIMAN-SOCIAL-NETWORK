import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clips, posts } from "@/lib/db/schema";
import { assertIdentityOwned } from "@/modules/posts/service";

export async function listClipsForIdentity(userId: string, identityId: string, limit: number) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");

  return db
    .select({
      clip: clips,
      post: posts,
    })
    .from(clips)
    .innerJoin(posts, eq(clips.postId, posts.id))
    .where(eq(posts.authorIdentityId, identityId))
    .orderBy(desc(clips.createdAt))
    .limit(limit);
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
