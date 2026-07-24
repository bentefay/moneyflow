# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P12 / 05
- **Scope IDs:** HS-005 only; bounded requestAnimationFrame maintenance for duplicate transaction
  buckets and description-alias symlinks; HS-005 remains incomplete and unchecked
- **State:** changes_requested; revision-05 failure is immutable at
  `2f39bf17e64526b63376590f2f72e730a504472e`; HS-005 is unchecked
- **Task:** `tasks/HS-005-background-gc.md`; exact 6-line HS-005 block in SCOPE
- **Dependencies:** P09/02 and P11A–C are passed; P12 is independent of blocked P05/P08/P10
- **Literal original BASE:** `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`
- **Revision-05 pre-implementation HEAD:** `19589ee99e249b8371ee6255528cc36ebcade84d`
- **Literal revision-05 product/test HEAD:** `865a78774cee84a3ed4c2686422579af94d368b5`
- **Revision-05 commits:** `cfeb4dae13f9eff855a1b95feb14d9c06adda016` plus hook correction
  `865a78774cee84a3ed4c2686422579af94d368b5`; seven authorized cumulative paths
- **Frozen implementation evidence:** `evidence/P12/implementation-05.md`, SHA-256
  `146a1cc4df55e5aa1bbfab922861ed069e7c5a7f55585f4a8f852d7cb6794ba5`, 171 lines/11,731 bytes
- **Literal revision-04 product/test HEAD:** `2489c41335ad2292f9005403c18022c46915507b`
- **Committed revision-04 range:** seven authorized paths, 1,290 insertions/173 deletions; commit
  `Complete bounded private vault maintenance`
- **Frozen implementation evidence:** `evidence/P12/implementation-04.md`, SHA-256
  `8bc662894cf3efb60456ba235d539504f4520ef6b0af047e3d6eb882e6e63def`, 207 lines/14,537 bytes
- **Allowed implementation paths:** `src/lib/crdt/maintenance.ts`, `queries.ts`, `mutations.ts`,
  narrowly `context.tsx` for the raw `useTransaction` private-child leak, and
  only if a private maintenance-shadow discriminator needs shared type/Mirror handling,
  `schema.ts`/`mirror.ts`; focused existing/new `tests/unit/crdt/maintenance.test.ts`,
  `transaction-mutations.test.ts`, `transaction-queries.test.ts`, and
  `tests/integration/vault-maintenance.test.tsx` plus one focused context-hook regression. Touch only
  the necessary subset. No other context/Undo/
  components/routes/styles/schema/migrations/sync/transport/server/database/auth/crypto/realtime,
  dependencies/config, global ledgers, prior evidence/reviews, scratch, FS-001, SCOPE, `.claude`,
  `.codex` or agent configuration without a reproduced blocker and prior root expansion.
- **Sole implementer artifact:** `evidence/P12/implementation-05.md`
- **Future immutable review artifact:** `reviews/P12-review-05.md`
- **Commit contract:** inspect first, preserve revisions 01/02, stage exact authorized paths only,
  commit product/test remediation with a message containing no parentheses, and leave evidence
  uncommitted. Never use `git add .` or `git add -A`.
- **Pre-existing dirty paths:** root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; no staged,
  product, executable, generated or other dirty path
- **Revision-05 closure:** recursively filter incomplete nested shadows at every lookup/read/mutation;
  classify any mixed maintenance/user/import batch as invalidating before reveal; exchange actual
  unnest/swap updates in both orders and compare subscribed physical docs; keep maintenance metadata
  outside public Mirror transaction enumeration with bounded crash/reload/sync cleanup. Preserve the
  now-passed bounded attach and global canonical-query behavior.
- **Root authority expansion:** `src/lib/crdt/context.tsx` and one focused hook regression are
  explicitly authorized because review-04 names `useTransaction` as a raw public boundary and final
  worker audit reproduced a malformed/legacy private parent leaking a real-ID incomplete nested child.
  No other path expansion is authorized.
- **Prior F-01 retained:** remove the recursively attaching detached-tree final path. Prefer a private
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
- **Literal revision-05 HEAD:** `865a78774cee84a3ed4c2686422579af94d368b5`
- **Range type:** cumulative original BASE through revision-05 product/test HEAD
- **Implementation evidence:** `evidence/P12/implementation-05.md`, SHA-256
  `146a1cc4df55e5aa1bbfab922861ed069e7c5a7f55585f4a8f852d7cb6794ba5`, 171 lines/11,731 bytes
- **Sole reviewer artifact:** `reviews/P12-review-05.md`
- **Review SHA-256:** `a54ea0b726d157fabab1b3d59a3f2ca84391cfc9ff0560b48a20e08296e8326a`,
  196 lines/14,376 bytes
- **Verdict:** FAIL — review-04 F-01 through F-03 close and F-04 closes for new/startup state, but two
  lifecycle blockers require revision 06
- **F-05 High:** scheduler disposal retains per-document shadow/import trust; same-document remount can
  resume a partial shadow after equal-cardinality tag/allocation edits, reveal stale data and delete source.
- **F-06 Medium:** late revision-04 metadata-only live sync bypasses alias-projection-gated cleanup and
  can reintroduce the reserved account through raw `useTransactions()`.
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

Persist/link revision-05 failure artifacts and dispatch narrow cumulative P12/06.
