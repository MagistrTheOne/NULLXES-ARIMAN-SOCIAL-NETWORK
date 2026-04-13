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
//# sourceMappingURL=posts.js.map