import { apiJson } from "./http.js";
export async function searchUsers(config, params) {
    const sp = new URLSearchParams({ search: params.search });
    if (params.limit != null)
        sp.set("limit", String(params.limit));
    return apiJson(config, `/api/users?${sp.toString()}`, { method: "GET" });
}
//# sourceMappingURL=users-search.js.map