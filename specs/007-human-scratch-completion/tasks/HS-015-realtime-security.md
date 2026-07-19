# HS-015 — Secure Supabase Realtime Connection

- **Status:** queued
- **Source:** `specs/human-scratch.md:325-326`; exact frozen text is in `SCOPE.json#HS-015`
- **Package:** P05
- **Depends on:** P04 threat model and permission model

## Frozen requirement

> Determine whether Supabase WebSockets work with CORS and are properly secured by public-key-hash
> vault access.

## Current evidence to revalidate

- Sync writes/pulls `vault_ops`, while `src/lib/supabase/realtime.ts` currently subscribes to legacy
  `vault_updates`, so live sync may not observe current writes.
- Browser Supabase uses an anon key without a demonstrated short-lived identity token compatible
  with the custom Ed25519 signing model. Realtime publication currently includes legacy/current
  tables.
- Presence transport security affects HS-003 and must share the corrected authorization boundary.

## Acceptance direction

- Research current Supabase Realtime auth/origin behavior from primary docs. Implement a
  short-lived, verified authorization mechanism bound to public-key identity, vault membership,
  channel/table and role; refresh/revoke it safely.
- Subscribe to the authoritative encrypted `vault_ops` stream (and explicitly justified snapshot/
  presence channels), never legacy duplication. Unauthorized clients cannot enumerate or subscribe.
- Production origins/TLS/config are explicit; reconnect, background, token expiry, offline catch-up
  and membership removal do not leak or stall. Server still verifies writes independently.

## Implementation and review checkpoints

- Document handshake/data flow and distinguish WebSocket origin controls from authorization.
  Reviewer observes real push-driven two-client sync without refresh and adversarial socket
  rejection.

## Automated tests

- Integration: token mint/expiry/replay/refresh, owner/member/outsider and cross-vault
  subscriptions, publication/table correctness, removal and reconnect catch-up.
- Two-context E2E: live edits/import/delete/presence appear without reload; offline/reconnect and
  revoked member fail safely. Full suite and repeated no-retry sync journey.

## Manual Playwright CLI charter

- Run owner/member/outsider sessions, edit concurrently, watch true live updates, expire/reconnect,
  background/foreground, duplicate tabs and remove access.
- Inspect requests/console/socket-related logs for legacy-table traffic, reconnect storms, secrets
  in URLs, unauthorized payloads and CORS errors. Judge saved/offline UX in mobile/dark/reduced
  motion.

## UX, style, and E2E review

Apply sync/crypto/tRPC/E2E guidance. Live state must be truthful and recover automatically; no
refresh requirement, infinite spinner or silent missed update is acceptable.

## Risks and questions

- Risks: confusing CORS with auth, token theft/replay, publication mismatch, reconnect storms,
  revoked access lingering. Record protocol choices and primary references in assigned evidence and
  return any global-decision proposal for root transcription.
