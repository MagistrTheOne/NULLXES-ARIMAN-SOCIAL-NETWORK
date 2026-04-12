import { apiJson } from "./http.js";
import type {
  ArimanSdkConfig,
  CreateClipBody,
  CreateClipResponse,
  GetClipsParams,
  GetClipsResponse,
} from "./types.js";

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
