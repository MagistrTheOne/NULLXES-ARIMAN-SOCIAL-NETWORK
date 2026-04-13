import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { parseBody, z } from "@/lib/security/validation";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { softDeleteMessage, updatePlaintextMessageBody } from "@/modules/messages/service";

export const runtime = "nodejs";

const patchBodySchema = z
  .object({
    body: z.string().min(1).max(16000),
  })
  .strict();

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const ip = clientIp(request);
  const rl = rateLimitSync(`messages:patch:${userId}:${ip}`, 120);
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return withApiSecurityHeaders(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }

  const parsed = parseBody(patchBodySchema, json);
  if (!parsed.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: parsed.error, issues: parsed.issues }, { status: 400 }),
    );
  }

  try {
    const message = await updatePlaintextMessageBody(userId, idParsed.data, parsed.data.body);
    return withApiSecurityHeaders(NextResponse.json({ message }));
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
    }
    if (e instanceof Error && e.message === "NOT_MEMBER") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && (e.message === "NOT_PLAINTEXT" || e.message === "NOT_EDITABLE")) {
      return withApiSecurityHeaders(NextResponse.json({ error: "Cannot edit this message" }, { status: 400 }));
    }
    if (e instanceof Error && e.message === "DELETED") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Message was deleted" }, { status: 400 }));
    }
    throw e;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const ip = clientIp(_request);
  const rl = rateLimitSync(`messages:delete:${userId}:${ip}`, 120);
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
    const message = await softDeleteMessage(userId, idParsed.data);
    return withApiSecurityHeaders(NextResponse.json({ message }));
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
    }
    if (e instanceof Error && e.message === "NOT_MEMBER") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && e.message === "NOT_PLAINTEXT") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Cannot delete this message" }, { status: 400 }));
    }
    if (e instanceof Error && e.message === "ALREADY_DELETED") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Already deleted" }, { status: 400 }));
    }
    throw e;
  }
}
