# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 08
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `6ad32a6497861f6866209f79ae842a40e143a1ad`; includes immutable
  revision-01–07 product and failure/control commits
- **Allowed implementation path:** exactly `tests/e2e/vault-settings.spec.ts`. No helper,
  product, Supabase config, dependency, migration, unit, other E2E, transport, SyncManager, CRDT or
  Loro path is writable.
- **Sole implementer artifact:** `evidence/P05/implementation-08.md`
- **Commit contract:** commit only the exact Realtime spec path using exact staging; leave
  evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/FS-001/.claude/
  .codex or immutable prior artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-08.md`; no staged paths
- **F-001 readiness correction:** immediately after awaited `createNewIdentity` and before the
  existing pre-lock snapshot, define
  `page.getByTitle(/\(online\)$/).filter({ visible: true })` and require exactly one match within
  15 seconds. Then retain the existing snapshot/subtraction and unchanged authorize `<=2`/revoke
  `>=1` assertions. Do not use `.first()`, bare strict visibility on hidden+visible matches, sleeps,
  counter waits, retries, reload/force, move observer creation or raise any bound.
- **Assertion invariants:** preserve the unchanged 120-second global timeout and every 15-second
  live bound, real owner/member contexts, exact subscription/current-grant aggregates, incoming-frame
  ordering, private Presence, import/edit/delete UI checks and later expiry/reconnect/offline,
  duplicate/background, lock/unlock, vault switch, membership removal and cleanup assertions.
- **Environment boundary:** compatible Realtime v2.112.6 with 79 internal migrations and the four-
  field filter composite is running; latest database is empty through migrations 005–008. Do not
  recreate services or edit pins/config. Verify compatibility/no mismatch before and after evidence.
- **Validation:** run focused and full unit/integration, lint/type/build/format/diff, fresh and
  upgrade database audits, ordinary full retries-zero E2E, repeated isolated Realtime E2E and the
  installed CLI owner/member/outsider/duplicate/background charter. Inspect requests, console,
  sockets and server logs without retaining secrets, identities, vault IDs or payloads.
- **Stop boundary:** any remaining failure requires a complete exact next-owner proposal. Do not
  change bounds/retries/timeouts or edit the helper, revision-06 spec, provider, product, privileges,
  transport, dependencies, config, migration, SyncManager, CRDT or Loro under this revision.
- **Inherited boundaries:** compatible service recreation, strengthened helper, migration 008,
  private Presence, provider topology, cleanup and hermetic fail-closed startup are accepted and
  must remain unchanged. Prior evidence/reviews are immutable.
  P08 owns invite/key-wrap UI, P10 owns encrypted active-transaction Presence UX, and R-024 remains
  P20B/P21. Recheck rolling scratch SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue unless another exact owner is proved necessary.

## Review result

Revision-08 evidence/review and the cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `a4d62601dbb0ea17ad43308b39aabd81acbaf7fe`
- **Range type:** non-empty cumulative original BASE through revision-08 HEAD
- **Implementation evidence:** `evidence/P05/implementation-08.md`, SHA-256
  `dcfb79499ab725eb4881899fcf298804123d575d557ff9b7943772f9ed0f0c8d`
- **Sole reviewer artifact:** `reviews/P05-review-08.md`
- **Prior review files:** immutable revision-01–07 FAIL artifacts; latest SHA-256
  `6698876b9b654bff6cd00e3bf54d4ac45f86cd9ba7348fc30a4b33a3048bde7c`
- **Verdict:** FAIL, SHA-256
  `46c4403f0d8364e49500cb8cf5e6cb8f09f151d07e69bdcb9c7f1ac6310e58d4`; readiness accepted,
  cross-fixture global subscription attribution remains High
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently audit original BASE through exact HEAD, visible-filter
  readiness and unchanged deltas/bounds. Reproduce focused 1/1, paired vault 3/3 and Realtime 2/3;
  verify transient prior-vault subscription contamination and post-close zero. Confirm/correct/reject
  exact revision-09 helper+Realtime-spec vault-scoped aggregate proposal with UUID validation,
  unchanged equality/bounds and no wait/teardown/product widening. Recheck cleanup/hashes/sources.
- **Failure route:** persist immutable revision-08 artifacts and use reviewer-confirmed next scope
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Persist immutable revision-08 evidence/review, Q-010 and failure ledgers using exact staging. Then
durably record that artifact commit, rewrite for P05 revision 09 and dispatch only current-vault
aggregate scoping in the helper/caller. No HS-015 marker is authorized.
