import { createClip, getClips } from "./clips.js";
import { getConversation, listConversations } from "./conversations.js";
import {
  getMessages,
  listConversationSummaries,
  markConversationRead,
  sendMessage,
  type GetMessagesParams,
} from "./messaging.js";
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
  ArimanSdkConfig,
  ConversationDetailResponse,
  CreateClipBody,
  CreateClipResponse,
  CreateMessageResponse,
  CreatePostBody,
  CreatePostResponse,
  GetClipsParams,
  GetClipsResponse,
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
  };
}

export type ArimanSdk = ReturnType<typeof createArimanSdk>;
