import { type GetMessagesParams } from "./messaging.js";
import { type GetFeedParams } from "./posts.js";
import type { ArimanSdkConfig, ConversationDetailResponse, CreateClipBody, CreateClipResponse, CreateMessageResponse, CreatePostBody, CreatePostResponse, GetClipsParams, GetClipsResponse, GetMessagesResponse, GetPostsResponse, ListConversationsResponse, MeResponse, SendMessageBody } from "./types.js";
/** Browser-friendly default: same-origin relative `/api/*`. */
export declare function defaultSdkBaseUrl(): string;
export declare function createArimanSdk(config?: ArimanSdkConfig): {
    getMe: () => Promise<MeResponse>;
    getFeed: (params: GetFeedParams) => Promise<GetPostsResponse>;
    createPost: (body: CreatePostBody) => Promise<CreatePostResponse>;
    sendMessage: (body: SendMessageBody) => Promise<CreateMessageResponse>;
    getMessages: (params: GetMessagesParams) => Promise<GetMessagesResponse>;
    listConversations: () => Promise<ListConversationsResponse>;
    getConversation: (conversationId: string) => Promise<ConversationDetailResponse>;
    getClips: (params: GetClipsParams) => Promise<GetClipsResponse>;
    createClip: (body: CreateClipBody) => Promise<CreateClipResponse>;
};
export type ArimanSdk = ReturnType<typeof createArimanSdk>;
//# sourceMappingURL=client.d.ts.map