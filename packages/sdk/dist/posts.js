import { apiJson } from "./http.js";
export async function getMe(config) {
    return apiJson(config, "/api/users/me", { method: "GET" });
}
export async function getFeed(config, params) {
    const sp = new URLSearchParams({ identityId: params.identityId });
    if (params.limit != null)
        sp.set("limit", String(params.limit));
    return apiJson(config, `/api/posts?${sp.toString()}`, {
        method: "GET",
    });
}
export async function createPost(config, body) {
    return apiJson(config, "/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
//# sourceMappingURL=posts.js.map