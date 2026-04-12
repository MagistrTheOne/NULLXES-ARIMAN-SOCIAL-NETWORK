import { apiJson } from "./http.js";
export async function listConversations(config) {
    return apiJson(config, "/api/conversations", { method: "GET" });
}
export async function getConversation(config, conversationId) {
    return apiJson(config, `/api/conversations/${encodeURIComponent(conversationId)}`, { method: "GET" });
}
//# sourceMappingURL=conversations.js.map