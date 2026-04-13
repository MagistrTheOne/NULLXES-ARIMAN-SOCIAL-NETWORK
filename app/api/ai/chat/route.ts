import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api/session";
import { parseBody, z } from "@/lib/security/validation";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { runAiChat } from "@/modules/ai/chat";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    conversationId: z.uuid(),
    message: z.string().min(1).max(16000),
    /** Used when the model returns type "create_post"; defaults to your first identity if omitted. */
    actionIdentityId: z.uuid().optional(),
  })
  .strict();

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const ip = clientIp(request);
  const rl = rateLimitSync(`ai:chat:${userId}:${ip}`, 30);
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

  const parsed = parseBody(bodySchema, json);
  if (!parsed.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: parsed.error, issues: parsed.issues }, { status: 400 }),
    );
  }

  try {
    const out = await runAiChat(userId, parsed.data.conversationId, parsed.data.message, {
      actionIdentityId: parsed.data.actionIdentityId,
    });
    return withApiSecurityHeaders(NextResponse.json(out, { status: 201 }));
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_MEMBER") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && e.message === "AI_MENTION_REQUIRED") {
      return withApiSecurityHeaders(
        NextResponse.json(
          {
            error:
              "Include @oracle, @analyst, or @writer (or full .nullxes handle) anywhere in the message.",
          },
          { status: 400 },
        ),
      );
    }
    if (e instanceof Error && e.message === "AI_AGENT_NOT_FOUND") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Unknown agent" }, { status: 404 }));
    }
    if (e instanceof Error && e.message === "OPENAI_API_KEY_MISSING") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Server is not configured for AI (OPENAI_API_KEY)." }, { status: 503 }),
      );
    }
    if (e instanceof Error && e.message === "OPENAI_EMPTY_RESPONSE") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Model returned no text" }, { status: 502 }),
      );
    }
    if (e instanceof Error && e.message === "AI_INVALID_JSON") {
      return withApiSecurityHeaders(
        NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 }),
      );
    }
    if (e instanceof Error && e.message === "AI_ACTION_IDENTITY_REQUIRED") {
      return withApiSecurityHeaders(
        NextResponse.json(
          { error: "No identity available for create_post; add actionIdentityId or create an identity." },
          { status: 400 },
        ),
      );
    }
    console.error("[ai/chat]", e);
    return withApiSecurityHeaders(
      NextResponse.json(
        { error: e instanceof Error ? e.message : "AI request failed" },
        { status: 502 },
      ),
    );
  }
}
