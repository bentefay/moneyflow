# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 07
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested after immutable `reviews/P05-review-07.md` FAIL; revision-07
  evidence, review, Q-009 and risk state persisted in
  `ad26cf6b752e41eeac025586183b92b40751520d`
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `9729a422ff276064693810a47448a8de18492854`; includes immutable
  revision-01–06 product and failure/control commits
- **Allowed implementation path:** exactly `tests/e2e/vault-settings.spec.ts`. No helper,
  product, Supabase config, dependency, migration, unit, other E2E, transport, SyncManager, CRDT or
  Loro path is writable.
- **Sole implementer artifact:** `evidence/P05/implementation-07.md`
- **Commit contract:** commit only the exact Realtime spec path using exact staging; leave
  evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/FS-001/.claude/
  .codex or immutable prior artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-07.md`; no staged paths
- **F-001 interval attribution correction:** immediately after awaited `createNewIdentity` and
  before Lock, capture `preLockLifecycle = realtimeLifecycle.snapshot()`. In final attribution,
  subtract the matching pre-lock sync/Presence authorize/revoke counters from the final snapshot and
  apply the existing authorize `<=2` and revoke `>=1` assertions to those deltas. Keep cumulative
  aggregates only as sanitized annotations if useful. Do not move observer creation or raise bounds.
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

Revision-07 evidence/review and the cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `c2203faa84a1590263014d6426e2f854cdc036e8`
- **Range type:** non-empty cumulative original BASE through revision-07 HEAD
- **Implementation evidence:** `evidence/P05/implementation-07.md`, SHA-256
  `fa6296b49fac4eec9bd3afe9be9a9cad36241b7207c5543d4dce60e4081e32dd`
- **Sole reviewer artifact:** `reviews/P05-review-07.md`
- **Prior review files:** immutable revision-01–06 FAIL artifacts; latest SHA-256
  `53dd7bfe51b392cd0b4ea316e37978bafe4f75fe1d592c937d135259a7ffbfb5`
- **Verdict:** FAIL, SHA-256
  `6698876b9b654bff6cd00e3bf54d4ac45f86cd9ba7348fc30a4b33a3048bde7c`; delta logic accepted,
  immediate baseline remains premature
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently audit original BASE through exact HEAD and the sole
  pre-lock delta diff. Reproduce the zero immediate Presence baseline and final delta 4; verify
  createNewIdentity readiness versus `getByTitle(/\(online\)$/)` source/behavior. Confirm/correct/
  reject the exact revision-08 same-spec visible-online readiness proposal with unchanged 15-second
  and lifecycle bounds, no sleeps/counter waits/product widening. Recheck compatible service,
  cleanup, prior hashes and frozen sources.
- **Failure route:** persist immutable revision-07 artifacts and use only reviewer-confirmed scope
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Commit this durable artifact-commit reference, rewrite for P05 revision 08 and dispatch only
visible-online readiness in the same spec. No HS-015 marker is authorized.
