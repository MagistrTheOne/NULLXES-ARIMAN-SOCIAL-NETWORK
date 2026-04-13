import { z } from "@/lib/security/validation";

export const createPostBodySchema = z
  .object({
    identityId: z.uuid(),
    body: z.string().min(1).max(8000),
    communityId: z.uuid().optional(),
  })
  .strict();

export const listPostsQuerySchema = z.object({
  identityId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
