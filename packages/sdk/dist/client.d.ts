import { type GetMessagesParams } from "./messaging.js";
import { type ListMentionCandidatesParams } from "./mention-candidates.js";
import { type GetFeedParams, type GetProfileStatsParams } from "./posts.js";
import { type GetCommunityParams } from "./communities.js";
import { type GetActivityParams } from "./post-social.js";
import { type SearchUsersParams } from "./users-search.js";
import type { AiChatBody, AiChatResponse, AnalyzePostResponse, ArimanSdkConfig, DeleteMessageResponse, EnsureAiConversationBody, EnsureAiConversationResponse, ListAiAgentsResponse, MentionCandidatesResponse, PatchMessageBody, PatchMessageResponse, ConversationDetailResponse, CreateClipBody, CreateClipResponse, CreateMessageResponse, CreatePostBody, CreatePostResponse, GetClipsParams, GetClipsResponse, RecordClipViewResponse, UploadClipVideoParams, UploadClipVideoResponse, GetMessagesResponse, GetPostsResponse, ListConversationSummariesResponse, ListConversationsResponse, MeResponse, PatchMeBody, PatchMeResponse, PatchPostBody, ProfileStatsResponse, SearchUsersResponse, SendMessageBody, CommunityDetailResponse, CreateCommentBody, GetActivityResponse, ListCommentsResponse, PostInteractionState } from "./types.js";
/** Browser-friendly default: same-origin relative `/api/*`. */
export declare function defaultSdkBaseUrl(): string;
export declare function createArimanSdk(config?: ArimanSdkConfig): {
    getMe: () => Promise<MeResponse>;
    getFeed: (params: GetFeedParams) => Promise<GetPostsResponse>;
    getPosts: (params: GetFeedParams) => Promise<GetPostsResponse>;
    patchMe: (body: PatchMeBody) => Promise<PatchMeResponse>;
    getProfileStats: (params: GetProfileStatsParams) => Promise<ProfileStatsResponse>;
    patchPost: (postId: string, body: PatchPostBody) => Promise<{
        ok: boolean;
    }>;
    deletePost: (postId: string) => Promise<{
        ok: boolean;
    }>;
    createPost: (body: CreatePostBody) => Promise<CreatePostResponse>;
    getCommunity: (slug: string, params?: GetCommunityParams) => Promise<CommunityDetailResponse>;
    listPostComments: (postId: string, limit?: number) => Promise<ListCommentsResponse>;
    createComment: (postId: string, body: CreateCommentBody) => Promise<{
        comment: {
            id: string;
            postId: string;
            authorIdentityId: string;
            body: string;
            createdAt: string;
        };
    }>;
    toggleEcho: (postId: string, identityId: string) => Promise<PostInteractionState>;
    toggleSave: (postId: string, identityId: string) => Promise<PostInteractionState>;
    getActivity: (params: GetActivityParams) => Promise<GetActivityResponse>;
    joinCommunity: (slug: string) => Promise<{
        ok: boolean;
        joined: boolean;
    }>;
    sendMessage: (body: SendMessageBody) => Promise<CreateMessageResponse>;
    sendAiChat: (body: AiChatBody) => Promise<AiChatResponse>;
    sendVoiceMessage: (args: {
        conversationId: string;
        file: Blob;
    }) => Promise<CreateMessageResponse>;
    patchMessage: (messageId: string, body: PatchMessageBody) => Promise<PatchMessageResponse>;
    deleteMessage: (messageId: string) => Promise<DeleteMessageResponse>;
    listMentionCandidates: (params?: ListMentionCandidatesParams) => Promise<MentionCandidatesResponse>;
    listAiAgents: () => Promise<ListAiAgentsResponse>;
    ensureAiConversation: (body: EnsureAiConversationBody) => Promise<EnsureAiConversationResponse>;
    getMessages: (params: GetMessagesParams) => Promise<GetMessagesResponse>;
    listConversationSummaries: () => Promise<ListConversationSummariesResponse>;
    markConversationRead: (conversationId: string) => Promise<{
        ok: boolean;
    }>;
    listConversations: () => Promise<ListConversationsResponse>;
    searchUsers: (params: SearchUsersParams) => Promise<SearchUsersResponse>;
    getConversation: (conversationId: string) => Promise<ConversationDetailResponse>;
    getClips: (params: GetClipsParams) => Promise<GetClipsResponse>;
    createClip: (body: CreateClipBody) => Promise<CreateClipResponse>;
    uploadClipVideo: (params: UploadClipVideoParams) => Promise<UploadClipVideoResponse>;
    recordClipView: (clipId: string) => Promise<RecordClipViewResponse>;
    analyzePost: (postId: string) => Promise<AnalyzePostResponse>;
};
export type ArimanSdk = ReturnType<typeof createArimanSdk>;
//# sourceMappingURL=client.d.ts.map