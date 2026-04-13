import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { parseBody } from "@/lib/security/validation";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { patchMeBodySchema } from "@/modules/users/me-patch-schema";
import { updateProfileIdentity } from "@/modules/users/profile";
import { ensurePrimaryIdentity } from "@/modules/users/service";

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
  const rl = rateLimitSync(`users:me:${ip}`, 60);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const identities = await ensurePrimaryIdentity(userId);
  return withApiSecurityHeaders(NextResponse.json({ userId, identities }));
}

export async function PATCH(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimitSync(`users:me:patch:${ip}`, 30);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return withApiSecurityHeaders(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }

  const parsed = parseBody(patchMeBodySchema, json);
  if (!parsed.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: parsed.error, issues: parsed.issues }, { status: 400 }),
    );
  }

  try {
    const row = await updateProfileIdentity(userId, parsed.data.identityId, {
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
    });
    const identities = await ensurePrimaryIdentity(userId);
    return withApiSecurityHeaders(NextResponse.json({ userId, identities, identity: row }));
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN_IDENTITY") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    throw e;
  }
}
