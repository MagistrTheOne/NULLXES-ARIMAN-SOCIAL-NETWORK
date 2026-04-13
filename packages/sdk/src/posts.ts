import { apiJson } from "./http.js";
import type {
  ArimanSdkConfig,
  CreatePostBody,
  CreatePostResponse,
  GetPostsResponse,
  MeResponse,
  PatchMeBody,
  PatchMeResponse,
  PatchPostBody,
  ProfileStatsResponse,
} from "./types.js";

export async function getMe(config: ArimanSdkConfig | undefined): Promise<MeResponse> {
  return apiJson<MeResponse>(config, "/api/users/me", { method: "GET" });
}

export async function patchMe(
  config: ArimanSdkConfig | undefined,
  body: PatchMeBody,
): Promise<PatchMeResponse> {
  return apiJson<PatchMeResponse>(config, "/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type GetFeedParams = {
  identityId: string;
  limit?: number;
};

export async function getFeed(
  config: ArimanSdkConfig | undefined,
  params: GetFeedParams,
): Promise<GetPostsResponse> {
  const sp = new URLSearchParams({ identityId: params.identityId });
  if (params.limit != null) sp.set("limit", String(params.limit));
  return apiJson<GetPostsResponse>(config, `/api/posts?${sp.toString()}`, {
    method: "GET",
  });
}

/** Alias for {@link getFeed} — list posts for an identity you own. */
export const getPosts = getFeed;

export async function createPost(
  config: ArimanSdkConfig | undefined,
  body: CreatePostBody,
): Promise<CreatePostResponse> {
  return apiJson<CreatePostResponse>(config, "/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type GetProfileStatsParams = {
  identityId: string;
};

export async function getProfileStats(
  config: ArimanSdkConfig | undefined,
  params: GetProfileStatsParams,
): Promise<ProfileStatsResponse> {
  const sp = new URLSearchParams({ identityId: params.identityId });
  return apiJson<ProfileStatsResponse>(config, `/api/users/me/stats?${sp.toString()}`, {
    method: "GET",
  });
}

export async function patchPost(
  config: ArimanSdkConfig | undefined,
  postId: string,
  body: PatchPostBody,
): Promise<{ ok: boolean }> {
  return apiJson<{ ok: boolean }>(config, `/api/posts/${encodeURIComponent(postId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deletePost(
  config: ArimanSdkConfig | undefined,
  postId: string,
): Promise<{ ok: boolean }> {
  return apiJson<{ ok: boolean }>(config, `/api/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  });
}
