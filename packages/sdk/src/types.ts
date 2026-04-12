/** Serialized message row from `GET /api/messages`. */
export type MessageRow = {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string | null;
  ciphertext: string | null;
  senderPublicKey: string | null;
  encryptionVersion: number;
  createdAt: string;
};

export type SendMessageBody =
  | {
      conversationId: string;
      ciphertext: string;
      encryption_version: 1;
      sender_public_key: string;
    }
  | {
      peerUserId: string;
      ciphertext: string;
      encryption_version: 1;
      sender_public_key: string;
    };

export type CreateMessageResponse = {
  conversationId: string;
  message: MessageRow;
};

export type GetMessagesResponse = {
  messages: MessageRow[];
};

export type Identity = {
  id: string;
  userId: string;
  handle: string;
  displayName: string;
  createdAt: string;
};

export type MeResponse = {
  userId: string;
  identities: Identity[];
};

export type PostRow = {
  id: string;
  authorIdentityId: string;
  postKind: string;
  body: string;
  createdAt: string;
};

export type CreatePostBody = {
  identityId: string;
  body: string;
};

export type CreatePostResponse = {
  post: PostRow;
};

export type GetPostsResponse = {
  posts: PostRow[];
};

export type ArimanSdkConfig = {
  /** Origin without trailing slash, e.g. `https://app.example.com`. Empty string uses relative URLs (browser same-origin). */
  baseUrl?: string;
};

export type ConversationSummary = {
  conversationId: string;
  joinedAt: string;
};

export type ListConversationsResponse = {
  conversations: ConversationSummary[];
};

export type ConversationMember = {
  userId: string;
};

export type ConversationDetailResponse = {
  conversationId: string;
  peerUserId: string | null;
  members: ConversationMember[];
};

export type ClipRow = {
  id: string;
  postId: string;
  durationMs: number;
  transcodeState: string;
  hlsManifestKey: string | null;
  posterFrameKey: string | null;
  createdAt: string;
};

export type ClipWithPost = {
  clip: ClipRow;
  post: PostRow;
};

export type GetClipsResponse = {
  clips: ClipWithPost[];
};

export type GetClipsParams = {
  identityId: string;
  limit?: number;
};

export type CreateClipBody = {
  identityId: string;
  body: string;
};

export type CreateClipResponse = {
  post: PostRow;
  clip: ClipRow;
};
