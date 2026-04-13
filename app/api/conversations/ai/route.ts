import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { parseBody, z } from "@/lib/security/validation";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { findOrCreateAiConversation } from "@/modules/conversations/ai";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    aiAgentId: z.uuid(),
  })
  .strict();

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
  const rl = rateLimitSync(`conversations:ai:post:${userId}:${ip}`, 60);
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
    const conversationId = await findOrCreateAiConversation(userId, parsed.data.aiAgentId);
    return withApiSecurityHeaders(NextResponse.json({ conversationId }, { status: 201 }));
  } catch (e) {
    if (e instanceof Error && e.message === "AI_AGENT_NOT_FOUND") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Unknown agent" }, { status: 404 }));
    }
    throw e;
  }
}
