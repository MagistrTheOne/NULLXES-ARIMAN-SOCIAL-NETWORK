import { NextResponse } from "next/server";
import { withApiSecurityHeaders } from "@/lib/security/headers";

export const runtime = "nodejs";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "NULLXES ARIMAN API",
    version: "0.1.0",
  },
  paths: {
    "/api/users/me": {
      get: {
        summary: "Current user and identities",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/posts": {
      get: {
        summary: "List posts for identity",
        parameters: [
          { name: "identityId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
        ],
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
      post: {
        summary: "Create post",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["identityId", "body"],
                properties: {
                  identityId: { type: "string", format: "uuid" },
                  body: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/messages": {
      get: {
        summary: "List messages in conversation",
        parameters: [
          {
            name: "conversationId",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
      post: {
        summary: "Send message (or open DM with peerUserId)",
        security: [{ cookieAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/realtime/token": {
      post: {
        summary: "Mint short-lived realtime subscribe token",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/clips": {
      get: {
        summary: "List clips for identity (with Stream fields and interaction counts)",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
      post: {
        summary: "Create clip (post + clip row)",
        security: [{ cookieAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/clips/upload": {
      post: {
        summary: "Upload video to Cloudflare Stream and attach to clip",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "OK" },
          "502": { description: "Upstream / upload error" },
          "503": { description: "Stream not configured" },
        },
      },
    },
    "/api/clips/{clipId}/view": {
      post: {
        summary: "Increment clip viewsCount",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "OK" }, "404": { description: "Not found" } },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
      },
    },
  },
};

export async function GET() {
  return withApiSecurityHeaders(
    NextResponse.json(spec, {
      headers: { "Cache-Control": "public, max-age=60" },
    }),
  );
}
