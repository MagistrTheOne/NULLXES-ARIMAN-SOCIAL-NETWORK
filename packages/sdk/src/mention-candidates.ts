import { apiJson } from "./http.js";
import type { ArimanSdkConfig, MentionCandidatesResponse } from "./types.js";

export type ListMentionCandidatesParams = {
  q?: string;
  limit?: number;
};

export async function listMentionCandidates(
  config: ArimanSdkConfig | undefined,
  params?: ListMentionCandidatesParams,
): Promise<MentionCandidatesResponse> {
  const sp = new URLSearchParams();
  if (params?.q != null) sp.set("q", params.q);
  if (params?.limit != null) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const path = qs ? `/api/mentions?${qs}` : "/api/mentions";
  return apiJson<MentionCandidatesResponse>(config, path, { method: "GET" });
}
