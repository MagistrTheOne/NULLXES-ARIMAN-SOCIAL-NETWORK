import { apiJson } from "./http.js";
import type {
  ArimanSdkConfig,
  CreateCommentBody,
  GetActivityResponse,
  ListCommentsResponse,
  PostInteractionState,
} from "./types.js";

export async function listPostComments(
  config: ArimanSdkConfig | undefined,
  postId: string,
  limit?: number,
): Promise<ListCommentsResponse> {
  const sp = new URLSearchParams();
  if (limit != null) sp.set("limit", String(limit));
  const q = sp.toString();
  return apiJson<ListCommentsResponse>(
    config,
    `/api/posts/${encodeURIComponent(postId)}/comments${q ? `?${q}` : ""}`,
    { method: "GET" },
  );
}

export async function createComment(
  config: ArimanSdkConfig | undefined,
  postId: string,
  body: CreateCommentBody,
): Promise<{ comment: { id: string; postId: string; authorIdentityId: string; body: string; createdAt: string } }> {
  return apiJson(config, `/api/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function toggleEcho(
  config: ArimanSdkConfig | undefined,
  postId: string,
  identityId: string,
): Promise<PostInteractionState> {
  return apiJson<PostInteractionState>(config, `/api/posts/${encodeURIComponent(postId)}/echo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identityId }),
  });
}

export async function toggleSave(
  config: ArimanSdkConfig | undefined,
  postId: string,
  identityId: string,
): Promise<PostInteractionState> {
  return apiJson<PostInteractionState>(config, `/api/posts/${encodeURIComponent(postId)}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identityId }),
  });
}

export type GetActivityParams = {
  identityId: string;
  limit?: number;
};

export async function getActivity(
  config: ArimanSdkConfig | undefined,
  params: GetActivityParams,
): Promise<GetActivityResponse> {
  const sp = new URLSearchParams({ identityId: params.identityId });
  if (params.limit != null) sp.set("limit", String(params.limit));
  return apiJson<GetActivityResponse>(config, `/api/activity?${sp.toString()}`, { method: "GET" });
}
