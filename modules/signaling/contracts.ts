import { z } from "@/lib/security/validation";

export const signalingAckSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  issues: z.unknown().optional(),
});

export const callJoinSchema = z.object({
  callId: z.uuid(),
});

export const callLeaveSchema = z.object({
  callId: z.uuid(),
});

export const callMuteSchema = z.object({
  callId: z.uuid(),
  muted: z.boolean(),
});

export const callPingSchema = z.object({
  callId: z.uuid(),
  ts: z.number().int().nonnegative(),
});

export const signalSdpSchema = z.object({
  callId: z.uuid(),
  targetSocketId: z.string().min(1).max(128),
  description: z.object({
    type: z.enum(["offer", "answer", "pranswer", "rollback"]),
    sdp: z.string().min(1).max(2_000_000),
  }),
});

export const signalIceSchema = z.object({
  callId: z.uuid(),
  targetSocketId: z.string().min(1).max(128),
  candidate: z.object({
    candidate: z.string().max(20_000),
    sdpMid: z.string().max(256).nullable().optional(),
    sdpMLineIndex: z.number().int().nonnegative().nullable().optional(),
    usernameFragment: z.string().max(256).nullable().optional(),
  }),
});

export const mediaRtpCapabilitiesGetSchema = z.object({
  callId: z.uuid(),
});

export const mediaTransportCreateSchema = z.object({
  callId: z.uuid(),
  direction: z.enum(["send", "recv"]),
});

export const mediaTransportConnectSchema = z.object({
  callId: z.uuid(),
  transportId: z.string().min(1).max(200),
  dtlsParameters: z.record(z.string(), z.unknown()),
});

export const mediaProducerCreateSchema = z.object({
  callId: z.uuid(),
  transportId: z.string().min(1).max(200),
  kind: z.enum(["audio", "video"]),
  rtpParameters: z.record(z.string(), z.unknown()),
  appData: z.record(z.string(), z.unknown()).optional(),
});

export const mediaConsumerCreateSchema = z.object({
  callId: z.uuid(),
  transportId: z.string().min(1).max(200),
  producerId: z.string().min(1).max(200),
  rtpCapabilities: z.record(z.string(), z.unknown()),
});

export const mediaConsumerResumeSchema = z.object({
  callId: z.uuid(),
  consumerId: z.string().min(1).max(200),
});

export type CallJoinInput = z.infer<typeof callJoinSchema>;
export type CallLeaveInput = z.infer<typeof callLeaveSchema>;
export type CallMuteInput = z.infer<typeof callMuteSchema>;
export type CallPingInput = z.infer<typeof callPingSchema>;
export type SignalSdpInput = z.infer<typeof signalSdpSchema>;
export type SignalIceInput = z.infer<typeof signalIceSchema>;
export type MediaRtpCapabilitiesGetInput = z.infer<typeof mediaRtpCapabilitiesGetSchema>;
export type MediaTransportCreateInput = z.infer<typeof mediaTransportCreateSchema>;
export type MediaTransportConnectInput = z.infer<typeof mediaTransportConnectSchema>;
export type MediaProducerCreateInput = z.infer<typeof mediaProducerCreateSchema>;
export type MediaConsumerCreateInput = z.infer<typeof mediaConsumerCreateSchema>;
export type MediaConsumerResumeInput = z.infer<typeof mediaConsumerResumeSchema>;
export type SignalingAck = z.infer<typeof signalingAckSchema>;
