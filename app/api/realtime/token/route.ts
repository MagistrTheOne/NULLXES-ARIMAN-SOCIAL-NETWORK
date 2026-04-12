import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { signRealtimeSubscribeToken } from "@/lib/realtime/subscribe-token";
import { z } from "@/lib/security/validation";

export const runtime = "nodejs";

const bodySchema = z.object({
  rooms: z.array(z.string().min(1).max(128)).min(1).max(20),
  ttlSeconds: z.coerce.number().int().min(30).max(900).optional().default(300),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const rl = rateLimitSync(`rt:token:${userId}`, 30);
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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 }),
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const token = signRealtimeSubscribeToken({
    sub: userId,
    rooms: parsed.data.rooms,
    iat: now,
    exp: now + parsed.data.ttlSeconds,
  });

  return withApiSecurityHeaders(NextResponse.json({ token, exp: now + parsed.data.ttlSeconds }));
}
