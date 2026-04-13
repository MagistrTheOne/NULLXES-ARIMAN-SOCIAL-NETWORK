import { z } from "@/lib/security/validation";

const avatarUrlField = z.union([
  z.null(),
  z.string().url().max(4000),
  z
    .string()
    .max(520000)
    .regex(/^data:image\/(png|jpeg|webp);base64,/i, "Avatar must be PNG, JPEG, or WebP data URL"),
]);

export const patchMeBodySchema = z
  .object({
    identityId: z.uuid(),
    displayName: z.string().min(1).max(120).optional(),
    bio: z.union([z.string().max(4000), z.null()]).optional(),
    avatarUrl: avatarUrlField.optional(),
  })
  .strict()
  .refine((d) => d.displayName !== undefined || d.bio !== undefined || d.avatarUrl !== undefined, {
    message: "Provide displayName, bio, and/or avatarUrl to update",
  });
