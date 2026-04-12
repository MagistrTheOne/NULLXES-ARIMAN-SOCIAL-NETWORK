export interface MessageEnvelopeV1 {
  v: 1;
  ephPub: string;
  nonce: string;
  cipher: string;
}

export function parseEnvelopeV1(raw: string): MessageEnvelopeV1 | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const v = (o as { v?: unknown }).v;
    if (v !== 1) return null;
    const ephPub = (o as { ephPub?: unknown }).ephPub;
    const nonce = (o as { nonce?: unknown }).nonce;
    const cipher = (o as { cipher?: unknown }).cipher;
    if (typeof ephPub !== "string" || typeof nonce !== "string" || typeof cipher !== "string")
      return null;
    if (ephPub.length < 16 || nonce.length < 8 || cipher.length < 8) return null;
    return { v: 1, ephPub, nonce, cipher };
  } catch {
    return null;
  }
}
