import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { parseBody } from "@/lib/security/validation";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { createCommentBodySchema } from "@/modules/post-interactions/schemas";
import { assertPostExists, createCommentOnPost, listCommentsForPost } from "@/modules/post-interactions/service";

export const runtime = "nodejs";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const ip = clientIp(request);
  const rl = rateLimitSync(`posts:comments:get:${ip}`, 120);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  const { id: postId } = await ctx.params;
  if (!(await assertPostExists(postId))) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50") || 50));
  const rows = await listCommentsForPost(postId, limit);
  return withApiSecurityHeaders(NextResponse.json({ comments: rows }));
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  const ip = clientIp(request);
  const rl = rateLimitSync(`posts:comments:post:${userId}:${ip}`, 60);
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
  const parsed = parseBody(createCommentBodySchema, json);
  if (!parsed.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: parsed.error, issues: parsed.issues }, { status: 400 }),
    );
  }

  try {
    const row = await createCommentOnPost(userId, postId, parsed.data.identityId, parsed.data.body);
    return withApiSecurityHeaders(NextResponse.json({ comment: row }, { status: 201 }));
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
