import { apiJson } from "./http.js";
import type { ArimanSdkConfig, CommunityDetailResponse } from "./types.js";

export type GetCommunityParams = {
  identityId?: string;
};

export async function getCommunity(
  config: ArimanSdkConfig | undefined,
  slug: string,
  params?: GetCommunityParams,
): Promise<CommunityDetailResponse> {
  const sp = new URLSearchParams();
  if (params?.identityId) sp.set("identityId", params.identityId);
  const q = sp.toString();
  return apiJson<CommunityDetailResponse>(
    config,
    `/api/communities/${encodeURIComponent(slug)}${q ? `?${q}` : ""}`,
    { method: "GET" },
  );
}

export async function joinCommunity(
  config: ArimanSdkConfig | undefined,
  slug: string,
): Promise<{ ok: boolean; joined: boolean }> {
  return apiJson<{ ok: boolean; joined: boolean }>(
    config,
    `/api/communities/${encodeURIComponent(slug)}/join`,
    { method: "POST" },
  );
}
