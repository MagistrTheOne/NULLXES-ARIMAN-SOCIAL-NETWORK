import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { parseBody } from "@/lib/security/validation";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { createMessageBodySchema, listMessagesQuerySchema } from "@/modules/messages/schemas";
import { createMessage, listMessages } from "@/modules/messages/service";

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
  const rl = rateLimitSync(`messages:get:${ip}`, 120);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { searchParams } = new URL(request.url);
  const q = listMessagesQuerySchema.safeParse({
    conversationId: searchParams.get("conversationId"),
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!q.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid query", issues: q.error.issues }, { status: 400 }),
    );
  }

  try {
    const rows = await listMessages(userId, q.data.conversationId, q.data.limit);
    return withApiSecurityHeaders(NextResponse.json({ messages: rows }));
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_MEMBER") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    throw e;
  }
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const rl = rateLimitSync(`messages:post:${userId}:${ip}`, 120);
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

  const parsed = parseBody(createMessageBodySchema, json);
  if (!parsed.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: parsed.error, issues: parsed.issues }, { status: 400 }),
    );
  }

  try {
    const out = await createMessage(userId, parsed.data);
    return withApiSecurityHeaders(NextResponse.json(out, { status: 201 }));
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_MEMBER") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && e.message === "INVALID_PEER") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Invalid peer user" }, { status: 400 }),
      );
    }
    throw e;
  }
}
