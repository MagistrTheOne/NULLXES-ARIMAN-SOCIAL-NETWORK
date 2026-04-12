import { apiJson } from "./http.js";
import type {
  ArimanSdkConfig,
  CreatePostBody,
  CreatePostResponse,
  GetPostsResponse,
  MeResponse,
} from "./types.js";

export async function getMe(config: ArimanSdkConfig | undefined): Promise<MeResponse> {
  return apiJson<MeResponse>(config, "/api/users/me", { method: "GET" });
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
