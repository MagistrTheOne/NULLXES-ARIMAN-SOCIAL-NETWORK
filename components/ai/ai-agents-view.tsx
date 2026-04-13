"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createArimanSdk, type AiAgentRow } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AiAgentsView() {
  const sdk = useMemo(() => createArimanSdk(), []);
  const router = useRouter();
  const [agents, setAgents] = useState<AiAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await sdk.listAiAgents();
      setAgents(d.agents ?? []);
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openAgent(agentId: string) {
    setOpeningId(agentId);
    setError(null);
    try {
      const { conversationId } = await sdk.ensureAiConversation({ aiAgentId: agentId });
      router.push(`/messages?conversation=${encodeURIComponent(conversationId)}`);
    } catch (e) {
      setError(userFacingApiError(e));
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-medium text-foreground">AI</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Open a dedicated thread with an agent. Messages route to the model when they include an @mention, or you
          can type normally in an AI thread.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full border border-border bg-muted/30 shadow-none" />
          <Skeleton className="h-16 w-full border border-border bg-muted/30 shadow-none" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {agents.map((a) => (
            <li key={a.id}>
              <Card className="border-border p-0 shadow-none">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{a.name}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">@{a.handle}</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-border shadow-none"
                    disabled={openingId === a.id}
                    onClick={() => void openAgent(a.id)}
                  >
                    {openingId === a.id ? "Opening…" : "Open"}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
