import { apiJson } from "./http.js";
import type {
  ArimanSdkConfig,
  CreateMessageResponse,
  GetMessagesResponse,
  SendMessageBody,
} from "./types.js";

export async function sendMessage(
  config: ArimanSdkConfig | undefined,
  body: SendMessageBody,
): Promise<CreateMessageResponse> {
  return apiJson<CreateMessageResponse>(config, "/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type GetMessagesParams = {
  conversationId: string;
  limit?: number;
};

export async function getMessages(
  config: ArimanSdkConfig | undefined,
  params: GetMessagesParams,
): Promise<GetMessagesResponse> {
  const sp = new URLSearchParams({ conversationId: params.conversationId });
  if (params.limit != null) sp.set("limit", String(params.limit));
  return apiJson<GetMessagesResponse>(config, `/api/messages?${sp.toString()}`, {
    method: "GET",
  });
}
