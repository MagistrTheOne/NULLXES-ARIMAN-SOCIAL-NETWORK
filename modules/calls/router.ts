import { getCallRouter } from "./worker";

export async function getCallRtpCapabilities(callId: string) {
  const router = await getCallRouter(callId);
  return router.rtpCapabilities;
}
