import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { z } from "@/lib/security/validation";
import { createVoiceMessageFromUpload } from "@/modules/messages/voice";
import { getMessageDetailById } from "@/modules/messages/service";

export const runtime = "nodejs";

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
  const rl = rateLimitSync(`messages:voice:${userId}:${ip}`, 40);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return withApiSecurityHeaders(NextResponse.json({ error: "Invalid form data" }, { status: 400 }));
  }

  const conversationIdRaw = form.get("conversationId");
  const file = form.get("file");

  const ids = z.object({ conversationId: z.uuid() }).safeParse({
    conversationId: typeof conversationIdRaw === "string" ? conversationIdRaw : "",
  });
  if (!ids.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid conversationId", issues: ids.error.issues }, { status: 400 }),
    );
  }

  if (!(file instanceof Blob) || file.size === 0) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Missing file" }, { status: 400 }));
  }

  try {
    const { conversationId, message } = await createVoiceMessageFromUpload({
      userId,
      conversationId: ids.data.conversationId,
      file,
    });
    const detail = await getMessageDetailById(userId, message.id);
    return withApiSecurityHeaders(
      NextResponse.json({ conversationId, message: detail }, { status: 201 }),
    );
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_MEMBER") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && e.message === "OPENAI_API_KEY_MISSING") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Server is not configured for AI (OPENAI_API_KEY)." }, { status: 503 }),
      );
    }
    if (e instanceof Error && (e.message === "EMPTY_AUDIO" || e.message === "WHISPER_EMPTY")) {
      return withApiSecurityHeaders(NextResponse.json({ error: "No speech detected" }, { status: 400 }));
    }
    if (e instanceof Error && e.message === "VOICE_TOO_LARGE") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Audio too large" }, { status: 413 }));
    }
    console.error("[messages/voice]", e);
    return withApiSecurityHeaders(
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Voice message failed" },
        { status: 502 },
      ),
    );
  }
}
