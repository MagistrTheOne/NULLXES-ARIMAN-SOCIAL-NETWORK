import type { ArimanSdkConfig, CreateMessageResponse, GetMessagesResponse, SendMessageBody } from "./types.js";
export declare function sendMessage(config: ArimanSdkConfig | undefined, body: SendMessageBody): Promise<CreateMessageResponse>;
export type GetMessagesParams = {
    conversationId: string;
    limit?: number;
};
export declare function getMessages(config: ArimanSdkConfig | undefined, params: GetMessagesParams): Promise<GetMessagesResponse>;
//# sourceMappingURL=messaging.d.ts.map