import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { CURRENT_ENCRYPTION_VERSION } from "@/lib/crypto/message";
import { parseEnvelopeV1 } from "@/lib/crypto/envelope";
import { db } from "@/lib/db";
import { conversationMembers, conversations, messages, users } from "@/lib/db/schema";

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

/** Returns existing direct thread id between two users, if any. */
export async function findDirectConversationId(
  userId: string,
  peerUserId: string,
): Promise<string | null> {
  const mine = await db
    .select({ cid: conversationMembers.conversationId })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  for (const { cid } of mine) {
    const conv = await db.query.conversations.findFirst({
      where: and(eq(conversations.id, cid), eq(conversations.kind, "direct")),
    });
    if (!conv) continue;
    const mems = await db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, cid));
    const ids = mems.map((m) => m.userId);
    if (ids.length === 2 && ids.includes(peerUserId)) return cid;
  }
  return null;
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

export type CreatePlaintextMessageInput =
  | { conversationId: string; body: string }
  | { peerUserId: string; body: string };

function validateEncryptedPayload(input: CreateEncryptedMessageInput) {
  if (input.encryption_version !== CURRENT_ENCRYPTION_VERSION) {
    throw new Error("INVALID_ENCRYPTION_VERSION");
  }
  const env = parseEnvelopeV1(input.ciphertext);
  if (!env) throw new Error("INVALID_CIPHERTEXT_ENVELOPE");
}

export async function createEncryptedMessage(userId: string, input: CreateEncryptedMessageInput) {
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
  let convId = await findDirectConversationId(userId, peer);
  if (!convId) {
    const conv = await createDirectConversation(userId, peer);
    convId = conv.id;
  }
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: convId,
      senderUserId: userId,
      body: null,
      ciphertext: input.ciphertext,
      senderPublicKey: input.sender_public_key,
      encryptionVersion: input.encryption_version,
    })
    .returning();
  return { conversationId: convId, message: msg };
}

export async function createPlaintextMessage(userId: string, input: CreatePlaintextMessageInput) {
  if ("conversationId" in input) {
    const member = await assertMember(userId, input.conversationId);
    if (!member) throw new Error("NOT_MEMBER");
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        senderUserId: userId,
        body: input.body,
        ciphertext: null,
        senderPublicKey: null,
        encryptionVersion: 0,
      })
      .returning();
    return { conversationId: input.conversationId, message: msg };
  }

  const peer = input.peerUserId;
  if (peer === userId) throw new Error("INVALID_PEER");
  let convId = await findDirectConversationId(userId, peer);
  if (!convId) {
    const conv = await createDirectConversation(userId, peer);
    convId = conv.id;
  }
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: convId,
      senderUserId: userId,
      body: input.body,
      ciphertext: null,
      senderPublicKey: null,
      encryptionVersion: 0,
    })
    .returning();
  return { conversationId: convId, message: msg };
}

/** @deprecated Use createEncryptedMessage or createPlaintextMessage */
export async function createMessage(userId: string, input: CreateEncryptedMessageInput) {
  return createEncryptedMessage(userId, input);
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

export type ConversationSummaryRow = {
  conversationId: string;
  peerUserId: string;
  peerDisplayName: string;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unreadCount: number;
};

export async function listConversationSummariesForUser(
  userId: string,
): Promise<ConversationSummaryRow[]> {
  const memberships = await db
    .select()
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  const out: ConversationSummaryRow[] = [];

  for (const m of memberships) {
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, m.conversationId),
    });
    if (!conv || conv.kind !== "direct") continue;

    const mems = await db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, m.conversationId));
    const peerId = mems.map((x) => x.userId).find((uid) => uid !== userId);
    if (!peerId) continue;

    const peerUser = await db.query.users.findFirst({ where: eq(users.id, peerId) });
    const peerDisplayName =
      peerUser?.name?.trim() || peerUser?.email || `${peerId.slice(0, 8)}…`;

    const [lastMsg] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, m.conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    let lastMessagePreview = "";
    if (lastMsg) {
      if (lastMsg.body) {
        lastMessagePreview = lastMsg.body.length > 120 ? `${lastMsg.body.slice(0, 120)}…` : lastMsg.body;
      } else if (lastMsg.encryptionVersion === 1) {
        lastMessagePreview = "Encrypted message";
      }
    }

    const lastMessageAt = lastMsg?.createdAt ? lastMsg.createdAt.toISOString() : null;

    const unreadWhere = [
      eq(messages.conversationId, m.conversationId),
      ne(messages.senderUserId, userId),
    ];
    if (m.lastReadAt) {
      unreadWhere.push(gt(messages.createdAt, m.lastReadAt));
    }

    const [unreadRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(...unreadWhere));

    const unreadCount = Number(unreadRow?.c ?? 0);

    out.push({
      conversationId: m.conversationId,
      peerUserId: peerId,
      peerDisplayName,
      lastMessagePreview,
      lastMessageAt,
      unreadCount,
    });
  }

  out.sort((a, b) => {
    const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return tb - ta;
  });

  return out;
}

export async function markConversationReadForUser(userId: string, conversationId: string) {
  const ok = await assertMember(userId, conversationId);
  if (!ok) throw new Error("NOT_MEMBER");
  await db
    .update(conversationMembers)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    );
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
