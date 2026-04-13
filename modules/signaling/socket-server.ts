import { createServer } from "node:http";
import { Server } from "socket.io";
import { auth } from "@/lib/auth";
import { rateLimitSync } from "@/lib/security/rate-limit";
import { createConsumerForParticipant, resumeConsumerForParticipant } from "@/modules/calls/consumers";
import { createProducerForParticipant } from "@/modules/calls/producers";
import { getCallRtpCapabilities } from "@/modules/calls/router";
import {
  ensureCallRoom,
  listProducers,
  removeParticipant,
  removeSocketFromAllCalls,
  setParticipantMuted,
  sweepIdleCallRooms,
  touchCall,
  upsertParticipant,
} from "@/modules/calls/rooms";
import {
  connectWebRtcTransportForParticipant,
  createWebRtcTransportForParticipant,
} from "@/modules/calls/transports";
import { assertMember } from "@/modules/messages/service";
import {
  callJoinSchema,
  callLeaveSchema,
  callMuteSchema,
  callPingSchema,
  mediaConsumerCreateSchema,
  mediaConsumerResumeSchema,
  mediaProducerCreateSchema,
  mediaRtpCapabilitiesGetSchema,
  mediaTransportConnectSchema,
  mediaTransportCreateSchema,
  signalIceSchema,
  signalSdpSchema,
} from "./contracts";

type Ack = (payload: { ok: boolean; error?: string; issues?: unknown; data?: unknown }) => void;
type SocketWithUser = {
  id: string;
  data: { userId?: string };
  handshake: { headers: Record<string, string | string[] | undefined> };
};

const E = {
  invalidPayload: "INVALID_PAYLOAD",
  unauthorized: "UNAUTHORIZED",
  forbiddenCall: "FORBIDDEN_CALL",
  callNotJoined: "CALL_NOT_JOINED",
  targetNotFound: "TARGET_NOT_FOUND",
  transportNotFound: "TRANSPORT_NOT_FOUND",
  producerNotFound: "PRODUCER_NOT_FOUND",
  consumerNotFound: "CONSUMER_NOT_FOUND",
  cannotConsume: "CANNOT_CONSUME",
  sessionFailed: "SESSION_FAILED",
  rateLimited: "RATE_LIMITED",
  badOrigin: "BAD_ORIGIN",
} as const;

function ackOk(ack?: Ack) {
  ack?.({ ok: true });
}

function ackError(ack: Ack | undefined, error: string, issues?: unknown) {
  ack?.({ ok: false, error, issues });
}

function roomForCall(callId: string) {
  return `call:${callId}`;
}

function allowedOriginSet() {
  const raw = process.env.SIGNALING_CORS_ORIGIN ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
}

async function getSocketUserId(headers: Record<string, string | string[] | undefined>) {
  const h = new Headers();
  for (const [k, raw] of Object.entries(headers)) {
    if (raw == null) continue;
    h.set(k, Array.isArray(raw) ? raw.join(",") : raw);
  }
  const session = await auth.api.getSession({ headers: h });
  return session?.user?.id ? String(session.user.id) : null;
}

const port = Number(process.env.SIGNALING_PORT ?? 3400);
const origin = [...allowedOriginSet()];

const httpServer = createServer((_, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "ariman-signaling" }));
});

const io = new Server(httpServer, {
  cors: {
    origin,
    credentials: true,
  },
  path: "/socket.io",
});

io.use(async (socket, next) => {
  try {
    const reqOrigin = socket.handshake.headers.origin;
    const validOrigin = !reqOrigin || origin.includes(reqOrigin);
    if (!validOrigin) {
      next(new Error(E.badOrigin));
      return;
    }

    const userId = await getSocketUserId(socket.handshake.headers as Record<string, string | string[] | undefined>);
    if (!userId) {
      next(new Error(E.unauthorized));
      return;
    }
    socket.data.userId = userId;
    next();
  } catch {
    next(new Error(E.sessionFailed));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId ?? null;
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  function allowEvent(scope: string) {
    const ip =
      socket.handshake.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ??
      socket.handshake.address ??
      "unknown";
    const rl = rateLimitSync(`signaling:${scope}:${userId}:${ip}`, 120);
    return rl.ok;
  }

  async function ensureMember(callId: string) {
    const ok = await assertMember(userId, callId);
    return ok;
  }

  socket.on("call:join", (raw, ack?: Ack) => {
    if (!allowEvent("call:join")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = callJoinSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    void (async () => {
      if (!(await ensureMember(parsed.data.callId))) {
        ackError(ack, E.forbiddenCall);
        return;
      }
      ensureCallRoom(parsed.data.callId);
      upsertParticipant(parsed.data.callId, socket.id, userId);
      socket.join(roomForCall(parsed.data.callId));
      socket.to(roomForCall(parsed.data.callId)).emit("call:peer-joined", {
        callId: parsed.data.callId,
        socketId: socket.id,
        userId,
        joinedAt: Date.now(),
      });
      socket.emit("call:producer-list", {
        callId: parsed.data.callId,
        producers: listProducers(parsed.data.callId, socket.id),
      });
      ackOk(ack);
    })().catch(() => ackError(ack, E.sessionFailed));
  });

  socket.on("call:leave", (raw, ack?: Ack) => {
    if (!allowEvent("call:leave")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = callLeaveSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    removeParticipant(parsed.data.callId, socket.id);
    socket.leave(roomForCall(parsed.data.callId));
    socket.to(roomForCall(parsed.data.callId)).emit("call:peer-left", {
      callId: parsed.data.callId,
      socketId: socket.id,
      userId,
      leftAt: Date.now(),
    });
    ackOk(ack);
  });

  socket.on("call:mute", (raw, ack?: Ack) => {
    if (!allowEvent("call:mute")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = callMuteSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    if (!setParticipantMuted(parsed.data.callId, socket.id, parsed.data.muted)) {
      ackError(ack, E.callNotJoined);
      return;
    }
    socket.to(roomForCall(parsed.data.callId)).emit("call:peer-muted", {
      callId: parsed.data.callId,
      socketId: socket.id,
      userId,
      muted: parsed.data.muted,
      at: Date.now(),
    });
    ackOk(ack);
  });

  socket.on("call:ping", (raw, ack?: Ack) => {
    const parsed = callPingSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    touchCall(parsed.data.callId);
    socket.to(roomForCall(parsed.data.callId)).emit("call:pong", {
      callId: parsed.data.callId,
      socketId: socket.id,
      userId,
      ts: parsed.data.ts,
      serverTs: Date.now(),
    });
    ackOk(ack);
  });

  socket.on("signal:sdp", (raw, ack?: Ack) => {
    if (!allowEvent("signal:sdp")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = signalSdpSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    const target = io.sockets.sockets.get(parsed.data.targetSocketId);
    if (!target) {
      ackError(ack, E.targetNotFound);
      return;
    }
    touchCall(parsed.data.callId);
    target.emit("signal:sdp", {
      callId: parsed.data.callId,
      fromSocketId: socket.id,
      fromUserId: userId,
      description: parsed.data.description,
    });
    ackOk(ack);
  });

  socket.on("signal:ice", (raw, ack?: Ack) => {
    if (!allowEvent("signal:ice")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = signalIceSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    const target = io.sockets.sockets.get(parsed.data.targetSocketId);
    if (!target) {
      ackError(ack, E.targetNotFound);
      return;
    }
    touchCall(parsed.data.callId);
    target.emit("signal:ice", {
      callId: parsed.data.callId,
      fromSocketId: socket.id,
      fromUserId: userId,
      candidate: parsed.data.candidate,
    });
    ackOk(ack);
  });

  socket.on("media:rtpCapabilities:get", (raw, ack?: Ack) => {
    if (!allowEvent("media:rtpCapabilities:get")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = mediaRtpCapabilitiesGetSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    void (async () => {
      if (!(await ensureMember(parsed.data.callId))) {
        ackError(ack, E.forbiddenCall);
        return;
      }
      const rtpCapabilities = await getCallRtpCapabilities(parsed.data.callId);
      ack?.({ ok: true, data: { rtpCapabilities } });
    })().catch(() => ackError(ack, E.sessionFailed));
  });

  socket.on("media:transport:create", (raw, ack?: Ack) => {
    if (!allowEvent("media:transport:create")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = mediaTransportCreateSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    void (async () => {
      if (!(await ensureMember(parsed.data.callId))) {
        ackError(ack, E.forbiddenCall);
        return;
      }
      upsertParticipant(parsed.data.callId, socket.id, userId);
      const transport = await createWebRtcTransportForParticipant(
        parsed.data.callId,
        socket.id,
        parsed.data.direction,
      );
      ack?.({ ok: true, data: { transport } });
    })().catch((err) => ackError(ack, err instanceof Error ? err.message : E.sessionFailed));
  });

  socket.on("media:transport:connect", (raw, ack?: Ack) => {
    if (!allowEvent("media:transport:connect")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = mediaTransportConnectSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    void (async () => {
      await connectWebRtcTransportForParticipant(
        parsed.data.callId,
        socket.id,
        parsed.data.transportId,
        parsed.data.dtlsParameters as never,
      );
      ackOk(ack);
    })().catch((err) =>
      ackError(
        ack,
        err instanceof Error && err.message === "TRANSPORT_NOT_FOUND" ? E.transportNotFound : E.sessionFailed,
      ),
    );
  });

  socket.on("media:producer:create", (raw, ack?: Ack) => {
    if (!allowEvent("media:producer:create")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = mediaProducerCreateSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    void (async () => {
      const producer = await createProducerForParticipant({
        callId: parsed.data.callId,
        socketId: socket.id,
        transportId: parsed.data.transportId,
        kind: parsed.data.kind,
        rtpParameters: parsed.data.rtpParameters as never,
        appData: parsed.data.appData,
      });
      socket.to(roomForCall(parsed.data.callId)).emit("call:producer-added", {
        callId: parsed.data.callId,
        socketId: socket.id,
        userId,
        producerId: producer.id,
        kind: producer.kind,
      });
      ack?.({ ok: true, data: { producer } });
    })().catch((err) =>
      ackError(
        ack,
        err instanceof Error && err.message === "TRANSPORT_NOT_FOUND" ? E.transportNotFound : E.sessionFailed,
      ),
    );
  });

  socket.on("media:consumer:create", (raw, ack?: Ack) => {
    if (!allowEvent("media:consumer:create")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = mediaConsumerCreateSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    void (async () => {
      const consumer = await createConsumerForParticipant({
        callId: parsed.data.callId,
        socketId: socket.id,
        transportId: parsed.data.transportId,
        producerId: parsed.data.producerId,
        rtpCapabilities: parsed.data.rtpCapabilities as never,
      });
      ack?.({ ok: true, data: { consumer } });
    })().catch((err) =>
      ackError(
        ack,
        err instanceof Error
          ? err.message === "PRODUCER_NOT_FOUND"
            ? E.producerNotFound
            : err.message === "TRANSPORT_NOT_FOUND"
              ? E.transportNotFound
              : err.message === "CANNOT_CONSUME"
                ? E.cannotConsume
                : E.sessionFailed
          : E.sessionFailed,
      ),
    );
  });

  socket.on("media:consumer:resume", (raw, ack?: Ack) => {
    if (!allowEvent("media:consumer:resume")) {
      ackError(ack, E.rateLimited);
      return;
    }
    const parsed = mediaConsumerResumeSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, E.invalidPayload, parsed.error.issues);
      return;
    }
    void (async () => {
      await resumeConsumerForParticipant(parsed.data.callId, socket.id, parsed.data.consumerId);
      ackOk(ack);
    })().catch((err) =>
      ackError(
        ack,
        err instanceof Error && err.message === "CONSUMER_NOT_FOUND" ? E.consumerNotFound : E.sessionFailed,
      ),
    );
  });

  socket.on("disconnect", () => {
    removeSocketFromAllCalls(socket.id);
  });
});

setInterval(() => {
  sweepIdleCallRooms();
}, 30_000).unref();

httpServer.listen(port, () => {
  console.log(`[signaling] socket.io listening on :${port}`);
});
