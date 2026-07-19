# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 04
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested after immutable `reviews/P05-review-04.md` FAIL; revision-04
  evidence, review, Q-006 and risk state persisted in
  `3070cbf86692f70aceab33456261004482955701`
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `abbb4f52439025401d3ca858f9809b41daddcbe3`; includes immutable
  revision-01/02/03 product and failure/control commits
- **Allowed implementation path:** exactly `tests/e2e/helpers/realtime.ts`. No product,
  Supabase config, dependency, migration, unit, other test, transport, SyncManager, CRDT or Loro
  path is writable.
- **Sole implementer artifact:** `evidence/P05/implementation-04.md`
- **Commit contract:** commit only the exact diagnostic helper path using exact staging; leave
  evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/FS-001/.claude/
  .codex or immutable prior artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-04.md`; no staged paths
- **Verified destructive precondition:** root queried the exact running project database immediately
  before dispatch. `auth.users`, all eight public application/authz tables, `realtime.subscription`
  and permanent ops are each zero. The local project is disposable; running image is exact
  `supabase_realtime_moneyflow` v2.80.7. Do not assume this condition after any new write—recheck it
  immediately before recreation and stop if any count is nonzero.
- **Exact service correction:** only after that recheck, run `pnpm exec supabase stop --no-backup`
  from this repository and then `pnpm exec supabase start`. Do not issue Docker volume/container
  deletion commands, target a broad path, or affect another project. Verify the resulting Realtime
  image, `realtime.schema_migrations` count and active `realtime.user_defined_filter` field shape are
  mutually compatible and logs contain no `MigrationCountMismatch`. Apply/reset migrations 005–008
  normally. If a clean pinned start recreates the mismatch, stop with a complete revision-05 proposal
  for exact `package.json`/`pnpm-lock.yaml` authority; do not change them now.
- **F-002 diagnostic correction:** make `liveExactGrant` require an exact sync-purpose grant and JWT
  table/topic/purpose/vault/role scope, current matching membership/role and a non-deleted vault.
  Continue returning aggregate integers only. Never retain/output a token, claim, identity, vault,
  topic, filter, frame or financial payload.
- **Live acceptance:** on a compatible clean service, the real two-context owner/member import,
  edit and delete must register a subscription whose sanitized count matches a current exact live
  grant, then produce genuine incoming `postgres_changes` events and UI delivery without refresh or
  pull substitution. Private Presence must remain clean. Preserve initial/final bounds, explicit
  cleanup, expiry/reconnect/offline catch-up, duplicate/background tabs, lock/unlock, vault switch
  and immediate membership-removal denial.
- **Validation:** run focused and full unit/integration, lint/type/build/format/diff, fresh and
  upgrade database audits, ordinary full retries-zero E2E, repeated isolated Realtime E2E and the
  installed CLI owner/member/outsider/duplicate/background charter. Inspect requests, console,
  sockets and server logs without retaining secrets, identities, vault IDs or payloads.
- **Stop boundary:** any clean-start mismatch or remaining product failure requires a complete exact
  next-owner proposal. Do not change channel privacy, transport, dependencies, config, migration,
  SyncManager, CRDT or Loro under this revision.
- **Inherited boundaries:** migration 008, private Presence, provider topology, cleanup and hermetic
  fail-closed startup are accepted and must remain unchanged. Prior evidence/reviews are immutable.
  P08 owns invite/key-wrap UI, P10 owns encrypted active-transaction Presence UX, and R-024 remains
  P20B/P21. Recheck rolling scratch SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue unless another exact owner is proved necessary.

## Review result

Revision-04 evidence/review and the cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `4233b59c930117e7b160ac142a6f953b988b2dc8`
- **Range type:** non-empty cumulative original BASE through revision-04 HEAD
- **Implementation evidence:** `evidence/P05/implementation-04.md`, SHA-256
  `fc7832cc801210332c960b38d37bdfc87c6c3ae5d9709c10ccf6ed3d8928fb2c`
- **Sole reviewer artifact:** `reviews/P05-review-04.md`
- **Prior review files:** immutable revision-01/02/03 FAIL artifacts; latest SHA-256
  `72934172c159a290695b895ddf15e85933a60cf25b240811e264dc7805c56348`
- **Verdict:** FAIL, SHA-256
  `dd629bc49ca8e0694406b113fbd3eb23996da6def212a852ed94a289a1449d33`; service/helper/import
  accepted, deterministic self-invalidating locator remains High
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently audit original BASE through exact HEAD and the sole helper
  diff. Verify guarded exact-project recreation, compatible image/internal schema, strengthened
  sanitized exact-grant predicate, registered subscriptions and genuine incoming import. Reproduce
  the inline-edit boundary and confirm/correct/reject the exact revision-05 addition of only
  `tests/e2e/realtime-security.spec.ts`, including the claimed self-invalidating value-qualified
  locator. Recheck service/database/browser cleanup, prior hashes and frozen sources. No later
  package can waive P05 live delivery.
- **Failure route:** persist immutable revision-04 artifacts and use only a reviewer-confirmed next
  revision boundary
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Commit this durable artifact-commit reference, rewrite for P05 revision 05 and dispatch only the
Realtime spec locator correction. No HS-015 marker is authorized.
