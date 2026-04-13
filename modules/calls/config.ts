import type { WorkerSettings } from "mediasoup/types";

const DEFAULT_LISTEN_IP = "0.0.0.0";
const DEFAULT_ANNOUNCED_IP = "127.0.0.1";

export function mediasoupWorkerSettings(): WorkerSettings {
  return {
    rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT ?? 40000),
    rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT ?? 49999),
    logLevel: "warn",
    logTags: ["ice", "dtls", "rtp", "rtcp"],
  };
}

export function mediasoupRouterCodecs() {
  return [
    {
      kind: "audio" as const,
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: "video" as const,
      mimeType: "video/VP8",
      clockRate: 90000,
      parameters: { "x-google-start-bitrate": 1000 },
    },
  ];
}

export function transportListenIps() {
  const ip = process.env.MEDIASOUP_LISTEN_IP ?? DEFAULT_LISTEN_IP;
  const announcedIp = process.env.MEDIASOUP_ANNOUNCED_IP ?? DEFAULT_ANNOUNCED_IP;
  return [{ ip, announcedIp }];
}
