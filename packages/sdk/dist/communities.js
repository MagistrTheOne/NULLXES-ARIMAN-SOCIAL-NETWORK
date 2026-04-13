import { apiJson } from "./http.js";
export async function getCommunity(config, slug, params) {
    const sp = new URLSearchParams();
    if (params?.identityId)
        sp.set("identityId", params.identityId);
    const q = sp.toString();
    return apiJson(config, `/api/communities/${encodeURIComponent(slug)}${q ? `?${q}` : ""}`, { method: "GET" });
}
export async function joinCommunity(config, slug) {
    return apiJson(config, `/api/communities/${encodeURIComponent(slug)}/join`, { method: "POST" });
}
//# sourceMappingURL=communities.js.map