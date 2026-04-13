import { apiJson, ArimanHttpError } from "./http.js";
function joinUrl(baseUrl, path) {
    if (!baseUrl)
        return path;
    return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
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
        body: JSON.stringify({
            identityId: body.identityId,
            body: body.body ?? "",
        }),
    });
}
export async function uploadClipVideo(config, params) {
    const baseUrl = config?.baseUrl ?? "";
    const url = joinUrl(baseUrl, "/api/clips/upload");
    const form = new FormData();
    form.append("identityId", params.identityId);
    form.append("clipId", params.clipId);
    form.append("file", params.file);
    const res = await fetch(url, { method: "POST", body: form, credentials: "include" });
    const text = await res.text();
    let json;
    try {
        json = text ? JSON.parse(text) : null;
    }
    catch {
        throw new ArimanHttpError(res.status, `Invalid JSON (${res.status})`, text);
    }
    if (!res.ok) {
        const err = json;
        const msg = err && typeof err.error === "string" ? err.error : `HTTP ${res.status}`;
        throw new ArimanHttpError(res.status, msg, json);
    }
    return json;
}
export async function recordClipView(config, clipId) {
    return apiJson(config, `/api/clips/${clipId}/view`, { method: "POST" });
}
//# sourceMappingURL=clips.js.map