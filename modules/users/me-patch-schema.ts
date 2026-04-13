import { z } from "@/lib/security/validation";

export const patchMeBodySchema = z
  .object({
    identityId: z.uuid(),
    displayName: z.string().min(1).max(120).optional(),
    bio: z.union([z.string().max(4000), z.null()]).optional(),
  })
  .strict()
  .refine((d) => d.displayName !== undefined || d.bio !== undefined, {
    message: "Provide displayName and/or bio to update",
  });
