import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { isUndefinedRelationError } from "@/lib/db/pg-relation-error";
import { postComments, posts } from "@/lib/db/schema";
import { assertIdentityOwned } from "@/modules/identities/access";

export type ActivityItem =
  | {
      kind: "post";
      id: string;
      body: string;
      createdAt: Date;
    }
  | {
      kind: "reply";
      id: string;
      body: string;
      createdAt: Date;
      postId: string;
      postPreview: string;
    };

export async function listActivityForIdentity(userId: string, identityId: string, limit: number) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");

  const ownPosts = await db
    .select({
      id: posts.id,
      body: posts.body,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.authorIdentityId, identityId))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  let replies: {
    id: string;
    body: string;
    createdAt: Date;
    postId: string;
    postBody: string;
  }[] = [];
  try {
    replies = await db
      .select({
        id: postComments.id,
        body: postComments.body,
        createdAt: postComments.createdAt,
        postId: postComments.postId,
        postBody: posts.body,
      })
      .from(postComments)
      .innerJoin(posts, eq(postComments.postId, posts.id))
      .where(
        and(eq(postComments.authorIdentityId, identityId), isNull(posts.deletedAt)),
      )
      .orderBy(desc(postComments.createdAt))
      .limit(limit);
  } catch (e) {
    if (!isUndefinedRelationError(e)) throw e;
  }

  const merged: ActivityItem[] = [
    ...ownPosts.map((p) => ({
      kind: "post" as const,
      id: p.id,
      body: p.body,
      createdAt: p.createdAt,
    })),
    ...replies.map((r) => ({
      kind: "reply" as const,
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      postId: r.postId,
      postPreview: r.postBody.slice(0, 120) + (r.postBody.length > 120 ? "…" : ""),
    })),
  ];
  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return merged.slice(0, limit);
}
