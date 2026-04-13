import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { z } from "@/lib/security/validation";
import { searchUsers } from "@/modules/users/search";

export const runtime = "nodejs";

const querySchema = z.object({
  search: z.string().min(1).max(128),
  limit: z.coerce.number().int().min(1).max(25).optional().default(15),
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
  const rl = rateLimitSync(`users:search:${ip}`, 60);
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
  const parsed = querySchema.safeParse({
    search: searchParams.get("search") ?? "",
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 }),
    );
  }

  const usersOut = await searchUsers(userId, parsed.data.search, parsed.data.limit);
  return withApiSecurityHeaders(NextResponse.json({ users: usersOut }));
}
