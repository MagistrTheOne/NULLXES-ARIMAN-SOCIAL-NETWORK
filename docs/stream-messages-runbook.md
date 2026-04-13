# Stream Messages Mode Runbook

## Required Environment Variables

Set these in `.env`:

- `STREAM_API_KEY`
- `STREAM_API_SECRET`
- `STREAM_DEFAULT_CALL_TYPE` (default: `default`)
- `NEXT_PUBLIC_STREAM_API_KEY` (same value as `STREAM_API_KEY`)

## Local Start

1. Start app:
   - `npm run dev`
2. Open:
   - `/messages?conversation=<conversation-uuid>`

## How call/channel mapping works

- Stream `callId`: `conversation-<conversationId>`
- Stream `channelId`: `conversation-<conversationId>`
- Stream user id format: `ariman-user-<userId>`

The token endpoint enforces membership on the requested conversation before issuing a token.

## Troubleshooting

- `Stream API is not configured`:
  - missing `STREAM_API_KEY` or `STREAM_API_SECRET`.
- `Forbidden` on `/api/stream/token`:
  - current user is not a member of the selected conversation.
- Empty chat/call panel:
  - verify `conversation` query param is a valid UUID and belongs to current user.
