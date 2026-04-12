import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { listConversationsForUser } from "@/modules/messages/service";

export const runtime = "nodejs";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimitSync(`conversations:get:${ip}`, 120);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const rows = await listConversationsForUser(userId);
  return withApiSecurityHeaders(NextResponse.json({ conversations: rows }));
}
