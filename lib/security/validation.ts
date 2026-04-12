import { z } from "zod";

export { z };

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; issues?: { path: (string | number)[]; message: string }[] };

export function parseBody<T>(schema: z.ZodType<T>, input: unknown): ParseResult<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    error: parsed.error.message,
    issues: parsed.error.issues.map((i) => ({
      path: i.path as (string | number)[],
      message: i.message,
    })),
  };
}
