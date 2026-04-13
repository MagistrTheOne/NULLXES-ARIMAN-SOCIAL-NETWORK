import { StreamClient } from "@stream-io/node-sdk";

export function streamServerClient() {
  const apiKey = process.env.STREAM_API_KEY ?? "";
  const apiSecret = process.env.STREAM_API_SECRET ?? "";
  if (!apiKey || !apiSecret) {
    throw new Error("STREAM_NOT_CONFIGURED");
  }
  return new StreamClient(apiKey, apiSecret);
}
