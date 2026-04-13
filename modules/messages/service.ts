import { and, desc, eq, gt, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { CURRENT_ENCRYPTION_VERSION } from "@/lib/crypto/message";
import { parseEnvelopeV1 } from "@/lib/crypto/envelope";
import { db } from "@/lib/db";
import { aiAgents, conversationMembers, conversations, messages, users } from "@/lib/db/schema";
import { resolveMentionsFromPlaintext } from "@/modules/messages/mentions-resolve";

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
        senderType: "user",
        messageType: "text",
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
      senderType: "user",
      messageType: "text",
      body: null,
      ciphertext: input.ciphertext,
      senderPublicKey: input.sender_public_key,
      encryptionVersion: input.encryption_version,
    })
    .returning();
  return { conversationId: convId, message: msg };
}

export async function createPlaintextMessage(userId: string, input: CreatePlaintextMessageInput) {
  const mentionRows = await resolveMentionsFromPlaintext(input.body);

  if ("conversationId" in input) {
    const member = await assertMember(userId, input.conversationId);
    if (!member) throw new Error("NOT_MEMBER");
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        senderUserId: userId,
        senderType: "user",
        messageType: "text",
        body: input.body,
        mentions: mentionRows.length ? mentionRows : null,
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
      senderType: "user",
      messageType: "text",
      body: input.body,
      mentions: mentionRows.length ? mentionRows : null,
      ciphertext: null,
      senderPublicKey: null,
      encryptionVersion: 0,
    })
    .returning();
  return { conversationId: convId, message: msg };
}

export async function insertAiAgentMessage(conversationId: string, agentId: string, body: string) {
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId,
      senderUserId: null,
      senderType: "ai",
      aiAgentId: agentId,
      messageType: "text",
      body,
      ciphertext: null,
      senderPublicKey: null,
      encryptionVersion: 0,
    })
    .returning();
  if (!msg) throw new Error("AI_MESSAGE_INSERT_FAILED");
  return msg;
}

export type AiContextTurn = { role: "user" | "assistant"; content: string };

export async function listMessagesForAiContext(
  userId: string,
  conversationId: string,
  limit: number,
): Promise<AiContextTurn[]> {
  const member = await assertMember(userId, conversationId);
  if (!member) throw new Error("NOT_MEMBER");

  const rows = await db
    .select({
      senderType: messages.senderType,
      body: messages.body,
      transcript: messages.transcript,
      messageType: messages.messageType,
      encryptionVersion: messages.encryptionVersion,
    })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt)))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  const chronological = rows.slice().reverse();
  const out: AiContextTurn[] = [];
  for (const r of chronological) {
    if (r.encryptionVersion !== 0) continue;
    const content =
      (r.messageType === "voice" ? r.transcript?.trim() || r.body?.trim() : r.body?.trim()) ?? "";
    if (!content) continue;
    if (r.senderType === "ai") {
      out.push({ role: "assistant", content });
    } else {
      out.push({ role: "user", content });
    }
  }
  return out;
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
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderUserId: messages.senderUserId,
      senderType: messages.senderType,
      aiAgentId: messages.aiAgentId,
      aiAgentHandle: aiAgents.handle,
      aiAgentName: aiAgents.name,
      messageType: messages.messageType,
      body: messages.body,
      ciphertext: messages.ciphertext,
      senderPublicKey: messages.senderPublicKey,
      encryptionVersion: messages.encryptionVersion,
      transcript: messages.transcript,
      audioUrl: sql<string | null>`
        case
          when ${messages.voiceAudioBase64} is not null
          then '/api/messages/' || ${messages.id}::text || '/audio'
          else null
        end
      `.as("audioUrl"),
      mentions: messages.mentions,
      editedAt: messages.editedAt,
      deletedAt: messages.deletedAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .leftJoin(aiAgents, eq(messages.aiAgentId, aiAgents.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

export async function getMessageDetailById(userId: string, messageId: string) {
  const [base] = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!base) throw new Error("NOT_FOUND");

  const member = await assertMember(userId, base.conversationId);
  if (!member) throw new Error("NOT_MEMBER");

  const [row] = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderUserId: messages.senderUserId,
      senderType: messages.senderType,
      aiAgentId: messages.aiAgentId,
      aiAgentHandle: aiAgents.handle,
      aiAgentName: aiAgents.name,
      messageType: messages.messageType,
      body: messages.body,
      ciphertext: messages.ciphertext,
      senderPublicKey: messages.senderPublicKey,
      encryptionVersion: messages.encryptionVersion,
      transcript: messages.transcript,
      audioUrl: sql<string | null>`
        case
          when ${messages.voiceAudioBase64} is not null
          then '/api/messages/' || ${messages.id}::text || '/audio'
          else null
        end
      `.as("audioUrl"),
      mentions: messages.mentions,
      editedAt: messages.editedAt,
      deletedAt: messages.deletedAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .leftJoin(aiAgents, eq(messages.aiAgentId, aiAgents.id))
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export type ConversationSummaryRow = {
  conversationId: string;
  kind: "direct" | "ai";
  peerUserId: string;
  peerDisplayName: string;
  aiAgentId?: string | null;
  aiAgentHandle?: string | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unreadCount: number;
};

async function previewAndUnreadForConversation(
  userId: string,
  conversationId: string,
  lastReadAt: Date | null,
): Promise<{ lastMessagePreview: string; lastMessageAt: string | null; unreadCount: number }> {
  const [lastMsg] = await db
    .select({
      body: messages.body,
      transcript: messages.transcript,
      messageType: messages.messageType,
      encryptionVersion: messages.encryptionVersion,
      senderType: messages.senderType,
      deletedAt: messages.deletedAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt)))
    .orderBy(desc(messages.createdAt))
    .limit(1);

  let lastMessagePreview = "";
  if (lastMsg) {
    if (lastMsg.messageType === "voice") {
      const t = lastMsg.transcript?.trim() || lastMsg.body?.trim() || "";
      lastMessagePreview = t ? `Voice · ${t.length > 100 ? `${t.slice(0, 100)}…` : t}` : "Voice message";
    } else if (lastMsg.body) {
      const raw = lastMsg.body.length > 120 ? `${lastMsg.body.slice(0, 120)}…` : lastMsg.body;
      lastMessagePreview = lastMsg.senderType === "ai" ? `AI · ${raw}` : raw;
    } else if (lastMsg.encryptionVersion === 1) {
      lastMessagePreview = "Encrypted message";
    }
  }

  const lastMessageAt = lastMsg?.createdAt ? lastMsg.createdAt.toISOString() : null;

  const fromOthers = or(
    eq(messages.senderType, "ai"),
    and(eq(messages.senderType, "user"), isNotNull(messages.senderUserId), ne(messages.senderUserId, userId)),
  );
  const unreadWhere = [
    eq(messages.conversationId, conversationId),
    fromOthers,
    isNull(messages.deletedAt),
  ];
  if (lastReadAt) {
    unreadWhere.push(gt(messages.createdAt, lastReadAt));
  }

  const [unreadRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(...unreadWhere));

  const unreadCount = Number(unreadRow?.c ?? 0);

  return { lastMessagePreview, lastMessageAt, unreadCount };
}

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
    if (!conv) continue;

    if (conv.kind === "ai") {
      if (!conv.aiAgentId) continue;
      const agent = await db.query.aiAgents.findFirst({
        where: eq(aiAgents.id, conv.aiAgentId),
      });
      if (!agent) continue;

      const { lastMessagePreview, lastMessageAt, unreadCount } = await previewAndUnreadForConversation(
        userId,
        m.conversationId,
        m.lastReadAt,
      );

      out.push({
        conversationId: m.conversationId,
        kind: "ai",
        peerUserId: "",
        peerDisplayName: agent.name,
        aiAgentId: conv.aiAgentId,
        aiAgentHandle: agent.handle,
        lastMessagePreview,
        lastMessageAt,
        unreadCount,
      });
      continue;
    }

    if (conv.kind !== "direct") continue;

    const mems = await db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, m.conversationId));
    const peerId = mems.map((x) => x.userId).find((uid) => uid !== userId);
    if (!peerId) continue;

    const peerUser = await db.query.users.findFirst({ where: eq(users.id, peerId) });
    const peerDisplayName =
      peerUser?.name?.trim() || peerUser?.email || `${peerId.slice(0, 8)}…`;

    const { lastMessagePreview, lastMessageAt, unreadCount } = await previewAndUnreadForConversation(
      userId,
      m.conversationId,
      m.lastReadAt,
    );

    out.push({
      conversationId: m.conversationId,
      kind: "direct",
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

export async function updatePlaintextMessageBody(userId: string, messageId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("EMPTY_BODY");

  const [row] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!row) throw new Error("NOT_FOUND");
  if (row.senderUserId !== userId || row.senderType !== "user") throw new Error("FORBIDDEN");
  if (row.encryptionVersion !== 0) throw new Error("NOT_PLAINTEXT");
  if (row.deletedAt) throw new Error("DELETED");
  if (row.messageType === "voice") throw new Error("NOT_EDITABLE");

  const ok = await assertMember(userId, row.conversationId);
  if (!ok) throw new Error("NOT_MEMBER");

  const mentionRows = await resolveMentionsFromPlaintext(trimmed);
  const updated = await db
    .update(messages)
    .set({
      body: trimmed,
      editedAt: new Date(),
      mentions: mentionRows.length ? mentionRows : null,
    })
    .where(eq(messages.id, messageId))
    .returning({ id: messages.id });

  if (!updated.length) throw new Error("UPDATE_FAILED");
  return getMessageDetailById(userId, messageId);
}

export async function softDeleteMessage(userId: string, messageId: string) {
  const [row] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!row) throw new Error("NOT_FOUND");
  if (row.senderUserId !== userId || row.senderType !== "user") throw new Error("FORBIDDEN");
  if (row.encryptionVersion !== 0) throw new Error("NOT_PLAINTEXT");
  if (row.deletedAt) throw new Error("ALREADY_DELETED");

  const ok = await assertMember(userId, row.conversationId);
  if (!ok) throw new Error("NOT_MEMBER");

  const updated = await db
    .update(messages)
    .set({
      deletedAt: new Date(),
      body: null,
      transcript: null,
      voiceAudioBase64: null,
      voiceMimeType: null,
      ciphertext: null,
      mentions: null,
    })
    .where(eq(messages.id, messageId))
    .returning({ id: messages.id });

  if (!updated.length) throw new Error("UPDATE_FAILED");
  return getMessageDetailById(userId, messageId);
}

export async function getVoiceMessageAudioPayload(userId: string, messageId: string) {
  const [row] = await db
    .select({
      conversationId: messages.conversationId,
      messageType: messages.messageType,
      voiceMimeType: messages.voiceMimeType,
      voiceAudioBase64: messages.voiceAudioBase64,
      deletedAt: messages.deletedAt,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!row || row.deletedAt) throw new Error("NOT_FOUND");
  if (row.messageType !== "voice" || !row.voiceAudioBase64) throw new Error("NOT_VOICE");

  const member = await assertMember(userId, row.conversationId);
  if (!member) throw new Error("NOT_MEMBER");

  return {
    mimeType: row.voiceMimeType ?? "application/octet-stream",
    buffer: Buffer.from(row.voiceAudioBase64, "base64"),
  };
}

/** For AI tab: default @mention handle when user sends plain text in an AI thread. */
export async function getConversationAiAgentHandleForUser(
  userId: string,
  conversationId: string,
): Promise<string | null> {
  const member = await assertMember(userId, conversationId);
  if (!member) throw new Error("NOT_MEMBER");

  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conv || conv.kind !== "ai" || !conv.aiAgentId) return null;

  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.id, conv.aiAgentId),
  });
  return agent?.handle ?? null;
}
