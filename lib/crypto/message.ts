export const CURRENT_ENCRYPTION_VERSION = 0;

export type StoredMessagePayload = {
  body: string;
  encryptionVersion: typeof CURRENT_ENCRYPTION_VERSION;
};

export function assertPlaintextPhase(payload: StoredMessagePayload) {
  if (payload.encryptionVersion !== CURRENT_ENCRYPTION_VERSION) {
    throw new Error("Unsupported encryption version");
  }
}
