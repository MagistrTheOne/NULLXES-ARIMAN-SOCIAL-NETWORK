import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { identities } from "@/lib/db/schema";
import { assertIdentityOwned } from "@/modules/identities/access";

export async function updateProfileIdentity(
  userId: string,
  identityId: string,
  patch: { displayName?: string; bio?: string | null; avatarUrl?: string | null },
) {
  const ok = await assertIdentityOwned(userId, identityId);
  if (!ok) throw new Error("FORBIDDEN_IDENTITY");

  const updates: { displayName?: string; bio?: string | null; avatarUrl?: string | null } = {};
  if (patch.displayName !== undefined) updates.displayName = patch.displayName;
  if (patch.bio !== undefined) updates.bio = patch.bio;
  if (patch.avatarUrl !== undefined) updates.avatarUrl = patch.avatarUrl;

  if (Object.keys(updates).length === 0) {
    const row = await db.query.identities.findFirst({
      where: eq(identities.id, identityId),
    });
    return row;
  }

  const [row] = await db
    .update(identities)
    .set(updates)
    .where(eq(identities.id, identityId))
    .returning();

  return row;
}
