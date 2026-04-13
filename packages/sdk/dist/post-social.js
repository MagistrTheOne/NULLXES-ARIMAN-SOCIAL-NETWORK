import { apiJson } from "./http.js";
export async function listPostComments(config, postId, limit) {
    const sp = new URLSearchParams();
    if (limit != null)
        sp.set("limit", String(limit));
    const q = sp.toString();
    return apiJson(config, `/api/posts/${encodeURIComponent(postId)}/comments${q ? `?${q}` : ""}`, { method: "GET" });
}
export async function createComment(config, postId, body) {
    return apiJson(config, `/api/posts/${encodeURIComponent(postId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
export async function toggleEcho(config, postId, identityId) {
    return apiJson(config, `/api/posts/${encodeURIComponent(postId)}/echo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identityId }),
    });
}
export async function toggleSave(config, postId, identityId) {
    return apiJson(config, `/api/posts/${encodeURIComponent(postId)}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identityId }),
    });
}
export async function getActivity(config, params) {
    const sp = new URLSearchParams({ identityId: params.identityId });
    if (params.limit != null)
        sp.set("limit", String(params.limit));
    return apiJson(config, `/api/activity?${sp.toString()}`, { method: "GET" });
}
//# sourceMappingURL=post-social.js.map