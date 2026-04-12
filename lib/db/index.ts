import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://127.0.0.1:5432/ariman_placeholder?sslmode=disable";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
