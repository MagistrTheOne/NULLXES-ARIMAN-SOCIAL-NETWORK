import { z } from "@/lib/security/validation";

export const identityActionBodySchema = z
  .object({
    identityId: z.uuid(),
  })
  .strict();

export const createCommentBodySchema = z
  .object({
    identityId: z.uuid(),
    body: z.string().min(1).max(4000),
  })
  .strict();
