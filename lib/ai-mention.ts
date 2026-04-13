/** Client-safe parsing for @agent mentions (no DB). */

import { resolveAgentHandleFromMention } from "@/lib/mentions";

export { resolveAgentHandleFromMention } from "@/lib/mentions";

export function extractFirstAiAgentHandle(text: string): string | null {
  const re = /@([\w.-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const h = resolveAgentHandleFromMention(m[1] ?? "");
    if (h) return h;
  }
  return null;
}

export function shouldRouteToAiChat(text: string): boolean {
  return extractFirstAiAgentHandle(text) != null;
}

export function parseLeadingAgentMention(
  text: string,
): { agentHandle: string; userPrompt: string } | null {
  const trimmed = text.trimStart();
  const m = trimmed.match(/^@([\w.-]+)\s*/);
  if (!m?.[1]) return null;
  const resolved = resolveAgentHandleFromMention(m[1]);
  if (!resolved) return null;
  const userPrompt = trimmed.slice(m[0].length).trim();
  if (!userPrompt) return null;
  return { agentHandle: resolved, userPrompt };
}
