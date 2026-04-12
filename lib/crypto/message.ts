export const CURRENT_ENCRYPTION_VERSION = 1;

export type StoredMessagePayload = {
  body: string | null;
  ciphertext: string | null;
  encryptionVersion: number;
};

export function assertPlaintextPhase(payload: Pick<StoredMessagePayload, "encryptionVersion">) {
  if (payload.encryptionVersion !== 0) {
    throw new Error("Unsupported encryption version for plaintext path");
  }
}
