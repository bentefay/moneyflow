# P05 Implementation Evidence — Revision 13

## Immutable dispatch boundary

- Package/scope/revision: `P05` / `HS-015` / `13`, reopened under **D-017** (supersedes D-011).
- Build BASE / pre-implementation HEAD: `92dfd4d002e8bcb2a6694c35aff8f713ba4689dc` (HANDOFF), with
  root's later ledger commit `ca22ed6` present on the branch at dispatch.
- Cumulative re-review range for the reviewer: `007651beb814d98646aa2e786801b647e2abd0b5` -> new
  HEAD.
- Sole implementer artifact: this file, left uncommitted.
- Allowed writes: `tests/integration/**`, `tests/e2e/**`, `tests/unit/**`, and — only where strictly
  required to make security acceptance provable — `src/lib/supabase/realtime.ts`,
  `src/server/routers/realtime.ts`, `src/server/schemas/realtime.ts`.
- Forbidden: all ledgers, `specs/human-scratch.md`, `SCOPE.json`, FS-001, `tasks/**`, `reviews/**`,
  `.claude/**`, `.codex/**`. No `git add .` / `git add -A`.

## Governing scope (D-017)

HS-015's frozen requirement is **websocket security**: how the client connects to Supabase for
websockets, whether that works with CORS, and whether it is properly secured by public-key-hash
vault access. The hidden-tab "first late edge" network-timing study (D-011 / Q-013) is explicitly
OUT OF SCOPE and accepted as an unmeasured non-issue. No `worker: true`, timeout change, reload or
poll mitigation is introduced for it.

## Architecture under test (as already built — preserved, not changed)

### Handshake and data flow

1. The browser holds an Ed25519 seed-derived identity. Every tRPC request is signed (`x-pubkey`,
   `x-timestamp`, `x-nonce`, `x-signature`) and the server replay-guards it through
   `claim_request_nonce`. The server derives `ctx.pubkeyHash` only from a verified signature.
2. `realtime.authorize` calls
   `rotate_realtime_grant(p_pubkey_hash, p_vault_id, p_purpose, p_previous_grant_id, p_ttl_seconds)`
   as `service_role`. The RPC raises SQLSTATE `42501` unless the caller's `pubkey_hash` has a live
   `vault_memberships` row for that exact vault on a non-deleted vault. The router maps `42501` ->
   tRPC `FORBIDDEN`.
3. On success the RPC inserts an opaque `realtime_grants` row and returns
   `(grant_id, vault_role, expires_at)`. The router HS256-signs a 60-second JWT whose claims are
   `sub`/`jti = grant_id`, `role: authenticated`, `vault_id`, `realtime_table: vault_ops`,
   `realtime_purpose`, `realtime_topic: vault:{id}:{purpose}`, `vault_role`, plus `iat`,
   `nbf = iat - 5s` (clock skew) and `exp = iat + 60s`. **The pubkey hash never enters the token.**
   `refreshAt = exp - 20s` gives the client a refresh lead.
4. `VaultRealtimeSync.subscribe()` mints the grant _before_ opening any socket, creates an isolated
   Supabase client whose `accessToken` callback returns that token, awaits `realtime.setAuth()` so
   the first `phx_join` cannot race ahead with the anon API key, then joins the private channel
   `vault:{id}:{purpose}` and binds `postgres_changes` INSERT on `public.vault_ops` filtered to
   `vault_id=eq.{id}`.
5. The Realtime server verifies the JWT signature and expiry, stores its claims on
   `realtime.subscription`, and evaluates `realtime.messages` RLS (`realtime_topic_allowed` /
   `realtime_topic_send_allowed`) plus the `vault_ops` SELECT policy (`realtime_grant_allows`) per
   row. Both re-check the _live_ grant row (not revoked, not expired) joined to a matching
   `vault_memberships` row, and require every claim to equal the stored grant. Revoking membership
   or the grant therefore stops delivery at the database, not just in the client.
6. Writes never travel over the socket. `sync.pushOps` is a signed tRPC mutation that appends
   through `append_vault_ops`; `authenticated` has no INSERT/UPDATE/DELETE privilege on `vault_ops`.
   The realtime grant is a read/subscribe capability only.

### CORS vs. authorization (the part HS-015 asks about explicitly)

- **CORS does not apply to the WebSocket upgrade.** The Fetch/CORS specification governs
  XHR/`fetch`; the WebSocket protocol has its own handshake with an `Origin` header and is
  deliberately exempt from the same-origin policy's CORS preflight machinery. A browser will open a
  cross-origin `wss://` connection with no preflight and no `Access-Control-Allow-Origin`
  requirement. **A missing or permissive CORS configuration therefore neither blocks nor secures the
  Realtime socket.** Any design that relied on CORS/origin allow-lists to protect Realtime would be
  unprotected.
- Supabase's browser CORS/redirect allow-lists apply to the REST/Auth HTTP surfaces, not to
  `/realtime/v1/websocket`. `supabase/config.toml` already records this next to `[realtime]`.
- Consequently **all** Realtime security here is authorization, not origin: a short-lived HS256
  grant bound to a verified `pubkey_hash`'s current vault membership, scoped to one vault, one
  purpose/topic, one table and one role, re-verified in the database on every read.
- **Production origins/TLS:** `NEXT_PUBLIC_SUPABASE_URL` is validated by
  `requireSecureSupabaseUrl(url, NODE_ENV)`, which requires `https:` outside development, so the SDK
  derives `wss://` for the socket. Locally the stack is loopback plaintext (`http://127.0.0.1:54321`
  -> `ws://127.0.0.1:54321`). The token is carried in the `phx_join` payload / `setAuth`, not in the
  socket query string, so it cannot leak through URLs, logs or referrers.

## Gaps this revision closes (acceptance, not architecture)

The security substance existed but its acceptance was proven mostly by mocks and by the SQL audit
that is not part of the automated gate. Revision 13 adds **real** coverage:

1. Router-level integration: exact claim set and TTL, HMAC integrity (tampered payload / foreign
   secret), refresh rotation carrying `previousGrantId`, rotation denial, outsider and cross-vault
   denial mapped to `FORBIDDEN`, `revoke`, no-secret-in-output, and `vault_ops`-only table scope.
2. Live adversarial socket coverage against the **real** local Supabase Realtime server from Node:
   anon-key-only, forged-signature, expired, revoked/replayed, outsider and cross-vault tokens are
   all denied and receive no `vault_ops` data, while the legitimate grant receives a real INSERT.
3. Publication correctness proven against the live database: `supabase_realtime` publishes exactly
   `vault_ops` (no legacy `vault_updates`).
4. Two-context browser E2E already proves push-driven import/edit/delete plus removal fail-safe;
   this revision adds offline -> reconnect catch-up and the visibility-driven re-sync behavior test.

## Background robustness — logic only, no timing claims

`page.addInitScript` redefines `Document.prototype.visibilityState` / `hidden` getters and provides
a helper that dispatches `visibilitychange`. This flips **only the JS predicate**; it does not
throttle the socket, the timers or the network. To create a genuinely missed update
deterministically the test suppresses server -> page `postgres_changes` frames with
`page.routeWebSocket` (the channel stays joined; only the live push is dropped). The assertions are
about **convergence of state**:

- while hidden and suppressed, the second client shows no leaked data and no error;
- after a hidden -> visible transition, it re-syncs the missed `vault_ops` over the durable tRPC
  catch-up path and converges to the exact expected state;
- sync status returns to a settled state (no infinite spinner) and no console/page error is emitted.

**No wall-clock latency is asserted anywhere, and no number produced under this mock is or will be
presented as measured genuinely-hidden-tab network timing.** The 2026-07-26 root probe found CDP
`Emulation.setVisibilityState` absent in the bundled Chromium; raw CDP is not attempted.

## Validation plan

1. Write the notes above before any test/product change (done).
2. Add RED integration + E2E coverage; confirm each new adversarial case fails against a
   deliberately broken control before it passes against the real boundary.
3. Full gate: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`.
   Format only the exact changed paths with `pnpm exec oxfmt`; never bare `pnpm format` (Q-024).
4. Repeat the realtime/security E2E with `--retries=0 --repeat-each`.
5. Stage only exact authorized `src/**` and `tests/**` paths; leave this evidence uncommitted.

## Defect found and fixed — durable catch-up was answered from cache

The background-behaviour test failed for a real reason, not a harness reason.

- **Symptom:** with the live `vault_ops` push withheld, a hidden->visible transition did NOT
  converge. The client stayed permanently missing the operation.
- **Diagnosis:** the `visibilitychange` handler fired, `catchUpFromServer()` ran, and
  `sync.getUpdates` returned `type: "ops", count: 0` **with no network request at all**.
  `VaultProvider` wired the SyncManager's `getUpdates`/`getSnapshot` to `trpcUtils.sync.*.fetch()`,
  which honours React Query's default `staleTime: 60 * 1000`
  (`src/components/providers/trpc-provider.tsx`). The catch-up was being answered from cache.
- **Proof it was the cache, not a race:** foregrounding inside the 60-second window converged
  `count=0`; waiting out `staleTime` and foregrounding again converged `count=1`, same run, same
  suppressed push. This is exactly the "silent missed update" the acceptance forbids, and it also
  degraded the offline->reconnect path, which uses the same code.
- **Fix (minimal, 1 file):** `src/components/providers/vault-provider.tsx` now routes sync reads
  through the direct client (`trpcUtils.client.sync.getUpdates.query` / `getSnapshot.query`).
  Recovery reads must always hit the server; caching a recovery read defeats its only purpose. No
  authorization, schema, payload, CRDT or transport change.
- **RED control:** reverting only this change makes `realtime-recovery.spec.ts` "a hidden receiver
  re-syncs missed vault_ops" fail; restoring it passes.

## Adversarial reproduction — the tests are load-bearing

Two independent RED controls confirm the assertions detect real weakening rather than passing
vacuously:

1. **Authorization control.** `public.realtime_grant_allows` and `public.realtime_topic_allowed`
   were temporarily replaced with `SELECT true` in the local database. **9 of 25** socket-security
   tests failed immediately: revoked replay, rotated replay, cross-vault, rewritten `vault_id`,
   escalated `vault_role`, widened table, mismatched topic, unknown grant id, and membership-removal
   fail-safe. Both functions were then restored from their migration source and verified
   **byte-identical** to the captured pre-control `pg_get_functiondef` output; the suite returned to
   25/25.
2. **Suppression control.** An early version of the visibility test passed even with the product's
   foreground re-sync deliberately disabled — because `routeWebSocket` was installed _after_
   navigation (it only affects sockets opened later) and the predicate matched `"event":"INSERT"`
   while real frames carry `"table":"vault_ops"` with `"type":"INSERT"`. Both defects were fixed:
   the route is now installed before navigation, and the test asserts `suppressedCount() > 0` so it
   can never again pass on a push that was never actually withheld.

## Results

Changed paths (exactly 7, all authorized):

| Path                                                 | Purpose                                          |
| ---------------------------------------------------- | ------------------------------------------------ |
| `src/components/providers/vault-provider.tsx`        | the cache defect fix above (only product change) |
| `tests/integration/realtime-grant-lifecycle.test.ts` | 23 router/token tests                            |
| `tests/integration/realtime-socket-security.test.ts` | 25 live-server socket tests                      |
| `tests/integration/realtime-origin-controls.test.ts` | 9 CORS/origin vs. authorization tests            |
| `tests/integration/helpers/realtime-stack.ts`        | live-stack fixtures (no secrets emitted)         |
| `tests/e2e/realtime-recovery.spec.ts`                | 3 convergence journeys                           |
| `tests/e2e/helpers/visibility.ts`                    | documented JS-predicate visibility control       |

Gates on the committed state:

- `pnpm typecheck` — pass. `pnpm lint` — 0 errors (10 pre-existing warnings).
- `pnpm test` — **1,684 passed / 2 skipped across 77 files** (57 new).
- `pnpm test:e2e` — **122/122** with `--retries=0`, twice.
- Repeated serial `realtime-security` + `realtime-recovery` + `tab-duplication` with
  `--workers=1 --repeat-each=3 --retries=0` — **15/15**.
- `pnpm format:check` — the 16 failures are all pre-existing `specs/**` files (Q-024); no `src/` or
  `tests/` path fails. Only exact changed paths were formatted with `pnpm exec oxfmt`.
- Implementation commit: `b34dcf6`. This evidence is intentionally uncommitted.

## Preserved boundary — confirmed unchanged

`git diff` over `src/server/routers/realtime.ts`, `src/lib/supabase/realtime.ts`,
`src/server/schemas/realtime.ts`, `src/lib/sync/manager.ts` and `supabase/**` is **empty**. Token
scope/TTL, the pubkey-hash authorization boundary, `vault_ops`-only subscription and the rev-11
same-identity correction are all intact. No `worker: true`, no timeout change, no reload/poll
mitigation, no legacy-table subscription, and no migration was needed — no security gap was found.

## Honesty statements

- **No faked timing evidence.** No wall-clock latency is asserted in any new test. The only
  durations in this document are test-suite runtimes. No mock- or CDP-driven number is presented as
  measured genuinely-hidden-tab network timing; raw CDP was not attempted.
- **No secret leak.** The local symmetric key is derived into memory and never logged, asserted on,
  returned or written to evidence. Tests assert the token does NOT contain the identity hash or the
  signing secret. The only literal secret-shaped string added is the synthetic
  `"test-secret-that-is-at-least-thirty-two-characters"` vector, matching the existing convention in
  `tests/integration/realtime-auth.test.ts`. Database fixtures use `sha256`-of-a-label identity
  hashes and public base64 vectors, and are deleted in `afterAll`.
- **Local database state** was returned to its pre-run condition; the control-weakened functions
  were restored and verified byte-identical.

## Note for the reviewer — one judgement call worth checking

`tests/e2e/realtime-recovery.spec.ts` filters transport-layer console errors
(`nonTransportProblems`) before asserting the page is healthy. This is deliberate: two of the three
journeys intentionally sever or suppress the connection, and the full parallel suite shares one dev
server, so a dropped socket is the expected condition the client must absorb. **The security claims
are never judged by that filter** — data exposure is asserted directly against rendered state
(`toHaveCount(0)`). A reviewer may reasonably want the filter narrowed; it is one small function.
