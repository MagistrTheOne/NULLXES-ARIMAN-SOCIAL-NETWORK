export { sendMessage, getMessages } from "./messaging.js";
export type { GetMessagesParams } from "./messaging.js";

export { getMe, getFeed, createPost } from "./posts.js";
export type { GetFeedParams } from "./posts.js";

export type {
  ArimanSdkConfig,
  CreateMessageResponse,
  CreatePostBody,
  CreatePostResponse,
  GetMessagesResponse,
  GetPostsResponse,
  Identity,
  MeResponse,
  MessageRow,
  PostRow,
  SendMessageBody,
} from "./types.js";
