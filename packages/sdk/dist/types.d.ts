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
export type SendMessageBody = {
    conversationId: string;
    ciphertext: string;
    encryption_version: 1;
    sender_public_key: string;
} | {
    peerUserId: string;
    ciphertext: string;
    encryption_version: 1;
    sender_public_key: string;
} | {
    conversationId: string;
    body: string;
} | {
    peerUserId: string;
    body: string;
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
    bio?: string | null;
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
    communityId?: string | null;
    authorHandle?: string;
    authorDisplayName?: string;
    echoCount?: number;
    commentCount?: number;
    saveCount?: number;
    echoedByViewer?: boolean;
    savedByViewer?: boolean;
};
export type PostInteractionState = {
    echoCount: number;
    commentCount: number;
    saveCount: number;
    echoedByViewer: boolean;
    savedByViewer: boolean;
};
export type CommentRow = {
    id: string;
    postId: string;
    authorIdentityId: string;
    body: string;
    createdAt: string;
    authorHandle: string;
    authorDisplayName: string;
};
export type ListCommentsResponse = {
    comments: CommentRow[];
};
export type CreateCommentBody = {
    identityId: string;
    body: string;
};
export type ActivityItemDto = {
    kind: "post";
    id: string;
    body: string;
    createdAt: string;
} | {
    kind: "reply";
    id: string;
    body: string;
    createdAt: string;
    postId: string;
    postPreview: string;
};
export type GetActivityResponse = {
    items: ActivityItemDto[];
};
export type CreatePostBody = {
    identityId: string;
    body: string;
    communityId?: string;
};
export type CreatePostResponse = {
    post: PostRow;
};
export type GetPostsResponse = {
    posts: PostRow[];
};
export type CommunitySummary = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    createdAt: string;
};
export type CommunityDetailResponse = {
    community: CommunitySummary;
    member: boolean;
    memberCount: number;
    posts: PostRow[];
};
export type PatchMeBody = {
    identityId: string;
    displayName?: string;
    bio?: string | null;
};
export type PatchMeResponse = MeResponse & {
    identity?: Identity;
};
export type ArimanSdkConfig = {
    /** Origin without trailing slash, e.g. `https://app.example.com`. Empty string uses relative URLs (browser same-origin). */
    baseUrl?: string;
};
export type ConversationSummary = {
    conversationId: string;
    joinedAt: string;
};
export type ConversationSummaryRow = {
    conversationId: string;
    peerUserId: string;
    peerDisplayName: string;
    lastMessagePreview: string;
    lastMessageAt: string | null;
    unreadCount: number;
};
export type ListConversationsResponse = {
    conversations: ConversationSummary[];
};
export type ListConversationSummariesResponse = {
    conversations: ConversationSummaryRow[];
};
export type UserSearchRow = {
    id: string;
    name: string;
    email: string;
    image: string | null;
};
export type SearchUsersResponse = {
    users: UserSearchRow[];
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
//# sourceMappingURL=types.d.ts.map