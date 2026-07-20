# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 11
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `71b38d71aa17fa843f0c9354bf78c20a0d3b4400`; includes immutable
  revision-01–10 product and failure/control commits
- **Allowed implementation paths:** exactly `src/lib/sync/manager.ts` and
  `tests/e2e/tab-duplication.spec.ts`. No other product, E2E/helper/vault-settings, unit, Supabase
  config, dependency, migration, transport, CRDT or Loro path is writable.
- **Sole implementer artifact:** `evidence/P05/implementation-11.md`
- **Commit contract:** commit only the exact manager + duplicated-tab spec paths using exact staging; leave
  evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/FS-001/.claude/
  .codex or immutable prior artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-11.md`; no staged or other dirty paths
- **F-001 same-identity live correction:** in `SyncManager.initialize()`, remove only the comment
  and early return comparing `update.authorPubkeyHash` with `this.pubkeyHash`. Retain the exact-vault
  callback and existing serialized `applyRemoteUpdate(update.encryptedData)` path unchanged. Add no
  per-tab identifier or schema/payload/transport/CRDT/API change.
- **True duplicate regression:** extend the existing test and its extension-backed
  `chrome.tabs.duplicate()` helper; retain all cache/hydration assertions. Navigate both authenticated
  duplicates to Transactions and attach console/page-error capture before mutation. Create one row
  through normal UI, then require exactly one matching row in both tabs, exactly one permanent op for
  the fixture vault, receiver `sync.pushOps` delta zero from its pre-mutation baseline, and zero
  browser errors. Keep the receiver backgrounded; do not use focus catch-up.
- **Assertion invariants:** preserve the unchanged 120-second global timeout and every 15-second
  live bound, real owner/member contexts, exact subscription/current-grant aggregates, incoming-frame
  ordering, private Presence, import/edit/delete UI checks and later expiry/reconnect/offline,
  duplicate/background, lock/unlock, vault switch, membership removal and cleanup assertions.
  Preserve the 60-second duplicate test timeout and every 15-second live bound, extension/profile
  cleanup, grants/topics/filters, throttling, durable catch-up, encryption and all cumulative P05
  security assertions.
- **Environment boundary:** compatible Realtime v2.112.6 with 79 internal migrations and the four-
  field filter composite is running; latest database is empty through migrations 005–008. Do not
  recreate services or edit pins/config. Verify compatibility/no mismatch before and after evidence.
- **Validation:** run focused and full unit/integration, lint/type/build/format/diff, fresh and
  upgrade database audits, ordinary full retries-zero E2E, repeated isolated Realtime E2E and the
  installed CLI owner/member/outsider/duplicate/background charter. Inspect requests, console,
  sockets and server logs without retaining secrets, identities, vault IDs or payloads.
- **Stop boundary:** any remaining failure requires a complete exact next-owner proposal. Do not
  replace true Chrome duplication with `window.open`, `context.newPage` or storage copying; do not
  reload/focus receiver, poll as a live substitute, sleep/retry/raise timeouts, weaken exact counts,
  or edit any unlisted product/test/schema/config/dependency/migration/transport/CRDT/Loro path.
- **Inherited boundaries:** compatible service recreation, strengthened helper, migration 008,
  private Presence, provider topology, cleanup and hermetic fail-closed startup are accepted and
  must remain unchanged. Prior evidence/reviews are immutable.
  P08 owns invite/key-wrap UI, P10 owns encrypted active-transaction Presence UX, and R-024 remains
  P20B/P21. Recheck rolling scratch SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue unless another exact owner is proved necessary.

## Review dispatch

This section is complete; revision-11 evidence, review and cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `7f0b0710e820b87be2ee8877a3b7693d90e5e505`
- **Range type:** non-empty cumulative original BASE through revision-11 HEAD
- **Implementation evidence:** `evidence/P05/implementation-11.md`, SHA-256
  `2e57eb4e8540b364ceb8369bef5b508b4f9cc442e430723435503ee03d1bcb90`
- **Sole reviewer artifact:** `reviews/P05-review-11.md`
- **Review verdict:** FAIL; SHA-256
  `429b7b86c3fbceca9bbad6ae3d861037ca75a49d7a96a85c448dd7a195aa0244`
- **Failure artifact commit:** `f6fa2c2e411546f06e7b21e12157dfbb0c411d24`
- **Prior review files:** immutable revision-01–10 FAIL artifacts; latest SHA-256
  `51bd77e62afb1adb08cd617db974d1df85f51eda7c7b06c20cd42d838aa7c9f8`
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently audit original BASE through exact HEAD and exact two-path
  revision-11 diff. Verify the filter-only manager change, true extension duplicate, both exact rows,
  one scoped op, zero receiver push and browser-error evidence under focused/repeated/full gates.
  Reproduce the installed-CLI genuinely hidden sibling miss beyond 15 seconds and eventual no-focus
  convergence. Instrument sanitized socket receipt, remote import and DOM publication timing enough
  to identify the single owner. Confirm/correct/reject Q-PROPOSAL-P05-11-01's exact Realtime-client
  worker + duplicate-spec scope; audit installed dependency support, extra-socket/refresh/CSP risks
  and whether worker mode targets the measured delay. Recheck service, cleanup, prior hashes and
  frozen sources.
- **Failure route:** persist immutable revision-11 artifacts and use reviewer-confirmed next scope
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Commit this durable artifact reference, then reconcile the executable verified-hidden topology gate
before any revision-12 dispatch or evidence-backed `blocked_external` transition. No worker/product
diff or HS-015 marker is authorized.
