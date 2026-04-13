import { io } from "socket.io-client";
function signalingBaseUrl() {
    if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SIGNALING_URL) {
        return process.env.NEXT_PUBLIC_SIGNALING_URL.replace(/\/$/, "");
    }
    if (typeof window !== "undefined")
        return window.location.origin;
    return "http://localhost:3400";
}
function withAck(socket, event, payload) {
    return new Promise((resolve) => {
        socket.emit(event, payload, (ack) => {
            if (!ack || typeof ack.ok !== "boolean") {
                resolve({ ok: false, error: "BAD_ACK" });
                return;
            }
            resolve(ack);
        });
    });
}
export function createCallsClient(config) {
    const baseUrl = (config?.baseUrl && config.baseUrl.length > 0 ? config.baseUrl : signalingBaseUrl()).replace(/\/$/, "");
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
        getRtpCapabilities: (body) => withAck(socket, "media:rtpCapabilities:get", body),
        createTransport: (body) => withAck(socket, "media:transport:create", body),
        connectTransport: (body) => withAck(socket, "media:transport:connect", body),
        produce: (body) => withAck(socket, "media:producer:create", body),
        consume: (body) => withAck(socket, "media:consumer:create", body),
        resumeConsumer: (body) => withAck(socket, "media:consumer:resume", body),
    };
}
//# sourceMappingURL=calls.js.map