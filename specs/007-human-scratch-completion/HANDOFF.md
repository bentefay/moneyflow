# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 05
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested after immutable `reviews/P05-review-05.md` FAIL; revision-05
  evidence, review, Q-007 and risk state persisted in
  `a4961fdb53e0315a8b1925b1d65f90f237b139cd`
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `913b01381e0cbef49200368c40fb990e3873514a`; includes immutable
  revision-01/02/03/04 product and failure/control commits
- **Allowed implementation path:** exactly `tests/e2e/realtime-security.spec.ts`. No helper,
  product, Supabase config, dependency, migration, unit, other E2E, transport, SyncManager, CRDT or
  Loro path is writable.
- **Sole implementer artifact:** `evidence/P05/implementation-05.md`
- **Commit contract:** commit only the exact Realtime spec path using exact staging; leave
  evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/FS-001/.claude/
  .codex or immutable prior artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-05.md`; no staged paths
- **F-001 locator correction:** retain `fill(editedDescription)`, then re-resolve the unique owner
  description input by `editedDescription`, optionally assert it is uniquely focused, and press
  Enter through that resolved locator. Do not reuse any locator or row filter constrained to the old
  value. Do not use forced actions, arbitrary waits, broad `.first()`, retries, timeout increases,
  mocks, refresh or polling substitutes.
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
  change the helper, channel privacy, transport, dependencies, config, migration, SyncManager, CRDT
  or Loro under this revision.
- **Inherited boundaries:** compatible service recreation, strengthened helper, migration 008,
  private Presence, provider topology, cleanup and hermetic fail-closed startup are accepted and
  must remain unchanged. Prior evidence/reviews are immutable.
  P08 owns invite/key-wrap UI, P10 owns encrypted active-transaction Presence UX, and R-024 remains
  P20B/P21. Recheck rolling scratch SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue unless another exact owner is proved necessary.

## Review result

Revision-05 evidence/review and the cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `0d24c802bc8c6dab93a6e1a1c1e1167e95b98583`
- **Range type:** non-empty cumulative original BASE through revision-05 HEAD
- **Implementation evidence:** `evidence/P05/implementation-05.md`, SHA-256
  `a3177aa1cabe07835c170e5c37eb8da7dc3f074fc82e90d6f03fe3245729349f`
- **Sole reviewer artifact:** `reviews/P05-review-05.md`
- **Prior review files:** immutable revision-01/02/03/04 FAIL artifacts; latest SHA-256
  `dd629bc49ca8e0694406b113fbd3eb23996da6def212a852ed94a289a1449d33`
- **Verdict:** FAIL, SHA-256
  `53edd79c1472196338ff721d9c8ded29ea8df35645d704813675dd5c1e42f460`; locator/import/edit/
  delete accepted, forbidden observer and non-causal proposed threshold remain High
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently audit original BASE through exact HEAD and the sole
  stable-locator diff. Reproduce genuine import/edit/delete, the expiry-gate HTTP 403, and migration
  007's intentional service-role table denial. Confirm/correct/reject the exact revision-06 same-spec
  substitution of the already-imported sanitized aggregate helper while retaining the 70-second/
  `>=2` assertion. Recheck compatible service, cleanup, prior hashes and frozen sources; no helper,
  privilege, migration or product widening.
- **Failure route:** persist immutable revision-05 artifacts and use only a reviewer-confirmed next
  revision boundary
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Commit this durable artifact-commit reference, rewrite for P05 revision 06 and dispatch only the
causal baseline-relative observer correction. No HS-015 marker is authorized.
