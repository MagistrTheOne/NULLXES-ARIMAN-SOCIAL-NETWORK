import { and, ilike, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type UserSearchRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export async function searchUsers(
  currentUserId: string,
  query: string,
  limit: number,
): Promise<UserSearchRow[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const safe = q.slice(0, 128).replace(/%/g, "").replace(/_/g, "");
  const pattern = `%${safe}%`;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(
      and(
        ne(users.id, currentUserId),
        or(ilike(users.email, pattern), ilike(users.name, pattern)),
      ),
    )
    .limit(limit);

  return rows;
}
