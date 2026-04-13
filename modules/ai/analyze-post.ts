import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { identities, posts } from "@/lib/db/schema";
import { z } from "@/lib/security/validation";

const explainSchema = z
  .object({
    explanation: z.string().min(1).max(8000),
  })
  .strict();

export async function analyzePostForUser(_userId: string, postId: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const row = await db
    .select({
      body: posts.body,
      postKind: posts.postKind,
      handle: identities.handle,
      displayName: identities.displayName,
    })
    .from(posts)
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(eq(posts.id, postId))
    .limit(1);

  const p = row[0];
  if (!p) throw new Error("POST_NOT_FOUND");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Analyst for NULLXES ARIMAN. Explain the given post clearly: intent, tone, key claims, and anything notable. " +
          'Output JSON only: {"explanation":"..."}',
      },
      {
        role: "user",
        content: JSON.stringify({
          author: `@${p.handle} (${p.displayName})`,
          kind: p.postKind,
          body: p.body,
        }),
      },
    ],
    temperature: 0.4,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("OPENAI_EMPTY_RESPONSE");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("AI_INVALID_JSON");
  }
  const parsed = explainSchema.safeParse(json);
  if (!parsed.success) throw new Error("AI_INVALID_JSON");
  return parsed.data.explanation;
}
