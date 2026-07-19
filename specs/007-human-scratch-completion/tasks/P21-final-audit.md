# P21 — Executable Final Audit Control Package

- **Status:** queued
- **Scope:** control package; no scratch requirement or marker
- **Owner:** `human_scratch_implementer` acting only as final-audit evidence collector
- **Independent gate:** `human_scratch_reviewer`
- **Allowed persistent implementer write:** exact dispatched `evidence/P21/implementation-<NN>.md`
  only
- **Allowed persistent reviewer write:** exact dispatched `reviews/P21-review-<NN>.md` only
- **Product/migration/test writes:** forbidden
- **Global/FINAL-AUDIT transcription:** root coordinator only
- **Expected range:** `BASE == HEAD`; a non-empty range requires root reconciliation before review

## Entry conditions

- Every package P00–P20B, including P16A–E, is passed with immutable revisioned evidence/reviews and
  integration commits.
- All 21 scratch markers are authorized, normalized scope byte-matches SCOPE, actual SHA equals the
  rolling PROGRESS SHA and no drift is unclassified.
- All 22 first-class requirement-ledger rows are passed. Immutable whole-file FS-001 still has
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and
  25,441 bytes, and no source mutation.
- HEAD/dirty paths reconcile with PROGRESS and no implementation/review artifact is pending.

Root writes literal package/revision/BASE, no product paths, exact implementation evidence and exact
future review paths into HANDOFF. The collector may run checks and create disposable browser/test
state but writes only its evidence file, commits nothing and does not edit FINAL-AUDIT or ledgers.

## Audit contract

The evidence must complete every checklist in FINAL-AUDIT and record exact commands, timestamps,
status, duration, counts/seeds, reproduction and sanitized outputs, including:

1. scope/package/review/integration/question/marker reconciliation and final repository provenance;
2. dependency currency and P03 primary-source release-gate recheck;
3. fresh and supported-upgrade migrations plus existing IndexedDB/vault compatibility;
4. format, lint, typecheck, production build, all unit/property/integration tests;
5. complete E2E with retries disabled and repeated critical journeys sufficient to expose flakes;
6. malicious cross-vault API/database/realtime/invite/auth checks and secret/plaintext inspection;
7. large import/table/alias/automation/GC/allocation performance and duplicate-tab convergence,
   including sub-100ms allocation edits and near-linear approximate 100k/200ms settlement evidence
   or the canonical measured follow-up;
8. complete manual product journey using disposable headless Playwright CLI sessions and isolated
   users: recovery/passkey, vaults, imports/drop zones/provenance, transactions/empty rows, aliases,
   tags, allocations, automations, undo/redo, people/invites/realtime/presence and marketing;
9. pointer/keyboard/focus, desktop/mobile, 320px reflow, 200% zoom, dark/reduced-motion,
   empty/loading/error/offline, refresh and multi-tab behavior;
10. deterministic accessible role/name/state snapshots and applicable computed contrast ratios for
    focus, error, status and changed controls; and
11. exhaustive FS-001 audit: exact signed unit conservation; separate named production unit/property
    expectations and separate named E2E expectations for every canonical example A, B, C, D, E, F, G
    and H; owner remainder/effective totals; reject-never-clamp behavior; sole per-currency
    settlement engine; typed invalid-data issues; traceable obligations/source navigation; all P16C
    current mutation paths; actual virtualized/historical/presence grid/add-row UX; and P17
    complete-set API use; and
12. console and suspicious/failed network inspection throughout, plus complete Q proposals.

The collector uses only PROCESS-permitted CLI run-code/eval for observation/media/accessibility and
normal task interaction. It cleans sessions and sensitive data. It proposes FINAL-AUDIT contents in
evidence; only root may transcribe them after independent PASS.

## Independent review

Root confirms HEAD still equals BASE and dispatches a distinct reviewer with literal BASE/HEAD,
evidence and a new exact `reviews/P21-review-<NN>.md`. The reviewer independently reruns the
complete high-risk gates and the complete required manual matrix, audits all artifacts/style guides
and gives a single unconditional PASS or FAIL. Empty diff is expected but never automatic approval.

## PASS and failure routing

- Any failing check, unexplained flake, material UX/accessibility/security/data/performance finding,
  false marketing claim, missing evidence, write-boundary breach or unclassified drift is FAIL.
- Root preserves each failed P21 review and moves P21 to `changes_requested`. Before downgrading any
  package it persists the complete ordered rollback batch of actual owning/affected packages,
  requirements, checked HS IDs, failed review and starting rolling SHA. It moves batched HS
  requirements `passed -> rollback_pending`, impacted packages/FS-001 to `changes_requested`, and
  reopens all actual owners. Allocation/settlement defects route to P16A–E or P17A–D for automation
  paths; cross-cutting style defects route to P20B.
- Before fix dispatch, root drains the entire batch in order. Each HS rollback records linked
  before/after SHAs, normalized byte comparison and authorized-ID removal, removes that ID from the
  pending set, and sets it `changes_requested`; remaining IDs stay validly checked/
  `rollback_pending`. FS-001 is outside the batch and has no source mutation. Prepared, active or
  partially completed batches are recoverable but prohibit dispatch until empty, verified and
  cleared. P08 explicitly batches both HS-011 and HS-012.
- Every reopened package receives normal full implementation and independent revisioned review.
  Requirements re-pass only when all mapped packages pass; HS markers then receive a new logged
  `[] -> [x]`, while FS-001 re-passes without a source edit.
- After every fix package and impacted requirement passes, root starts P21 revision NN+1 with a new
  current BASE and entirely new evidence/review paths. Never overwrite or amend the failed verdict.
- Only after independent P21 PASS does root transcribe evidence to FINAL-AUDIT and global ledgers,
  persist artifacts, record the integration-control commit and set P21 passed.
- Goal completion additionally requires every GOAL definition-of-done clause; P21 agents cannot mark
  the Goal complete themselves.
