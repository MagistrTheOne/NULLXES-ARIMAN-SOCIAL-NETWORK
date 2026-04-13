"use client";

import {
  createCallsClient,
  type CallState,
  type CallsClient,
  type SignalingAck,
} from "@nullxes/ariman-sdk";

type NetworkSample = {
  rttMs: number | null;
  jitterMs: number | null;
  packetLossPct: number | null;
  at: number;
};

export type CallSession = {
  client: CallsClient;
  getState: () => CallState;
  onState: (handler: (state: CallState) => void) => () => void;
  onNetworkQuality: (handler: (sample: NetworkSample) => void) => () => void;
  join: (callId: string) => Promise<SignalingAck>;
  leave: (callId: string) => Promise<SignalingAck>;
  setMuted: (callId: string, muted: boolean) => Promise<SignalingAck>;
  close: () => void;
};

export function createCallSession(): CallSession {
  const client = createCallsClient();
  let state: CallState = "idle";
  const stateHandlers = new Set<(state: CallState) => void>();
  const networkHandlers = new Set<(sample: NetworkSample) => void>();

  function emitState(next: CallState) {
    if (state === next) return;
    state = next;
    for (const fn of stateHandlers) fn(state);
  }

  client.on("connect", () => {
    emitState("connected");
  });
  client.on("disconnect", () => {
    emitState("reconnecting");
  });
  client.on("connect_error", () => {
    emitState("failed");
  });
  client.on("call:pong", (payload: unknown) => {
    const row = payload as { ts?: number; serverTs?: number };
    const now = Date.now();
    const sentTs = typeof row.ts === "number" ? row.ts : null;
    const rtt = sentTs ? Math.max(0, now - sentTs) : null;
    const sample: NetworkSample = {
      rttMs: rtt,
      jitterMs: null,
      packetLossPct: null,
      at: now,
    };
    for (const fn of networkHandlers) fn(sample);
  });

  return {
    client,
    getState: () => state,
    onState: (handler) => {
      stateHandlers.add(handler);
      return () => {
        stateHandlers.delete(handler);
      };
    },
    onNetworkQuality: (handler) => {
      networkHandlers.add(handler);
      return () => {
        networkHandlers.delete(handler);
      };
    },
    join: async (callId) => {
      emitState("joining");
      const ack = await client.joinCall({ callId });
      emitState(ack.ok ? "connected" : "failed");
      return ack;
    },
    leave: async (callId) => {
      const ack = await client.leaveCall({ callId });
      emitState("ended");
      return ack;
    },
    setMuted: (callId, muted) => client.setMuted({ callId, muted }),
    close: () => {
      emitState("ended");
      client.disconnect();
    },
  };
}
