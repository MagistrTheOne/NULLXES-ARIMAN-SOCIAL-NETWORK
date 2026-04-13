import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clips,
  communityMembers,
  conversationMembers,
  posts,
} from "@/lib/db/schema";
import { assertIdentityOwned } from "@/modules/identities/access";

export type ProfileStats = {
  postCount: number;
  clipCount: number;
  threadCount: number;
  communityCount: number;
  /** Message threads + communities joined (no follow graph yet). */
  connectionCount: number;
};

export async function getProfileStatsForIdentity(
  userId: string,
  identityId: string,
): Promise<ProfileStats> {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");

  const [postRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(posts)
    .where(and(eq(posts.authorIdentityId, identityId), isNull(posts.deletedAt)));

  const [clipRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(clips)
    .innerJoin(posts, eq(clips.postId, posts.id))
    .where(and(eq(posts.authorIdentityId, identityId), isNull(posts.deletedAt)));

  const [threadRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  const [commRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(communityMembers)
    .where(eq(communityMembers.userId, userId));

  const threads = Number(threadRow?.c ?? 0);
  const communities = Number(commRow?.c ?? 0);

  return {
    postCount: Number(postRow?.c ?? 0),
    clipCount: Number(clipRow?.c ?? 0),
    threadCount: threads,
    communityCount: communities,
    connectionCount: threads + communities,
  };
}
