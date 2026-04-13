import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiMemories } from "@/lib/db/schema";

export async function insertAiMemory(userId: string, aiAgentId: string, content: string) {
  const [row] = await db
    .insert(aiMemories)
    .values({ userId, aiAgentId, content: content.trim() })
    .returning();
  return row ?? null;
}

export async function listRecentAiMemories(userId: string, aiAgentId: string, limit: number) {
  return db
    .select({ id: aiMemories.id, content: aiMemories.content, createdAt: aiMemories.createdAt })
    .from(aiMemories)
    .where(and(eq(aiMemories.userId, userId), eq(aiMemories.aiAgentId, aiAgentId)))
    .orderBy(desc(aiMemories.createdAt))
    .limit(limit);
}
