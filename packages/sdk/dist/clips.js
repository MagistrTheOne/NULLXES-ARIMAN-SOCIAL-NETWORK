import { apiJson } from "./http.js";
export async function getClips(config, params) {
    const sp = new URLSearchParams({ identityId: params.identityId });
    if (params.limit != null)
        sp.set("limit", String(params.limit));
    return apiJson(config, `/api/clips?${sp.toString()}`, { method: "GET" });
}
export async function createClip(config, body) {
    return apiJson(config, "/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
//# sourceMappingURL=clips.js.map