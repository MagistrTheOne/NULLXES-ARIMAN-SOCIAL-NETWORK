"use client";

import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { extract, expand } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { parseEnvelopeV1, type MessageEnvelopeV1 } from "@/lib/crypto/envelope";

const HKDF_INFO = new TextEncoder().encode("ariman-msg-v1");

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return globalThis.btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function deriveAeadKey(sharedSecret: Uint8Array): Uint8Array {
  const prk = extract(sha256, sharedSecret, new Uint8Array(0));
  return expand(sha256, prk, HKDF_INFO, 32);
}

export function generateKeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array } {
  const { secretKey, publicKey } = x25519.keygen();
  return { publicKey, privateKey: secretKey };
}

export function publicKeyToBase64(publicKey: Uint8Array): string {
  return toB64(publicKey);
}

export function privateKeyFromBase64(b64: string): Uint8Array {
  return fromB64(b64);
}

export function publicKeyFromBase64(b64: string): Uint8Array {
  return fromB64(b64);
}

export function encryptMessage(
  message: string,
  recipientPublicKeyBase64: string,
  senderPrivateKey: Uint8Array,
): { ciphertext: string; sender_public_key: string } {
  const recipientPub = publicKeyFromBase64(recipientPublicKeyBase64);
  const ephemeral = x25519.keygen();
  const shared = x25519.getSharedSecret(ephemeral.secretKey, recipientPub);
  const aeadKey = deriveAeadKey(shared);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const pt = new TextEncoder().encode(message);
  const cipher = chacha20poly1305(aeadKey, nonce).encrypt(pt);
  const senderPub = x25519.getPublicKey(senderPrivateKey);
  const env: MessageEnvelopeV1 = {
    v: 1,
    ephPub: toB64(ephemeral.publicKey),
    nonce: toB64(nonce),
    cipher: toB64(cipher),
  };
  return {
    ciphertext: JSON.stringify(env),
    sender_public_key: toB64(senderPub),
  };
}

export function decryptMessage(ciphertextJson: string, privateKey: Uint8Array): string {
  const env = parseEnvelopeV1(ciphertextJson);
  if (!env) throw new Error("Invalid envelope");
  const ephPub = fromB64(env.ephPub);
  const nonce = fromB64(env.nonce);
  const cipher = fromB64(env.cipher);
  const shared = x25519.getSharedSecret(privateKey, ephPub);
  const aeadKey = deriveAeadKey(shared);
  const pt = chacha20poly1305(aeadKey, nonce).decrypt(cipher);
  return new TextDecoder().decode(pt);
}
