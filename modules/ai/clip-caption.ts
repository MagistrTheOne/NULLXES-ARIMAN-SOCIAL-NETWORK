import OpenAI from "openai";
import { z } from "@/lib/security/validation";

const clipMetaSchema = z
  .object({
    caption: z.string().min(1).max(8000),
    summary: z.string().max(2000).optional(),
  })
  .strict();

/**
 * When the user creates a clip without a caption, generate feed copy + optional short summary.
 */
export async function generateClipCaptionAndSummary(args: {
  displayName: string;
  handle: string;
}): Promise<{ body: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write short social clip captions. Output JSON only: {\"caption\":\"...\",\"summary\":\"...\"}. " +
          "caption: punchy line for the feed (no hashtags unless essential). summary: optional one sentence about vibe/topic; can be empty string.",
      },
      {
        role: "user",
        content: `Author @${args.handle} (${args.displayName}). No user caption was provided — invent a neutral caption suitable for a short video slot.`,
      },
    ],
    temperature: 0.7,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("OPENAI_EMPTY_RESPONSE");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("AI_INVALID_JSON");
  }
  const parsed = clipMetaSchema.safeParse(json);
  if (!parsed.success) throw new Error("AI_INVALID_JSON");

  let body = parsed.data.caption.trim();
  const sum = parsed.data.summary?.trim();
  if (sum) {
    body = `${body}\n\n—\n${sum}`;
  }
  return { body };
}
