# P05 Implementation Evidence — Revision 06

## Immutable dispatch boundary

- Package/scope/revision: `P05` / `HS-015` / `06`.
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Pre-implementation HEAD: `a00eed992495f837eab34dfa0cf7cb13d62c97c5`.
- Canonical `Q-007` requires causal refresh evidence relative to the existing initial sanitized
  owner-sync grant total, using the legal aggregate fixture and the unchanged 70-second bound.
- Sole writable implementation path: `tests/e2e/realtime-security.spec.ts`.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-06.md`,
  created before any service or implementation mutation and left uncommitted.
- At dispatch, HEAD matched the literal pre-implementation HEAD, the index and untracked set were
  empty, and Git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.
  Assigned revision-05 evidence was no longer present in the working tree.
- All prior evidence/reviews, helper/export, product/config/dependency/migration/unit/other E2E,
  transport/SyncManager/CRDT/Loro, control/task, frozen-source and scratch-marker paths remain
  read-only.

## Validation plan

1. Remove only the forbidden `countRealtimeGrants` import/use. Return the initial
   `grants.owner.sync.total` from the existing attribution step, then poll the existing validated
   `getRealtimeGrantAggregates(...).sync.total` every second for at most 70 seconds until it reaches
   `Math.max(2, initialOwnerSyncTotal + 1)`.
2. Preserve the 120-second test timeout, every other assertion/bound, real owner/member contexts,
   incoming import/edit/delete, exact subscription/current-grant evidence, and later lifecycle,
   denial and cleanup checks without pre-satisfied thresholds, retries, mocks, waits, refresh or
   polling substitutes.
3. Verify compatible Realtime state, run repeated focused live coverage, fresh/seeded-upgrade
   database audits, full unit/integration/static/build and ordinary zero-retry full E2E gates.
4. Exercise the installed Playwright CLI owner/member/outsider/duplicate/background charter and
   inspect sanitized console/request/socket/server evidence without retaining secrets, scope values
   or encrypted payloads.
5. Restore generated files, close browser/dev processes, remove browser artifacts, reset the local
   database, verify frozen-source integrity, exact-stage only the spec and leave this evidence
   uncommitted. Any newly proven owner routes to an exact revision-07 proposal without widening.

## Sole implementation change and static boundary

- Removed only the `countRealtimeGrants` import and use. The existing attribution step now returns
  its already-sanitized `grants.owner.sync.total` integer as `initialOwnerSyncTotal`.
- The unchanged refresh step polls
  `getRealtimeGrantAggregates(fixture.ownerHash, fixture.vaultId).sync.total` at the existing
  one-second cadence for at most the existing 70 seconds and requires
  `Math.max(2, initialOwnerSyncTotal + 1)`. It therefore cannot pass on the pre-refresh total.
- The 120-second test timeout, all other 15-second bounds, subscription/current-grant assertions,
  private owner/member contexts, incoming-frame ordering, import/edit/delete/removal checks, socket
  safety and runtime-error assertion remain unchanged.
- Focused `oxfmt`, ESLint, TypeScript and `git diff --check` passed for the sole spec.
- The running service boundary was Realtime `public.ecr.aws/supabase/realtime:v2.112.6`, 79 internal
  Realtime migrations, active filter fields `column_name:text`, `op:realtime.equality_op`,
  `value:text`, and `negate:boolean`, and four application migrations 005–008. Sanitized logs
  contained no `MigrationCountMismatch`.

## Focused real Realtime evidence

- After a fresh database reset, the ordinary single-worker zero-retry journey passed 1/1 in 19.0
  seconds (16.0-second test duration).
- A second fresh reset followed by `--repeat-each=3 --workers=1 --retries=0` passed 3/3 in 49.6
  seconds, with individual durations 16.4, 14.7 and 14.7 seconds.
- All four executions passed genuine private subscription registration, authenticated exact-current
  grant aggregates, incoming import/edit/delete delivery without refresh, causal post-baseline
  owner-sync grant growth, membership-removal denial, socket URL safety and zero captured runtime
  errors.

## Database and repository-wide gates

- Fresh migrations 005–008 plus `tests/database/rls-audit.sql`: 87/87 pgTAP assertions passed.
- Seeded migration-005 legacy fixture, normal upgrade through 006/007/008, then
  `tests/database/legacy-upgrade-audit.sql`: 27/27 pgTAP assertions passed. Latest migrations were
  restored afterward with a normal reset.
- Full Vitest: 47 files and 1,170/1,170 tests passed.
- Repository `pnpm typecheck`: pass.
- Repository `pnpm lint`: exit 0 with 13 pre-existing warnings and no errors; none concerns the sole
  changed spec.
- Production `pnpm build`: pass; all 17 static/dynamic routes generated successfully.
- Repository-wide `pnpm format:check` remains red only on root/frozen control and source files
  (`DECISIONS.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, and
  `specs/human-scratch.md`) plus the then-unformatted current evidence. The sole spec was already
  format-clean; this evidence is formatted before handoff, while root/frozen paths remain untouched.

## Ordinary full E2E and finite stop

- The ordinary four-worker, zero-retry full suite ran all 81 tests. The revised
  `realtime-security.spec.ts` journey passed inside that concurrent run. Overall result was 80/81
  passed in 1.4 minutes.
- The sole failure was the unchanged `vault-settings.spec.ts` journey
  `same-vault lock then unlock renders on the first attempt`: `counts.authorize.presence` was 4
  against its `<=2` aggregate bound. The UI, sync lifecycle and prior steps reached the final
  attribution assertion.
- One exact fresh-database, one-worker, zero-retry diagnostic reproduced the same count 4 failure in
  6.1 seconds. This proves a deterministic lifecycle-attribution owner rather than cross-suite
  concurrency or a revision-06 observer effect.
- Aggregate-only post-run grant evidence classified two authenticated-mount clusters. Sync had two
  total grants/one revoked; Presence had four total/three revoked. Relative to the first grant, the
  initial mount created sync at 0.000 seconds and two Presence grants at 0.129/0.132 seconds; the
  post-unlock mount created sync at 2.684 seconds and two Presence grants at 2.755/2.763 seconds.
  These relative ordinals/times contain no identifier, scope, token or payload.
- The exact source supports that classification: `useVaultPresence` owns a React effect at
  `src/hooks/use-vault-presence.ts:71`, creates a new Presence transport at line 90, starts its
  async subscription at lines 94–116, and unsubscribes it in effect cleanup at lines 119–124. Next's
  development effect replay therefore creates and cleans one transient Presence transport before
  retaining the second on each authenticated mount. The paired Presence grants are supported
  lifecycle work in the test's dev-server environment; the extra cumulative pair belongs to
  onboarding, not the lock/unlock interval.
- Per the stop boundary, no more retries, threshold edits, remaining full rerun, installed CLI
  charter or completion claim followed. All remain required after the revision-07 correction below.

## Q-PROPOSAL-P05-06-01 — Attribute lock/unlock lifecycle relative to its pre-lock baseline

- **Context and evidence:** The full suite and exact isolated reproduction observe four total
  Presence authorizations across identity/vault creation plus same-vault lock/unlock, while the test
  bounds the whole cumulative journey at two. The observer starts before `createNewIdentity`, so the
  assertion mixes onboarding connection authorizations with the later lock/unlock lifecycle it is
  named to measure. The sanitized two-cluster chronology and effect source above show two paired
  Presence authorizations during onboarding and two after unlock; sync/revocation and rendered-vault
  checks reach the final attribution step.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 requires reconnect-
  storm bounds, but revision 06 authorizes only the baseline-relative credential-refresh observer in
  `realtime-security.spec.ts`; it cannot change the separate vault-settings attribution window.
- **Options considered:** (A) snapshot the existing lifecycle aggregates immediately after identity
  creation and assert the current sync/Presence authorize/revoke bounds on final-minus-baseline
  deltas; (B) raise the cumulative Presence bound to four; (C) move observer creation after identity
  setup; or (D) weaken/skip/retry the assertion. A keeps onboarding evidence available, isolates the
  named lock/unlock interval and retains the strict `<=2`/`>=1` bounds. B permits unrelated growth,
  C may miss late initial work, and D cannot establish lifecycle control.
- **Default selected for continued work:** Dispatch P05 revision 07 with exactly
  `tests/e2e/vault-settings.spec.ts` writable. Immediately after the `createNewIdentity` step and
  before clicking Lock, capture `const preLockLifecycle = realtimeLifecycle.snapshot()`. In the
  existing attribution step, compare each final counter minus its corresponding pre-lock counter:
  sync/Presence authorize deltas remain `<=2`, and sync/Presence revoke deltas remain `>=1`. Keep
  every UI, URL/body secrecy, timeout and browser-error assertion unchanged. Do not edit the helper,
  revision-06 spec, thresholds themselves, product/provider/transport, migration/privileges, config,
  dependencies, other tests, SyncManager, CRDT or Loro paths.
- **Decision hierarchy basis:** The test title and acceptance criterion concern same-vault lock/
  unlock behavior. A before/after delta is causal evidence for precisely that interval and mirrors
  Q-007's accepted baseline-relative methodology without relaxing reconnect-storm limits.
- **Impact and risk:** The test will reject more than two authorizations or fewer than one revoke
  per purpose caused by lock/unlock, while no longer failing on valid initial onboarding activity.
  Only sanitized integer counters are retained; no identity, vault, grant, topic, claim, filter,
  frame or financial data is exposed.
- **How to reverse or migrate:** The test-only baseline subtraction is independently revertible. If
  the interval deltas still fail, capture only the four sanitized deltas and route the proven
  provider/transport behavior to a later exact owner rather than raising limits.
- **Does a human still need to decide after completion?:** No. The causal interval follows the test
  name, existing aggregate-only evidence and Q-007 precedent. Human input is optional only if the
  project wants separate onboarding lifecycle bounds in a later package.

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
  byte-for-byte after Next development/build changed its generated route reference.
- The final normal database reset reapplied migrations 005–008 and left aggregate counts at zero for
  `auth.users`, all nine public base tables, and `realtime.subscription`. Realtime remains
  `public.ecr.aws/supabase/realtime:v2.112.6` with 79 internal migrations, the four active filter
  fields, and no `MigrationCountMismatch` in post-reset logs.

## Commit boundary

- Revision-06 implementation commit: `95acc3b2e935b9bdf2788f301a79b490d2d5d509`
  (`test: prove realtime grant refresh causally`).
- The exact revision-06 range
  `a00eed992495f837eab34dfa0cf7cb13d62c97c5..95acc3b2e935b9bdf2788f301a79b490d2d5d509` changes only
  `tests/e2e/realtime-security.spec.ts` (41 insertions, 35 deletions). Most line churn is formatter
  wrapping around the existing attribution `test.step`; the semantic changes are only the removed
  forbidden import/use, returned initial total and baseline-relative legal aggregate poll.
- The evidence file remains uncommitted for root freeze/review. Final Git-visible worktree state is
  exactly the root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus this untracked evidence; the
  worker left no staged paths or other implementation/configuration/test dirt.
