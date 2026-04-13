import { apiJson } from "./http.js";
export async function listMentionCandidates(config, params) {
    const sp = new URLSearchParams();
    if (params?.q != null)
        sp.set("q", params.q);
    if (params?.limit != null)
        sp.set("limit", String(params.limit));
    const qs = sp.toString();
    const path = qs ? `/api/mentions?${qs}` : "/api/mentions";
    return apiJson(config, path, { method: "GET" });
}
//# sourceMappingURL=mention-candidates.js.map