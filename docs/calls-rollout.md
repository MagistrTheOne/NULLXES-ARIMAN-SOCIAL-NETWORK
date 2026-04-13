# ARIMAN Calls Rollout

## Phase A - 1:1 Audio (Internal)
- Enable signaling + mediasoup process for internal team.
- Join/leave/mute flow in `messages` UI.
- Validate reconnect + room cleanup in unstable network tests.

## Phase B - Stability Gate
- Track RTT and reconnect frequency from client signaling metrics.
- Fail the session to safe ended state when repeated reconnect loops exceed threshold.
- Keep voice message upload path as fallback when live call is degraded.

## Phase C - Video Support
- Reuse `media:transport:*` and `media:producer/create` contracts for video tracks.
- Add camera producer creation and remote consumer rendering path.
- Add camera permission and local preview states in UI.

## Phase D - Group Calls
- Allow multiple remote producers per call room.
- Add participant roster and active speaker indicators.
- Add moderation controls (mute-all / remove participant) on top of existing room auth.

## Deployment Notes
- Run Next.js app and signaling/media server as separate services.
- Configure TURN/STUN before external rollout.
- Keep `SIGNALING_CORS_ORIGIN` aligned with app origins.
