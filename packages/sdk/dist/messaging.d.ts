import type { ArimanSdkConfig, CreateMessageResponse, GetMessagesResponse, ListConversationSummariesResponse, SendMessageBody } from "./types.js";
export declare function sendMessage(config: ArimanSdkConfig | undefined, body: SendMessageBody): Promise<CreateMessageResponse>;
export type GetMessagesParams = {
    conversationId: string;
    limit?: number;
};
export declare function getMessages(config: ArimanSdkConfig | undefined, params: GetMessagesParams): Promise<GetMessagesResponse>;
export declare function listConversationSummaries(config: ArimanSdkConfig | undefined): Promise<ListConversationSummariesResponse>;
export declare function markConversationRead(config: ArimanSdkConfig | undefined, conversationId: string): Promise<{
    ok: boolean;
}>;
//# sourceMappingURL=messaging.d.ts.map