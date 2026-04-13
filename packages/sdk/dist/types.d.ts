/** Parsed @mention stored on a message (user = users.id, ai = ai_agents.id). */
export type MessageMention = {
    type: "user" | "ai";
    id: string;
};
/** Serialized message row from `GET /api/messages`. */
export type MessageRow = {
    id: string;
    conversationId: string;
    senderUserId: string | null;
    senderType: string;
    aiAgentId?: string | null;
    aiAgentHandle?: string | null;
    aiAgentName?: string | null;
    messageType?: "text" | "voice";
    body: string | null;
    ciphertext: string | null;
    senderPublicKey: string | null;
    encryptionVersion: number;
    transcript?: string | null;
    /** Relative URL to fetch voice bytes (same-origin). */
    audioUrl?: string | null;
    mentions?: MessageMention[] | null;
    editedAt?: string | null;
    deletedAt?: string | null;
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
export type AiChatBody = {
    conversationId: string;
    message: string;
    /** When the model returns create_post, prefer this identity; otherwise first identity is used. */
    actionIdentityId?: string;
};
export type AiChatResponse = {
    userMessage: MessageRow;
    aiMessage: MessageRow;
    createdPostId?: string;
};
export type AnalyzePostResponse = {
    explanation: string;
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
    avatarUrl?: string | null;
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
    editedAt?: string | null;
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
    avatarUrl?: string | null;
};
export type ProfileStatsResponse = {
    postCount: number;
    clipCount: number;
    threadCount: number;
    communityCount: number;
    connectionCount: number;
};
export type PatchPostBody = {
    body: string;
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
    kind?: "direct" | "ai";
    peerUserId: string;
    peerDisplayName: string;
    aiAgentId?: string | null;
    aiAgentHandle?: string | null;
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
    kind?: "direct" | "ai";
    peerUserId: string | null;
    aiAgentId?: string | null;
    aiAgentHandle?: string | null;
    members: ConversationMember[];
};
export type AiAgentRow = {
    id: string;
    handle: string;
    name: string;
    model: string;
};
export type ListAiAgentsResponse = {
    agents: AiAgentRow[];
};
export type EnsureAiConversationBody = {
    aiAgentId: string;
};
export type EnsureAiConversationResponse = {
    conversationId: string;
};
export type MentionAgentCandidate = {
    id: string;
    handle: string;
    name: string;
    shortHandle: string;
};
export type MentionUserCandidate = {
    userId: string;
    handle: string;
    displayName: string;
};
export type MentionCandidatesResponse = {
    agents: MentionAgentCandidate[];
    users: MentionUserCandidate[];
};
export type PatchMessageBody = {
    body: string;
};
export type PatchMessageResponse = {
    message: MessageRow;
};
export type DeleteMessageResponse = {
    message: MessageRow;
};
export type ClipRow = {
    id: string;
    postId: string;
    durationMs: number;
    transcodeState: string;
    hlsManifestKey: string | null;
    posterFrameKey: string | null;
    streamPlaybackId: string | null;
    playbackUrl: string | null;
    thumbnailUrl: string | null;
    viewsCount: number;
    echoCount: number;
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
    /** Omit or empty to auto-generate caption via AI (server). */
    body?: string;
};
export type CreateClipResponse = {
    post: PostRow;
    clip: ClipRow;
};
export type UploadClipVideoParams = {
    identityId: string;
    clipId: string;
    file: File;
};
export type UploadClipVideoResponse = {
    clip: ClipRow;
    playbackUrl: string;
    thumbnailUrl: string | null;
    streamPlaybackId: string;
    readyToStream: boolean;
};
export type RecordClipViewResponse = {
    viewsCount: number;
};
//# sourceMappingURL=types.d.ts.map