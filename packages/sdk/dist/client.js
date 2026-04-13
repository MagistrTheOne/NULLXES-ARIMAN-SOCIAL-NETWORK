import { createClip, getClips, recordClipView, uploadClipVideo } from "./clips.js";
import { getConversation, listConversations } from "./conversations.js";
import { getMessages, listConversationSummaries, markConversationRead, sendMessage, } from "./messaging.js";
import { createPost, getFeed, getMe, getPosts, patchMe } from "./posts.js";
import { getCommunity, joinCommunity } from "./communities.js";
import { createComment, getActivity, listPostComments, toggleEcho, toggleSave, } from "./post-social.js";
import { searchUsers } from "./users-search.js";
/** Browser-friendly default: same-origin relative `/api/*`. */
export function defaultSdkBaseUrl() {
    if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }
    return "";
}
export function createArimanSdk(config = {}) {
    const c = {
        baseUrl: config.baseUrl ?? defaultSdkBaseUrl(),
    };
    return {
        getMe: () => getMe(c),
        getFeed: (params) => getFeed(c, params),
        getPosts: (params) => getPosts(c, params),
        patchMe: (body) => patchMe(c, body),
        createPost: (body) => createPost(c, body),
        getCommunity: (slug, params) => getCommunity(c, slug, params),
        listPostComments: (postId, limit) => listPostComments(c, postId, limit),
        createComment: (postId, body) => createComment(c, postId, body),
        toggleEcho: (postId, identityId) => toggleEcho(c, postId, identityId),
        toggleSave: (postId, identityId) => toggleSave(c, postId, identityId),
        getActivity: (params) => getActivity(c, params),
        joinCommunity: (slug) => joinCommunity(c, slug),
        sendMessage: (body) => sendMessage(c, body),
        getMessages: (params) => getMessages(c, params),
        listConversationSummaries: () => listConversationSummaries(c),
        markConversationRead: (conversationId) => markConversationRead(c, conversationId),
        listConversations: () => listConversations(c),
        searchUsers: (params) => searchUsers(c, params),
        getConversation: (conversationId) => getConversation(c, conversationId),
        getClips: (params) => getClips(c, params),
        createClip: (body) => createClip(c, body),
        uploadClipVideo: (params) => uploadClipVideo(c, params),
        recordClipView: (clipId) => recordClipView(c, clipId),
    };
}
//# sourceMappingURL=client.js.map