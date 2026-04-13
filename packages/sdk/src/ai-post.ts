import { apiJson } from "./http.js";
import type { ArimanSdkConfig } from "./types.js";

export async function analyzePost(
  config: ArimanSdkConfig | undefined,
  postId: string,
): Promise<{ explanation: string }> {
  return apiJson<{ explanation: string }>(config, "/api/ai/analyze-post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId }),
  });
}
