# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 03
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `f543c4b7a4f445c2e5d11a7f3f077a8929074335`; includes immutable
  revision-01/02 product and failure/control commits
- **Allowed implementation paths:** exactly `src/app/(app)/layout.tsx`,
  `src/components/providers/vault-provider.tsx`, `playwright.config.ts`,
  `tests/e2e/helpers/realtime.ts`, `tests/e2e/realtime-security.spec.ts`, and
  `tests/e2e/vault-settings.spec.ts`, plus
  `supabase/migrations/008_realtime_authorization_lifecycle.sql`,
  `tests/database/rls-audit.sql`, and `tests/database/legacy-upgrade-audit.sql`. No other product,
  migration, transport, SyncManager, CRDT, Loro, config or test path is writable.
- **Sole implementer artifact:** `evidence/P05/implementation-03.md`
- **Commit contract:** commit only the exact nine authorized product/migration/test paths using
  exact staging; leave evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/
  FS-001/.claude/.codex or immutable prior artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-03.md`; no staged paths
- **F-001 correction:** add forward-only migration 008; never rewrite migration 007. Initial mint
  must leave independently owned active sibling grants valid. Refresh may rotate only the caller's
  exact explicitly presented predecessor, and final revoke must affect only its exact grant. Keep
  credentials short-lived (60 seconds), independently revocable and bounded by safe pruning of
  expired/stale rows without invalidating active siblings.
- **Private-channel policy:** minimally authorize the installed client's actual extension set for
  each exact private purpose/topic, including default Broadcast configuration on an enabled Presence
  join. Preserve verified identity, current exact vault membership/role, purpose/topic/table,
  cross-vault, outsider, expiry, revocation and immediate membership-removal denial. Do not broaden
  one purpose into another or expose payload/scope metadata.
- **Counterfactual database evidence:** update both audits to prove two simultaneous grants remain
  usable, explicit refresh/revoke is independent, stale rows are bounded/pruned, and wrong vault,
  purpose, topic, extension, role, expiry and removed membership remain denied. Prove both a fresh
  latest database and a seeded 005-to-008 upgrade; migration 008 must preserve existing encrypted
  data and prior grant behavior only where compatible with HS-015.
- **Live acceptance:** the real two-context owner/member import, edit and delete must reach the
  member through genuine incoming `postgres_changes` without refresh or pull substitution. Private
  Presence must join. Preserve sanitized counters, initial/final bounds, explicit cleanup, expiry/
  reconnect/offline catch-up, duplicate/background tabs, lock/unlock, vault switch and removal tests.
- **Validation:** run focused and full unit/integration, lint/type/build/format/diff, fresh and
  upgrade database audits, ordinary full retries-zero E2E, repeated isolated Realtime E2E and the
  installed CLI owner/member/outsider/duplicate/background charter. Inspect requests, console,
  sockets and server logs without retaining secrets, identities, vault IDs or payloads.
- **Stop boundary:** if a real incoming frame reaches the member but later processing fails, or any
  additional owner is conclusively proved, stop with a complete revision-04 proposal. Do not edit
  transport, SyncManager, CRDT or Loro code under this revision.
- **Inherited boundaries:** F-002/F-003 are closed; preserve their topology, cleanup and hermetic
  fail-closed startup. Prior evidence/reviews are immutable. P08 owns invite/key-wrap UI, P10 owns
  encrypted active-transaction Presence UX, and R-024 remains P20B/P21. Recheck rolling scratch
  SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue unless another exact owner is proved necessary.

## Review result

Revision-03 evidence/review and the cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `ec7dcf8b29ce93f46f73a904e7420ddf49317b11`
- **Range type:** non-empty cumulative original BASE through revision-03 HEAD
- **Implementation evidence:** `evidence/P05/implementation-03.md`, SHA-256
  `02ecbb1b2ca227bfbd88804aad47a3a4f240d1ccd54f2210769b5e7cc9815a17`
- **Sole reviewer artifact:** `reviews/P05-review-03.md`
- **Prior review files:** immutable revision-01/02 FAIL artifacts; latest SHA-256
  `1bce7bce9d94b628d2068cb06edb2248f5c849f40c05afabb87af9cd70f810dd`
- **Verdict:** FAIL, SHA-256
  `72934172c159a290695b895ddf15e85933a60cf25b240811e264dc7805c56348`; migration/Presence
  correction accepted, live Postgres registration remains Critical and F-002 diagnostic is Medium
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently audit the original BASE through exact HEAD and the five
  changed paths within the nine-path authorization. Reproduce fresh/upgrade grant concurrency,
  pruning, extension least privilege and clean private Presence. Verify the sanitized counterexample:
  outgoing Postgres bindings exist but `realtime.subscription` has zero permanent-op/authenticated/
  live-grant matches and no incoming event. Confirm, correct or reject the proposed exact revision-04
  addition of only `src/lib/supabase/realtime.ts` and `tests/unit/sync/realtime.test.ts`, including
  primary-source/current installed-contract reasoning. Recheck cleanup, prior hashes and both frozen
  sources; no later package can waive P05 live delivery.
- **Failure route:** persist immutable revision-03 artifacts and use only a reviewer-confirmed next
  revision boundary
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Persist immutable revision-03 evidence/review, Q-005 and failure ledgers using exact staging. Then
durably record that artifact commit, rewrite for P05 revision 04, re-verify the exact project is
empty/disposable and dispatch only the diagnostic helper plus safe exact-project service recreation.
No HS-015 marker is authorized.
