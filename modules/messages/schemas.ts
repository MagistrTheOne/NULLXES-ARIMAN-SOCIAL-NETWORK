import { z } from "@/lib/security/validation";

export const createMessageBodySchema = z.union([
  z.object({
    conversationId: z.uuid(),
    body: z.string().min(1).max(16_000),
  }),
  z.object({
    peerUserId: z.uuid(),
    body: z.string().min(1).max(16_000),
  }),
]);

export const listMessagesQuerySchema = z.object({
  conversationId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
