import { createHmac, timingSafeEqual } from "node:crypto";

export type RealtimeSubscribeClaims = {
  sub: string;
  rooms: string[];
  exp: number;
  iat: number;
};

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function secret() {
  const s = process.env.REALTIME_TOKEN_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("REALTIME_TOKEN_SECRET or BETTER_AUTH_SECRET must be set");
  return s;
}

export function signRealtimeSubscribeToken(claims: RealtimeSubscribeClaims): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8");
  const sig = createHmac("sha256", secret()).update(payload).digest();
  return `${b64url(payload)}.${b64url(sig)}`;
}

export function verifyRealtimeSubscribeToken(token: string): RealtimeSubscribeClaims | null {
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  const payload = Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const sig = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const expected = createHmac("sha256", secret()).update(payload).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  try {
    const claims = JSON.parse(payload.toString("utf8")) as RealtimeSubscribeClaims;
    if (typeof claims.exp !== "number" || Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}
