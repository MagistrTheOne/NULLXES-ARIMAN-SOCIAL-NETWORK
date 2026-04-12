import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { getConversationMembers } from "@/modules/messages/service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { id } = await context.params;
  try {
    const members = await getConversationMembers(userId, id);
    const peerUserId = members.map((m) => m.userId).find((u) => u !== userId) ?? null;
    return withApiSecurityHeaders(NextResponse.json({ conversationId: id, peerUserId, members }));
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_MEMBER") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    throw e;
  }
}
