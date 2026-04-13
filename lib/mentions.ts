/**
 * Mention helpers (regex + agent short-handle resolution).
 * DB resolution lives in `modules/messages/mentions-resolve.ts`.
 */

const HANDLE_ALIASES: Record<string, string> = {
  oracle: "oracle.nullxes",
  analyst: "analyst.nullxes",
  writer: "writer.nullxes",
};

export function resolveAgentHandleFromMention(raw: string): string | null {
  const h = raw.trim().toLowerCase();
  if (!h) return null;
  if (h.includes(".")) return h;
  return HANDLE_ALIASES[h] ?? null;
}

/** Unique @token substrings (without leading @), in order of first appearance. */
export function extractMentionTokens(text: string): string[] {
  const re = /@([\w.-]+)/g;
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = m[1] ?? "";
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** @-mention query at end of text for autocomplete (after last unclosed @). */
export function mentionQueryAtCaret(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, Math.min(caret, text.length));
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  const afterAt = before.slice(at + 1);
  if (/\s/.test(afterAt)) return null;
  return { start: at, query: afterAt };
}
