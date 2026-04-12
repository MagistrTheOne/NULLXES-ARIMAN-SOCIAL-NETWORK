import { createAuthClient } from "better-auth/react";

/**
 * Browser client for Better Auth (same origin; absolute base URL in env).
 * @see https://www.better-auth.com/docs/installation#create-client-instance
 */
const baseURL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
});

export const { signIn, signUp, useSession, signOut } = authClient;
