import { apiJson } from "./http.js";
import type { ArimanSdkConfig, ConversationDetailResponse, ListConversationsResponse } from "./types.js";

export async function listConversations(
  config: ArimanSdkConfig | undefined,
): Promise<ListConversationsResponse> {
  return apiJson<ListConversationsResponse>(config, "/api/conversations", { method: "GET" });
}

export async function getConversation(
  config: ArimanSdkConfig | undefined,
  conversationId: string,
): Promise<ConversationDetailResponse> {
  return apiJson<ConversationDetailResponse>(
    config,
    `/api/conversations/${encodeURIComponent(conversationId)}`,
    { method: "GET" },
  );
}
