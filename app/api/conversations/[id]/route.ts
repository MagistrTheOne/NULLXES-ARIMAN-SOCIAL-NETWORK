import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { db } from "@/lib/db";
import { aiAgents, conversations } from "@/lib/db/schema";
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

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
    });
    const kind = conv?.kind === "ai" ? "ai" : "direct";
    let aiAgentId: string | null = null;
    let aiAgentHandle: string | null = null;
    if (conv?.kind === "ai" && conv.aiAgentId) {
      aiAgentId = conv.aiAgentId;
      const agent = await db.query.aiAgents.findFirst({
        where: eq(aiAgents.id, conv.aiAgentId),
      });
      aiAgentHandle = agent?.handle ?? null;
    }

    return withApiSecurityHeaders(
      NextResponse.json({
        conversationId: id,
        kind,
        peerUserId,
        aiAgentId,
        aiAgentHandle,
        members,
      }),
    );
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_MEMBER") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    throw e;
  }
}
