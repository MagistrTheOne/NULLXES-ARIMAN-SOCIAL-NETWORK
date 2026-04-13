import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { parseBody, z } from "@/lib/security/validation";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { analyzePostForUser } from "@/modules/ai/analyze-post";

export const runtime = "nodejs";

const bodySchema = z.object({ postId: z.uuid() }).strict();

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const ip = clientIp(request);
  const rl = rateLimitSync(`ai:analyze-post:${userId}:${ip}`, 40);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return withApiSecurityHeaders(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }

  const parsed = parseBody(bodySchema, json);
  if (!parsed.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: parsed.error, issues: parsed.issues }, { status: 400 }),
    );
  }

  try {
    const explanation = await analyzePostForUser(userId, parsed.data.postId);
    return withApiSecurityHeaders(NextResponse.json({ explanation }));
  } catch (e) {
    if (e instanceof Error && e.message === "POST_NOT_FOUND") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
    }
    if (e instanceof Error && e.message === "OPENAI_API_KEY_MISSING") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Server is not configured for AI (OPENAI_API_KEY)." }, { status: 503 }),
      );
    }
    if (e instanceof Error && e.message === "OPENAI_EMPTY_RESPONSE") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Model returned no text" }, { status: 502 }),
      );
    }
    if (e instanceof Error && e.message === "AI_INVALID_JSON") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 }),
      );
    }
    console.error("[ai/analyze-post]", e);
    return withApiSecurityHeaders(
      NextResponse.json({ error: e instanceof Error ? e.message : "Analysis failed" }, { status: 502 }),
    );
  }
}
