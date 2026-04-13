import { apiJson } from "./http.js";
export async function listAiAgents(config) {
    return apiJson(config, "/api/ai/agents", { method: "GET" });
}
export async function ensureAiConversation(config, body) {
    return apiJson(config, "/api/conversations/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
//# sourceMappingURL=ai.js.map