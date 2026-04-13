import { z } from "@/lib/security/validation";

const encryptedFields = {
  ciphertext: z.string().min(32),
  encryption_version: z.literal(1),
  sender_public_key: z.string().min(32),
};

export const createMessageBodySchema = z.union([
  z
    .object({
      conversationId: z.uuid(),
      ...encryptedFields,
    })
    .strict(),
  z
    .object({
      peerUserId: z.uuid(),
      ...encryptedFields,
    })
    .strict(),
  z
    .object({
      conversationId: z.uuid(),
      body: z.string().min(1).max(16000),
    })
    .strict(),
  z
    .object({
      peerUserId: z.uuid(),
      body: z.string().min(1).max(16000),
    })
    .strict(),
]);

export const listMessagesQuerySchema = z.union([
  z.object({ mode: z.literal("conversations") }),
  z.object({
    conversationId: z.uuid(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  }),
]);
