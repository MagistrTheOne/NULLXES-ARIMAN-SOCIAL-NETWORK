const RELATION_MISSING = /relation .+ does not exist/i;

function messageLooksLikeMissingRelation(msg: string): boolean {
  return RELATION_MISSING.test(msg);
}

function visitPgError(cur: unknown, depth: number, seen: Set<unknown>): boolean {
  if (cur == null || depth > 16 || seen.has(cur)) return false;
  seen.add(cur);

  if (typeof cur === "string") return messageLooksLikeMissingRelation(cur);

  if (typeof cur === "object") {
    const o = cur as Record<string, unknown>;

    const code = o.code;
    if (code === "42P01" || String(code) === "42P01") return true;

    for (const key of ["message", "detail", "hint"] as const) {
      const v = o[key];
      if (typeof v === "string" && messageLooksLikeMissingRelation(v)) return true;
    }

    const cause = o.cause;
    if (cause !== undefined && visitPgError(cause, depth + 1, seen)) return true;

    if (cur instanceof AggregateError && Array.isArray(cur.errors)) {
      for (const e of cur.errors) {
        if (visitPgError(e, depth + 1, seen)) return true;
      }
    }
  }

  return false;
}

/**
 * True when Postgres reports a missing relation (e.g. table not migrated yet).
 * Drizzle often throws a wrapper whose message is "Failed query: ..."; the real
 * `42P01` / "relation … does not exist" lives on nested `cause` (Neon driver).
 */
export function isUndefinedRelationError(err: unknown): boolean {
  const seen = new Set<unknown>();
  if (visitPgError(err, 0, seen)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return messageLooksLikeMissingRelation(msg);
}
