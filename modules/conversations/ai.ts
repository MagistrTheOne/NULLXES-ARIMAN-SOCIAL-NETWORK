import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiAgents, conversationMembers, conversations } from "@/lib/db/schema";
import { ensureDefaultAiAgents } from "@/modules/ai/agents";

export async function findOrCreateAiConversation(userId: string, aiAgentId: string): Promise<string> {
  await ensureDefaultAiAgents();

  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.id, aiAgentId),
  });
  if (!agent) throw new Error("AI_AGENT_NOT_FOUND");

  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .innerJoin(conversationMembers, eq(conversationMembers.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.kind, "ai"),
        eq(conversations.aiAgentId, aiAgentId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .limit(1);

  if (existing?.id) return existing.id;

  const [conv] = await db
    .insert(conversations)
    .values({ kind: "ai", createdByUserId: userId, aiAgentId })
    .returning();

  if (!conv) throw new Error("CONVERSATION_CREATE_FAILED");

  await db.insert(conversationMembers).values({
    conversationId: conv.id,
    userId,
  });

  return conv.id;
}
