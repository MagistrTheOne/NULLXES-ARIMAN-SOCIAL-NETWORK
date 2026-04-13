import { io, type Socket } from "socket.io-client";
import type {
  ArimanSdkConfig,
  CallJoinBody,
  CallMuteBody,
  CreateConsumerResponse,
  CreateProducerResponse,
  CreateTransportResponse,
  MediaConsumerCreateBody,
  MediaConsumerResumeBody,
  MediaProducerCreateBody,
  MediaTransportConnectBody,
  MediaTransportCreateBody,
  RtpCapabilitiesResponse,
  SignalingAck,
} from "./types.js";

export type CallsClient = {
  socket: Socket;
  disconnect: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
  off: (event: string, handler: (payload: unknown) => void) => void;
  joinCall: (body: CallJoinBody) => Promise<SignalingAck>;
  leaveCall: (body: CallJoinBody) => Promise<SignalingAck>;
  setMuted: (body: CallMuteBody) => Promise<SignalingAck>;
  getRtpCapabilities: (body: CallJoinBody) => Promise<SignalingAck<RtpCapabilitiesResponse>>;
  createTransport: (body: MediaTransportCreateBody) => Promise<SignalingAck<CreateTransportResponse>>;
  connectTransport: (body: MediaTransportConnectBody) => Promise<SignalingAck>;
  produce: (body: MediaProducerCreateBody) => Promise<SignalingAck<CreateProducerResponse>>;
  consume: (body: MediaConsumerCreateBody) => Promise<SignalingAck<CreateConsumerResponse>>;
  resumeConsumer: (body: MediaConsumerResumeBody) => Promise<SignalingAck>;
};

function signalingBaseUrl() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SIGNALING_URL) {
    return process.env.NEXT_PUBLIC_SIGNALING_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3400";
}

function withAck<T = unknown>(
  socket: Socket,
  event: string,
  payload: unknown,
): Promise<SignalingAck<T>> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (ack: SignalingAck<T>) => {
      if (!ack || typeof ack.ok !== "boolean") {
        resolve({ ok: false, error: "BAD_ACK" });
        return;
      }
      resolve(ack);
    });
  });
}

export function createCallsClient(config?: ArimanSdkConfig): CallsClient {
  const baseUrl = (config?.baseUrl && config.baseUrl.length > 0 ? config.baseUrl : signalingBaseUrl()).replace(
    /\/$/,
    "",
  );
  const socket = io(baseUrl, {
    path: "/socket.io",
    withCredentials: true,
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
  });
  return {
    socket,
    disconnect: () => socket.disconnect(),
    on: (event, handler) => {
      socket.on(event, handler);
    },
    off: (event, handler) => {
      socket.off(event, handler);
    },
    joinCall: (body) => withAck(socket, "call:join", body),
    leaveCall: (body) => withAck(socket, "call:leave", body),
    setMuted: (body) => withAck(socket, "call:mute", body),
    getRtpCapabilities: (body) => withAck<RtpCapabilitiesResponse>(socket, "media:rtpCapabilities:get", body),
    createTransport: (body) => withAck<CreateTransportResponse>(socket, "media:transport:create", body),
    connectTransport: (body) => withAck(socket, "media:transport:connect", body),
    produce: (body) => withAck<CreateProducerResponse>(socket, "media:producer:create", body),
    consume: (body) => withAck<CreateConsumerResponse>(socket, "media:consumer:create", body),
    resumeConsumer: (body) => withAck(socket, "media:consumer:resume", body),
  };
}
