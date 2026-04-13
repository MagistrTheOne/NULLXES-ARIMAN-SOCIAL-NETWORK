import { z } from "@/lib/security/validation";

export const aiAssistantJsonSchema = z
  .object({
    type: z.enum(["text", "create_post"]),
    content: z.string(),
    memorySummary: z.string().min(1).max(2000),
  })
  .strict();

export type AiAssistantJson = z.infer<typeof aiAssistantJsonSchema>;

export const JSON_OUTPUT_INSTRUCTION = `You must output exactly one JSON object (no markdown fences, no prose outside JSON) with this shape:
{"type":"text"|"create_post","content":"<string>","memorySummary":"<one sentence summarizing this turn for memory>"}
Rules:
- type "text": content is your reply visible in chat.
- type "create_post": content is the full post body to publish to the user's feed when they want a public post drafted from this conversation.
- memorySummary: factual, short note about what happened (not a reply to the user).`;

export function stripMarkdownJsonFence(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("```")) {
    return t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
  }
  return t;
}

export function parseAiAssistantJson(raw: string): AiAssistantJson {
  const cleaned = stripMarkdownJsonFence(raw);
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error("AI_INVALID_JSON");
  }
  const parsed = aiAssistantJsonSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("AI_INVALID_JSON");
  }
  return parsed.data;
}
