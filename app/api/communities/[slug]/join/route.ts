import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { getCommunityBySlug, joinCommunity } from "@/modules/communities/service";

export const runtime = "nodejs";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const ip = clientIp(_request);
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const rl = rateLimitSync(`communities:join:${userId}:${ip}`, 30);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  const { slug } = await ctx.params;
  const community = await getCommunityBySlug(slug);
  if (!community) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }

  try {
    const out = await joinCommunity(userId, community.id);
    return withApiSecurityHeaders(NextResponse.json(out));
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
    }
    throw e;
  }
}
