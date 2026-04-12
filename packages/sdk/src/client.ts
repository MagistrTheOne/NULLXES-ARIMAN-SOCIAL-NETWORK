import { createClip, getClips } from "./clips.js";
import { getConversation, listConversations } from "./conversations.js";
import { getMessages, sendMessage, type GetMessagesParams } from "./messaging.js";
import { createPost, getFeed, getMe, type GetFeedParams } from "./posts.js";
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
  ListConversationsResponse,
  MeResponse,
  SendMessageBody,
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
    createPost: (body: CreatePostBody): Promise<CreatePostResponse> => createPost(c, body),
    sendMessage: (body: SendMessageBody): Promise<CreateMessageResponse> => sendMessage(c, body),
    getMessages: (params: GetMessagesParams): Promise<GetMessagesResponse> => getMessages(c, params),
    listConversations: (): Promise<ListConversationsResponse> => listConversations(c),
    getConversation: (conversationId: string): Promise<ConversationDetailResponse> =>
      getConversation(c, conversationId),
    getClips: (params: GetClipsParams): Promise<GetClipsResponse> => getClips(c, params),
    createClip: (body: CreateClipBody): Promise<CreateClipResponse> => createClip(c, body),
  };
}

export type ArimanSdk = ReturnType<typeof createArimanSdk>;
