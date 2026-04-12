export { ArimanHttpError, apiJson } from "./http.js";
export {
  createArimanSdk,
  defaultSdkBaseUrl,
  type ArimanSdk,
} from "./client.js";

export { sendMessage, getMessages } from "./messaging.js";
export type { GetMessagesParams } from "./messaging.js";

export { getMe, getFeed, createPost } from "./posts.js";
export type { GetFeedParams } from "./posts.js";

export { listConversations, getConversation } from "./conversations.js";

export { getClips, createClip } from "./clips.js";

export type {
  ArimanSdkConfig,
  ClipRow,
  ClipWithPost,
  ConversationDetailResponse,
  ConversationMember,
  ConversationSummary,
  CreateClipBody,
  CreateClipResponse,
  CreateMessageResponse,
  CreatePostBody,
  CreatePostResponse,
  GetClipsParams,
  GetClipsResponse,
  GetMessagesResponse,
  GetPostsResponse,
  Identity,
  ListConversationsResponse,
  MeResponse,
  MessageRow,
  PostRow,
  SendMessageBody,
} from "./types.js";
