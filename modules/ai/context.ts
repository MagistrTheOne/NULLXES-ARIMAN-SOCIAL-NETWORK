import type { InferSelectModel } from "drizzle-orm";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { aiAgents } from "@/lib/db/schema";
import { listMessagesForAiContext } from "@/modules/messages/service";
import { JSON_OUTPUT_INSTRUCTION } from "@/modules/ai/structured-response";
import { listRecentAiMemories } from "@/modules/ai/memory";

type AiAgentRow = InferSelectModel<typeof aiAgents>;

const CONTEXT_MESSAGE_LIMIT = 10;
const CONTEXT_MEMORY_LIMIT = 5;

export async function buildAiChatOpenAiMessages(args: {
  userId: string;
  conversationId: string;
  agent: AiAgentRow;
}): Promise<ChatCompletionMessageParam[]> {
  const { userId, conversationId, agent } = args;

  const [history, memories] = await Promise.all([
    listMessagesForAiContext(userId, conversationId, CONTEXT_MESSAGE_LIMIT),
    listRecentAiMemories(userId, agent.id, CONTEXT_MEMORY_LIMIT),
  ]);

  const memoryBlock =
    memories.length === 0
      ? ""
      : "\n\nRecalled notes from prior exchanges (newest first in list, may be incomplete):\n" +
        memories.map((m) => `- ${m.content}`).join("\n");

  const systemContent = `${agent.systemPrompt}\n\n${JSON_OUTPUT_INSTRUCTION}${memoryBlock}`;

  const out: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.map((h) => ({ role: h.role, content: h.content }) as ChatCompletionMessageParam),
  ];

  return out;
}
