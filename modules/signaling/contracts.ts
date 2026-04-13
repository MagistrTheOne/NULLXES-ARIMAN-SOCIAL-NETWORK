import { z } from "@/lib/security/validation";

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

export type CallJoinInput = z.infer<typeof callJoinSchema>;
export type CallLeaveInput = z.infer<typeof callLeaveSchema>;
export type CallMuteInput = z.infer<typeof callMuteSchema>;
export type CallPingInput = z.infer<typeof callPingSchema>;
export type SignalSdpInput = z.infer<typeof signalSdpSchema>;
export type SignalIceInput = z.infer<typeof signalIceSchema>;
