import { apiJson } from "./http.js";
import type {
  ArimanSdkConfig,
  EnsureAiConversationBody,
  EnsureAiConversationResponse,
  ListAiAgentsResponse,
} from "./types.js";

export async function listAiAgents(
  config: ArimanSdkConfig | undefined,
): Promise<ListAiAgentsResponse> {
  return apiJson<ListAiAgentsResponse>(config, "/api/ai/agents", { method: "GET" });
}

export async function ensureAiConversation(
  config: ArimanSdkConfig | undefined,
  body: EnsureAiConversationBody,
): Promise<EnsureAiConversationResponse> {
  return apiJson<EnsureAiConversationResponse>(config, "/api/conversations/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
