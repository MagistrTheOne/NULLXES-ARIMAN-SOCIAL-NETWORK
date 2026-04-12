import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { passkey as passkeyPlugin } from "@better-auth/passkey";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      passkey: schema.passkey,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    /** Allow full sign-up flow without outbound mail; APIs still enforce session. */
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  advanced: {
    database: { generateId: "uuid" },
  },
  plugins: [
    passkeyPlugin({
      rpID: process.env.PASSKEY_RP_ID ?? "localhost",
      rpName: "NULLXES ARIMAN",
      origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    }),
    nextCookies(),
  ],
});
