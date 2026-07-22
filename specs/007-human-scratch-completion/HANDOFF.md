# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P12 / 03
- **Scope IDs:** HS-005 only; bounded requestAnimationFrame maintenance for duplicate transaction
  buckets and description-alias symlinks; HS-005 remains incomplete and unchecked
- **State:** changes_requested; revision-03 implementation/review are immutable in failure-control
  `86d39c19a5c5223a729c2f296cd8de9ea60a3c91`; prior artifacts remain immutable; HS-005 is unchecked
- **Task:** `tasks/HS-005-background-gc.md`; exact 6-line HS-005 block in SCOPE
- **Dependencies:** P09/02 and P11A–C are passed; P12 is independent of blocked P05/P08/P10
- **Literal original BASE:** `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`
- **Revision-03 pre-implementation HEAD:** `b2c32a40e0aca052771c45d086180522e040e5f4`
- **Literal revision-03 product/test HEAD:** `058098dc74833523bc4a05094b164af5635f327f`
- **Committed revision-03 range:** two commits, seven authorized paths; interim
  `7e1fb5d1145cbf363751c4f7bc7748844b0fd104` and strict-bound continuation
  `058098dc74833523bc4a05094b164af5635f327f`
- **Frozen implementation evidence:** `evidence/P12/implementation-03.md`, SHA-256
  `540a3e497d3d33f4d82be5925d588e31b9ce37d030d43e88d3e412f6a38a33ce`, 139 lines/8,688 bytes
- **Allowed implementation paths:** `src/lib/crdt/maintenance.ts`, `description-aliases.ts`,
  `queries.ts`, `mutations.ts`, and, only if required for container-preserving bounded relocation,
  `mirror.ts`; focused existing/new `tests/unit/crdt/maintenance.test.ts`,
  `transaction-mutations.test.ts`, `transaction-queries.test.ts`, and
  `tests/integration/vault-maintenance.test.tsx`. Touch only the necessary subset. No context/Undo/
  components/routes/styles/schema/migrations/sync/transport/server/database/auth/crypto/realtime,
  dependencies/config, global ledgers, prior evidence/reviews, scratch, FS-001, SCOPE, `.claude`,
  `.codex` or agent configuration without a reproduced blocker and prior root expansion.
- **Sole implementer artifact:** `evidence/P12/implementation-03.md`
- **Future immutable review artifact:** `reviews/P12-review-03.md`
- **Commit contract:** inspect first, preserve revisions 01/02, stage exact authorized paths only,
  commit product/test remediation with a message containing no parentheses, and leave evidence
  uncommitted. Never use `git add .` or `git add -A`.
- **Pre-existing dirty paths:** root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; no staged,
  product, executable, generated or other dirty path
- **F-01 required closure:** make `unnestDuplicate()` and `swapDuplicate()` one logical operation over
  every physical copy of the parent during relocation. Define deterministic behavior when copies have
  already diverged; preserve direct/nested alias pointers and same-ID peer convergence; prove subscribed
  between-commit operations in both delivery orders and a clean final physical graph, not merely a
  deduplicated view. Audit every remaining exported mutation for first-copy behavior.
- **F-02 required closure:** route `findTransaction()`, `findTransactionById()` and
  `getTransactionsInDateRange()` through the one documented canonical selection/dedup/total-order
  rule. Add conflict-bucket and same-ID peer tests for parent/nested lookup and date ranges, including
  the import duplicate caller's expected value. Audit all exported transaction queries so no raw
  materialization-order boundary remains.
- **F-03 required closure:** a RAF callback must not perform an arbitrarily large recursive copy,
  equality, year/vault proof, alias backlink scan or CRDT apply before it can yield. Cursor inside
  transaction/nested field visits and structural/alias proofs, reuse bounded proofs safely at apply,
  and use bounded/container-preserving mutation where possible. If atomic apply cannot be subdivided,
  investigate actual Loro container-move/reference primitives or enforce a complete, repository-wide,
  backward-compatible payload bound with typed rejection and legacy handling; do not merely check the
  clock after overrun. Instrument exact inner work with oversized nested transactions, wide alias sets
  and structural trees, demonstrate each callback stays within the assigned unit/time contract, and
  retain fair completion under sustained edits. Any unresolved definition must become a complete Q
  proposal under PROCESS; it does not permit stopping or silently weakening the review gate.
- **Retained cumulative gates:** preserve correct pre-GC reads, adjacent equal year/month/day merge,
  exact record/order conservation, direct-only alias rewrites, apply-time full backlink/target proof,
  `system:gc` excluded from Undo but persisted/encrypted/synced with no echo, idempotence, hidden pause/
  visible resume when truthfully available, cancellation/replacement and provider/document lifetime.
- **Required automation:** begin with red counterexamples for all three findings. Repeat the focused
  P12 profile, nested-operation cases, exported-query cases and oversized-work instrumentation in at
  least three clean processes; run full Vitest, typecheck, lint, build, scoped format and repository
  checks. Repeat affected E2E at least three times with retries disabled and run full no-retry E2E.
  Report every red exactly; final drain and after-the-fact clock checks are not proof of the invariant.
- **Validation/manual charter:** use repository-installed headless `playwright-cli` with disposable
  real authenticated state to exercise nested duplicate resolution and lookup/import/date behavior
  while maintenance is pending, oversized scheduling/scroll/edit responsiveness, retained history/
  same-provider collection, navigation/reload, two visible tabs, offline/reconnect, responsive/dark/
  reduced-motion/200%/roles/privacy/console/network. Attribute inherited dark/zoom observations to
  P20A/P20B but do not waive them. Clean UI/session/process/generated state and restore `next-env.d.ts`.
- **Evidence contract:** record exact original BASE, preimplementation HEAD, new product/test HEAD,
  commits/paths/index, red-to-green counterexamples, architecture and all bounded work units, exact
  per-copy nested-operation results, every exported query boundary, inner cursor/work accounting and
  atomic-apply argument, commands/repeats, sanitized manual evidence, inherited reds, cleanup, risks,
  frozen checks and complete Q proposals. Do not claim PASS.
- **Frozen boundary:** scratch SHA
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, checked set
  HS-002/HS-004/HS-006/HS-010/HS-014/HS-017/HS-018, all 21 normalized blocks exact; FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Review dispatch

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal cumulative review BASE:** `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`
- **Literal revision-03 HEAD:** `058098dc74833523bc4a05094b164af5635f327f`
- **Range type:** cumulative original BASE through revision-03 product/test HEAD
- **Implementation evidence:** `evidence/P12/implementation-03.md`, SHA-256
  `540a3e497d3d33f4d82be5925d588e31b9ce37d030d43e88d3e412f6a38a33ce`, 139 lines/8,688 bytes
- **Sole reviewer artifact:** `reviews/P12-review-03.md`
- **Review SHA-256:** `3d68ffd573feff3e42d2b56d4be9d4626a3c4317c7bbda1079846127d20098ec`,
  223 lines/20,332 bytes
- **Verdict:** FAIL — three blockers require revision 04
- **F-01 High:** official Loro 1.13.7 attach recursively emits the entire detached tree during final
  `pushContainer(job.root)`, so the callback remains arbitrarily large despite bounded preparation.
- **F-02 Medium:** multi-account `queryTransactions()` and unscoped
  `getTransactionsWithDuplicates()` concatenate per-account physical results without global logical-ID
  canonicalization, leaving duplicate/materialization-sensitive public reads.
- **F-03 Medium:** all-copy unnest/swap tests use plain object fixtures; required subscribed real-Loro
  copy/remove interval and both peer-delivery-order convergence proof is absent.
- **Retained evidence:** focused 85/85 x3, full Vitest 1,258/1,258, type/lint/build/scoped format and
  affected E2E 12/12 pass; full E2E 86/87 only on inherited T021c and isolated T021c 3/3. Manual normal
  path/two-tab/offline passes. Frozen sources, index, generated state, data, browsers and port are clean.

## Next root action

Revision-03 failure control is immutable at `86d39c19a5c5223a729c2f296cd8de9ea60a3c91`.
Link it in the root-only ledgers, then dispatch cumulative P12/04 with one new evidence path.
