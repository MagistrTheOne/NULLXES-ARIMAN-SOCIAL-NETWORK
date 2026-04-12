import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { identities, users } from "@/lib/db/schema";

export async function ensurePrimaryIdentity(userId: string) {
  const existing = await db.query.identities.findMany({
    where: eq(identities.userId, userId),
    limit: 10,
  });
  if (existing.length > 0) return existing;

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const base = u?.name?.replace(/\s+/g, "_").toLowerCase() || "user";
  const handle = `${base}_${randomUUID().slice(0, 10)}`;

  const [row] = await db
    .insert(identities)
    .values({
      userId,
      handle,
      displayName: u?.name ?? "User",
    })
    .returning();

  return row ? [row] : [];
}
