import { apiJson } from "./http.js";
export async function sendMessage(config, body) {
    return apiJson(config, "/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
export async function sendAiChat(config, body) {
    return apiJson(config, "/api/ai/chat", {
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
export async function patchMessage(config, messageId, body) {
    return apiJson(config, `/api/messages/${encodeURIComponent(messageId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
export async function deleteMessage(config, messageId) {
    return apiJson(config, `/api/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
    });
}
export async function sendVoiceMessage(config, args) {
    const fd = new FormData();
    fd.set("conversationId", args.conversationId);
    fd.set("file", args.file, "voice.webm");
    return apiJson(config, "/api/messages/voice", {
        method: "POST",
        body: fd,
    });
}
//# sourceMappingURL=messaging.js.map