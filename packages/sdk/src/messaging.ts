import { apiJson } from "./http.js";
import type {
  AiChatBody,
  AiChatResponse,
  ArimanSdkConfig,
  CreateMessageResponse,
  DeleteMessageResponse,
  GetMessagesResponse,
  ListConversationSummariesResponse,
  PatchMessageBody,
  PatchMessageResponse,
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

export async function sendAiChat(
  config: ArimanSdkConfig | undefined,
  body: AiChatBody,
): Promise<AiChatResponse> {
  return apiJson<AiChatResponse>(config, "/api/ai/chat", {
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

export async function listConversationSummaries(
  config: ArimanSdkConfig | undefined,
): Promise<ListConversationSummariesResponse> {
  return apiJson<ListConversationSummariesResponse>(config, "/api/messages?mode=conversations", {
    method: "GET",
  });
}

export async function markConversationRead(
  config: ArimanSdkConfig | undefined,
  conversationId: string,
): Promise<{ ok: boolean }> {
  return apiJson<{ ok: boolean }>(
    config,
    `/api/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: "POST" },
  );
}

export async function patchMessage(
  config: ArimanSdkConfig | undefined,
  messageId: string,
  body: PatchMessageBody,
): Promise<PatchMessageResponse> {
  return apiJson<PatchMessageResponse>(
    config,
    `/api/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function deleteMessage(
  config: ArimanSdkConfig | undefined,
  messageId: string,
): Promise<DeleteMessageResponse> {
  return apiJson<DeleteMessageResponse>(config, `/api/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
  });
}

export async function sendVoiceMessage(
  config: ArimanSdkConfig | undefined,
  args: { conversationId: string; file: Blob },
): Promise<CreateMessageResponse> {
  const fd = new FormData();
  fd.set("conversationId", args.conversationId);
  fd.set("file", args.file, "voice.webm");
  return apiJson<CreateMessageResponse>(config, "/api/messages/voice", {
    method: "POST",
    body: fd,
  });
}
