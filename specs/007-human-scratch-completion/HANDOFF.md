# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 10
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `09c192e85ac3ee43c00a8f6a71da5d0a542dccf3`; includes immutable
  revision-01–09 product and failure/control commits
- **Allowed implementation path:** exactly `tests/unit/sync/realtime.test.ts`. No product, E2E,
  helper, vault-settings, Supabase config, dependency, migration, transport, SyncManager, CRDT or
  Loro path is writable.
- **Sole implementer artifact:** `evidence/P05/implementation-10.md`
- **Commit contract:** commit only the exact unit-test path using exact staging; leave
  evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/FS-001/.claude/
  .codex or immutable prior artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-10.md`; no staged or other dirty paths
- **F-001 deterministic clock correction:** add `afterEach` to the existing Vitest import. Within
  `describe("VaultRealtimeSync")` only, retain the existing `beforeEach` mock setup, install
  `vi.useFakeTimers({ toFake: ["Date"] })`, and set
  `vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"))` before every case. Add a same-describe
  `afterEach` that calls `vi.useRealTimers()`. Fake no other API and do not advance time.
- **Assertion invariants:** preserve the unchanged 120-second global timeout and every 15-second
  live bound, real owner/member contexts, exact subscription/current-grant aggregates, incoming-frame
  ordering, private Presence, import/edit/delete UI checks and later expiry/reconnect/offline,
  duplicate/background, lock/unlock, vault switch, membership removal and cleanup assertions.
  Preserve all unit credentials, channel/table/filter, opaque Presence key, subscribed-state,
  disconnect and revoke assertions unchanged.
- **Environment boundary:** compatible Realtime v2.112.6 with 79 internal migrations and the four-
  field filter composite is running; latest database is empty through migrations 005–008. Do not
  recreate services or edit pins/config. Verify compatibility/no mismatch before and after evidence.
- **Validation:** run focused and full unit/integration, lint/type/build/format/diff, fresh and
  upgrade database audits, ordinary full retries-zero E2E, repeated isolated Realtime E2E and the
  installed CLI owner/member/outsider/duplicate/background charter. Inspect requests, console,
  sockets and server logs without retaining secrets, identities, vault IDs or payloads.
- **Stop boundary:** any remaining failure requires a complete exact next-owner proposal. Do not
  alter credential chronology, use relative/future expiry, fake timers beyond Date, advance time,
  add waits/retries, weaken assertions or edit product/E2E/helper/vault-settings/privileges/
  transport/dependencies/config/migration/SyncManager/CRDT/Loro paths.
- **Inherited boundaries:** compatible service recreation, strengthened helper, migration 008,
  private Presence, provider topology, cleanup and hermetic fail-closed startup are accepted and
  must remain unchanged. Prior evidence/reviews are immutable.
  P08 owns invite/key-wrap UI, P10 owns encrypted active-transaction Presence UX, and R-024 remains
  P20B/P21. Recheck rolling scratch SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue unless another exact owner is proved necessary.

## Review dispatch

This section is complete; revision-10 evidence, review and cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `55e3cb60b39418e947503a189e78b89cd4292673`
- **Range type:** non-empty cumulative original BASE through revision-10 HEAD
- **Implementation evidence:** `evidence/P05/implementation-10.md`, SHA-256
  `ab7d6806d7937bbbdb9f1bac7b562fe12e93dc04657cd29554b3878b6f897fb0`
- **Sole reviewer artifact:** `reviews/P05-review-10.md`
- **Review verdict:** FAIL; SHA-256
  `51bd77e62afb1adb08cd617db974d1df85f51eda7c7b06c20cd42d838aa7c9f8`
- **Failure artifact commit:** `af985817c24652ec85b433b04dc609e1cced5c8c`
- **Prior review files:** immutable revision-01–09 FAIL artifacts; latest SHA-256
  `58e40beca43c0ec272f2d9ccf950344040aa5235d695f914f55b684a3312a25d`
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently audit original BASE through exact HEAD and the exact
  revision-10 one-path diff. Verify Date-only fake time and unconditional restoration, unchanged
  credentials/assertions and real timers; reproduce focused/full unit, static/build/database,
  repeated/full E2E evidence proportionately. Independently reproduce and source-audit the installed-
  CLI same-identity duplicate-tab live failure. Confirm/correct/reject Q-PROPOSAL-P05-10-01's exact
  `src/lib/sync/manager.ts` + `tests/e2e/tab-duplication.spec.ts` scope, Loro idempotence/no-loop
  premise and true Chrome duplicate journey. Recheck service, cleanup, prior hashes and frozen
  sources.
- **Failure route:** persist immutable revision-10 artifacts and use reviewer-confirmed next scope
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Commit this durable artifact reference, then rewrite for P05 revision 11 with exact manager + true
duplicated-tab spec paths. No HS-015 marker is authorized before cumulative PASS.
