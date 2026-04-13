import type { RtpCapabilities } from "mediasoup/types";
import { findConsumer, findProducer, findTransport, registerConsumer } from "./rooms";
import { getCallRouter } from "./worker";

export async function createConsumerForParticipant(args: {
  callId: string;
  socketId: string;
  transportId: string;
  producerId: string;
  rtpCapabilities: RtpCapabilities;
}) {
  const router = await getCallRouter(args.callId);
  if (!router.canConsume({ producerId: args.producerId, rtpCapabilities: args.rtpCapabilities })) {
    throw new Error("CANNOT_CONSUME");
  }
  const producer = findProducer(args.callId, args.producerId);
  if (!producer) throw new Error("PRODUCER_NOT_FOUND");
  const transport = findTransport(args.callId, args.socketId, args.transportId);
  if (!transport) throw new Error("TRANSPORT_NOT_FOUND");
  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities: args.rtpCapabilities,
    paused: true,
  });
  registerConsumer(args.callId, args.socketId, consumer);
  return {
    id: consumer.id,
    producerId: consumer.producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    type: consumer.type,
    producerPaused: consumer.producerPaused,
  };
}

export async function resumeConsumerForParticipant(callId: string, socketId: string, consumerId: string) {
  const consumer = findConsumer(callId, socketId, consumerId);
  if (!consumer) throw new Error("CONSUMER_NOT_FOUND");
  await consumer.resume();
}
