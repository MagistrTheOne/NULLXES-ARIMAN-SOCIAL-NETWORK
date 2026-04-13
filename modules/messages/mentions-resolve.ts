import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import type { MessageMentionRow } from "@/lib/db/schema";
import { aiAgents, identities } from "@/lib/db/schema";
import { extractMentionTokens, resolveAgentHandleFromMention } from "@/lib/mentions";

/** Resolve @tokens in plain text to persisted mention rows (user = users.id, ai = ai_agents.id). */
export async function resolveMentionsFromPlaintext(text: string): Promise<MessageMentionRow[]> {
  const tokens = extractMentionTokens(text);
  const out: MessageMentionRow[] = [];
  const seen = new Set<string>();

  for (const raw of tokens) {
    const agentHandle = resolveAgentHandleFromMention(raw);
    if (agentHandle) {
      const agent = await db.query.aiAgents.findFirst({
        where: eq(aiAgents.handle, agentHandle),
      });
      if (agent) {
        const key = `ai:${agent.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ type: "ai", id: agent.id });
        }
      }
      continue;
    }

    const handle = raw.trim().toLowerCase();
    if (!handle) continue;

    const row = await db.query.identities.findFirst({
      where: eq(identities.handle, handle),
    });
    if (row) {
      const key = `user:${row.userId}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ type: "user", id: row.userId });
      }
    }
  }

  return out;
}
