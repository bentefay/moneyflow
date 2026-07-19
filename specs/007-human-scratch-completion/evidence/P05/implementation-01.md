# P05 Implementation Evidence — Revision 01

## Contract and pre-mutation boundary

- Package/scope/revision: `P05` / `HS-015` / `01`.
- Original package BASE and pre-implementation HEAD: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Sole worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-01.md`.
- At dispatch, only root-owned unstaged `HANDOFF.md` and `PROGRESS.md` were dirty. The index and
  untracked set were empty. No product, migration, configuration or test path had been changed when
  this ADR and red-baseline plan were written.
- Product/test/config authority is exactly the path set in the current handoff. Frozen sources,
  control ledgers, tasks, reviews and all other paths remain read-only.

This implementer does not mark PASS. Independent review and root integration retain their PROCESS
authority.

## Dated protocol, origin and authorization ADR

Research date: **2026-07-20**. Sources were read from current primary Supabase documentation and the
exact installed `@supabase/supabase-js` / `@supabase/realtime-js` 2.110.7 source before mutation.

### Current primary sources

- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization):
  private Broadcast/Presence channels use RLS on `realtime.messages`; authorization considers the
  JWT, request headers and topic at join; policies are cached until a new JWT arrives; an expired
  token disconnects if it is not refreshed; Postgres Changes separately filters rows through the
  target table's RLS.
- [Supabase Realtime Protocol](https://supabase.com/docs/guides/realtime/protocol): hosted sockets
  use `wss://.../realtime/v1/websocket?apikey=...`; a channel join carries configuration and an
  optional access token in the WebSocket frame; `access_token` refresh is in-band; join failures are
  backed off; Postgres subscription ID mismatch requires teardown/rejoin; the client reconnect
  schedule is bounded at 1/2/5/10 seconds.
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes): only
  tables in `supabase_realtime` publish changes, and rows are delivered according to the subscribing
  role's SELECT grant plus target-table RLS.
- [Supabase Realtime server repository](https://github.com/supabase/realtime): Realtime accepts
  HS256/384/512 tenant-secret JWTs, requires `exp` and database `role`, and states hosted production
  WebSocket URLs use WSS. The server does not guarantee message delivery, so a durable pull catch-up
  remains mandatory even with live push.
- [Supabase local-development workflow](https://supabase.com/docs/guides/local-development/cli-workflows):
  the local stack has no TLS and is not production hardened. It must remain loopback-only;
  production uses the hosted/custom HTTPS origin and therefore WSS.
- [Supabase Edge Function CORS](https://supabase.com/docs/guides/functions/cors): browser CORS is an
  HTTP preflight/response-header concern. It is not channel/table authorization and does not replace
  JWT/RLS checks on a WebSocket join or replicated row.

### Installed-source findings

- Installed `RealtimeClient.setAuth()` updates joined channels with an in-band `access_token`
  message; a callback-based token is re-read on connection and heartbeat. Explicit manual tokens are
  retained across resubscribe, so MoneyFlow will use an isolated callback-based client per grant.
- Installed `RealtimeChannel.subscribe()` puts the token in the `phx_join` payload, not the URL, and
  maps configured Postgres filters into that join. Its channel default is public, so MoneyFlow must
  explicitly set `private: true`.
- The current MoneyFlow browser client uses the anon key alone, a public channel and a
  client-claimed public-key hash as the Presence key; it subscribes to the legacy `vault_updates`
  compatibility view while current writes append `vault_ops`. The database publication already
  contains only `vault_ops`, so current live updates cannot work.

### Decision

1. Browser redirect allow-lists and HTTP CORS do not authorize Realtime. Browser WebSocket `Origin`
   is useful deployment telemetry/edge policy but is not a vault security boundary. Production must
   pass the existing secure Supabase URL check and therefore use HTTPS/WSS; local HTTP/WS is allowed
   only for loopback development. Actual access is the conjunction of signed tRPC minting, a current
   server-side membership check, a short-lived JWT, exact topic/table/purpose claims, SQL grant/RLS
   and a live server-side grant record.
2. A P04-protected `realtime.authorize` procedure mints an HS256 token only after verified identity
   and an atomic current membership/deleted-vault check. It contains no public-key hash, service
   key, signing key or financial data. Claims bind an opaque grant ID, `authenticated` role, exact
   vault, permanent table `vault_ops`, purpose, topic, role, issued/not-before/expiry. The signing
   secret is server-only `SUPABASE_JWT_SECRET`; production deployment must use the Supabase tenant
   JWT secret and never a browser-prefixed variable.
3. Grants live server-side and are rotated atomically. Refresh revokes the prior grant, explicit
   teardown revokes the current grant, membership removal/deleted vault invalidates row policy
   immediately, and token expiry bounds disconnected reuse. TTL is 60 seconds, refresh begins 20
   seconds before expiry, JWT `nbf` permits 5 seconds of negative clock skew, and server/database
   authorization never extends beyond the recorded expiry. Concurrent refresh is single-flight.
4. Each vault/purpose uses an isolated Supabase Realtime client so a global socket token cannot
   grant another channel. The WebSocket URL carries only the public anon/publishable API key and
   protocol metadata; the short-lived credential and topic/filter remain WebSocket frames. No token,
   identity, vault/filter input, signing material or payload is logged or persisted.
5. Sync subscribes only to INSERTs on permanent encrypted `vault_ops`. Snapshots remain tRPC pull/
   cache data. Server writes remain P04 signed tRPC operations and are independently membership-
   authorized. Realtime is a latency hint, not a delivery guarantee: subscribe is followed by a
   version-vector catch-up and every foreground/reconnect path performs bounded catch-up.
6. The shared private transport may authorize a separate `presence` purpose, but this package does
   not claim P10's encrypted active-transaction presence UX. Presence uses no public-key hash as a
   key or payload.

The protocol and secret hierarchy require no new global decision. The out-of-authority lifecycle
fault found by real-browser validation requires the complete proposal below. P08 still owns real
invitation/key-wrap UI, so member transport proof may use a deterministic database fixture without
claiming that UI journey.

## Red baseline plan written before product mutation

The first test mutation will encode these counterfactual failures against the current HEAD:

- client subscription must target `vault_ops`, be private, obtain a short-lived credential, and keep
  vault/token/identity out of the socket URL;
- minting must reject anonymous, outsider, wrong-vault and removed membership, and returned claims
  must be exact/short-lived/no-hash;
- database publication and RLS must allow only a live exact-vault grant while retaining append-only
  service-mediated writes;
- refresh must rotate/revoke, teardown must clear the credential/channel/timers/listeners, and
  concurrent refresh/reconnect must be serialized;
- the manager must close the subscribe race with a pull catch-up and avoid stale post-disconnect
  callbacks.

The exact red commands and observed failures will be appended before implementing the correction.

Red command executed before product mutation:

`pnpm exec vitest run tests/unit/sync/realtime.test.ts tests/integration/realtime-auth.test.ts`

Result: 2 files failed. The new integration suite could not resolve the absent Realtime router; all
5 loaded unit tests failed because the credential manager/fresh credentialed client did not exist,
and the old implementation still requested the anonymous singleton. These failures establish the
missing mint/rotation/revocation boundary and old transport before the implementation below.

## Mutation and validation ledger

Implemented within the exact authorized P05 paths:

- added a server-only short-lived Realtime authorization router, strict schemas and server-side HMAC
  JWT minting after the existing P04 signed protected-procedure boundary;
- added atomic database grant rotation/revocation, exact live membership/deleted-vault checks,
  private-channel policies, and authenticated SELECT-only RLS reachability for `vault_ops`;
- replaced the anonymous/public/legacy-table browser subscription with isolated private clients,
  callback credentials, explicit pre-join `setAuth()`, exact-vault permanent-op filters, refresh,
  teardown and no-hash Presence keys/payloads;
- serialized remote operation application and added post-join, reconnect, foreground and forced-sync
  durable catch-up;
- added focused unit/integration tests, expanded fresh/upgrade pgTAP audits, and added a
  deterministic P08-independent two-context member fixture and real-browser Realtime security
  regression.

Validation completed for revision 01:

- Focused red-to-green:
  `pnpm exec vitest run tests/unit/sync/realtime.test.ts tests/integration/realtime-auth.test.ts`
  changed from the recorded 2-file failure to 2 files and 8 tests passing.
- Fresh migration reset applied through `007_realtime_authorization.sql`. The repository's pgTAP
  files live under `tests/database`, so `supabase test db` truthfully returned `NOTESTS`; executing
  `tests/database/rls-audit.sql` directly against the local container passed all **69/69** tests,
  including atomic prior-grant rotation and the single-live-grant invariant.
- The legacy upgrade sequence `005` fixture -> `006` -> `007` passed **18/18** preservation and
  authorization assertions, and a final fresh reset restored the latest schema. An earlier command
  mistakenly started the fixture at `006`; seven legacy-provenance assertions correctly failed
  because that seeded data after its conversion migration. No product behavior was relaxed; the
  correct `005` boundary was run twice successfully after the diagnostic.
- `SUPABASE_TELEMETRY_DISABLED=1 pnpm db:types` regenerated types successfully. The first plain
  `pnpm db:types` generated correct stdout but exited non-zero when the CLI telemetry request
  failed; the telemetry-disabled rerun removed that environmental ambiguity.
- `pnpm typecheck` passed after implementation and again after the E2E fixture was completed.
- Full `pnpm test` passed **47 files, 1,170/1,170 tests**. `pnpm lint` exited 0 with the same 13
  pre-existing warnings and no errors. `pnpm typecheck` and `pnpm build` both exited 0; the build
  compiled, typechecked and generated all 17 routes successfully.
- A first one-context `sync-persistence` smoke exposed two real integration defects: the router's
  timestamp parser rejected Postgres `+00:00` offsets, then the first `phx_join` raced the
  constructor callback and used the anonymous API key. The schema now accepts offset timestamps and
  the client explicitly awaits `realtime.setAuth()` before channel construction; the exact smoke
  then passed.
- The new two-context Realtime security smoke reached a current-member encrypted owner append in
  `vault_ops`, but the member did not render it within 15 seconds. Private Presence joins were also
  denied. Database counts and sanitized Realtime diagnostics establish the common lifecycle cause
  below; this is preserved as an intentionally failing regression rather than reported as green.
- Full Playwright with retries disabled completed **79/81 passing**. The intended new regression
  failed at that exact 15-second member-delivery assertion. The existing same-vault lock/unlock
  journey also failed because it asserts an empty console and captured the same repeated private
  Presence failure plus unsigned requests produced during teardown/reinitialization. All other 79
  journeys, including the four existing sync-persistence tests, passed.
- Repository-installed `playwright-cli` manual validation used an isolated non-persistent session.
  It created an identity without printing or retaining seed words, selected its new vault, rendered
  the transactions toolbar, and observed one Realtime socket with the permitted local WS shape and
  no vault topic or short-lived `access_token` in the URL. The console independently reproduced the
  private Presence connection failure. The session was closed and generated CLI artifacts removed.
- After the single-live-grant hardening, focused Vitest again passed **8/8** and `pnpm typecheck`
  again exited 0. `git diff --check` and exact changed TS/TSX/Markdown formatting passed. The
  repository-wide `pnpm format:check` remained red only on six out-of-authority pre-existing/control
  paths: root-owned `DECISIONS.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, and
  frozen `specs/human-scratch.md`. None was reformatted or staged by this worker.

## Q-PROPOSAL-P05-01-01 — stabilize VaultProvider sync lifecycle

- **Raised by/package/revision:** `human_scratch_implementer`, P05, revision 01, 2026-07-20.
- **Context and evidence:** P05's authorized transport can mint, join and append, but an existing
  provider effect outside revision-01 path authority tears it down whenever its own sync-status
  callback changes React context state. `VaultProvider` depends on the whole `syncStatusContext`
  value, which is reconstructed whenever `state` or `isConnected` changes.
  `SyncManager.initialize()` calls `setSyncState("syncing")` and `setSyncState("idle")`; each
  transition retriggers the effect, asynchronously disconnects the active manager/channel/grant, and
  initializes another. Later save-state transitions repeat the fault. The initial two-context
  diagnostic created **11 sync grants and 12 presence grants in seconds**. The owner operation was
  present in permanent `vault_ops`, but the member missed delivery for the full **15-second**
  assertion. Realtime independently logged denied reads for the private Presence topic. After both
  contexts closed, the repeated short-lived grants were expired but most sync grants had no explicit
  revocation timestamp, demonstrating cleanup impact. The database rotation function was then
  strengthened within P05 authority so a new mint leaves only one exact live grant; that invariant
  cannot make a continually recreated React manager stable or ensure the last manager's teardown
  runs.
- **Why existing authority does not decide it:** HS-015 requires authorized live propagation and
  cleanup, but does not select ownership between the vault lifecycle effect and sync-status context.
  Revision 01's exact path contract excludes both candidate ownership files,
  `src/components/providers/vault-provider.tsx` and `src/hooks/use-sync-status.tsx`. Silencing
  `SyncManager` status callbacks would be inside the current path list but would degrade the
  existing status UI contract, so the worker cannot use it as a substitute or silently expand
  authority.
- **Options considered:** (A) authorize the narrow `src/components/providers/vault-provider.tsx`
  change and destructure/use only stable setter/callback dependencies inside the effect; (B)
  authorize `src/hooks/use-sync-status.tsx` and memoize the entire context value; (C) suppress
  status reporting in `SyncManager`; or (D) leave the lifecycle red and treat short-lived
  expiry/pull recovery as sufficient. A and B address the cause. C silently removes an existing UI
  behavior, while D does not satisfy HS-015.
- **Reversible default selected to continue:** choose **A** in revision 02. It is the narrowest
  ownership correction and prevents sync lifecycle from depending on presentation state while
  preserving status behavior. Retain and rerun `tests/e2e/realtime-security.spec.ts` as the
  deterministic regression, then verify bounded grant counts, explicit teardown revocation,
  import/edit/delete propagation, expiry refresh and removal denial. Do not check HS-015 until that
  exact revision passes independent review.
- **Decision-hierarchy basis:** the explicit HS-015 live-delivery and cleanup requirement comes
  first, followed by verified identity/least privilege, preservation of the status UI contract, the
  smallest reversible implementation, and existing repository ownership. Revision 01 therefore
  preserves the real red regression and proposes the one-file lifecycle correction instead of
  weakening authorization, tests or user-visible sync state.
- **Impact and risk:** until corrected, manager recreation makes private subscriptions transient,
  can revoke a credential during join, prevents reliable no-refresh member delivery and Presence,
  creates connection/mint/console churn, and can miss explicit teardown of the final grant. Durable
  encrypted `vault_ops`, version-vector pull recovery, 60-second expiry and the database's
  single-live-grant invariant limit data-loss and credential-reuse risk, but they do not meet the
  live propagation contract. A dependency mistake in the proposed provider fix could instead leave a
  stale manager across a real vault/identity change, so exact vault-change, lock/unlock, removal and
  cleanup regressions remain mandatory.
- **Reversal or migration path:** the recommended change is a local React dependency/closure
  correction with no database or encrypted-data migration. Revert that one provider change if it
  destabilizes vault switching, retain the revision-01 grant schema/transport, and apply option B as
  the fallback. Existing grant rows remain compatible and expire within 60 seconds; tests can reset
  local grant fixtures without transforming durable vault data.
- **Human review still useful after completion:** no product preference remains unresolved, so a
  human decision is not required to continue. Root can authorize the exact one-file revision-02
  expansion under PROCESS and independent review can accept or reject its evidence. Human review is
  still useful, but optional, if the product owner wants sync-status semantics or lifecycle
  ownership to differ from the repository's current contract.

## Commit and handoff boundary

- Exact original BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Exact product HEAD/commit: `29e4a1014d1cfa8ad5614b5fdadeba1890523554`, subject
  `feat(sync): authorize private realtime vault streams`.
- Exact immutable review range:
  `007651beb814d98646aa2e786801b647e2abd0b5..29e4a1014d1cfa8ad5614b5fdadeba1890523554`.
- Exact committed paths are:

```text
.env.local.example
src/hooks/use-vault-presence.ts
src/lib/supabase/client.ts
src/lib/supabase/database.types.ts
src/lib/supabase/realtime.ts
src/lib/sync/manager.ts
src/lib/sync/presence.ts
src/server/routers/_app.ts
src/server/routers/realtime.ts
src/server/schemas/realtime.ts
supabase/config.toml
supabase/migrations/007_realtime_authorization.sql
tests/database/legacy-upgrade-audit.sql
tests/database/rls-audit.sql
tests/e2e/helpers/index.ts
tests/e2e/helpers/realtime.ts
tests/e2e/realtime-security.spec.ts
tests/integration/realtime-auth.test.ts
tests/unit/sync/realtime.test.ts
```

- This evidence file is the sole uncommitted worker artifact. The index is empty. The dirty set is
  exactly root-owned `specs/007-human-scratch-completion/HANDOFF.md`, root-owned
  `specs/007-human-scratch-completion/PROGRESS.md`, and this evidence file.
- Generated/browser cleanup is complete: `next-env.d.ts` has no diff, `.playwright-cli/` is absent,
  the disposable CLI session is closed, and the temporary development server is stopped. The local
  database was returned to a fresh latest-schema state.
- Rolling `specs/human-scratch.md` remains exact at SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, 350 lines and 24,243 bytes.
  Its checked requirement set is exactly `HS-002`, `HS-014`, `HS-017`, `HS-018`; all 21 normalized
  HS blocks remain byte-identical to `SCOPE.json`. This worker made no scratch change.
- Immutable FS-001 source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  exact at SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and
  25,441 bytes. This worker made no FS-001 source change.
- Revision 01 does **not** claim PASS or HS-015 completion. Independent review must assess the exact
  range and evidence; the preserved browser red and `Q-PROPOSAL-P05-01-01` require a subsequent
  authorized revision before any completion marker may change.
