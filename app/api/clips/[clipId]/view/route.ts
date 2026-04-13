import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { incrementClipViewCountForViewer } from "@/modules/clips/service";

export const runtime = "nodejs";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: Request, ctx: { params: Promise<{ clipId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { clipId } = await ctx.params;
  const ip = clientIp(request);
  const rl = rateLimitSync(`clips:view:${userId}:${ip}`, 600);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  try {
    const viewsCount = await incrementClipViewCountForViewer(userId, clipId);
    return withApiSecurityHeaders(NextResponse.json({ viewsCount }));
  } catch (e) {
    if (e instanceof Error && e.message === "CLIP_NOT_FOUND") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
    }
    throw e;
  }
}
