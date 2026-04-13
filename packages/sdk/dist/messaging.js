import { apiJson } from "./http.js";
export async function sendMessage(config, body) {
    return apiJson(config, "/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
export async function getMessages(config, params) {
    const sp = new URLSearchParams({ conversationId: params.conversationId });
    if (params.limit != null)
        sp.set("limit", String(params.limit));
    return apiJson(config, `/api/messages?${sp.toString()}`, {
        method: "GET",
    });
}
export async function listConversationSummaries(config) {
    return apiJson(config, "/api/messages?mode=conversations", {
        method: "GET",
    });
}
export async function markConversationRead(config, conversationId) {
    return apiJson(config, `/api/conversations/${encodeURIComponent(conversationId)}/read`, { method: "POST" });
}
//# sourceMappingURL=messaging.js.map