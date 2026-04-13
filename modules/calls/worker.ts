import mediasoup from "mediasoup";
import type { Router, Worker } from "mediasoup/types";
import { mediasoupRouterCodecs, mediasoupWorkerSettings } from "./config";

let workerPromise: Promise<Worker> | null = null;
const routersByCallId = new Map<string, Router>();

export async function getMediasoupWorker() {
  if (!workerPromise) {
    workerPromise = mediasoup.createWorker(mediasoupWorkerSettings());
    (await workerPromise).on("died", () => {
      workerPromise = null;
      routersByCallId.clear();
    });
  }
  return workerPromise;
}

export async function getCallRouter(callId: string) {
  const existing = routersByCallId.get(callId);
  if (existing) return existing;
  const worker = await getMediasoupWorker();
  const router = await worker.createRouter({ mediaCodecs: mediasoupRouterCodecs() });
  routersByCallId.set(callId, router);
  return router;
}

export function closeCallRouter(callId: string) {
  const router = routersByCallId.get(callId);
  if (!router) return;
  try {
    router.close();
  } catch {
    // ignore teardown errors
  }
  routersByCallId.delete(callId);
}
