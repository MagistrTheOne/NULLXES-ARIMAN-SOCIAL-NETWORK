import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { z } from "@/lib/security/validation";
import { assertIdentityOwned } from "@/modules/identities/access";
import {
  countCommunityMembers,
  getCommunityBySlug,
  isCommunityMember,
  listPostsForCommunity,
} from "@/modules/communities/service";

const communityQuerySchema = z.object({
  identityId: z.uuid().optional(),
});

export const runtime = "nodejs";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const ip = clientIp(request);
  const rl = rateLimitSync(`communities:get:${ip}`, 120);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { slug } = await ctx.params;
  const community = await getCommunityBySlug(slug);
  if (!community) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }

  const { searchParams } = new URL(request.url);
  const qv = communityQuerySchema.safeParse({
    identityId: searchParams.get("identityId") ?? undefined,
  });
  if (!qv.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid query", issues: qv.error.issues }, { status: 400 }),
    );
  }

  let viewerIdentityId: string | null = null;
  if (qv.data.identityId) {
    const ok = await assertIdentityOwned(userId, qv.data.identityId);
    if (!ok) {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    viewerIdentityId = qv.data.identityId;
  }

  const member = await isCommunityMember(userId, community.id);
  const memberCount = await countCommunityMembers(community.id);
  const posts = await listPostsForCommunity(community.id, 40, viewerIdentityId);

  return withApiSecurityHeaders(
    NextResponse.json({
      community: {
        id: community.id,
        slug: community.slug,
        title: community.title,
        description: community.description,
        createdAt: community.createdAt,
      },
      member,
      memberCount,
      posts,
    }),
  );
}
