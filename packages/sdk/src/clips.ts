import { apiJson, ArimanHttpError } from "./http.js";
import type {
  ArimanSdkConfig,
  CreateClipBody,
  CreateClipResponse,
  GetClipsParams,
  GetClipsResponse,
  RecordClipViewResponse,
  UploadClipVideoParams,
  UploadClipVideoResponse,
} from "./types.js";

function joinUrl(baseUrl: string, path: string) {
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getClips(
  config: ArimanSdkConfig | undefined,
  params: GetClipsParams,
): Promise<GetClipsResponse> {
  const sp = new URLSearchParams({ identityId: params.identityId });
  if (params.limit != null) sp.set("limit", String(params.limit));
  return apiJson<GetClipsResponse>(config, `/api/clips?${sp.toString()}`, { method: "GET" });
}

export async function createClip(
  config: ArimanSdkConfig | undefined,
  body: CreateClipBody,
): Promise<CreateClipResponse> {
  return apiJson<CreateClipResponse>(config, "/api/clips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function uploadClipVideo(
  config: ArimanSdkConfig | undefined,
  params: UploadClipVideoParams,
): Promise<UploadClipVideoResponse> {
  const baseUrl = config?.baseUrl ?? "";
  const url = joinUrl(baseUrl, "/api/clips/upload");
  const form = new FormData();
  form.append("identityId", params.identityId);
  form.append("clipId", params.clipId);
  form.append("file", params.file);
  const res = await fetch(url, { method: "POST", body: form, credentials: "include" });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ArimanHttpError(res.status, `Invalid JSON (${res.status})`, text);
  }
  if (!res.ok) {
    const err = json as { error?: string } | null;
    const msg = err && typeof err.error === "string" ? err.error : `HTTP ${res.status}`;
    throw new ArimanHttpError(res.status, msg, json);
  }
  return json as UploadClipVideoResponse;
}

export async function recordClipView(
  config: ArimanSdkConfig | undefined,
  clipId: string,
): Promise<RecordClipViewResponse> {
  return apiJson<RecordClipViewResponse>(config, `/api/clips/${clipId}/view`, { method: "POST" });
}
