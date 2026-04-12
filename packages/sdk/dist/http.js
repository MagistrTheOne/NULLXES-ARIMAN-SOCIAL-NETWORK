function joinUrl(baseUrl, path) {
    if (!baseUrl)
        return path;
    return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
export class ArimanHttpError extends Error {
    status;
    body;
    constructor(status, message, body) {
        super(message);
        this.name = "ArimanHttpError";
        this.status = status;
        this.body = body;
    }
}
export async function apiJson(config, path, init) {
    const baseUrl = config?.baseUrl ?? "";
    const url = joinUrl(baseUrl, path);
    const res = await fetch(url, {
        ...init,
        credentials: "include",
        headers: {
            Accept: "application/json",
            ...(init?.headers ?? {}),
        },
    });
    const text = await res.text();
    let json;
    try {
        json = text ? JSON.parse(text) : null;
    }
    catch {
        throw new ArimanHttpError(res.status, `Invalid JSON (${res.status}) from ${url}: ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
        const err = json;
        const msg = err && typeof err.error === "string" ? err.error : `HTTP ${res.status}`;
        throw new ArimanHttpError(res.status, msg, json);
    }
    return json;
}
//# sourceMappingURL=http.js.map