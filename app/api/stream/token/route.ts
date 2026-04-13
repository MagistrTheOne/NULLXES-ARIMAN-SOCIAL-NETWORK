import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { z } from "@/lib/security/validation";
import { streamServerClient } from "@/lib/stream/server";
import { assertMember } from "@/modules/messages/service";
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
  const rl = rateLimitSync(`stream:token:${ip}`, 60);
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
  const parsedQuery = z
    .object({
      conversationId: z.uuid(),
    })
    .safeParse({
      conversationId: searchParams.get("conversationId") ?? "",
    });
  if (!parsedQuery.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid query", issues: parsedQuery.error.issues }, { status: 400 }),
    );
  }

  try {
    const isMember = await assertMember(userId, parsedQuery.data.conversationId);
    if (!isMember) {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }

    const identities = await ensurePrimaryIdentity(userId);
    const primary = identities[0] ?? null;
    if (!primary) {
      return withApiSecurityHeaders(NextResponse.json({ error: "No identity" }, { status: 400 }));
    }

    const stream = streamServerClient();
    const streamUserId = `ariman-user-${userId}`;
    const apiKey = process.env.STREAM_API_KEY ?? "";
    const token = stream.generateUserToken({ user_id: streamUserId, validity_in_seconds: 3600 });
    const callType = process.env.STREAM_DEFAULT_CALL_TYPE ?? "default";
    const callId = `conversation-${parsedQuery.data.conversationId}`;
    const channelId = `conversation-${parsedQuery.data.conversationId}`;

    await stream.upsertUsers([
      {
        id: streamUserId,
        name: primary.displayName,
        image: primary.avatarUrl ?? undefined,
      },
    ]);

    return withApiSecurityHeaders(
      NextResponse.json({
        apiKey,
        token,
        callType,
        callId,
        channelType: "messaging",
        channelId,
        user: {
          id: streamUserId,
          name: primary.displayName,
          image: primary.avatarUrl ?? null,
        },
      }),
    );
  } catch (e) {
    if (e instanceof Error && e.message === "STREAM_NOT_CONFIGURED") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Stream API is not configured" }, { status: 503 }),
      );
    }
    throw e;
  }
}
