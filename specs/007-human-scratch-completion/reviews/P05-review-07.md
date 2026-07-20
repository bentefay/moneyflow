# P05 Independent Review — Revision 07

## Verdict

**FAIL.** Revision 07 makes the authorized same-file interval-attribution change correctly, but the
focused real lock/unlock journey remains red. A fresh isolated run again receives four Presence
authorizations against the unchanged maximum of two. Its sanitized annotation shows identical
cumulative and lock/unlock values—sync authorize/revoke `2/1` and Presence authorize/revoke `4/3`—
which proves the immediate post-`createNewIdentity` baseline contained zero lifecycle events.

The asynchronous-readiness diagnosis is confirmed. The proposed visible-online barrier is causal,
not merely cosmetic: the rendered avatar requires the retained Presence subscription to reach
`SUBSCRIBED`, track state, receive a Presence `sync`, and update React state. The lifecycle observer
records each authorization at browser-request time, earlier in that chain. Development effect replay
starts the transient authorization before cleanup and starts the retained authorization before the
retained subscription can render, so a visible retained avatar necessarily follows both initial
authorization requests.

`Q-PROPOSAL-P05-07-01` is confirmed with one necessary selector correction. The responsive layout
renders both a hidden mobile avatar and a visible desktop avatar in the DOM. A bare strict
`toBeVisible()` on `page.getByTitle(/\(online\)$/)` would therefore see two elements and fail.
Revision 08 must filter that base locator to visible elements and require an exact count of one
within 15 seconds before taking the existing snapshot. The sole writable path remains
`tests/e2e/vault-settings.spec.ts`; no helper, product, timeout, bound, retry, counter wait, sleep
or provider widening is supported. HS-015 remains incomplete and no scratch marker is authorized.

## Immutable review boundary

- Package/revision: `P05/07`, cumulative `HS-015` review.
- Literal cumulative range:
  `007651beb814d98646aa2e786801b647e2abd0b5..c2203faa84a1590263014d6426e2f854cdc036e8`.
- Revision-07 implementation commit: `c2203faa84a1590263014d6426e2f854cdc036e8`
  (`test: isolate realtime lock lifecycle`). Its exact parent is
  `9729a422ff276064693810a47448a8de18492854`.
- Revision 07 changes only the authorized `tests/e2e/vault-settings.spec.ts`, with 19 insertions and
  5 deletions. It snapshots the existing observer immediately after identity creation, computes
  matching final-minus-baseline counters, annotates only aggregates and applies the unchanged `<=2`
  authorize and `>=1` revoke assertions to the deltas.
- Frozen revision-07 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-07.md`, independently verified
  SHA-256 `fa6296b49fac4eec9bd3afe9be9a9cad36241b7207c5543d4dce60e4081e32dd`, 138 lines and 10,281
  bytes.
- Prior immutable revision-06 FAIL review:
  `specs/007-human-scratch-completion/reviews/P05-review-06.md`, independently verified SHA-256
  `53dd7bfe51b392cd0b4ea316e37978bafe4f75fe1d592c937d135259a7ffbfb5`, 239 lines and 14,775 bytes.
- `git diff --check BASE..HEAD` passes and the index is empty. Before this review artifact,
  Git-visible dirt was exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen
  untracked revision-07 evidence.

## F-001 — High — the pre-lock snapshot precedes asynchronous Presence authorization

After a fresh latest database reset, the independent command was:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  tests/e2e/vault-settings.spec.ts \
  --grep 'same-vault lock then unlock renders on the first attempt' \
  --workers=1 --reporter=list --retries=0
```

It failed 0/1 in 6.1 seconds only at
`expect(lockUnlockCounts.authorize.presence).toBeLessThanOrEqual(2)`, receiving 4. Identity
creation, Lock, same-vault unlock, first-render, Saved-state and browser-error checks all reached
the final attribution step.

A second fresh run used Playwright's JSON reporter only to inspect the existing aggregate-only test
annotation. It reported:

```text
cumulative: authorize sync=2, presence=4; revoke sync=1, presence=3
lockUnlock: authorize sync=2, presence=4; revoke sync=1, presence=3
```

Because each delta exactly equals its cumulative counter, `preLockLifecycle` was zero for all four
counters. In particular, neither initial Presence authorization request had been observed when the
snapshot at `vault-settings.spec.ts:152` ran.

The aggregate-only database chronology from that reproduction contained no identity, vault, grant or
payload values:

| Purpose  | Ordinal | Relative creation | Revoked at observation |
| -------- | ------: | ----------------: | ---------------------: |
| sync     |       1 |              0 ms |                    yes |
| Presence |       1 |            135 ms |                    yes |
| Presence |       2 |            136 ms |                    yes |
| sync     |       2 |          2,719 ms |                     no |
| Presence |       3 |          2,791 ms |                     no |
| Presence |       4 |          2,798 ms |                    yes |

Final totals were sync 2 with one revoked and Presence 4 with three revoked. This independently
reproduces the initial and post-unlock pairs established by revision 06 and rules out suite
concurrency as the cause.

## Why visible-online is a causal request barrier

The source chain is ordered as follows:

1. The lifecycle observer is attached before identity creation and increments on Playwright's
   browser `request` event (`tests/e2e/helpers/realtime.ts:62-79`).
2. Each Presence effect invokes `connect()`, which calls `subscribe()`
   (`src/hooks/use-vault-presence.ts:89-116`). Subscription synchronously initiates
   `realtime.authorize` through `getAccessToken()` before awaiting its result
   (`src/lib/supabase/realtime.ts:94-123,163-182`). Thus the request observer sees authorization
   before that subscription can advance.
3. The retained channel must reach `SUBSCRIBED`; only then is it marked subscribed, tracking begins
   and `subscribe()` resolves (`src/lib/supabase/realtime.ts:258-283`). Only after that resolution
   does the hook set `isConnected` (`src/hooks/use-vault-presence.ts:94-108`).
4. An avatar also requires non-empty online Presence state. That state is produced only by the
   channel's Presence `sync` handler (`src/lib/supabase/realtime.ts:232-255`) and the layout gates
   both avatar locations on `isConnected && onlineUsers.length > 0`
   (`src/app/(app)/layout.tsx:209-216,342-349`).

React development replay runs the first setup and its authorization initiation before its cleanup,
then runs the retained setup. The retained avatar cannot become visible until the retained request
has completed the later subscription/state chain. Consequently both the earlier transient request
and retained request have already emitted browser request events when visible-online succeeds. This
does not poll a development-only counter threshold and remains valid if replay behavior changes.

The visibility filter is required for responsive DOM topology. The mobile header remains mounted
under `md:hidden` while the desktop sidebar is visible, and both render the same Presence group from
the same state. Therefore `page.getByTitle(/\(online\)$/)` has two DOM matches at the configured
desktop viewport once ready, but exactly one visible match. Playwright 1.61.1 supports
`Locator.filter({ visible: true })`.

## Corrected Q-PROPOSAL-P05-07-01

- **Decision:** confirm the behavior-based readiness barrier, corrected to count only visible
  matches.
- **Sole revision-08 writable path:** `tests/e2e/vault-settings.spec.ts`.
- **Exact placement:** immediately after the awaited `createNewIdentity(page)` step and immediately
  before the existing `preLockLifecycle` snapshot.
- **Required assertion shape:**

```ts
const visibleOnlinePresence = page.getByTitle(/\(online\)$/).filter({ visible: true });
await expect(visibleOnlinePresence).toHaveCount(1, { timeout: 15000 });
const preLockLifecycle = realtimeLifecycle.snapshot();
```

- Retain the observer's original pre-identity placement, the final-minus-baseline calculation,
  sanitized cumulative/delta annotation, global 120-second test timeout, every existing 15-second
  live bound, and authorize `<=2`/revoke `>=1` limits unchanged.
- Do not use `.first()`, a bare strict `toBeVisible()` on the unfiltered responsive locator, sleeps,
  counter thresholds, force, reload, retries or timeout/bound increases.
- Do not edit the helper, revision-06 Realtime spec, provider/product/transport, migrations,
  privileges, config, dependencies, other tests, SyncManager, CRDT or Loro.

This is the smallest reversible correction. If revision 08 still exceeds an unchanged interval
bound, preserve sanitized baseline/final/delta values and route the proven behavior to its exact
owner rather than weakening acceptance.

## Validation limits and final cleanup

The deterministic focused failure is sufficient to reject revision 07. Repeated focused journeys,
the Realtime journey, full unit/integration/static/build/database audits, the ordinary 81-test
zero-retry suite and the installed CLI charter were not rerun after that failure. They remain
mandatory completion gates for revision 08; this failed-review stop is not a waiver.

- Final `pnpm db:reset` reapplied migrations 005–008. Aggregate counts are zero for `auth.users`,
  all nine public base tables and `realtime.subscription`.
- Realtime is running as `public.ecr.aws/supabase/realtime:v2.112.6`; the database has 79 internal
  Realtime migrations and active filter fields `column_name:text`, `op:realtime.equality_op`,
  `value:text`, `negate:boolean`. Post-reset logs contain no `MigrationCountMismatch`.
- Reviewer-generated `test-results` and `playwright-report` were moved to trash; no
  `.playwright-cli` session exists. Generated `next-env.d.ts` was restored byte-for-byte and no
  browser/dev process remains.
- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes. Its recorded 21 normalized blocks remain clean and the authorized checked set is HS-002,
  HS-014, HS-017 and HS-018; HS-015 is unchanged.
- Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, exactly 450 lines and 27,382
  bytes.

## Exact next revision

Root should preserve revision-01 through revision-07 evidence/reviews as immutable, transcribe the
corrected proposal, set P05/HS-015 to `changes_requested`, and dispatch P05 revision 08 against the
same original BASE. Revision 08 creates a new committed HEAD using only
`tests/e2e/vault-settings.spec.ts`, then receives independent review in `reviews/P05-review-08.md`.
No HS-015 marker may change before that cumulative range passes.
