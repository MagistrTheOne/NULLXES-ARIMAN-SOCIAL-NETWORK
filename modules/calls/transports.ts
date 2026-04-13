import type { DtlsParameters } from "mediasoup/types";
import { transportListenIps } from "./config";
import { findTransport, registerTransport } from "./rooms";
import { getCallRouter } from "./worker";

export async function createWebRtcTransportForParticipant(
  callId: string,
  socketId: string,
  direction: "send" | "recv",
) {
  const router = await getCallRouter(callId);
  const transport = await router.createWebRtcTransport({
    listenIps: transportListenIps(),
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    appData: { direction, callId, socketId },
  });
  registerTransport(callId, socketId, transport);
  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
    sctpParameters: transport.sctpParameters,
  };
}

export async function connectWebRtcTransportForParticipant(
  callId: string,
  socketId: string,
  transportId: string,
  dtlsParameters: DtlsParameters,
) {
  const transport = findTransport(callId, socketId, transportId);
  if (!transport) throw new Error("TRANSPORT_NOT_FOUND");
  await transport.connect({ dtlsParameters });
}
