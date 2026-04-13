import { NextResponse } from "next/server";
import { z } from "@/lib/security/validation";
import { getSessionUserId } from "@/lib/api/session";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { withApiSecurityHeaders } from "@/lib/security/headers";
import { uploadVideoBlobToCloudflareStream, isCloudflareStreamConfigured } from "@/lib/cloudflare-stream";
import { updateClipFromStreamUpload } from "@/modules/clips/service";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 500 * 1024 * 1024; // 500 MiB ceiling (platform may enforce lower limits)

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
  const rl = rateLimitSync(`clips:upload:${userId}:${ip}`, 20);
  if (!rl.ok) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
  }

  if (!isCloudflareStreamConfigured()) {
    return withApiSecurityHeaders(
      NextResponse.json(
        {
          error:
            "Cloudflare Stream is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN.",
        },
        { status: 503 },
      ),
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return withApiSecurityHeaders(NextResponse.json({ error: "Invalid form data" }, { status: 400 }));
  }

  const identityIdRaw = form.get("identityId");
  const clipIdRaw = form.get("clipId");
  const file = form.get("file");

  const ids = z.object({ identityId: z.uuid(), clipId: z.uuid() }).safeParse({
    identityId: typeof identityIdRaw === "string" ? identityIdRaw : "",
    clipId: typeof clipIdRaw === "string" ? clipIdRaw : "",
  });
  if (!ids.success) {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Invalid identityId or clipId", issues: ids.error.issues }, { status: 400 }),
    );
  }

  if (!(file instanceof Blob) || file.size === 0) {
    return withApiSecurityHeaders(NextResponse.json({ error: "Missing file" }, { status: 400 }));
  }

  if (file.size > MAX_BYTES) {
    return withApiSecurityHeaders(NextResponse.json({ error: "File too large" }, { status: 413 }));
  }

  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("video/") && mime !== "application/octet-stream") {
    return withApiSecurityHeaders(
      NextResponse.json({ error: "Expected a video file" }, { status: 400 }),
    );
  }

  try {
    const uploaded = await uploadVideoBlobToCloudflareStream(file, "clip-upload");
    const clip = await updateClipFromStreamUpload(userId, ids.data.identityId, ids.data.clipId, {
      streamPlaybackId: uploaded.streamPlaybackId,
      playbackUrl: uploaded.playbackUrl,
      thumbnailUrl: uploaded.thumbnailUrl,
      durationMs: uploaded.durationMs,
      transcodeState: uploaded.transcodeState,
    });

    return withApiSecurityHeaders(
      NextResponse.json({
        clip,
        playbackUrl: uploaded.playbackUrl,
        thumbnailUrl: uploaded.thumbnailUrl,
        streamPlaybackId: uploaded.streamPlaybackId,
        readyToStream: uploaded.readyToStream,
      }),
    );
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN_IDENTITY") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    if (e instanceof Error && e.message === "CLIP_NOT_FOUND") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Clip not found" }, { status: 404 }));
    }
    if (e instanceof Error && e.message === "CLOUDFLARE_STREAM_NOT_CONFIGURED") {
      return withApiSecurityHeaders(NextResponse.json({ error: "Stream not configured" }, { status: 503 }));
    }
    console.error("[clips/upload]", e);
    return withApiSecurityHeaders(
      NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 502 }),
    );
  }
}
