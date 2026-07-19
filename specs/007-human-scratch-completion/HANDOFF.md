# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P03 / 01
- **Scope IDs:** HS-018; no scratch marker unless the requirement actually passes after independent
  review. A proven unreleased gate becomes `blocked_external`, not completion.
- **State:** passed/integrated in `ca0c42f8e5fcfe02f0deb0e3df8b39b21faa0e34`; HS-018
  `completion_pending` from scratch SHA
  `5d283ab12623e950dd7bf76a1c502b020ecbc2604c97df2e62e40ebd53472efc`
- **Task:** `tasks/HS-018-tanstack-virtual.md`
- **Original package BASE:** `c60f605bd811d8920122a66f3d6743d8a3ac044d`
- **Pre-implementation HEAD:** `c60f605bd811d8920122a66f3d6743d8a3ac044d`
- **Allowed implementation paths if and only if a stable compatible safe-chain release contains PR
  #1100:** `package.json`, `pnpm-lock.yaml`,
  `src/components/features/transactions/TransactionTable.tsx`, and task-relevant tests under
  `tests/**`. If the release gate is closed, make no product/test/dependency change.
- **Sole implementer artifact:** `evidence/P03/implementation-01.md`
- **Commit contract:** commit only authorized product/test/dependency changes with exact-path
  staging; leave evidence uncommitted. `BASE == HEAD` is valid for a proven closed external gate.
  Never use `git add -A` or `git add .`.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md`/`HANDOFF.md` plus sole
  untracked evidence; no staged paths; branch `main` is twenty-nine commits ahead of `origin/main`
- **Release gate:** use current primary sources to identify PR #1100's exact merge commit, every
  containing stable package release, current stable and installed `@tanstack/react-virtual`, and
  Safe Chain eligibility. Inspect installed/published package source and declarations to prove
  whether `useFlushSync` is actually exposed; never infer inclusion from semver or changelog alone.
- **Released path:** upgrade to the newest compatible safe-chain eligible stable containing the PR,
  explicitly enable `useFlushSync` on every relevant current virtualizer, add meaningful
  unit/integration/E2E coverage, and prove no warnings, hydration issues, scroll jumps, focus loss,
  resize loops or performance regression with large-list measurements.
- **Closed-gate path:** retain the safe installed version; record dated PR/release/package-source
  evidence, exact recheck triggers before milestones/P21, and do not vendor or simulate the API.
- **Validation:** cover rapid large-table scroll, resize, editing/focus at overscan edges,
  add/remove/filter, navigation/refresh/duplicate tab, desktop/mobile/reduced-motion, console
  flushSync/ResizeObserver/hydration warnings, position stability, jank and cleanup. If no released
  API exists, reproduce current baseline sufficiently to support the external-gate verdict.
- **Question route:** complete proposals in assigned evidence; root alone appends QUESTIONS

## Review dispatch

This section records the completed independent review pending root integration.

- **Reviewer:** a `human_scratch_reviewer` instance distinct from the implementer
- **Literal reviewed BASE:** `c60f605bd811d8920122a66f3d6743d8a3ac044d`
- **Literal reviewed HEAD:** `b8d4b448f52022970ca388654be14d24e347deb5`
- **Range type:** `non-empty`; exactly three authorized implementation/test paths
- **Implementation evidence:** `evidence/P03/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P03-review-01.md`
- **Prior review files:** none
- **Reviewer writes:** assigned review file only; no evidence/ledger/product/test/scratch writes
- **Failure route:** persist review, P03 `changes_requested`, next paths
  `evidence/P03/implementation-02.md` and `reviews/P03-review-02.md`
- **PASS/blocked authority:** reviewer recommends; root alone verifies, transcribes, integrates and
  sets `passed` or `blocked_external`
- **Verdict:** PASS; no Q; retain P14/P21 persistence, R-008/P16D/P21 jank and R-009/P13/P21 flake
  routes

## Next root action

Execute/finalize the prepared HS-018 marker exactly; no next-package dispatch until cleared.
