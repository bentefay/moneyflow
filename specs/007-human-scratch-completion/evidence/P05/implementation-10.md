# P05 Implementation Evidence — Revision 10

## Immutable dispatch boundary

- Package/scope/revision: `P05` / `HS-015` / `10`.
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Pre-implementation HEAD: `09c192e85ac3ee43c00a8f6a71da5d0a542dccf3`.
- Canonical `Q-011` requires a Date-only fixed clock within `describe("VaultRealtimeSync")` and
  same-describe restoration, preserving real timers and the existing credential chronology.
- Sole writable implementation path: `tests/unit/sync/realtime.test.ts`.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-10.md`,
  created before any service or implementation mutation and left uncommitted.
- At dispatch, HEAD matched the literal pre-implementation HEAD, the index and untracked set were
  empty, and Git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.
- All prior evidence/reviews, product, E2E/helper/vault-settings, Supabase config, dependency,
  migration, transport/SyncManager/CRDT/Loro, control/task, frozen-source and scratch-marker paths
  remain read-only.

## Validation plan

1. Add `afterEach` to the existing Vitest import. Inside only the VaultRealtimeSync describe, retain
   the existing mock setup, fake only `Date`, set the system time to `2026-07-20T00:00:00.000Z`
   before every case and restore real timers after every case.
2. Do not advance time, change credentials/assertions, fake any non-Date timer API, add waits or
   retries, or mutate any other implementation path.
3. Verify compatible Realtime state; run focused and full unit/integration, lint/type/build/format/
   diff, fresh and seeded-upgrade database audits, ordinary full zero-retry E2E and repeated
   isolated Realtime coverage.
4. Exercise the repository-installed Playwright CLI owner/member/outsider/duplicate/background
   charter and inspect sanitized console, request, socket and server evidence.
5. Restore generated files, close browser/development processes, remove browser artifacts, reset the
   local database, verify frozen-source integrity, exact-stage only the unit path and leave this
   evidence uncommitted. Any newly proven owner routes to an exact revision-11 proposal without
   widening.

## Implementation boundary

- Added `afterEach` to the existing Vitest import.
- Inside only `describe("VaultRealtimeSync")`, the retained `beforeEach` now calls
  `vi.useFakeTimers({ toFake: ["Date"] })` and fixes the system Date at `2026-07-20T00:00:00.000Z`
  before the unchanged mock setup.
- A same-describe `afterEach` calls `vi.useRealTimers()` after every case.
- No clock advancement, relative/future credential, timeout, interval, immediate, microtask,
  animation API, product behavior, fixture chronology or assertion changed.
- Scoped Oxfmt, ESLint, TypeScript and `git diff --check` passed. The exact diff is only the import,
  two Date setup lines and three-line restoration block.

## Unit, static and build gates

- Focused `tests/unit/sync/realtime.test.ts`: **5/5 passed** in one file. All three formerly expired
  VaultRealtimeSync cases reached and passed their unchanged private subscription, Presence,
  disconnect and revoke assertions.
- Full Vitest: **47/47 files and 1,170/1,170 tests passed**.
- Repository ESLint exited 0 with the same 13 pre-existing warnings and no errors. Repository
  TypeScript passed.
- Production build passed compilation, TypeScript, page collection and all 17 static/dynamic route
  generations.
- Repository `git diff --check` passed. Repository `format:check` remained red only on root/frozen
  control/source files `DECISIONS.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md` and
  `specs/human-scratch.md`, plus the then-unformatted current evidence. The sole unit path was
  format-clean and the evidence is formatted before handoff.

## Database and automated browser gates

- Fresh migrations 005–008 plus `tests/database/rls-audit.sql`: **87/87 passed**.
- Seeded reset to migration 005, fixture load, normal migration-up through 006/007/008, then
  `tests/database/legacy-upgrade-audit.sql`: **27/27 passed**. A normal reset restored latest state.
- Repeated isolated Realtime-security E2E with one worker, `--repeat-each=3` and `--retries=0`:
  **3/3 passed** in 16.0, 14.7 and 14.8 seconds; 49.3 seconds total.
- The ordinary four-worker full E2E suite with `--retries=0`: **81/81 passed** in 1.4 minutes.
  Realtime-security and same-vault lock/unlock both passed inside the concurrent run.

## Installed CLI charter and finite stop

- Two initial disposable startup diagnostics omitted the compatible local Realtime signing key and
  correctly produced fail-closed `Realtime authorization is unavailable`. Both browser sessions and
  their data were discarded. The manual server was then started with the same local-container-
  derived symmetric key used by Playwright configuration, without printing or persisting it.
- In the compatible owner session, onboarding completed without revealing or retaining recovery
  words. Vault Settings rendered `Saved`, exactly one online Presence entry and zero console errors.
- A second same-context tab inherited the signing session. Both tabs rendered the authenticated
  transactions UI, two online Presence entries and zero console errors. Sanitized database evidence
  showed two current `vault_ops` subscriptions.
- With the first tab already on Transactions, the second tab created a real transaction through the
  normal row UI. The origin rendered it and the server held exactly one permanent op. The first tab
  remained at zero transactions after being selected and failed to render that description within
  the existing 15-second bound, without reload or retry.
- The receiving tab had no console errors; its authorization/revocation requests were successful,
  Realtime logs contained no authorization/subscription error, and sanitized counts still showed
  active subscriptions and grants. The failure is therefore downstream of authorized delivery setup,
  not a key, socket, grant, RLS or persistence failure.
- Source inspection locates the deterministic owner in `SyncManager.initialize()`: the Realtime
  callback returns whenever `update.authorPubkeyHash === this.pubkeyHash`. That condition cannot
  distinguish the originating manager from a sibling tab using the same identity, so a sibling's
  permanent op is treated as a self echo and never imported. Loro update import is idempotent and
  `subscribeLocalUpdates` is specifically local-update-only, making the blanket identity filter the
  contradictory boundary.
- This is outside revision-10's sole unit path. Per the stop boundary, no source/E2E change, retry,
  manual reload/poll substitute, outsider/member continuation or remaining CLI charter followed. The
  ordinary automated owner/member journey remains green, but the installed CLI charter is incomplete
  because duplicate-tab live synchronization is deterministically red.

## Q-PROPOSAL-P05-10-01 — apply authorized same-identity operations in sibling tabs

- **Raised by/package/revision:** `human_scratch_implementer`, P05, revision 10, 2026-07-20.
- **Context and evidence:** two authenticated same-vault tabs held live subscriptions and Presence;
  one created and persisted a permanent op, while the sibling remained at zero transactions beyond
  15 seconds with no auth/socket/runtime error. `SyncManager` drops every incoming op authored by
  the current public-key hash, conflating an origin echo with another manager for the same identity.
- **Why existing authority does not decide it:** HS-015 explicitly requires duplicate-tab live and
  background behavior, but revision 10 can write only the Date-controlled unit file. Existing tests
  prove duplicated-tab hydration and different-identity member sync separately; neither asserts a
  same-identity operation across two live managers.
- **Options considered:** (A) remove the public-key-hash early return and rely on idempotent Loro
  import/local-update separation, with a true Chrome Duplicate Tab E2E regression; (B) add a new
  per-tab origin identifier to schema, encrypted op metadata and transport; (C) catch up only when a
  tab later becomes visible; or (D) add polling/reload/retry to the charter. A fixes both visible
  and background siblings with the smallest existing-model change. B is disproportionate new
  protocol surface, C leaves simultaneous visible duplicates stale, and D violates live delivery.
- **Reversible default selected to continue:** choose A in revision 11, writable exactly at
  `src/lib/sync/manager.ts` and `tests/e2e/tab-duplication.spec.ts`. Remove only the
  `authorPubkeyHash === this.pubkeyHash` early return so every authorized exact-vault op enters the
  existing serialized `applyRemoteUpdate` path. Extend the existing real `chrome.tabs.duplicate()`
  journey to put both authenticated duplicates on Transactions, create through normal UI in one, and
  require the other to render it without reload within 15 seconds with zero browser errors. Preserve
  grant/topic/filter/security checks, throttling, durable catch-up and all timeouts. Add no polling,
  reload, retry, schema/config/dependency/migration or other test/product change.
- **Decision-hierarchy basis:** explicit duplicate-tab live acceptance controls, followed by the
  existing CRDT idempotence and local-vs-remote update API, then the smallest reversible code and
  meaningful journey regression.
- **Impact and risk:** an origin manager will also receive its server echo, but importing the same
  Loro operation is idempotent and remote import does not enter `subscribeLocalUpdates`; the E2E
  must prove no duplicate row, push loop or runtime error. Authorization remains exact and no new
  identifier or plaintext crosses the transport.
- **Reversal or migration path:** revert the two-path revision-11 diff; no persisted-data, protocol
  or schema migration is involved.
- **Human review still useful after completion:** no decision blocks continuation. Independent
  review should confirm the Loro idempotence/no-loop premise and repeat the true duplicated-tab
  first-render journey with retries disabled.

## Frozen sources and cleanup

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes, matching the rolling boundary. The authorized checked set remains HS-002, HS-014, HS-017
  and HS-018; the worker changed no scratch marker or text.
- Immutable FS-001 at `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and
  25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, exactly 450 lines and 27,382
  bytes. The unchanged scratch hash preserves the same 21 normalized blocks already classified clean
  at dispatch.
- The generated `next-env.d.ts` route reference was restored byte-for-byte. Generated `test-results`
  and `.playwright-cli` were removed recoverably. Every disposable CLI browser was closed, its data
  deleted, the manual server stopped, and no test Playwright, Next development/ build or CLI process
  remained.
- The final normal database reset reapplied migrations 005–008 and left exact counts of zero for
  `auth.users`, `public.user_data`, `public.vaults`, `public.vault_memberships`,
  `public.vault_invites`, `public.vault_snapshots`, `public.vault_updates_legacy`,
  `public.request_nonces`, `public.realtime_grants`, `public.vault_ops` and `realtime.subscription`.
- Realtime remains `public.ecr.aws/supabase/realtime:v2.112.6` with four application migrations, 79
  internal migrations, active filter fields `column_name`, `op`, `value` and `negate`, and no
  `MigrationCountMismatch` in post-reset logs.

## Commit boundary

- Revision-10 implementation commit: `55e3cb60b39418e947503a189e78b89cd4292673`
  (`test: freeze realtime unit date`).
- The exact revision-10 range
  `09c192e85ac3ee43c00a8f6a71da5d0a542dccf3..55e3cb60b39418e947503a189e78b89cd4292673` changes only
  `tests/unit/sync/realtime.test.ts` (7 insertions, 1 deletion).
- The cumulative independent-review range remains original package
  `007651beb814d98646aa2e786801b647e2abd0b5..55e3cb60b39418e947503a189e78b89cd4292673`.
- The evidence file remains uncommitted for root freeze/review. Final Git-visible worktree state is
  exactly the root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus this untracked evidence; the
  worker left no staged paths or other implementation/configuration/test dirt.
