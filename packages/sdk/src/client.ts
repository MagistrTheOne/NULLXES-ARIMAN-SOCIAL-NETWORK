import { ensureAiConversation, listAiAgents } from "./ai.js";
import { analyzePost } from "./ai-post.js";
import { createClip, getClips, recordClipView, uploadClipVideo } from "./clips.js";
import { getConversation, listConversations } from "./conversations.js";
import {
  deleteMessage,
  getMessages,
  listConversationSummaries,
  markConversationRead,
  patchMessage,
  sendAiChat,
  sendMessage,
  sendVoiceMessage,
  type GetMessagesParams,
} from "./messaging.js";
import { listMentionCandidates, type ListMentionCandidatesParams } from "./mention-candidates.js";
import { createPost, getFeed, getMe, getPosts, patchMe, type GetFeedParams } from "./posts.js";
import { getCommunity, joinCommunity, type GetCommunityParams } from "./communities.js";
import {
  createComment,
  getActivity,
  listPostComments,
  toggleEcho,
  toggleSave,
  type GetActivityParams,
} from "./post-social.js";
import { searchUsers, type SearchUsersParams } from "./users-search.js";
import type {
  AiChatBody,
  AiChatResponse,
  AnalyzePostResponse,
  ArimanSdkConfig,
  DeleteMessageResponse,
  EnsureAiConversationBody,
  EnsureAiConversationResponse,
  ListAiAgentsResponse,
  MentionCandidatesResponse,
  PatchMessageBody,
  PatchMessageResponse,
  ConversationDetailResponse,
  CreateClipBody,
  CreateClipResponse,
  CreateMessageResponse,
  CreatePostBody,
  CreatePostResponse,
  GetClipsParams,
  GetClipsResponse,
  RecordClipViewResponse,
  UploadClipVideoParams,
  UploadClipVideoResponse,
  GetMessagesResponse,
  GetPostsResponse,
  ListConversationSummariesResponse,
  ListConversationsResponse,
  MeResponse,
  PatchMeBody,
  PatchMeResponse,
  SearchUsersResponse,
  SendMessageBody,
  CommunityDetailResponse,
  CreateCommentBody,
  GetActivityResponse,
  ListCommentsResponse,
  PostInteractionState,
} from "./types.js";

/** Browser-friendly default: same-origin relative `/api/*`. */
export function defaultSdkBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return "";
}

export function createArimanSdk(config: ArimanSdkConfig = {}) {
  const c: ArimanSdkConfig = {
    baseUrl: config.baseUrl ?? defaultSdkBaseUrl(),
  };

  return {
    getMe: (): Promise<MeResponse> => getMe(c),
    getFeed: (params: GetFeedParams): Promise<GetPostsResponse> => getFeed(c, params),
    getPosts: (params: GetFeedParams): Promise<GetPostsResponse> => getPosts(c, params),
    patchMe: (body: PatchMeBody): Promise<PatchMeResponse> => patchMe(c, body),
    createPost: (body: CreatePostBody): Promise<CreatePostResponse> => createPost(c, body),
    getCommunity: (slug: string, params?: GetCommunityParams): Promise<CommunityDetailResponse> =>
      getCommunity(c, slug, params),
    listPostComments: (postId: string, limit?: number): Promise<ListCommentsResponse> =>
      listPostComments(c, postId, limit),
    createComment: (postId: string, body: CreateCommentBody) => createComment(c, postId, body),
    toggleEcho: (postId: string, identityId: string): Promise<PostInteractionState> =>
      toggleEcho(c, postId, identityId),
    toggleSave: (postId: string, identityId: string): Promise<PostInteractionState> =>
      toggleSave(c, postId, identityId),
    getActivity: (params: GetActivityParams): Promise<GetActivityResponse> => getActivity(c, params),
    joinCommunity: (slug: string): Promise<{ ok: boolean; joined: boolean }> =>
      joinCommunity(c, slug),
    sendMessage: (body: SendMessageBody): Promise<CreateMessageResponse> => sendMessage(c, body),
    sendAiChat: (body: AiChatBody): Promise<AiChatResponse> => sendAiChat(c, body),
    sendVoiceMessage: (args: {
      conversationId: string;
      file: Blob;
    }): Promise<CreateMessageResponse> => sendVoiceMessage(c, args),
    patchMessage: (messageId: string, body: PatchMessageBody): Promise<PatchMessageResponse> =>
      patchMessage(c, messageId, body),
    deleteMessage: (messageId: string): Promise<DeleteMessageResponse> => deleteMessage(c, messageId),
    listMentionCandidates: (
      params?: ListMentionCandidatesParams,
    ): Promise<MentionCandidatesResponse> => listMentionCandidates(c, params),
    listAiAgents: (): Promise<ListAiAgentsResponse> => listAiAgents(c),
    ensureAiConversation: (
      body: EnsureAiConversationBody,
    ): Promise<EnsureAiConversationResponse> => ensureAiConversation(c, body),
    getMessages: (params: GetMessagesParams): Promise<GetMessagesResponse> => getMessages(c, params),
    listConversationSummaries: (): Promise<ListConversationSummariesResponse> =>
      listConversationSummaries(c),
    markConversationRead: (conversationId: string): Promise<{ ok: boolean }> =>
      markConversationRead(c, conversationId),
    listConversations: (): Promise<ListConversationsResponse> => listConversations(c),
    searchUsers: (params: SearchUsersParams): Promise<SearchUsersResponse> => searchUsers(c, params),
    getConversation: (conversationId: string): Promise<ConversationDetailResponse> =>
      getConversation(c, conversationId),
    getClips: (params: GetClipsParams): Promise<GetClipsResponse> => getClips(c, params),
    createClip: (body: CreateClipBody): Promise<CreateClipResponse> => createClip(c, body),
    uploadClipVideo: (params: UploadClipVideoParams): Promise<UploadClipVideoResponse> =>
      uploadClipVideo(c, params),
    recordClipView: (clipId: string): Promise<RecordClipViewResponse> => recordClipView(c, clipId),
    analyzePost: (postId: string): Promise<AnalyzePostResponse> => analyzePost(c, postId),
  };
}

export type ArimanSdk = ReturnType<typeof createArimanSdk>;
