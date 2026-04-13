import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { z } from "@/lib/security/validation";
import { listAiAgents } from "@/modules/ai/agents";
import { searchIdentitiesForMentions } from "@/modules/identities/mention-search";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().max(64).optional().default(""),
  limit: z.coerce.number().int().min(1).max(25).optional().default(12),
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
  const rl = rateLimitSync(`mentions:get:${ip}`, 120);
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
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 }),
    );
  }

  const q = parsed.data.q.trim().toLowerCase();
  const limit = parsed.data.limit;

  const allAgents = await listAiAgents();
  const agents = allAgents
    .filter((a) => {
      if (!q) return true;
      return (
        a.handle.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.handle.split(".")[0]?.toLowerCase().includes(q)
      );
    })
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      handle: a.handle,
      name: a.name,
      shortHandle: a.handle.split(".")[0] ?? a.handle,
    }));

  const users =
    q.length > 0 ? await searchIdentitiesForMentions(userId, q, limit) : [];

  return withApiSecurityHeaders(NextResponse.json({ agents, users }));
}
