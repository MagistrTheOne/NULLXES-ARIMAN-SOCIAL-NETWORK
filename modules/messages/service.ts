import { and, desc, eq } from "drizzle-orm";
import { CURRENT_ENCRYPTION_VERSION } from "@/lib/crypto/message";
import { db } from "@/lib/db";
import { conversationMembers, conversations, messages } from "@/lib/db/schema";

export async function assertMember(userId: string, conversationId: string) {
  const row = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, userId),
    ),
  });
  return row != null;
}

export async function createDirectConversation(userA: string, userB: string) {
  if (userA === userB) throw new Error("INVALID_PEER");

  const [conv] = await db
    .insert(conversations)
    .values({ kind: "direct", createdByUserId: userA })
    .returning();

  if (!conv) throw new Error("CONVERSATION_CREATE_FAILED");

  await db.insert(conversationMembers).values([
    { conversationId: conv.id, userId: userA },
    { conversationId: conv.id, userId: userB },
  ]);

  return conv;
}

export async function createMessage(
  userId: string,
  input: { conversationId: string; body: string } | { peerUserId: string; body: string },
) {
  if ("conversationId" in input) {
    const member = await assertMember(userId, input.conversationId);
    if (!member) throw new Error("NOT_MEMBER");
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        senderUserId: userId,
        body: input.body,
        encryptionVersion: CURRENT_ENCRYPTION_VERSION,
      })
      .returning();
    return { conversationId: input.conversationId, message: msg };
  }

  const peer = input.peerUserId;
  const conv = await createDirectConversation(userId, peer);
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: conv.id,
      senderUserId: userId,
      body: input.body,
      encryptionVersion: CURRENT_ENCRYPTION_VERSION,
    })
    .returning();
  return { conversationId: conv.id, message: msg };
}

export async function listMessages(
  userId: string,
  conversationId: string,
  limit: number,
) {
  const member = await assertMember(userId, conversationId);
  if (!member) throw new Error("NOT_MEMBER");

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}
