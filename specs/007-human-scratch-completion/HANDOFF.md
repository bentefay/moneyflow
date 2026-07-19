# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P05 / 02
- **Scope IDs:** HS-015; no scratch marker before independent package PASS and root integration
- **State:** changes_requested after immutable `reviews/P05-review-02.md` FAIL; revision-02
  evidence, review, Q-004 and risk state persisted in
  `082551d73d1c6e0949a29f410a59e22817708ebf`
- **Task:** `tasks/HS-015-realtime-security.md`
- **Original package BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Pre-implementation HEAD:** `72c90d132110d02641502b64d6263920abe0749d`
- **Allowed implementation paths:** exactly `src/app/(app)/layout.tsx`,
  `src/components/providers/vault-provider.tsx`, `playwright.config.ts`,
  `tests/e2e/helpers/realtime.ts`, `tests/e2e/realtime-security.spec.ts`, and
  `tests/e2e/vault-settings.spec.ts`. No transport/router/schema/migration/unit/other test path is
  writable. If sanitized attribution proves another owner is necessary, stop with a complete new
  proposal for revision 03 rather than widening or suppressing behavior.
- **Sole implementer artifact:** `evidence/P05/implementation-02.md`
- **Commit contract:** commit only the six authorized product/test-config/test paths using exact
  staging; leave evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/
  FS-001/.claude/.codex or immutable revision-01 artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P05/implementation-02.md`; no staged paths
- **F-001 correction:** make the existing real two-context import/edit/delete test pass solely by
  genuine no-refresh push. Preserve current permanent-op, private authorization, console, member-
  removal and cleanup assertions. Prove bounded sync/Presence grant creation, explicit final revoke,
  expiry refresh without storms, reconnect/offline catch-up, lock/unlock and real vault switch.
- **F-002 correction:** first add sanitized per-purpose/effect lifecycle attribution in the
  authorized E2E paths. Move `SyncStatusProvider` above `VaultProvider`; then make the provider
  initialize effect depend only on stable specific status callbacks, tRPC operations and primitive
  vault/key identity. Preserve correct recreation on actual identity/vault/key changes and connect
  real manager transitions to the status UI. Do not assume the implementer revision-01 diagnosis;
  if Presence or another source owner proves necessary, stop and propose it.
- **F-003 correction:** make ordinary local/CI Playwright startup hermetic for the known running
  Supabase stack without committing, printing, browser-prefixing or persisting the Realtime signing
  secret. A test-only process-memory bootstrap may supply the web server; otherwise fail fast with
  an actionable preflight before browser work. Production application behavior must remain fail-
  closed and deployment-secret-owned; no product fallback.
- **Validation:** retain revision-01 focused 8/8, unit 1,170/1,170, fresh 69/69 and upgrade 18/18;
  run authorized red-before/green-after, repeated real two-context push and lock/unlock, full retries-
  zero E2E, lint/type/build/format/diff, and installed CLI owner/member/outsider/background charter.
  Inspect request/socket/console/grant aggregates without secret, identity, vault or payload leakage.
- **Inherited boundaries:** revision-01 evidence/review are immutable; P08 still owns invite/key-wrap
  UI, P10 owns encrypted active-transaction Presence UX, and R-024 remains P20B/P21. Recheck rolling
  scratch SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue unless another exact owner is proved necessary.

## Review result

Revision-02 evidence/review and the cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `007651beb814d98646aa2e786801b647e2abd0b5`
- **Literal reviewed HEAD:** `e865023f6001704be0304bed4e75e76956854ea6`
- **Range type:** non-empty cumulative original BASE through revision-02 HEAD
- **Implementation evidence:** `evidence/P05/implementation-02.md`
- **Sole reviewer artifact:** `reviews/P05-review-02.md`
- **Prior review files:** immutable `reviews/P05-review-01.md` FAIL, SHA-256
  `52350e039f75934e59ec6f431fba4d041ef9df6f4e685411608fe86e06436ba5`
- **Verdict:** FAIL, SHA-256
  `1bce7bce9d94b628d2068cb06edb2248f5c849f40c05afabb87af9cd70f810dd`; F-002/F-003 closed,
  F-001 remains Critical and migration-owned
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently review original BASE through newest HEAD; verify F-002/
  F-003 corrections, reproduce the ordinary zero-frame/Presence red, validate sanitized attribution
  and decide whether migration 007 concurrent-grant/private-extension policy is the exact remaining
  owner. Confirm proposed migration 008 plus two audit paths, exact six-path boundary, cleanup,
  prior hashes and frozen sources. No later package can waive P05 live delivery.
- **Failure route:** persist immutable revision-02 artifacts and use revision-03 paths
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Commit this durable artifact-commit reference, rewrite the handoff for P05 revision 03, verify
frozen sources/worktree boundaries, and dispatch the implementer with exactly the confirmed nine
paths. No HS-015 marker is authorized.
