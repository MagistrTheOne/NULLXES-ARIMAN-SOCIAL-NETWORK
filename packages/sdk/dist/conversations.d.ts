import type { ArimanSdkConfig, ConversationDetailResponse, ListConversationsResponse } from "./types.js";
export declare function listConversations(config: ArimanSdkConfig | undefined): Promise<ListConversationsResponse>;
export declare function getConversation(config: ArimanSdkConfig | undefined, conversationId: string): Promise<ConversationDetailResponse>;
//# sourceMappingURL=conversations.d.ts.map