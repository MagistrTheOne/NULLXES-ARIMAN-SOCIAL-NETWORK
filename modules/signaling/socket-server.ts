import { createServer } from "node:http";
import { Server } from "socket.io";
import { auth } from "@/lib/auth";
import {
  callJoinSchema,
  callLeaveSchema,
  callMuteSchema,
  callPingSchema,
  signalIceSchema,
  signalSdpSchema,
} from "./contracts";

type Ack = (payload: { ok: boolean; error?: string; issues?: unknown }) => void;

function ackOk(ack?: Ack) {
  ack?.({ ok: true });
}

function ackError(ack: Ack | undefined, error: string, issues?: unknown) {
  ack?.({ ok: false, error, issues });
}

function roomForCall(callId: string) {
  return `call:${callId}`;
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
const origin = process.env.SIGNALING_CORS_ORIGIN ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

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
    const userId = await getSocketUserId(socket.handshake.headers);
    if (!userId) {
      next(new Error("UNAUTHORIZED"));
      return;
    }
    socket.data.userId = userId;
    next();
  } catch {
    next(new Error("SESSION_FAILED"));
  }
});

io.on("connection", (socket) => {
  socket.on("call:join", (raw, ack?: Ack) => {
    const parsed = callJoinSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, "INVALID_PAYLOAD", parsed.error.issues);
      return;
    }
    socket.join(roomForCall(parsed.data.callId));
    socket.to(roomForCall(parsed.data.callId)).emit("call:peer-joined", {
      callId: parsed.data.callId,
      socketId: socket.id,
      userId: socket.data.userId,
      joinedAt: Date.now(),
    });
    ackOk(ack);
  });

  socket.on("call:leave", (raw, ack?: Ack) => {
    const parsed = callLeaveSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, "INVALID_PAYLOAD", parsed.error.issues);
      return;
    }
    socket.leave(roomForCall(parsed.data.callId));
    socket.to(roomForCall(parsed.data.callId)).emit("call:peer-left", {
      callId: parsed.data.callId,
      socketId: socket.id,
      userId: socket.data.userId,
      leftAt: Date.now(),
    });
    ackOk(ack);
  });

  socket.on("call:mute", (raw, ack?: Ack) => {
    const parsed = callMuteSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, "INVALID_PAYLOAD", parsed.error.issues);
      return;
    }
    socket.to(roomForCall(parsed.data.callId)).emit("call:peer-muted", {
      callId: parsed.data.callId,
      socketId: socket.id,
      userId: socket.data.userId,
      muted: parsed.data.muted,
      at: Date.now(),
    });
    ackOk(ack);
  });

  socket.on("call:ping", (raw, ack?: Ack) => {
    const parsed = callPingSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, "INVALID_PAYLOAD", parsed.error.issues);
      return;
    }
    socket.to(roomForCall(parsed.data.callId)).emit("call:pong", {
      callId: parsed.data.callId,
      socketId: socket.id,
      userId: socket.data.userId,
      ts: parsed.data.ts,
      serverTs: Date.now(),
    });
    ackOk(ack);
  });

  socket.on("signal:sdp", (raw, ack?: Ack) => {
    const parsed = signalSdpSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, "INVALID_PAYLOAD", parsed.error.issues);
      return;
    }
    const target = io.sockets.sockets.get(parsed.data.targetSocketId);
    if (!target) {
      ackError(ack, "TARGET_NOT_FOUND");
      return;
    }
    target.emit("signal:sdp", {
      callId: parsed.data.callId,
      fromSocketId: socket.id,
      fromUserId: socket.data.userId,
      description: parsed.data.description,
    });
    ackOk(ack);
  });

  socket.on("signal:ice", (raw, ack?: Ack) => {
    const parsed = signalIceSchema.safeParse(raw);
    if (!parsed.success) {
      ackError(ack, "INVALID_PAYLOAD", parsed.error.issues);
      return;
    }
    const target = io.sockets.sockets.get(parsed.data.targetSocketId);
    if (!target) {
      ackError(ack, "TARGET_NOT_FOUND");
      return;
    }
    target.emit("signal:ice", {
      callId: parsed.data.callId,
      fromSocketId: socket.id,
      fromUserId: socket.data.userId,
      candidate: parsed.data.candidate,
    });
    ackOk(ack);
  });

  socket.on("disconnect", () => {
    // Room participants observe disconnect via built-in adapter state and
    // optional app-level heartbeat/reconnect logic on the client.
  });
});

httpServer.listen(port, () => {
  console.log(`[signaling] socket.io listening on :${port}`);
});
