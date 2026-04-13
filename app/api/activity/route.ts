import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { z } from "@/lib/security/validation";
import { listActivityForIdentity } from "@/modules/activity/service";

export const runtime = "nodejs";

const querySchema = z.object({
  identityId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(30),
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
  const rl = rateLimitSync(`activity:get:${ip}`, 120);
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
  const q = querySchema.safeParse({
    identityId: searchParams.get("identityId"),
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!q.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid query", issues: q.error.issues }, { status: 400 }),
    );
  }

  try {
    const items = await listActivityForIdentity(userId, q.data.identityId, q.data.limit);
    return withApiSecurityHeaders(NextResponse.json({ items }));
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN_IDENTITY") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    throw e;
  }
}
