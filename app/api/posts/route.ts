import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { parseBody } from "@/lib/security/validation";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { createPostBodySchema, listPostsQuerySchema } from "@/modules/posts/schemas";
import { createPost, listPostsForIdentity } from "@/modules/posts/service";

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
  const rl = rateLimitSync(`posts:get:${ip}`, 120);
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
  const q = listPostsQuerySchema.safeParse({
    identityId: searchParams.get("identityId"),
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!q.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid query", issues: q.error.issues }, { status: 400 }),
    );
  }

  try {
    const rows = await listPostsForIdentity(userId, q.data.identityId, q.data.limit);
    return withApiSecurityHeaders(NextResponse.json({ posts: rows }));
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN_IDENTITY") {
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

  const rl = rateLimitSync(`posts:post:${userId}:${ip}`, 60);
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

  const parsed = parseBody(createPostBodySchema, json);
  if (!parsed.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: parsed.error, issues: parsed.issues }, { status: 400 }),
    );
  }

  try {
    const row = await createPost(userId, parsed.data.identityId, parsed.data.body);
    return withApiSecurityHeaders(NextResponse.json({ post: row }, { status: 201 }));
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN_IDENTITY") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    throw e;
  }
}
