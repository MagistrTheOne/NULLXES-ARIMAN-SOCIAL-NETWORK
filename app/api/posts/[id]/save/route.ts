import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { parseBody } from "@/lib/security/validation";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { identityActionBodySchema } from "@/modules/post-interactions/schemas";
import { toggleSave } from "@/modules/post-interactions/service";

export const runtime = "nodejs";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  const ip = clientIp(request);
  const rl = rateLimitSync(`posts:save:${userId}:${ip}`, 120);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  const { id: postId } = await ctx.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return withApiSecurityHeaders(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }
  const parsed = parseBody(identityActionBodySchema, json);
  if (!parsed.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: parsed.error, issues: parsed.issues }, { status: 400 }),
    );
  }

  try {
    const out = await toggleSave(userId, postId, parsed.data.identityId);
    return withApiSecurityHeaders(NextResponse.json(out));
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN_IDENTITY") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
    }
    if (e instanceof Error && e.message === "INTERACTIONS_SCHEMA_MISSING") {
      return withApiSecurityHeaders(
        NextResponse.json(
          { error: "Database migration required: run npm run db:push" },
          { status: 503 },
        ),
      );
    }
    throw e;
  }
}
