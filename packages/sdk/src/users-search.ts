import { apiJson } from "./http.js";
import type { ArimanSdkConfig, SearchUsersResponse } from "./types.js";

export type SearchUsersParams = {
  search: string;
  limit?: number;
};

export async function searchUsers(
  config: ArimanSdkConfig | undefined,
  params: SearchUsersParams,
): Promise<SearchUsersResponse> {
  const sp = new URLSearchParams({ search: params.search });
  if (params.limit != null) sp.set("limit", String(params.limit));
  return apiJson<SearchUsersResponse>(config, `/api/users?${sp.toString()}`, { method: "GET" });
}
