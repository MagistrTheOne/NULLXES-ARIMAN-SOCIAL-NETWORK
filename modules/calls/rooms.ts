import type { Consumer, Producer, WebRtcTransport } from "mediasoup/types";
import { closeCallRouter } from "./worker";

type ParticipantState = {
  userId: string;
  socketId: string;
  joinedAt: number;
  muted: boolean;
  transports: Map<string, WebRtcTransport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
};

type CallRoomState = {
  callId: string;
  participants: Map<string, ParticipantState>;
  createdAt: number;
  lastSeenAt: number;
};

const rooms = new Map<string, CallRoomState>();
const ROOM_IDLE_MS = Number(process.env.CALL_ROOM_IDLE_MS ?? 5 * 60 * 1000);

export function ensureCallRoom(callId: string) {
  const existing = rooms.get(callId);
  if (existing) return existing;
  const created: CallRoomState = {
    callId,
    participants: new Map(),
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  };
  rooms.set(callId, created);
  return created;
}

export function upsertParticipant(callId: string, socketId: string, userId: string) {
  const room = ensureCallRoom(callId);
  room.lastSeenAt = Date.now();
  const prev = room.participants.get(socketId);
  if (prev) return prev;
  const participant: ParticipantState = {
    userId,
    socketId,
    joinedAt: Date.now(),
    muted: false,
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
  };
  room.participants.set(socketId, participant);
  return participant;
}

export function touchCall(callId: string) {
  const room = rooms.get(callId);
  if (room) room.lastSeenAt = Date.now();
}

export function getParticipant(callId: string, socketId: string) {
  return rooms.get(callId)?.participants.get(socketId) ?? null;
}

export function setParticipantMuted(callId: string, socketId: string, muted: boolean) {
  const p = getParticipant(callId, socketId);
  if (!p) return false;
  p.muted = muted;
  touchCall(callId);
  return true;
}

function closeParticipantMedia(p: ParticipantState) {
  for (const c of p.consumers.values()) {
    try {
      c.close();
    } catch {
      // ignore
    }
  }
  p.consumers.clear();
  for (const pr of p.producers.values()) {
    try {
      pr.close();
    } catch {
      // ignore
    }
  }
  p.producers.clear();
  for (const t of p.transports.values()) {
    try {
      t.close();
    } catch {
      // ignore
    }
  }
  p.transports.clear();
}

export function removeParticipant(callId: string, socketId: string) {
  const room = rooms.get(callId);
  if (!room) return;
  const participant = room.participants.get(socketId);
  if (!participant) return;
  closeParticipantMedia(participant);
  room.participants.delete(socketId);
  room.lastSeenAt = Date.now();
  if (room.participants.size === 0) {
    closeCallRouter(callId);
    rooms.delete(callId);
  }
}

export function removeSocketFromAllCalls(socketId: string) {
  for (const callId of rooms.keys()) {
    removeParticipant(callId, socketId);
  }
}

export function registerTransport(callId: string, socketId: string, transport: WebRtcTransport) {
  const p = getParticipant(callId, socketId);
  if (!p) throw new Error("CALL_NOT_JOINED");
  p.transports.set(transport.id, transport);
  touchCall(callId);
}

export function registerProducer(callId: string, socketId: string, producer: Producer) {
  const p = getParticipant(callId, socketId);
  if (!p) throw new Error("CALL_NOT_JOINED");
  p.producers.set(producer.id, producer);
  touchCall(callId);
}

export function registerConsumer(callId: string, socketId: string, consumer: Consumer) {
  const p = getParticipant(callId, socketId);
  if (!p) throw new Error("CALL_NOT_JOINED");
  p.consumers.set(consumer.id, consumer);
  touchCall(callId);
}

export function findTransport(callId: string, socketId: string, transportId: string) {
  return getParticipant(callId, socketId)?.transports.get(transportId) ?? null;
}

export function findProducer(callId: string, producerId: string) {
  const room = rooms.get(callId);
  if (!room) return null;
  for (const participant of room.participants.values()) {
    const producer = participant.producers.get(producerId);
    if (producer) return producer;
  }
  return null;
}

export function findConsumer(callId: string, socketId: string, consumerId: string) {
  return getParticipant(callId, socketId)?.consumers.get(consumerId) ?? null;
}

export function listProducers(callId: string, excludeSocketId?: string) {
  const room = rooms.get(callId);
  if (!room) return [];
  const out: Array<{ socketId: string; userId: string; producerId: string; kind: string }> = [];
  for (const [socketId, p] of room.participants.entries()) {
    if (excludeSocketId && socketId === excludeSocketId) continue;
    for (const producer of p.producers.values()) {
      out.push({ socketId, userId: p.userId, producerId: producer.id, kind: producer.kind });
    }
  }
  return out;
}

export function sweepIdleCallRooms() {
  const now = Date.now();
  for (const [callId, room] of rooms.entries()) {
    if (room.participants.size === 0 || now - room.lastSeenAt > ROOM_IDLE_MS) {
      closeCallRouter(callId);
      rooms.delete(callId);
    }
  }
}
