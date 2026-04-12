import type { ArimanSdkConfig } from "./types.js";

function joinUrl(baseUrl: string, path: string) {
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiJson<T>(
  config: ArimanSdkConfig | undefined,
  path: string,
  init?: RequestInit,
): Promise<T> {
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
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid JSON (${res.status}) from ${url}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = json as { error?: string } | null;
    const msg = err && typeof err.error === "string" ? err.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}
