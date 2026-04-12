import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/** Mount Better Auth at `/api/auth/*` (Next.js App Router). */
export const { POST, GET } = toNextJsHandler(auth);
