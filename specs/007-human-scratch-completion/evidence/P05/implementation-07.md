# P05 Implementation Evidence — Revision 07

## Immutable dispatch boundary

- Package/scope/revision: `P05` / `HS-015` / `07`.
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Pre-implementation HEAD: `9729a422ff276064693810a47448a8de18492854`.
- Canonical `Q-008` requires causal same-vault lock/unlock lifecycle evidence relative to an
  immediate post-identity/pre-lock sanitized aggregate snapshot, with all existing bounds retained.
- Sole writable implementation path: `tests/e2e/vault-settings.spec.ts`.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-07.md`,
  created before any service or implementation mutation and left uncommitted.
- At dispatch, HEAD matched the literal pre-implementation HEAD, the index and untracked set were
  empty, and Git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.
  Assigned revision-06 evidence was no longer present in the working tree.
- All prior evidence/reviews, helper, revision-06 spec,
  provider/product/config/dependency/migration/ unit/other E2E, transport/SyncManager/CRDT/Loro,
  control/task, frozen-source and scratch-marker paths remain read-only.

## Validation plan

1. Immediately after awaited identity creation and before Lock, snapshot the existing sanitized
   lifecycle counters. In final attribution, subtract matching pre-lock sync/Presence authorize and
   revoke values, retaining the exact `<=2` authorize and `>=1` revoke limits.
2. Do not move observer creation, raise bounds, add waits/retries/timeouts, or alter any UI,
   request- secrecy, browser-error or other test assertion. Keep cumulative counters only in
   sanitized annotations.
3. Verify compatible Realtime state; run focused/repeated vault-settings and Realtime journeys,
   fresh/seeded-upgrade database audits, full unit/integration/static/build and ordinary 81-test
   zero-retry E2E gates.
4. Exercise the repository-installed Playwright CLI owner/member/outsider/duplicate/background
   charter, including persistence, console/request/socket/server inspection, without retaining
   secrets, scope values or encrypted payloads.
5. Restore generated files, close browser/dev processes, remove browser artifacts, reset the local
   database, verify frozen-source integrity, exact-stage only the spec and leave this evidence
   uncommitted. Any newly proven owner routes to an exact revision-08 proposal without widening.

## Sole implementation change and static boundary

- Immediately after the awaited `createNewIdentity` step and before Lock, the spec captures
  `preLockLifecycle = realtimeLifecycle.snapshot()` without moving the existing observer.
- Final attribution retains the cumulative sanitized counters and records a `lockUnlockCounts`
  object made only from matching final-minus-pre-lock sync/Presence authorize/revoke integers.
- The original sync/Presence authorize `<=2` and revoke `>=1` limits apply unchanged to those four
  interval deltas. No wait, retry, timeout, bound or other assertion was added or changed.
- Focused Oxfmt, ESLint, TypeScript and `git diff --check` passed for the sole spec.
- The running service boundary was Realtime `public.ecr.aws/supabase/realtime:v2.112.6`, 79 internal
  Realtime migrations, active filter fields `column_name:text`, `op:realtime.equality_op`,
  `value:text`, and `negate:boolean`, and four application migrations 005–008. Sanitized logs
  contained no `MigrationCountMismatch`.

## Focused result and finite stop

- After a fresh `pnpm db:reset`, the exact one-worker zero-retry vault-settings lock/unlock journey
  ran once. All identity, Lock, unlock, first-render, saved-state and browser-error checks reached
  the final lifecycle attribution step in 6.1 seconds.
- The interval Presence authorize assertion still received 4 against the unchanged `<=2` bound.
  Because the isolated database contained exactly four total Presence grants, the immediate
  post-helper snapshot had observed zero Presence authorizations: asynchronous onboarding Presence
  work completed only after the snapshot and was mixed with the post-unlock pair.
- The prior source-backed chronology remains causal: initial sync authorization is followed by two
  near-simultaneous Presence authorizations, then post-unlock sync is followed by another two. The
  `createNewIdentity` helper waits for the settings URL and selected-vault local storage, but
  neither condition waits for `useVaultPresence` subscription completion. The page exposes
  completion only after `isConnected` and received Presence state render `PresenceAvatar` with a
  title ending `(online)` (`layout.tsx:342–349`, `PresenceAvatar.tsx:54–58`).
- Per the revision-07 stop boundary, no focused repetitions, Realtime rerun, database/full unit/
  static/build/E2E gates, installed CLI charter or completion claim followed. They remain required
  after the exact revision-08 readiness correction below.

## Q-PROPOSAL-P05-07-01 — Await initial Presence readiness before freezing the pre-lock baseline

- **Context and evidence:** The exact Q-008 snapshot occurs synchronously after `createNewIdentity`,
  but that helper returns after URL/local-storage readiness while the Presence effect remains
  asynchronous. The resulting baseline has zero Presence authorizations; the final delta therefore
  still combines two onboarding and two post-unlock authorizations. The UI later renders one online
  Presence avatar only after the retained subscription is connected and state has synchronized.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 requires causal,
  bounded lock/unlock evidence. Revision 07 authorizes only the immediate snapshot and explicitly
  forbids adding the missing readiness assertion.
- **Options considered:** (A) before the existing snapshot, assert exactly one visible online
  Presence avatar through `page.getByTitle(/\(online\)$/)` under a 15-second bound; (B) poll the
  lifecycle counter until the development-only pair reaches two; (C) add an arbitrary sleep; (D)
  raise/skip/retry the final bound; or (E) change provider/product behavior. A waits on user-visible
  connection state without encoding effect-replay counts. B is environment-specific, C is flaky, D
  weakens acceptance and E is not supported by the otherwise successful connection lifecycle.
- **Default selected for continued work:** Dispatch P05 revision 08 with exactly
  `tests/e2e/vault-settings.spec.ts` writable. Immediately after the awaited identity step and
  before the existing `preLockLifecycle` snapshot, use the existing Playwright expectation model to
  require exactly one visible `page.getByTitle(/\(online\)$/)` within 15 seconds. Then retain the
  Q-008 snapshot, final-minus-baseline calculation and unchanged `<=2`/`>=1` assertions. Do not use
  `.first()`, sleeps, force, reload, retries or timeout/bound increases; do not edit helper,
  revision-06 spec, provider/product/transport, migration/privileges, config/dependencies, other
  tests, SyncManager, CRDT or Loro paths.
- **Decision hierarchy basis:** Repository E2E guidance prefers behavior-based auto-waiting over
  arbitrary timing. The rendered online avatar is the existing observable consequence of initial
  private Presence subscription completion, so snapshotting after it causally excludes onboarding
  work while preserving strict lock/unlock bounds.
- **Impact and risk:** The test adds at most the standard 15-second live bound and fails if initial
  private Presence never becomes visibly connected. It retains aggregate-only lifecycle evidence and
  exposes no identity, vault, grant, topic, claim, filter, frame or financial data. A selector count
  of one prevents ambiguous `.first()` behavior.
- **How to reverse or migrate:** The spec-only readiness assertion is independently revertible. If
  the subsequent interval still exceeds bounds, capture only sanitized pre/final/delta counters and
  route the proven provider/transport behavior to its exact owner rather than relaxing limits.
- **Does a human still need to decide after completion?:** No. The visible readiness signal follows
  existing UI behavior and E2E guidance; human input is optional only if the project later exposes a
  dedicated semantic Presence connection status.

## Frozen sources and cleanup

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes, matching the current rolling boundary. Its unchanged content preserves the same 21 ordered
  normalized blocks and marker state; HS-015 was not edited.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, exactly 450 lines and 27,382
  bytes. The worker changed none of these frozen sources or any root ledger/control artifact.
- Playwright and Next development processes were absent at cleanup. Generated `test-results` and
  `.playwright-cli` paths were removed recoverably where present, and `next-env.d.ts` was restored
  byte-for-byte after Next development startup changed its generated route reference.
- The final normal database reset reapplied migrations 005–008 and left aggregate counts at zero for
  `auth.users`, all nine public base tables, and `realtime.subscription`. Realtime remains
  `public.ecr.aws/supabase/realtime:v2.112.6` with 79 internal migrations, the four active filter
  fields, and no `MigrationCountMismatch` in post-reset logs.

## Commit boundary

- Revision-07 implementation commit: `c2203faa84a1590263014d6426e2f854cdc036e8`
  (`test: isolate realtime lock lifecycle`).
- The exact revision-07 range
  `9729a422ff276064693810a47448a8de18492854..c2203faa84a1590263014d6426e2f854cdc036e8` changes only
  `tests/e2e/vault-settings.spec.ts` (19 insertions, 5 deletions).
- The evidence file remains uncommitted for root freeze/review. Final Git-visible worktree state is
  exactly the root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus this untracked evidence; the
  worker left no staged paths or other implementation/configuration/test dirt.
