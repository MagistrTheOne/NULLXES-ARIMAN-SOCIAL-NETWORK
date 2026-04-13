import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { z } from "@/lib/security/validation";
import { getVoiceMessageAudioPayload } from "@/modules/messages/service";

export const runtime = "nodejs";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const ip = clientIp(request);
  const rl = rateLimitSync(`messages:audio:get:${userId}:${ip}`, 120);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  const { id } = await context.params;
  const idParsed = z.uuid().safeParse(id);
  if (!idParsed.success) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Invalid message id" }, { status: 400 }));
  }

  try {
    const { mimeType, buffer } = await getVoiceMessageAudioPayload(userId, idParsed.data);
    const res = new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
    return withApiSecurityHeaders(res);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
    }
    if (e instanceof Error && e.message === "NOT_MEMBER") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && e.message === "NOT_VOICE") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Not a voice message" }, { status: 404 }));
    }
    throw e;
  }
}
