import { apiJson } from "./http.js";
export async function getMe(config) {
    return apiJson(config, "/api/users/me", { method: "GET" });
}
export async function patchMe(config, body) {
    return apiJson(config, "/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
export async function getFeed(config, params) {
    const sp = new URLSearchParams({ identityId: params.identityId });
    if (params.limit != null)
        sp.set("limit", String(params.limit));
    return apiJson(config, `/api/posts?${sp.toString()}`, {
        method: "GET",
    });
}
/** Alias for {@link getFeed} — list posts for an identity you own. */
export const getPosts = getFeed;
export async function createPost(config, body) {
    return apiJson(config, "/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
export async function getProfileStats(config, params) {
    const sp = new URLSearchParams({ identityId: params.identityId });
    return apiJson(config, `/api/users/me/stats?${sp.toString()}`, {
        method: "GET",
    });
}
export async function patchPost(config, postId, body) {
    return apiJson(config, `/api/posts/${encodeURIComponent(postId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
export async function deletePost(config, postId) {
    return apiJson(config, `/api/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE",
    });
}
//# sourceMappingURL=posts.js.map