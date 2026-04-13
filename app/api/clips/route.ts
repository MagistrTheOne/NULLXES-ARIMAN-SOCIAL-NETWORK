import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { parseBody } from "@/lib/security/validation";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { z } from "@/lib/security/validation";
import { createClipStub, listClipsForIdentity } from "@/modules/clips/service";

export const runtime = "nodejs";

const listQuerySchema = z.object({
  identityId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const createBodySchema = z.object({
  identityId: z.uuid(),
  /** Empty string triggers AI-generated caption (requires OPENAI_API_KEY). */
  body: z.string().max(8000).optional().default(""),
});

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimitSync(`clips:get:${ip}`, 120);
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
  const q = listQuerySchema.safeParse({
    identityId: searchParams.get("identityId"),
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!q.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid query", issues: q.error.issues }, { status: 400 }),
    );
  }

  try {
    const rows = await listClipsForIdentity(userId, q.data.identityId, q.data.limit);
    return withApiSecurityHeaders(NextResponse.json({ clips: rows }));
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN_IDENTITY") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    throw e;
  }
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const ip = clientIp(request);
  const rl = rateLimitSync(`clips:post:${userId}:${ip}`, 30);
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

  const parsed = parseBody(createBodySchema, json);
  if (!parsed.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: parsed.error, issues: parsed.issues }, { status: 400 }),
    );
  }

  try {
    const out = await createClipStub(userId, parsed.data.identityId, parsed.data.body);
    return withApiSecurityHeaders(NextResponse.json(out, { status: 201 }));
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN_IDENTITY") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && e.message === "OPENAI_API_KEY_MISSING") {
      return withApiSecurityHeaders(
        NextResponse.json(
          { error: "Caption generation requires OPENAI_API_KEY or provide a non-empty caption." },
          { status: 503 },
        ),
      );
    }
    if (e instanceof Error && e.message === "OPENAI_EMPTY_RESPONSE") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Caption generation failed (empty model response)" }, { status: 502 }),
      );
    }
    if (e instanceof Error && e.message === "AI_INVALID_JSON") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Caption generation failed (invalid model JSON)" }, { status: 502 }),
      );
    }
    throw e;
  }
}
