import { apiJson } from "./http.js";
export async function analyzePost(config, postId) {
    return apiJson(config, "/api/ai/analyze-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
    });
}
//# sourceMappingURL=ai-post.js.map