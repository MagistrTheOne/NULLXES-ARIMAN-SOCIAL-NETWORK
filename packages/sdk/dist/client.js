import { createClip, getClips } from "./clips.js";
import { getConversation, listConversations } from "./conversations.js";
import { getMessages, sendMessage } from "./messaging.js";
import { createPost, getFeed, getMe } from "./posts.js";
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
        createPost: (body) => createPost(c, body),
        sendMessage: (body) => sendMessage(c, body),
        getMessages: (params) => getMessages(c, params),
        listConversations: () => listConversations(c),
        getConversation: (conversationId) => getConversation(c, conversationId),
        getClips: (params) => getClips(c, params),
        createClip: (body) => createClip(c, body),
    };
}
//# sourceMappingURL=client.js.map