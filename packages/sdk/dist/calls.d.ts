import { type Socket } from "socket.io-client";
import type { ArimanSdkConfig, CallJoinBody, CallMuteBody, CreateConsumerResponse, CreateProducerResponse, CreateTransportResponse, MediaConsumerCreateBody, MediaConsumerResumeBody, MediaProducerCreateBody, MediaTransportConnectBody, MediaTransportCreateBody, RtpCapabilitiesResponse, SignalingAck } from "./types.js";
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
export declare function createCallsClient(config?: ArimanSdkConfig): CallsClient;
//# sourceMappingURL=calls.d.ts.map