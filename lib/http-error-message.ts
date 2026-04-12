import { ArimanHttpError } from "@nullxes/ariman-sdk";

/** Maps SDK/network errors to fixed copy for UI. */
export function userFacingApiError(err: unknown): "Unauthorized" | "Request failed" {
  if (err instanceof ArimanHttpError && err.status === 401) return "Unauthorized";
  return "Request failed";
}
