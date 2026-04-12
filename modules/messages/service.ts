import { and, desc, eq } from "drizzle-orm";
import { CURRENT_ENCRYPTION_VERSION } from "@/lib/crypto/message";
import { parseEnvelopeV1 } from "@/lib/crypto/envelope";
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

export type CreateEncryptedMessageInput =
  | {
      conversationId: string;
      ciphertext: string;
      encryption_version: 1;
      sender_public_key: string;
    }
  | {
      peerUserId: string;
      ciphertext: string;
      encryption_version: 1;
      sender_public_key: string;
    };

function validateEncryptedPayload(input: CreateEncryptedMessageInput) {
  if (input.encryption_version !== CURRENT_ENCRYPTION_VERSION) {
    throw new Error("INVALID_ENCRYPTION_VERSION");
  }
  const env = parseEnvelopeV1(input.ciphertext);
  if (!env) throw new Error("INVALID_CIPHERTEXT_ENVELOPE");
}

export async function createMessage(userId: string, input: CreateEncryptedMessageInput) {
  validateEncryptedPayload(input);

  if ("conversationId" in input) {
    const member = await assertMember(userId, input.conversationId);
    if (!member) throw new Error("NOT_MEMBER");
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        senderUserId: userId,
        body: null,
        ciphertext: input.ciphertext,
        senderPublicKey: input.sender_public_key,
        encryptionVersion: input.encryption_version,
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
      body: null,
      ciphertext: input.ciphertext,
      senderPublicKey: input.sender_public_key,
      encryptionVersion: input.encryption_version,
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

export async function listConversationsForUser(userId: string) {
  const rows = await db
    .select({
      conversationId: conversationMembers.conversationId,
      joinedAt: conversationMembers.joinedAt,
    })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  return rows;
}

export async function getConversationMembers(userId: string, conversationId: string) {
  const member = await assertMember(userId, conversationId);
  if (!member) throw new Error("NOT_MEMBER");

  return db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));
}
