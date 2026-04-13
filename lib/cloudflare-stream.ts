/**
 * Server-side upload to Cloudflare Stream.
 * Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN (Stream:Edit).
 * @see https://developers.cloudflare.com/stream/uploading-videos/upload-video-file/
 */

export type StreamUploadResult = {
  streamPlaybackId: string;
  playbackUrl: string;
  thumbnailUrl: string | null;
  durationMs: number;
  readyToStream: boolean;
  transcodeState: string;
};

type CfStreamResult = {
  uid: string;
  thumbnail?: string;
  preview?: string;
  duration?: number;
  readyToStream?: boolean;
  status?: { state?: string; pctComplete?: string };
  playback?: { hls?: string };
};

type CfApiEnvelope = {
  success: boolean;
  errors?: { message: string }[];
  messages?: string[];
  result?: CfStreamResult;
};

export function isCloudflareStreamConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_STREAM_API_TOKEN);
}

export async function uploadVideoBlobToCloudflareStream(blob: Blob, filename: string): Promise<StreamUploadResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("CLOUDFLARE_STREAM_NOT_CONFIGURED");
  }

  const form = new FormData();
  form.append("file", blob, filename || "upload.mp4");

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const json = (await res.json()) as CfApiEnvelope;
  if (!json.success || !json.result?.uid) {
    const msg = json.errors?.map((e) => e.message).join("; ") || JSON.stringify(json);
    throw new Error(`CLOUDFLARE_STREAM_UPLOAD_FAILED: ${msg}`);
  }

  const r = json.result;
  const hls =
    r.playback?.hls ?? `https://videodelivery.net/${r.uid}/manifest/video.m3u8`;
  const durationSec = typeof r.duration === "number" && Number.isFinite(r.duration) ? r.duration : 0;
  const state = r.status?.state ?? (r.readyToStream ? "ready" : "inprogress");

  return {
    streamPlaybackId: r.uid,
    playbackUrl: hls,
    thumbnailUrl: r.thumbnail ?? null,
    durationMs: Math.round(durationSec * 1000),
    readyToStream: !!r.readyToStream,
    transcodeState: state === "ready" ? "ready" : "pending",
  };
}
