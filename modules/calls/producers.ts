import type { MediaKind, RtpParameters } from "mediasoup/types";
import { findTransport, registerProducer } from "./rooms";

export async function createProducerForParticipant(args: {
  callId: string;
  socketId: string;
  transportId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  appData?: Record<string, unknown>;
}) {
  const transport = findTransport(args.callId, args.socketId, args.transportId);
  if (!transport) throw new Error("TRANSPORT_NOT_FOUND");
  const producer = await transport.produce({
    kind: args.kind,
    rtpParameters: args.rtpParameters,
    appData: args.appData,
  });
  registerProducer(args.callId, args.socketId, producer);
  return {
    id: producer.id,
    kind: producer.kind,
  };
}
