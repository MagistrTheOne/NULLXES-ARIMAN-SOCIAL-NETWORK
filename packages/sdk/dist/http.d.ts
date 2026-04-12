import type { ArimanSdkConfig } from "./types.js";
export declare class ArimanHttpError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(status: number, message: string, body?: unknown);
}
export declare function apiJson<T>(config: ArimanSdkConfig | undefined, path: string, init?: RequestInit): Promise<T>;
//# sourceMappingURL=http.d.ts.map