# P05 Review 13 — HS-015 Secure Supabase Realtime Authorization

**Reviewer:** `p05-reviewer-13` (independent; did not author this code) **Range reviewed:** original
P05 BASE `007651be` → new HEAD `b34dcf6`; new delta build BASE `92dfd4d` **Governing scope:** D-017
(supersedes D-011). HS-015 frozen requirement = websocket security (client→Supabase connection, CORS
applicability, public-key-hash vault-access enforcement). The hidden-tab network-timing study
(D-011/Q-013) is out of scope and treated as an accepted unmeasured non-issue.

## VERDICT: PASS

The already-accepted rev-11 authorization boundary is byte-for-byte preserved; the single new
product change is a correct, minimal fix to a real silent-missed-update defect; and the new tests
genuinely prove the HS-015 security acceptance against the **real** local Supabase Realtime server.
No faked hidden-tab timing, no secret leak, no regression. All gates I ran passed (full E2E suite of
122 not run — see Limitations).

---

## Per-item findings

### 1. Preserved authorization boundary is intact — CONFIRMED

`git diff 92dfd4d..b34dcf6 -- src/server/routers/realtime.ts src/lib/supabase/realtime.ts src/server/schemas/realtime.ts src/lib/sync/manager.ts supabase/`
is **empty (0 lines)**. I also read the current files to confirm the substance, not just the diff:

- `src/server/routers/realtime.ts` — `authorize` mints a 60s HS256 token only after
  `rotate_realtime_grant(p_pubkey_hash=ctx.pubkeyHash, …)` succeeds; `error.code === "42501"` →
  `FORBIDDEN`, otherwise `INTERNAL_SERVER_ERROR`. Token claims are `sub`/`jti = grant_id`,
  `role: authenticated`, `vault_id`, `realtime_table: "vault_ops"`, `realtime_purpose`,
  `realtime_topic: vault:{id}:{purpose}`, `vault_role`, with `nbf = iat − 5s` and `exp = iat + 60s`;
  `refreshAt = exp − 20s`. **The pubkey hash never enters the token payload** (realtime.ts:55-69).
- `src/lib/supabase/realtime.ts:208` binds `postgres_changes` on `table: "vault_ops"`; no
  `vault_updates` anywhere.
- Live DB (`supabase_db_moneyflow`) confirms the boundary is real and un-weakened:
  `pg_publication_tables` for `supabase_realtime` = **`vault_ops` only**; `realtime_grant_allows`
  (1281-char body) genuinely joins the live grant→membership→vault and checks jti, vault_id,
  purpose, `revoked_at IS NULL`, `expires_at > clock_timestamp()`, `vault.deleted_at IS NULL`, and
  every claim (`role`, `vault_id`, `realtime_table='vault_ops'`, `realtime_purpose`, exact
  `realtime_topic`, `vault_role`) against the grant row. `authenticated` has no SELECT on
  `realtime_grants` and no EXECUTE on `rotate_realtime_grant` (asserted by tests and consistent with
  the function body).

The rev-11 same-identity duplicate-tab correction in `src/lib/sync/manager.ts` is untouched (empty
diff). Preserved boundary is intact.

### 2. The sole product change (`src/components/providers/vault-provider.tsx`) — ACCEPTED

The only product diff in the new delta (2 logical lines):

```
getSnapshot: trpcUtilsRef.current.sync.getSnapshot.fetch(input)
          →  trpcUtilsRef.current.client.sync.getSnapshot.query(input)
getUpdates:  trpcUtilsRef.current.sync.getUpdates.fetch(input)
          →  trpcUtilsRef.current.client.sync.getUpdates.query(input)
```

- **Correctness — yes, fixes a real defect.** `utils.*.fetch()` reads through React Query, which is
  configured with `staleTime: 60 * 1000` (`src/components/providers/trpc-provider.tsx:30`). A
  recovery-triggered catch-up (`SyncManager.catchUpFromServer → getUpdates`) inside the 60s window
  was answered from cache and returned `count: 0` with no network request, permanently dropping the
  missed op — exactly the "silent missed update" HS-015's acceptance forbids
  (`tasks/HS-015-realtime-security.md:56`). Routing through the direct client
  (`client.sync.*.query`) forces every recovery read to hit the server. I independently reproduced
  convergence via `realtime-recovery.spec.ts` (3/3 pass); the "hidden receiver re-syncs missed
  vault_ops" journey depends on this fix.
- **Minimality — yes.** The two writers on the same object, `pushOps`/`pushSnapshot`, already used
  `client.*.mutate`; this change makes the two readers consistent with them. No auth, schema,
  payload, CRDT or transport change.
- **Impact — benign.** `getSnapshot`/`getUpdates` are wired only into
  `SyncManager.trpc.sync.*.query` (vault-provider.tsx:182-195), and grep confirms **nothing else in
  `src/` reads the `sync.getSnapshot`/`sync.getUpdates` React Query cache**. All sync reads —
  cold-start snapshot (manager.ts:522/641/808) and catch-up (manager.ts:629/794) — flow through
  these callbacks; caching a snapshot/updates read never had a legitimate consumer and a stale
  cold-start snapshot would be a correctness hazard, so bypassing the cache is strictly safer here.
  P08/P10 (invite/presence) use the separate presence/realtime routers and are unaffected.

**Path-boundary deviation (called out explicitly):** this file was **outside** the HANDOFF's
enumerated `src` grant (which listed only `realtime.ts` ×3). Per my dispatch item 2 and the
HANDOFF's "prefer tests over product change; only minimal completion strictly required," a genuine
minimal defect fix within HS-015's stated intent is acceptable. This qualifies: it is the smallest
change that makes the "no silent missed update" acceptance provable, and it is defensible on the
merits. I accept it, while noting it for root's awareness as a grant-scope deviation.

### 3. Security acceptance (the actual HS-015) — CONFIRMED against the real server

The local stack is up (`supabase_db_moneyflow`, `supabase_realtime_moneyflow`, … all present). The
three integration files run against it and **fail loudly rather than skip** if it is absent
(`requireRealtimeStack` throws). Explicit re-run: **3 files, 57 tests passed** (23 grant-lifecycle +
25 socket-security + 9 origin-controls), matching the evidence.

Spot-checked that the security-critical paths assert **real** server behavior, not mocks:

- `realtime-socket-security.test.ts` opens an actual `WebSocket` to `/realtime/v1/websocket`
  (`openVaultOpsSocket`) and lets the server decide authorization; `runSql`/`runSqlExpectingDenial`
  execute against the real `psql` in the DB container. It proves: anon-key-only, tampered-signature,
  foreign-secret-forged, expired, revoked-replay, rotated-replay, cross-vault, rewritten-`vault_id`,
  escalated-`vault_role`, widened-table, mismatched-topic, and unknown-grant tokens all receive **no
  `vault_ops` data**; owner and member sockets receive a **real** INSERT; membership removal
  fail-safe stops delivery at the DB with an unexpired token; and the browser role can neither write
  `vault_ops` nor mint grants in SQL.
- `realtime-origin-controls.test.ts` uses real `fetch` and real sockets (see item 6).
- `realtime-grant-lifecycle.test.ts` is (appropriately) router-level with mocked crypto/Supabase; it
  pins claim set, TTL/refresh lead, HMAC integrity, rotation, denial→`FORBIDDEN`, and no-secret/no-
  identity-hash-in-output. The socket-side enforcement of the same claims is what the live file
  above proves — so the mocked file is not standing in for the server on the security-critical path.

### 4. The RED controls — VERIFIED at the end state; weakening step not independently reproduced

The live DB shows the boundary functions are **real, not weakened**: `realtime_grant_allows` and
`realtime_topic_allowed` have full genuine bodies (1281 / 883 chars) and a regex scan for
`SELECT true` / `RETURN true` in those two functions returns nothing. Publication is `vault_ops`
only. This is consistent with the evidence's claim that the control-weakened `SELECT true` variants
were restored byte-identical. The functions are demonstrably load-bearing: the 57 tests passing
against these exact functions, plus the strict claim-by-claim body, means a `SELECT true` swap would
necessarily break the deny cases. **Limitation:** I did not re-perform the weakening step myself (it
requires a destructive edit to the live DB, which I am not authorized to make), so I confirmed the
restored end state and the plausibility of the RED run rather than replaying it.

### 5. Background re-sync asserts BEHAVIOR only — CONFIRMED, no faked timing

- `tests/e2e/helpers/visibility.ts` redefines only `document.visibilityState`/`hidden` getters and
  dispatches `visibilitychange` (+`focus`). It explicitly does **not** throttle the socket, timers,
  or renderer, and documents that no duration under it may be reported as hidden-tab timing.
- `tests/e2e/realtime-recovery.spec.ts` asserts **convergence of state** only
  (`toBeVisible`/`toHaveCount(0)`/`getByRole("status", {name:"Saved"})`), never wall-clock latency.
  Missed-update determinism comes from `suppressLiveVaultOpsPushes` (`page.routeWebSocket` dropping
  server→page `vault_ops` frames while the channel stays joined), installed **before** navigation,
  with an `expect.poll(suppressedCount).toBeGreaterThan(0)` guard so the test cannot pass on a push
  that was never actually withheld. No mock- or CDP-driven number is presented as measured timing;
  the note about absent CDP `Emulation.setVisibilityState` is honored (raw CDP not used). I ran this
  spec: **3/3 passed**.

### 6. CORS conclusion — SUPPORTED by the tests

`realtime-origin-controls.test.ts` substantiates "CORS does not gate the websocket upgrade; the
pubkey-hash grant is the boundary": an authorized socket opens with no CORS negotiation while an
anon-key-only socket is denied; the HTTP surface answers a hostile-origin preflight with
`Access-Control-Allow-Origin: *` yet still `401`s the anon key and `403`s cross-vault reads, grant
reads, and forged writes; and `requireSecureSupabaseUrl` enforces HTTPS→`wss://` in production while
the token travels in the `phx_join` payload, never the socket query string. The conclusion follows
from observable behavior, not prose.

### 7. Secret-safety — CONFIRMED

`tests/integration/helpers/realtime-stack.ts` derives the local symmetric verification key **at
runtime** from an inherited `SUPABASE_JWT_SECRET` (if ≥32 bytes) or the realtime container's
`API_JWT_JWKS` via `docker inspect`; there is **no hardcoded real secret**. The key is used only as
the HMAC key in `mintRealtimeToken` (realtime-stack.ts:251) and is never logged, returned, asserted
on, or written to evidence. The only secret-shaped literal is the synthetic
`"test-secret-that-is-at-least-thirty-two-characters"` vector in `realtime-grant-lifecycle.test.ts`
(matching the existing `realtime-auth.test.ts` convention), and that file affirmatively asserts the
token/credential contains **neither** that secret **nor** the identity hash (lines 201, 209-210,
304-305). Fixtures use `sha256`-of-a-label identity hashes and public base64 vectors, deleted in
`afterAll`.

### 8. `nonTransportProblems` console-error filter — security not judged through it; filter is broad

Security/data-exposure is asserted **directly against rendered state** via `toHaveCount(0)`
(realtime-recovery.spec.ts:145, 153, 263), never through the filter. The filter only gates a
secondary "page is healthy / no stray errors" assertion, which is reasonable given the tests
deliberately sever/suppress the connection on a shared dev server. The regex
(`websocket|realtime|presence|fetch|network|disconnected|connection|Failed to (load|fetch)`) is
broad — a genuine application error whose message happened to contain, e.g., "fetch" or "connection"
could be swallowed by the health check. This is a non-blocking quality nit, not a security hole,
because no security claim depends on it; the implementer already flagged it as narrow-able. I concur
it could be tightened but do not require it.

### 9. Gates — run and recorded

| Gate                                                            | Result                                                                                                                                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                                | **pass** (exit 0)                                                                                                                                                       |
| `pnpm lint`                                                     | **0 errors**, 10 pre-existing warnings (all in unrelated `tests/unit/crdt/*` files)                                                                                     |
| `pnpm test`                                                     | **1684 passed / 2 skipped**, 77 files (exit 0) — includes the 3 live realtime files                                                                                     |
| realtime integration (explicit re-run)                          | **57 passed** across the 3 files against the live stack                                                                                                                 |
| `tests/e2e/realtime-recovery.spec.ts` `--retries=0 --workers=1` | **3 passed**                                                                                                                                                            |
| `pnpm format:check`                                             | not re-run by me; evidence's pre-existing `specs/**` failures are the known Q-024 issue, not attributable to this delta (the delta's `src`/`tests` paths are formatted) |

---

## Limitations

- I did **not** run the full 122-test `pnpm test:e2e` suite; I ran the HS-015-relevant
  `realtime-recovery.spec.ts` (3/3). The evidence claims 122/122 twice plus a 15/15 repeated serial
  run; I did not reproduce those full-suite numbers.
- I did **not** independently replay the RED control's server-function weakening step (destructive
  DB edit, outside my authorization). I verified the restored end state (real, un-weakened function
  bodies; `vault_ops`-only publication) and the tests' dependence on those functions.
- I did not re-run `pnpm format:check`; I relied on the empty `src`/`tests` diff for formatting and
  the documented Q-024 pre-existing `specs/**` failure.
- The local dev DB holds large accumulated row counts (thousands of vaults/grants) from the
  project's prior E2E history; I could not cleanly isolate this run's fixtures, but the suite's
  `afterAll` deletes its own vault IDs and this does not affect the security conclusions.
