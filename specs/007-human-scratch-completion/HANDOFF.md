# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 09
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `cdf147d0dfdeec66f2722fafd802123c06bed09b`; includes immutable
  revision-01–08 product and failure/control commits
- **Allowed implementation paths:** exactly `tests/e2e/helpers/realtime.ts` and
  `tests/e2e/realtime-security.spec.ts`. No vault-settings, product, Supabase config, dependency,
  migration, unit, other E2E, transport, SyncManager, CRDT or Loro path is writable.
- **Sole implementer artifact:** `evidence/P05/implementation-09.md`
- **Commit contract:** commit only the exact Realtime spec path using exact staging; leave
  evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/FS-001/.claude/
  .codex or immutable prior artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-09.md`; no staged paths
- **F-001 fixture-local attribution:** change `getRealtimeSubscriptionCounts` to accept `vaultId`,
  reject unless it matches exact 8-4-4-4-12 hexadecimal UUID syntax, and add an outer claims
  `vault_id` equality alongside the existing `public.vault_ops` predicate. Call it with
  `fixture.vaultId`. Outer placement must scope total/authenticated/liveExactGrant equally. Preserve
  the three-integer aggregate return and never return/log scope or raw claims.
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
  add waits/retries/teardown changes, weaken equalities/bounds or edit vault-settings, product,
  privileges, transport, dependencies, config, migration, SyncManager, CRDT or Loro.
- **Inherited boundaries:** compatible service recreation, strengthened helper, migration 008,
  private Presence, provider topology, cleanup and hermetic fail-closed startup are accepted and
  must remain unchanged. Prior evidence/reviews are immutable.
  P08 owns invite/key-wrap UI, P10 owns encrypted active-transaction Presence UX, and R-024 remains
  P20B/P21. Recheck rolling scratch SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue unless another exact owner is proved necessary.

## Review dispatch

This section is complete; the revision-09 evidence, review and cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `98f5e973f00e794f119dd3045e8b4c57b4a7b0a7`
- **Range type:** non-empty cumulative original BASE through revision-09 HEAD
- **Implementation evidence:** `evidence/P05/implementation-09.md`, SHA-256
  `82cff417d5d5b1f7785edd6c25b5e83d4d72fd1fbe8b7ff5249857c69517431b`
- **Sole reviewer artifact:** `reviews/P05-review-09.md`
- **Review verdict:** FAIL; SHA-256
  `58e40beca43c0ec272f2d9ccf950344040aa5235d695f914f55b684a3312a25d`
- **Failure artifact commit:** `3a8e17f9e134c071e1ef48e935bdd26f817148fc`
- **Prior review files:** immutable revision-01–08 FAIL artifacts; latest SHA-256
  `46c4403f0d8364e49500cb8cf5e6cb8f09f151d07e69bdcb9c7f1ac6310e58d4`
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently audit BASE through exact HEAD, strict UUID/current-vault
  outer scoping and unchanged aggregates/equalities/bounds. Verify focused/interleaved/database
  greens and reproduce the three expired-fixed-date VaultRealtimeSync unit failures. Confirm/correct/
  reject exact revision-10 sole unit path with Date-only fake clock, real timers and restoration.
  Recheck service, cleanup, prior hashes and frozen sources.
- **Failure route:** persist immutable revision-09 artifacts and use reviewer-confirmed next scope
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Commit this durable artifact reference, then rewrite this handoff for P05 revision 10 with sole
writable path `tests/unit/sync/realtime.test.ts`. No HS-015 marker is authorized before cumulative
PASS.
