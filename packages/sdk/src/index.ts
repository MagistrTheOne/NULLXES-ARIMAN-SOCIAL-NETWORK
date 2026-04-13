export { ArimanHttpError, apiJson } from "./http.js";
export {
  createArimanSdk,
  defaultSdkBaseUrl,
  type ArimanSdk,
} from "./client.js";

export {
  sendMessage,
  getMessages,
  listConversationSummaries,
  markConversationRead,
} from "./messaging.js";
export type { GetMessagesParams } from "./messaging.js";

export { searchUsers } from "./users-search.js";
export type { SearchUsersParams } from "./users-search.js";

export { getMe, getFeed, getPosts, patchMe, createPost } from "./posts.js";
export type { GetFeedParams } from "./posts.js";

export { getCommunity, joinCommunity, type GetCommunityParams } from "./communities.js";

export {
  listPostComments,
  createComment,
  toggleEcho,
  toggleSave,
  getActivity,
} from "./post-social.js";
export type { GetActivityParams } from "./post-social.js";

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
  ListConversationSummariesResponse,
  ListConversationsResponse,
  ActivityItemDto,
  CommentRow,
  CommunityDetailResponse,
  CommunitySummary,
  CreateCommentBody,
  GetActivityResponse,
  ListCommentsResponse,
  PostInteractionState,
  ConversationSummaryRow,
  MeResponse,
  PatchMeBody,
  PatchMeResponse,
  SearchUsersResponse,
  UserSearchRow,
  MessageRow,
  PostRow,
  SendMessageBody,
} from "./types.js";
