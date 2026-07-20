# P05 Implementation Evidence — Revision 09

## Immutable dispatch boundary

- Package/scope/revision: `P05` / `HS-015` / `09`.
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Pre-implementation HEAD: `cdf147d0dfdeec66f2722fafd802123c06bed09b`.
- Canonical `Q-010` selects fixture-local subscription attribution: validate the current vault UUID,
  outer-filter `realtime.subscription` claims to that vault alongside the existing `vault_ops`
  entity predicate, and pass `fixture.vaultId` from the sole caller.
- Writable implementation paths are exactly `tests/e2e/helpers/realtime.ts` and
  `tests/e2e/realtime-security.spec.ts`.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-09.md`,
  created before any service or implementation mutation and left uncommitted.
- At dispatch, HEAD matched the literal pre-implementation HEAD, the index and untracked set were
  empty, and Git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.
- All prior evidence/reviews, vault-settings, product, Supabase config, dependency, migration, unit,
  other E2E, transport/SyncManager/CRDT/Loro, control/task, frozen-source and scratch-marker paths
  remain read-only.

## Validation plan

1. Change `getRealtimeSubscriptionCounts` to require `vaultId`, reject values that do not exactly
   match 8-4-4-4-12 hexadecimal UUID syntax before SQL construction, and add the outer claims
   `vault_id` equality so total/authenticated/live-exact-grant share one fixture scope.
2. Call the helper with `fixture.vaultId`. Preserve its aggregate-only three-integer result,
   `total >= 2`, both exact equalities, the 120-second test timeout, every 15-second live bound and
   every lifecycle/security assertion.
3. Verify compatible Realtime state; run focused and paired repeated Realtime/vault-settings gates,
   fresh and seeded-upgrade database audits, full unit/integration/static/build/format/diff and the
   ordinary 81-test zero-retry E2E suite.
4. Exercise the repository-installed Playwright CLI owner/member/outsider/duplicate/background
   charter, including persistence and sanitized console/request/socket/server inspection.
5. Restore generated files, close browser/development processes, remove browser artifacts, reset the
   local database, verify frozen-source integrity, exact-stage only the two authorized paths and
   leave this evidence uncommitted. Any newly proven owner routes to an exact revision-10 proposal
   without widening.

## Implementation and static boundary

- `getRealtimeSubscriptionCounts` now requires `vaultId: string` and rejects it before SQL unless it
  matches exact case-insensitive hexadecimal 8-4-4-4-12 UUID syntax.
- Its outer `realtime.subscription` query retains the `public.vault_ops` entity predicate and adds
  `subscription.claims ->> 'vault_id' = '${vaultId}'`. Total, authenticated and live-exact-grant
  aggregates therefore share the current fixture's row set.
- The sole caller now supplies `fixture.vaultId`. The helper still returns only the same three
  integers; it does not return or log the vault ID, claim, grant, topic, token or payload.
- The existing `total >= 2`, `authenticated == total` and `liveExactGrant == total` assertions are
  unchanged, as are the 120-second global timeout, every 15-second live bound, lifecycle counts,
  incoming-frame ordering, private Presence, import/edit/delete/removal and runtime/socket-safety
  assertions.
- Focused Oxfmt and ESLint passed for both authorized paths; repository TypeScript and scoped
  `git diff --check` passed. A scoped diff confirmed only the strict validation, outer predicate and
  caller argument were added.
- Initial compatibility remained Realtime `public.ecr.aws/supabase/realtime:v2.112.6`, four
  application migrations, 79 internal migrations, and active filter fields `column_name`, `op`,
  `value` and `negate`, with no `MigrationCountMismatch`.

## Focused and repeated real-browser evidence

- After a fresh reset, the exact one-worker, zero-retry Realtime-security journey passed **1/1**:
  15.4-second test duration and 18.5 seconds total.
- After a second fresh reset, the exact one-worker, zero-retry vault-settings lock/unlock journey
  passed **1/1**: 6.3-second test duration and 9.2 seconds total.
- After a third fresh reset, the two exact journeys ran interleaved with one worker,
  `--repeat-each=3` and `--retries=0`: **6/6 passed** in 1.1 minutes.
- Realtime-security passed **3/3** in 16.0, 14.6 and 14.7 seconds. Vault-settings passed **3/3** in
  5.1 seconds each. The prior cross-fixture `6/6/5` attribution did not recur; all strict current-
  fixture subscription/grant assertions passed without a teardown wait, retry or weakened bound.

## Database gates

- A normal fresh reset applied migrations 005–008 and `tests/database/rls-audit.sql` passed all
  **87/87** pgTAP assertions.
- A seeded reset to migration 005 loaded `legacy-upgrade-fixture.sql`, normal migration-up applied
  006/007/008, and `legacy-upgrade-audit.sql` passed all **27/27** assertions.
- A subsequent normal reset restored the latest migration state before repository-wide validation.

## Repository-wide finite stop

- Full Vitest ran all 47 files and 1,170 tests: 46 files and **1,167/1,170 tests passed**. Exactly
  three unchanged `VaultRealtimeSync` tests in `tests/unit/sync/realtime.test.ts` failed before
  subscription with `Realtime credential scope is invalid`.
- The deterministic cause is the unit fixture's default expiry `2026-07-20T00:01:00.000Z`. The run
  began around `2026-07-20T00:40Z`, and production code correctly rejects `expiresAt <= Date.now()`.
  The two credential-manager tests inject their own fixed clock, but the three VaultRealtimeSync
  tests use the real clock with the now-expired fixed credential.
- Repository ESLint completed with exit 0, the same 13 pre-existing warnings and no errors.
  Repository TypeScript completed successfully.
- The already queued production build began after TypeScript, but was interrupted during compilation
  when the new-owner stop was applied; it is unassessed. Repository format/diff after that block,
  the ordinary 81-test zero-retry E2E suite and installed CLI charter were not run.
- The failed unit owner is outside both revision-09 writable paths. Per the immutable stop boundary,
  no unit/product change, remaining gate, retry or substitute acceptance followed.

## Q-PROPOSAL-P05-09-01 — freeze the VaultRealtimeSync unit clock

- **Context:** three VaultRealtimeSync tests now reach the correct product expiration guard with a
  credential fixed to `2026-07-20T00:01Z` while using the real clock after that instant. The same
  unit file's credential-manager tests are already deterministic because they inject a fixed `now()`
  function.
- **Why the requirement and repository do not decide it:** HS-015 requires expired credentials to
  fail safely but does not prescribe unit-clock ownership. Revision 09 authorizes only two E2E
  paths; `tests/unit/sync/realtime.test.ts` is immutable here.
- **Option A (selected):** dispatch revision 10 writable only at `tests/unit/sync/realtime.test.ts`.
  Within the `VaultRealtimeSync` describe, use Vitest fake timers configured to fake `Date` only,
  set system time to `2026-07-20T00:00:00.000Z` before each test, and restore real timers after each
  test. Preserve real timer behavior and every credential, channel, private-scope, teardown and
  revoke assertion.
- **Option B:** make the shared credential fixture relative to wall time and rewrite the explicit
  credential-manager chronology. Rejected as broader and less legible than scoping the missing clock
  control to the real-clock describe.
- **Option C:** replace the expiry with a far-future literal. Rejected because it creates another
  date-triggered failure and obscures the intended one-minute credential lifetime.
- **Option D:** weaken or remove the production expiry check. Rejected because it would violate the
  security requirement and the product behavior is correct.
- **Decision basis:** tests own their clock, Vitest already supplies the mechanism, and faking only
  `Date` prevents wall-clock drift without converting refresh/subscription timers into manual-time
  behavior.
- **Impact:** the three unit fixtures regain deterministic pre-expiry state while product expiration
  behavior and all rev09 current-vault runtime evidence remain unchanged.
- **Reverse path:** revert the one-file test-only clock setup/teardown; no product or persisted-data
  migration is involved.
- **Human input:** none required under the decision hierarchy.
- **Next revision boundary:** writable implementation path exactly
  `tests/unit/sync/realtime.test.ts`; evidence/review use the next immutable revision-10 artifact
  paths. No other implementation path is authorized.

## Frozen sources and cleanup

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes, matching the current rolling boundary. HS-015 and every scratch marker remain untouched.
- Immutable FS-001 at `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and
  25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, exactly 450 lines and 27,382
  bytes. The worker changed none of these frozen sources or any root ledger/control artifact.
- The generated `next-env.d.ts` route reference was restored byte-for-byte. Generated `test-results`
  was removed recoverably; `.playwright-cli` was absent. No test Playwright, Next development/build
  or CLI process remained.
- The final normal database reset reapplied migrations 005–008 and left exact counts of zero for
  `auth.users`, `public.user_data`, `public.vaults`, `public.vault_memberships`,
  `public.vault_invites`, `public.vault_snapshots`, `public.vault_updates_legacy`,
  `public.request_nonces`, `public.realtime_grants`, `public.vault_ops` and `realtime.subscription`.
- Realtime remains `public.ecr.aws/supabase/realtime:v2.112.6` with four application migrations, 79
  internal migrations, the four active filter fields `column_name`, `op`, `value` and `negate`, and
  no `MigrationCountMismatch` in post-reset logs.

## Commit boundary

- Revision-09 implementation commit: `98f5e973f00e794f119dd3045e8b4c57b4a7b0a7`
  (`test: scope realtime subscription attribution`).
- The exact revision-09 range
  `cdf147d0dfdeec66f2722fafd802123c06bed09b..98f5e973f00e794f119dd3045e8b4c57b4a7b0a7` changes only
  `tests/e2e/helpers/realtime.ts` and `tests/e2e/realtime-security.spec.ts` (10 insertions, 2
  deletions).
- The evidence file remains uncommitted for root freeze/review. Final Git-visible worktree state is
  exactly the root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus this untracked evidence; the
  worker left no staged paths or other implementation/configuration/test dirt.
