# P05 Independent Review — Revision 10

## Verdict

**FAIL.** Revision 10 correctly closes the deterministic unit-clock failure. The exact one-file
change fakes `Date` only within `describe("VaultRealtimeSync")`, fixes the clock before expiry and
unconditionally restores real time after every case. Focused unit passes 5/5 and full Vitest passes
47/47 files and 1,170/1,170 tests with every credential and security assertion unchanged.

The installed-CLI same-identity sibling-tab live charter is independently red. Two authenticated
tabs reached the same vault's Transactions UI, each rendered two online Presence entries, and the
server held two current `vault_ops` subscriptions. The creating tab rendered one transaction and the
server persisted exactly one permanent op. The receiving tab remained at zero rows and timed out
after the existing 15-second live bound; both tabs had zero console errors.

Source inspection identifies the exact owner: `SyncManager.initialize()` discards every incoming
operation whose `authorPubkeyHash` equals the manager identity. That correctly identifies neither a
specific manager nor a specific tab, so it drops authorized operations created by a same-identity
sibling. Independent Loro probing confirms the proposed removal is safe: importing an operation back
into its origin and importing it twice into a sibling both leave version state unchanged, and
`subscribeLocalUpdates` fires zero times for those imports.

`Q-PROPOSAL-P05-10-01` is confirmed with explicit no-loop regression evidence below. Revision 11
should change only `src/lib/sync/manager.ts` and `tests/e2e/tab-duplication.spec.ts`: remove only
the public-key-hash early return and extend the existing extension-backed `chrome.tabs.duplicate()`
journey. It must prove exact one-row state in both tabs, one fixture-vault permanent op/no receiver
push, and zero browser errors without reload, polling substitute, sleep, retry or timeout increase.
HS-015 remains incomplete while duplicate-tab live delivery is red, and no scratch marker is
authorized.

## Immutable review boundary

- Package/revision: `P05/10`, cumulative `HS-015` review.
- Literal cumulative range:
  `007651beb814d98646aa2e786801b647e2abd0b5..55e3cb60b39418e947503a189e78b89cd4292673`.
- Revision-10 implementation commit: `55e3cb60b39418e947503a189e78b89cd4292673`
  (`test: freeze realtime unit date`). Its exact parent is
  `09c192e85ac3ee43c00a8f6a71da5d0a542dccf3`.
- Revision 10 changes only the authorized `tests/unit/sync/realtime.test.ts`, with 7 insertions and
  1 deletion: one import addition, two Date setup lines and one three-line restoration block.
- Frozen revision-10 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-10.md`, independently verified
  SHA-256 `ab7d6806d7937bbbdb9f1bac7b562fe12e93dc04657cd29554b3878b6f897fb0`, 176 lines and 12,681
  bytes.
- Prior immutable revision-09 FAIL review:
  `specs/007-human-scratch-completion/reviews/P05-review-09.md`, independently verified SHA-256
  `58e40beca43c0ec272f2d9ccf950344040aa5235d695f914f55b684a3312a25d`, 211 lines and 11,365 bytes.
- `git diff --check BASE..HEAD` passes and the index is empty. Before this review artifact,
  Git-visible dirt was exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen
  untracked revision-10 evidence.

## Revision-09 finding closure — deterministic Date-only unit scope

The diff exactly implements the reviewed boundary:

```ts
describe("VaultRealtimeSync", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"));
        // unchanged mock setup
    });

    afterEach(() => {
        vi.useRealTimers();
    });
});
```

The setup is inside only the three affected `VaultRealtimeSync` cases. The two
`RealtimeCredentialManager` cases retain their explicit injected clocks. `toFake: ["Date"]` leaves
timeouts, intervals, immediates, microtasks, animation APIs and performance time real. There is no
clock advancement or relative/far-future credential. `afterEach` restores globals even when a case
throws.

The fixed clock is exactly 40 seconds before refresh and 60 seconds before expiry. Credential IDs,
expiry/refresh chronology, authorization inputs, exact private topic/table/filter, opaque Presence
key, channel removal, client disconnect, grant revoke and subscribed-state assertions are unchanged.

Independent commands passed:

| Gate                                       | Result                         |
| ------------------------------------------ | ------------------------------ |
| focused `tests/unit/sync/realtime.test.ts` | 1 file, 5/5 tests              |
| full `pnpm test`                           | 47/47 files, 1,170/1,170 tests |

This closes review-09 F-001. The frozen implementation evidence also records green lint, TypeScript,
production build, fresh 87/87 and upgrade 27/27 pgTAP, focused Realtime 3/3 and ordinary 81/81
zero-retry E2E. The independent review proceeded to the required manual charter, where the new
product failure below provides the finite stop.

## F-001 — High — same-identity sibling operations are discarded as self echoes

The independent manual reproduction used the repository-installed `playwright-cli`, a unique
disposable session and a compatible server-side Realtime signing secret derived in memory from the
running local service. Recovery words, identity data, vault IDs, grants, topics and encrypted
payloads were neither printed nor retained.

The behavior was:

1. Complete onboarding and reach authenticated Transactions.
2. Open a same-context sibling through the browser so it inherits the signing session; both tabs
   render the authenticated transaction toolbar.
3. Verify the selected tab has two visible online Presence entries and zero transaction rows.
4. In the second tab, create a normal transaction through Add Transaction, description, amount and
   Enter, then wait for the real Saved status.
5. Select the receiving tab and require the matching transaction within 15 seconds, without reload
   or retry.

The creating tab rendered exactly one row. Aggregate-only database checks showed exactly one
permanent `vault_ops` row and two current `public.vault_ops` subscriptions. The receiving tab began
with zero rows, still had two visible online entries, and its matching-row wait timed out at 15
seconds. CLI console inspection returned zero errors and zero warnings for each tab. Server request
diagnostics showed successful authorization, revoke and the single operation push.

The installed CLI does not load the repository's test-only duplication extension, so this manual
reproduction used an opener-created same-identity sibling. That distinction does not alter the
manager fault: the callback sees only vault, payload and author identity, and cannot distinguish
either sibling mechanism. The checked-in automated `tests/e2e/tab-duplication.spec.ts` was therefore
also run independently. It passed 1/1 through the actual extension-backed `chrome.tabs.duplicate()`
path, but its current assertions stop at authenticated hydration and never create a live operation.
Revision 11 must extend that true-duplicate journey rather than substitute `window.open()`.

The source path is deterministic:

- `SyncManager.initialize()` installs the exact-vault Realtime callback at
  `src/lib/sync/manager.ts:191-205`.
- Lines 195-198 return solely when `update.authorPubkeyHash === this.pubkeyHash`.
- Both duplicate tabs use the same public-key identity, so the receiver satisfies that condition
  even though it did not originate the local mutation.
- The return occurs before the serialized `enqueueRemoteOperation(() => applyRemoteUpdate(...))`,
  explaining why authorization, subscriptions, persistence and console remain healthy while the UI
  stays stale.
- Different-identity owner/member E2E remains green because the member hash differs and bypasses the
  return.

Reload, visibility catch-up or polling would only mask the missing live callback. A per-tab protocol
identifier would add unnecessary schema, encrypted metadata and transport surface when the existing
CRDT import path already provides safe deduplication.

## Independent Loro idempotence and no-loop audit

A direct in-memory probe used the installed `loro-crdt` implementation without changing repository
files. It created one committed update and measured versions plus local-update callbacks:

```text
origin self-import version stable: true
sibling duplicate-import version stable: true
origin subscribeLocalUpdates callbacks: 0
sibling subscribeLocalUpdates callbacks: 0
sibling state contains the operation: true
```

This independently confirms both safety premises:

- an origin receiving its own server echo can import the already-known Loro operation without
  changing document version or duplicating state;
- a sibling can import the operation, and a repeated delivery is idempotent;
- remote `doc.import()` does not enter `subscribeLocalUpdates`, so it does not create a fresh local
  operation or push loop.

`SyncManager.applyRemoteUpdate()` adds a second guard: it disables `autoSyncEnabled` around decrypt
and import (`manager.ts:568-590`). All Realtime payloads and reconnect catch-up already enter the
same serialized remote queue (`manager.ts:593-625`). Removing the author filter therefore reuses
established remote behavior; it does not bypass serialization, encryption or durable catch-up.

## Confirmed and tightened Q-PROPOSAL-P05-10-01

- **Revision-11 writable paths, exactly:**

```text
src/lib/sync/manager.ts
tests/e2e/tab-duplication.spec.ts
```

- In `SyncManager.initialize()`, remove only the comment and early return that compare
  `update.authorPubkeyHash` with `this.pubkeyHash`. Leave the callback's existing serialized
  `applyRemoteUpdate(update.encryptedData)` path unchanged. Do not introduce a tab identifier or
  change payload/schema/config/migration/authorization/transport/CRDT APIs.
- Extend the existing test and its existing extension-backed `duplicateTab()` helper. The regression
  must continue to invoke `chrome.tabs.duplicate()` and retain the current cache/hydration
  assertions. Do not replace it with `context.newPage()`, `window.open()` or storage copying.
- Use the already authenticated `onboardingDuplicate` and `authenticatedDuplicate`; navigate both to
  Transactions and require their real toolbars/Saved state before mutation.
- Attach console and page-error collection to both live tabs before the operation.
- Through normal UI in one duplicate, create one transaction. Require the creating and receiving
  duplicate each to contain exactly one matching row, with the receiver bounded by the existing
  15-second live limit and no reload, focus-triggered catch-up, arbitrary sleep or retry.
- Prove no echo loop with aggregate-only fixture evidence: after both tabs return to Saved, require
  exactly one permanent operation for the active fixture vault and no `sync.pushOps` request from
  the receiving tab relative to its pre-mutation baseline. Keep scope values and request bodies in
  memory and out of reports. This can be implemented entirely inside the authorized spec; no helper
  path is added.
- Require zero collected console/page errors and keep exact one-row assertions in both tabs. These
  checks prove the origin echo remains idempotent and the sibling import neither duplicates UI state
  nor generates another permanent operation.
- Preserve the current 60-second test timeout, every 15-second live bound, test-only extension,
  profile cleanup, grants/topics/filters, throttling, IndexedDB/durable catch-up, encryption and all
  cumulative P05 security assertions.
- Add no polling substitute, reload, retry, wait-for-timeout, provider/product widening, dependency,
  schema, migration, config, SyncManager protocol, snapshot, Presence, other E2E or unit change.

The scoped permanent-op assertion is an explicit tightening of the evidence proposal, not a scope
widening. UI count alone could hide repeated idempotent imports; exact fixture-vault persistence
plus zero receiver pushes directly demonstrates the stated no-loop acceptance while remaining safe
under parallel full-suite execution.

## Validation limits and final cleanup

The manual duplicate-tab failure rejects revision 10. The independent review did not repeat every
broad green implementation gate after this deterministic charter failure. Revision 11 must rerun
focused/full unit, static/build, fresh/upgrade database, repeated Realtime, full zero-retry E2E and
the complete installed CLI charter; the finite stop is not a waiver.

- Final `pnpm db:reset` reapplied migrations 005–008 and left exact zero counts for `auth.users`,
  all nine public base tables and `realtime.subscription`.
- Realtime is running as `public.ecr.aws/supabase/realtime:v2.112.6`; the database has 79 internal
  migrations and filter fields `column_name:text`, `op:realtime.equality_op`, `value:text`,
  `negate:boolean`. Post-reset logs contain no `MigrationCountMismatch`.
- The disposable CLI session and browser were closed and their data deleted. Reviewer-generated
  `test-results` and `.playwright-cli` were moved to trash; no `playwright-report` remains.
  Generated `next-env.d.ts` was restored byte-for-byte and no test browser, CLI or Next development
  process remains.
- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes. All 21 ordered normalized blocks independently byte-match `SCOPE.json`; the checked set is
  exactly HS-002, HS-014, HS-017 and HS-018. HS-015 remains unchecked.
- Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, exactly 450 lines and 27,382
  bytes.

## Exact next revision

Root should preserve revision-01 through revision-10 evidence/reviews as immutable, transcribe the
confirmed/tightened proposal, set P05/HS-015 to `changes_requested`, and dispatch P05 revision 11
against the same original BASE. Only `src/lib/sync/manager.ts` and
`tests/e2e/tab-duplication.spec.ts` are writable. Revision 11 must create a new committed HEAD and
immutable `evidence/P05/implementation-11.md`, then receive independent review in
`reviews/P05-review-11.md`. No HS-015 marker may change before that cumulative range passes.
