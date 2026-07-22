# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P12 / 04
- **Scope IDs:** HS-005 only; bounded requestAnimationFrame maintenance for duplicate transaction
  buckets and description-alias symlinks; HS-005 remains incomplete and unchecked
- **State:** changes_requested; revision-04 failure is immutable at
  `48fb391a83ef711f9b1263c2a5fdfac79a367481`; HS-005 is unchecked
- **Task:** `tasks/HS-005-background-gc.md`; exact 6-line HS-005 block in SCOPE
- **Dependencies:** P09/02 and P11A–C are passed; P12 is independent of blocked P05/P08/P10
- **Literal original BASE:** `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`
- **Revision-04 pre-implementation HEAD:** `14259b5f6d02f566e32ac94ab4d63c20b5ef0353`
- **Literal revision-04 product/test HEAD:** `2489c41335ad2292f9005403c18022c46915507b`
- **Committed revision-04 range:** seven authorized paths, 1,290 insertions/173 deletions; commit
  `Complete bounded private vault maintenance`
- **Frozen implementation evidence:** `evidence/P12/implementation-04.md`, SHA-256
  `8bc662894cf3efb60456ba235d539504f4520ef6b0af047e3d6eb882e6e63def`, 207 lines/14,537 bytes
- **Allowed implementation paths:** `src/lib/crdt/maintenance.ts`, `queries.ts`, `mutations.ts`, and
  only if a private maintenance-shadow discriminator needs shared type/Mirror handling,
  `schema.ts`/`mirror.ts`; focused existing/new `tests/unit/crdt/maintenance.test.ts`,
  `transaction-mutations.test.ts`, `transaction-queries.test.ts`, and
  `tests/integration/vault-maintenance.test.tsx`. Touch only the necessary subset. No context/Undo/
  components/routes/styles/schema/migrations/sync/transport/server/database/auth/crypto/realtime,
  dependencies/config, global ledgers, prior evidence/reviews, scratch, FS-001, SCOPE, `.claude`,
  `.codex` or agent configuration without a reproduced blocker and prior root expansion.
- **Sole implementer artifact:** `evidence/P12/implementation-04.md`
- **Future immutable review artifact:** `reviews/P12-review-04.md`
- **Commit contract:** inspect first, preserve revisions 01/02, stage exact authorized paths only,
  commit product/test remediation with a message containing no parentheses, and leave evidence
  uncommitted. Never use `git add .` or `git add -A`.
- **Pre-existing dirty paths:** root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; no staged,
  product, executable, generated or other dirty path
- **F-01 required closure:** remove the recursively attaching detached-tree final path. Prefer a private
  in-document maintenance shadow built in bounded field/item commits: all public reads/mutations must
  ignore incomplete shadows; any relevant user/peer edit invalidates and boundedly discards the shadow;
  only a complete, freshly validated shadow becomes public in one constant/fixed-depth commit that also
  removes the source. Prove every callback's inner work, crash/interruption/reload cleanup, observer
  invisibility, Undo exclusion, encrypted sync/convergence and no orphan/private marker leakage. Any
  alternative must prove from official Loro behavior that final apply is not recursive/unbounded.
- **F-02 required closure:** globally canonicalize logical IDs after multi-account concatenation in
  `queryTransactions()` and unscoped `getTransactionsWithDuplicates()` while preserving account/date/
  import ordering and scoped duplicate semantics. Audit every public multi-account caller.
- **F-03 required closure:** use real Loro docs/providers/subscriptions, create the copy/remove or shadow
  interval, perform unnest and swap, exchange operations in both peer delivery orders, and prove each
  subscribed state plus clean converged physical graph, alias pointers and no standalone/nested loss.
- **Retained cumulative gates:** preserve correct pre-GC reads, adjacent equal year/month/day merge,
  exact record/order conservation, direct-only alias rewrites, apply-time full backlink/target proof,
  `system:gc` excluded from Undo but persisted/encrypted/synced with no echo, idempotence, hidden pause/
  visible resume when truthfully available, cancellation/replacement and provider/document lifetime.
- **Required automation:** begin with red counterexamples for all three findings. Repeat the focused
  P12 profile, real-Loro nested-operation cases, global-query cases and oversized-work instrumentation in at
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
- **Literal revision-04 HEAD:** `2489c41335ad2292f9005403c18022c46915507b`
- **Range type:** cumulative original BASE through revision-04 product/test HEAD
- **Implementation evidence:** `evidence/P12/implementation-04.md`, SHA-256
  `8bc662894cf3efb60456ba235d539504f4520ef6b0af047e3d6eb882e6e63def`, 207 lines/14,537 bytes
- **Sole reviewer artifact:** `reviews/P12-review-04.md`
- **Review SHA-256:** `0a97f910124dfbde35243a1d736337dc14179709108f2cb4c5df3d89cefcce49`,
  236 lines/23,016 bytes
- **Verdict:** FAIL — recursive attach/global queries close; four blockers require revision 05:
  incomplete nested shadows leak through lookups; mixed maintenance/user batches bypass invalidation;
  unnest/swap updates are not exchanged/physically compared; metadata permanently enters public Mirror.
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit or commit
- **Required review focus:** independently close revision-03 F-01 through F-03. Inspect every private
  shadow lifecycle/read/mutation/sync/hydration boundary and official Loro cost; reject recursive final
  attach, visible/operable partial state, unbounded rollback/cleanup, stale reveal, global-query leakage,
  or helper/plain-object-only convergence evidence. Revalidate every cumulative closed gate.
- **Evidence gate:** verify low-level metadata never enters public Mirror/default construction; all
  reads/mutations/imports/aliases/UI ignore private shadows; local/remote edits invalidate safely;
  crash/reload/sync cleanup is bounded; reveal/rollback does no recursive attach. Independently run
  subscribed real-Loro both-order unnest/swap and global multi-account queries, focused x3, full checks,
  affected/full no-retry E2E, installed CLI lifecycle/offline/two-tab/privacy and exact cleanup.
- **Verdict contract:** review full cumulative range with explicit findings, acceptance mapping,
  commands/repeats, manual evidence, cleanup/Q proposals and one PASS/FAIL. Material P12 findings fail.

## Next root action

Persist/link revision-04 failure artifacts and risks, then dispatch cumulative P12/05.
