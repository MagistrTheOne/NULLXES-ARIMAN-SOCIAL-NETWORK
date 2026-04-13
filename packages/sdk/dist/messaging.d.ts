import type { AiChatBody, AiChatResponse, ArimanSdkConfig, CreateMessageResponse, DeleteMessageResponse, GetMessagesResponse, ListConversationSummariesResponse, PatchMessageBody, PatchMessageResponse, SendMessageBody } from "./types.js";
export declare function sendMessage(config: ArimanSdkConfig | undefined, body: SendMessageBody): Promise<CreateMessageResponse>;
export declare function sendAiChat(config: ArimanSdkConfig | undefined, body: AiChatBody): Promise<AiChatResponse>;
export type GetMessagesParams = {
    conversationId: string;
    limit?: number;
};
export declare function getMessages(config: ArimanSdkConfig | undefined, params: GetMessagesParams): Promise<GetMessagesResponse>;
export declare function listConversationSummaries(config: ArimanSdkConfig | undefined): Promise<ListConversationSummariesResponse>;
export declare function markConversationRead(config: ArimanSdkConfig | undefined, conversationId: string): Promise<{
    ok: boolean;
}>;
export declare function patchMessage(config: ArimanSdkConfig | undefined, messageId: string, body: PatchMessageBody): Promise<PatchMessageResponse>;
export declare function deleteMessage(config: ArimanSdkConfig | undefined, messageId: string): Promise<DeleteMessageResponse>;
export declare function sendVoiceMessage(config: ArimanSdkConfig | undefined, args: {
    conversationId: string;
    file: Blob;
}): Promise<CreateMessageResponse>;
//# sourceMappingURL=messaging.d.ts.map