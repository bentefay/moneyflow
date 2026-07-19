# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 06
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `a00eed992495f837eab34dfa0cf7cb13d62c97c5`; includes immutable
  revision-01/02/03/04/05 product and failure/control commits
- **Allowed implementation path:** exactly `tests/e2e/realtime-security.spec.ts`. No helper,
  product, Supabase config, dependency, migration, unit, other E2E, transport, SyncManager, CRDT or
  Loro path is writable.
- **Sole implementer artifact:** `evidence/P05/implementation-06.md`
- **Commit contract:** commit only the exact Realtime spec path using exact staging; leave
  evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/FS-001/.claude/
  .codex or immutable prior artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-06.md`; no staged paths
- **F-001 legal observer correction:** remove only the `countRealtimeGrants` import/use. Preserve
  migration 007's deliberate direct-table denial. Retain the initial owner sync total integer from
  the existing sanitized attribution step, then poll
  `getRealtimeGrantAggregates(fixture.ownerHash, fixture.vaultId).sync.total` every second for at
  most the unchanged 70 seconds until it is at least
  `Math.max(2, initialOwnerSyncTotal + 1)`. Do not expose scope values or edit the helper/export.
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
  change thresholds to a pre-satisfied value, or edit the helper, privileges, channel privacy,
  transport, dependencies, config, migration, SyncManager, CRDT or Loro under this revision.
- **Inherited boundaries:** compatible service recreation, strengthened helper, migration 008,
  private Presence, provider topology, cleanup and hermetic fail-closed startup are accepted and
  must remain unchanged. Prior evidence/reviews are immutable.
  P08 owns invite/key-wrap UI, P10 owns encrypted active-transaction Presence UX, and R-024 remains
  P20B/P21. Recheck rolling scratch SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue unless another exact owner is proved necessary.

## Review result

Revision-06 evidence/review and the cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `95acc3b2e935b9bdf2788f301a79b490d2d5d509`
- **Range type:** non-empty cumulative original BASE through revision-06 HEAD
- **Implementation evidence:** `evidence/P05/implementation-06.md`, SHA-256
  `1c71d43ea08c7b9abc030126dc4444066f92d618bd0d84cce2cfe3ab17132599`
- **Sole reviewer artifact:** `reviews/P05-review-06.md`
- **Prior review files:** immutable revision-01/02/03/04/05 FAIL artifacts; latest SHA-256
  `53edd79c1472196338ff721d9c8ded29ea8df35645d704813675dd5c1e42f460`
- **Verdict:** FAIL, SHA-256
  `53dd7bfe51b392cd0b4ea316e37978bafe4f75fe1d592c937d135259a7ffbfb5`; causal Realtime passes,
  cumulative lock/unlock attribution remains High
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently audit original BASE through exact HEAD and the sole causal
  observer diff. Reproduce baseline-relative rotation and genuine import/edit/delete/removal; verify
  3/3 focused, database/static/build results and 80/81 full E2E. Independently classify the isolated
  vault-settings cumulative Presence count and confirm/correct/reject the exact revision-07 sole
  `tests/e2e/vault-settings.spec.ts` pre-lock delta proposal without relaxing bounds. Recheck
  compatible service, cleanup, prior hashes and frozen sources.
- **Failure route:** persist immutable revision-06 artifacts and use only a reviewer-confirmed next
  revision boundary
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Persist immutable revision-06 evidence/review, Q-008 and failure ledgers using exact staging. Then
durably record that artifact commit, rewrite for P05 revision 07 and dispatch only the vault-settings
pre-lock delta correction. No HS-015 marker is authorized.
