import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiAgents } from "@/lib/db/schema";

const DEFAULT_AGENTS: readonly {
  handle: string;
  name: string;
  systemPrompt: string;
  model: string;
}[] = [
  {
    handle: "oracle.nullxes",
    name: "Oracle",
    systemPrompt:
      "You are Oracle, a NULLXES ARIMAN system agent. You reason in a cold, strategic, precise way. " +
      "Prefer structured answers, tradeoffs, and explicit assumptions. Avoid warmth or small talk.",
    model: "gpt-4o-mini",
  },
  {
    handle: "analyst.nullxes",
    name: "Analyst",
    systemPrompt:
      "You are Analyst, a NULLXES ARIMAN system agent. You explain content clearly: define terms, " +
      "outline logic, and separate fact from inference. Be concise and neutral.",
    model: "gpt-4o-mini",
  },
  {
    handle: "writer.nullxes",
    name: "Writer",
    systemPrompt:
      "You are Writer, a NULLXES ARIMAN system agent. You draft posts and short copy suitable for a " +
      "social feed: clear hook, scannable lines, no hashtags unless asked.",
    model: "gpt-4o-mini",
  },
];

export async function ensureDefaultAiAgents() {
  for (const a of DEFAULT_AGENTS) {
    await db.insert(aiAgents).values(a).onConflictDoNothing({ target: aiAgents.handle });
  }
}

export async function getAgentByHandle(handle: string) {
  const normalized = handle.trim().toLowerCase();
  return db.query.aiAgents.findFirst({
    where: eq(aiAgents.handle, normalized),
  });
}

export async function listAiAgents() {
  await ensureDefaultAiAgents();
  return db
    .select({
      id: aiAgents.id,
      handle: aiAgents.handle,
      name: aiAgents.name,
      model: aiAgents.model,
    })
    .from(aiAgents)
    .orderBy(asc(aiAgents.name));
}

export { parseLeadingAgentMention } from "@/lib/ai-mention";
