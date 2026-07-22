# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P12 / 02
- **Scope IDs:** HS-005 only; bounded requestAnimationFrame maintenance for duplicate transaction
  buckets and description-alias symlinks; HS-005 remains incomplete and unchecked
- **State:** changes_requested; revision-02 implementation and failed review are immutable in failure-
  control commit `7533fd76219a08b5e1c1aa5f66b9b85419b6275b`; revision-01 artifacts remain
  immutable; HS-005 remains incomplete and unchecked
- **Task:** `tasks/HS-005-background-gc.md`; exact 6-line HS-005 block in SCOPE
- **Dependencies:** P09/02 and P11A–C are passed; P12 is independent of blocked P05/P08/P10
- **Literal original BASE:** `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`
- **Revision-02 pre-implementation HEAD:** `b21ef639fb24020978cb39c2b69b83d6ff261ebb`
- **Literal revision-02 product/test HEAD:** `e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`
- **Committed revision-02 range:** eight authorized paths, 792 insertions/173 deletions; commit
  `fix(crdt): harden bounded vault maintenance`
- **Frozen implementation evidence:** `evidence/P12/implementation-02.md`, SHA-256
  `7ed3e646ec39a75ab11650fbdc17498c94f27aa2c1d5208970eb79ea2a451574`, 166 lines/11,337 bytes
- **Allowed implementation paths:** `src/lib/crdt/maintenance.ts`, `context.tsx`,
  `description-aliases.ts`, `queries.ts`, `mutations.ts`, and `undo.tsx`; focused existing/new tests
  under `tests/unit/crdt/` and `tests/integration/` limited to transaction maintenance/query/mutation,
  alias maintenance/lifecycle and Undo-history behavior. Touch only the subset actually required.
  No components/routes/styles/schema/migrations/sync/transport/server/database/auth/crypto/realtime,
  dependencies/config, global ledgers, prior evidence/reviews, scratch, FS-001, SCOPE, `.claude`,
  `.codex` or agent configuration without a reproduced blocker and prior root expansion.
- **Sole implementer artifact:** `evidence/P12/implementation-02.md`
- **Future immutable review artifact:** `reviews/P12-review-02.md`
- **Commit contract:** inspect first, preserve revision 01, stage exact authorized paths only, commit
  product/test remediation with a message containing no parentheses, and leave evidence uncommitted.
  Never use `git add .` or `git add -A`.
- **Pre-existing dirty paths:** root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; no staged,
  product, executable, generated or other dirty path
- **F-01 required closure:** relocation must never expose two logical rows or ambiguous UI/query/
  mutation identity at any maintenance commit. Prefer a genuinely atomic source-to-canonical move if
  supported; otherwise define one canonical ID representation at every read and mutation boundary so
  edit/delete/move applies safely to all physical conflicts and cannot diverge, resurrect or split
  dates. Prove subscriptions after every GC commit, user edit/hard+soft delete/move between stages,
  same-ID peers in both delivery orders, focus/count/order stability and deterministic convergence.
- **F-02 required closure / Q-018:** remove the provider-lifetime blacklist. Expose the narrowest
  per-alias live Undo/Redo history reachability frontier, defer only while reachable, subscribe to
  frontier changes and requeue in the same provider as soon as clear/trim/invalidation makes it
  unreachable. Prove change-all → guarded GC → Undo → Redo, clear/trim → same-provider collection,
  hidden/resume, document replacement and exact disposal with no listener/task leak.
- **F-03 required closure:** define cooperative units that actually bound discovery, planning,
  recursive payload copy, apply mutation and proof work; include every unit in deterministic time/work
  instrumentation and yield before exceeding the contract. Replace reset-to-first-phase behavior with
  versioned/dirty phase queues or another fair cursor so sustained relevant edits cannot starve days,
  months, years or aliases. Prove per-callback bounds and eventual completion with large nested
  transactions, many aliases/buckets and continuous edits.
- **F-04 required closure:** remove the peer-identity-dependent expected ordering. Specify and enforce
  a total order for exact `creationInstant`/`importRowIndex` ties or assert the actual documented CRDT
  invariant without assuming local concatenation. The focused set and isolated conflict case must each
  pass in at least three clean processes.
- **Retained cumulative gates:** preserve correct pre-GC reads, adjacent equal year/month/day merge,
  exact record/order conservation, direct-only alias rewrites, apply-time full backlink/target proof,
  `system:gc` excluded from Undo but persisted/encrypted/synced with no echo, idempotence, hidden pause/
  visible resume when truthfully available, cancellation/replacement and provider/document lifetime.
- **Required automation:** begin with red counterexamples for all four findings. Repeat focused P12
  tests and F-04 isolation in three separate processes; run full Vitest, typecheck, lint, build, scoped
  format and repository checks. Repeat affected E2E at least three times with retries disabled and run
  full no-retry E2E. Report every red exactly; never convert a final-drain assertion into proof of an
  intermediate invariant.
- **Validation/manual charter:** use repository-installed headless `playwright-cli` with disposable
  real authenticated state to exercise live edit/delete/move while maintenance is pending, change-all
  history barrier and same-provider collection, large scheduling/scroll/navigation/reload, two visible
  tabs, offline/reconnect, responsive/dark/reduced-motion/200%/roles/privacy/console/network. Attribute
  inherited dark/zoom observations to P20A/P20B but do not waive them. Clean UI/session/process/
  generated state and restore `next-env.d.ts`.
- **Evidence contract:** record exact original BASE, preimplementation HEAD, new product/test HEAD,
  commits/paths/index, red-to-green counterexamples, architecture and all bounded work units, exact
  history reachability lifecycle, per-commit subscribed states, ordering invariant, commands/repeats,
  sanitized manual evidence, inherited reds, cleanup, risks, frozen checks and complete Q proposals.
  Do not claim PASS.
- **Frozen boundary:** scratch SHA
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, checked set
  HS-002/HS-004/HS-006/HS-010/HS-014/HS-017/HS-018, all 21 normalized blocks exact; FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Review dispatch

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal cumulative review BASE:** `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`
- **Literal revision-02 HEAD:** `e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`
- **Range type:** cumulative original BASE through revision-02 product/test HEAD
- **Implementation evidence:** `evidence/P12/implementation-02.md`, SHA-256
  `7ed3e646ec39a75ab11650fbdc17498c94f27aa2c1d5208970eb79ea2a451574`, 166 lines/11,337 bytes
- **Sole reviewer artifact:** `reviews/P12-review-02.md`
- **Review SHA-256:** `91fb0949549ffe2481f5109bf98808d07304bee97710ac244a0d2366cd79738b`,
  223 lines/19,850 bytes
- **Verdict:** FAIL — revision 02 closes revision-01 F-02 and F-04 and partially closes F-01/F-03,
  but three cumulative blockers require revision 03
- **F-01 High:** `unnestDuplicate()` and `swapDuplicate()` still mutate one physical parent during
  the copy/remove interval, leaving divergent parents and nested/standalone duplicate identities that
  maintenance cannot reconcile. Revision 03 must operate on every physical parent, handle preexisting
  divergence deterministically and prove clean physical graphs in both peer orders.
- **F-02 Medium:** exported `findTransaction()`, `findTransactionById()` and
  `getTransactionsInDateRange()` remain raw first/all-copy reads, so they can return stale copies,
  duplicate IDs or materialization-dependent values. Every public read requires the same documented
  canonical selection/order rule and conflict-bucket coverage, including the production import caller.
- **F-03 High:** time checks only surround indivisible recursive copy/equality, whole-year/vault proof,
  alias backlink scan and CRDT apply units. They observe an overrun after arbitrarily large synchronous
  work instead of bounding the RAF callback. Revision 03 must cursor inside these operations or enforce
  and prove a genuinely bounded payload invariant with oversized instrumentation.
- **Closed/retained:** live per-alias Undo/Redo frontier, same-provider collection, fair phase progress,
  principal read/edit/delete/move canonicalization and peer-independent tie order independently pass.
  Focused 32/32 in three processes, isolated large fixture three passes, full Vitest 1,253/1,253,
  lint/typecheck/build/scoped format, affected E2E 12/12, full E2E 87/87 and isolated shift-click 3/3
  all pass independently. Manual change-all/history/two-tab/offline/sync/cleanup passes; inherited dark/
  zoom observations remain routed to P20A/P20B.

## Next root action

Revision-02 failure control is immutable at `7533fd76219a08b5e1c1aa5f66b9b85419b6275b`.
Link it in the root-only ledgers, then dispatch cumulative P12/03 with one new evidence path. Never
overwrite revision-01 or revision-02 artifacts.
