import OpenAI from "openai";
import { createPlaintextMessage, insertAiAgentMessage } from "@/modules/messages/service";
import { extractFirstAiAgentHandle } from "@/lib/ai-mention";
import { ensureDefaultAiAgents, getAgentByHandle } from "@/modules/ai/agents";
import { buildAiChatOpenAiMessages } from "@/modules/ai/context";
import { parseAiAssistantJson } from "@/modules/ai/structured-response";
import { insertAiMemory } from "@/modules/ai/memory";
import { createPost } from "@/modules/posts/service";
import { getFirstIdentityIdForUser } from "@/modules/identities/access";

export type AiChatResult = {
  userMessage: Awaited<ReturnType<typeof createPlaintextMessage>>["message"];
  aiMessage: Awaited<ReturnType<typeof insertAiAgentMessage>>;
  createdPostId?: string;
};

export async function runAiChat(
  userId: string,
  conversationId: string,
  rawMessage: string,
  opts?: { actionIdentityId?: string | null },
): Promise<AiChatResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const agentHandle = extractFirstAiAgentHandle(rawMessage);
  if (!agentHandle) {
    throw new Error("AI_MENTION_REQUIRED");
  }

  await ensureDefaultAiAgents();
  const agent = await getAgentByHandle(agentHandle);
  if (!agent) {
    throw new Error("AI_AGENT_NOT_FOUND");
  }

  const { message: userMessage } = await createPlaintextMessage(userId, {
    conversationId,
    body: rawMessage.trim(),
  });

  const openaiMessages = await buildAiChatOpenAiMessages({
    userId,
    conversationId,
    agent,
  });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: agent.model,
    messages: openaiMessages,
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("OPENAI_EMPTY_RESPONSE");
  }

  let structured;
  try {
    structured = parseAiAssistantJson(raw);
  } catch {
    throw new Error("AI_INVALID_JSON");
  }

  let chatVisibleBody: string;
  let createdPostId: string | undefined;

  if (structured.type === "create_post") {
    const identityId =
      opts?.actionIdentityId?.trim() || (await getFirstIdentityIdForUser(userId));
    if (!identityId) {
      throw new Error("AI_ACTION_IDENTITY_REQUIRED");
    }
    const post = await createPost(userId, identityId, structured.content.trim());
    createdPostId = post.id;
    const preview =
      structured.content.length > 280 ? `${structured.content.slice(0, 280)}…` : structured.content;
    chatVisibleBody = `Published to your feed:\n\n${preview}`;
  } else {
    chatVisibleBody = structured.content.trim();
  }

  const aiMessage = await insertAiAgentMessage(conversationId, agent.id, chatVisibleBody);

  try {
    await insertAiMemory(userId, agent.id, structured.memorySummary.trim());
  } catch (e) {
    console.warn("[ai/memory] insert failed (migration may be pending)", e);
  }

  return createdPostId
    ? { userMessage, aiMessage, createdPostId }
    : { userMessage, aiMessage };
}
