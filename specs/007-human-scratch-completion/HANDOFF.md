# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P12 / 08
- **Scope IDs:** HS-005 only; bounded requestAnimationFrame maintenance for duplicate transaction
  buckets and description-alias symlinks; HS-005 remains incomplete and unchecked
- **State:** passed after root integration; revisions 01–08 are immutable; HS-005 remains unchecked
  until the separate root marker transaction
- **Task:** `tasks/HS-005-background-gc.md`; exact 6-line HS-005 block in SCOPE
- **Dependencies:** P09/02 and P11A–C are passed; P12 is independent of blocked P05/P08/P10
- **Literal original BASE:** `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`
- **Revision-08 pre-implementation HEAD:** `a5570e3d805cbb65af3f4cf5cead554fef279bce`
- **Literal revision-08 product/test HEAD:** `a2a31839f6bb57855fa60b8cfcc06feed069cafa`
- **Revision-08 commit:** `a2a31839f6bb57855fa60b8cfcc06feed069cafa`; exactly
  `src/lib/crdt/context.tsx` and `tests/integration/vault-maintenance.test.tsx`
- **Frozen implementation evidence:** `evidence/P12/implementation-08.md`, SHA-256
  `c3d0753c48884fea4d15a93b3570301ea3c69f071ab02d1a831daa9a4ce50900`, 202 lines/13,758 bytes
- **Revision-07 pre-implementation HEAD:** `bebf4f546c8a7715934adbafd757dfdcd27dec91`
- **Literal revision-07 product/test HEAD:** `ebe2fb6caf70acbdb88245cf3121f8c6356b1162`
- **Revision-07 commit:** `ebe2fb6caf70acbdb88245cf3121f8c6356b1162`; exactly
  `src/lib/crdt/context.tsx` and `tests/integration/vault-maintenance.test.tsx`
- **Frozen implementation evidence:** `evidence/P12/implementation-07.md`, SHA-256
  `f2bb54706d9f1c69b31573d6c3f9be3175043e63cb7a810f00d5917dc64c7a22`, 196 lines/13,005 bytes
- **Literal revision-06 product/test HEAD:** `9939d68cb6752f174c2fc60e4e815c7af52dd0d7`
- **Revision-06 commits:** `8c83dd7` and `9939d68`; exactly three authorized paths
- **Frozen implementation evidence:** `evidence/P12/implementation-06.md`, SHA-256
  `08ca7c17f64371f1f6c06ef1b8593cee035477f5b8a8dfb09431ec40b59a177c`, 191 lines/12,326 bytes
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
- **Allowed implementation paths:** exactly `src/lib/crdt/context.tsx` and focused existing/new
  cases in `tests/integration/vault-maintenance.test.tsx`. Touch only the necessary subset. No other
  maintenance/query/mutation/schema/Mirror/context/Undo/
  components/routes/styles/schema/migrations/sync/transport/server/database/auth/crypto/realtime,
  dependencies/config, global ledgers, prior evidence/reviews, scratch, FS-001, SCOPE, `.claude`,
  `.codex` or agent configuration without a reproduced blocker and prior root expansion.
- **Sole implementer artifact:** `evidence/P12/implementation-08.md`
- **Future immutable review artifact:** `reviews/P12-review-08.md`
- **Commit contract:** inspect first, preserve revisions 01/02, stage exact authorized paths only,
  commit product/test remediation with a message containing no parentheses, and leave evidence
  uncommitted. Never use `git add .` or `git add -A`.
- **Review-start dirty paths:** root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus the sole
  untracked frozen implementation evidence; no staged, product, executable, generated or other dirty
  path
- **Revision-05 closure:** recursively filter incomplete nested shadows at every lookup/read/mutation;
  classify any mixed maintenance/user/import batch as invalidating before reveal; exchange actual
  unnest/swap updates in both orders and compare subscribed physical docs; keep maintenance metadata
  outside public Mirror transaction enumeration with bounded crash/reload/sync cleanup. Preserve the
  now-passed bounded attach and global canonical-query behavior.
- **Revision-06 closure:** disposal must revoke every scheduler generation/import/shadow trust token so
  same-document remount cannot resume or reveal prior partial work; revalidation must detect equal-
  cardinality tag/allocation value edits. Any live legacy metadata/reserved-account delivery must
  schedule cleanup independently of alias projection changes and remain invisible to all raw hooks.
  Prove dispose/edit/remount stale-shadow rejection and late metadata-only sync cleanup/no resurrection.
- **Revision-07 closure:** sanitize the exported generic `useVaultSelector` transaction state before
  any caller selector runs, including PeopleTable, StatusesTable and TagsTable. Reserved/private accounts,
  parents and nested children must be invisible in the same notification before cleanup; unrelated
  state identity/subscription behavior and every prior specialized hook must remain stable. Add actual-
  context regressions for all named consumers and raw selector shapes, not only `useTransactions`.
- **Revision-08 closure:** replace the synchronous full-vault projection with a path-lazy,
  incrementally maintained/indexed or otherwise demonstrably bounded public view. Account-specific
  and reserved-key selectors must not visit unrelated account/year/month/day/transaction/nested
  trees, and ordinary transaction updates must not move unbounded work outside RAF budgets. Every
  exported application-state callback, including generic `useVaultAction`, must be unable to observe
  reserved accounts, private parents or private nested children before cleanup while legitimate
  mutations, Undo origin and one cleanup update remain correct. Preserve revision-07 same-notification
  selector sanitization and stable identities/subscriptions.
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
- **Required automation:** begin with red counterexamples for F-08 and F-09, including visit-count
  instrumentation over a deliberately large multi-account/nested fixture and real-provider generic
  action direct/enumeration/nested reads before cleanup. Repeat the focused
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
- **Literal revision-08 HEAD:** `a2a31839f6bb57855fa60b8cfcc06feed069cafa`
- **Range type:** cumulative original BASE through revision-08 product/test HEAD
- **Implementation evidence:** `evidence/P12/implementation-08.md`
- **Sole reviewer artifact:** `reviews/P12-review-08.md`
- **Revision-08 review:** PASS, SHA-256
  `6d46633271fbfcfcdcf573e62c4a0350d06b315faf7bf43ac006be379abedf85`, 154 lines/19,113 bytes.
  F-08 and F-09 close with no material finding; the exact cumulative range satisfies HS-005.
- **Revision-08 integration commit:** `f8cbb5a8caacb763c0bb77199595a5ee332ab729`
- **Revision-07 review:** FAIL, SHA-256
  `2efb05fe259074868b4e2852550f9fcd8caf8ec654f1d1eb926e038f11d14ad5`, 209 lines/21,524 bytes.
  The selector portion of F-07 closes, but F-08 High rejects the synchronous full-vault projection
  outside RAF budgets and F-09 Medium rejects raw private transaction state reaching generic
  `useVaultAction` callbacks.
- **Revision-07 failure integration commit:** `0216abbf76d40b07461af2bad94869fd3040c4fa`
- **Revision-06 review:** FAIL, SHA-256
  `a6182d430b761fd57c0ebd5ce08045811e952979303ab59b74afa885d8a8693e`, 165 lines/11,879 bytes.
  F-05 closes; F-06 physical cleanup and `useTransactions` close. F-07 Medium remains: exported
  `useVaultSelector(state => state.transactions)` exposes raw reserved state to People/Statuses/Tags
  tables before the next cleanup frame.
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit or commit
- **Required review focus:** independently close revision-07 F-08/F-09 with measured bounded selector
  work and a runtime-safe generic action boundary. Preserve the closed selector portion of F-07,
  same-notification privacy, stable identities/subscriptions, legitimate mutation and Undo behavior,
  and revalidate every cumulative P12 gate.
- **Evidence gate:** verify low-level metadata never enters public Mirror/default construction; all
  reads/mutations/imports/aliases/UI ignore private shadows; local/remote edits invalidate safely;
  crash/reload/sync cleanup is bounded; reveal/rollback does no recursive attach. Independently run
  subscribed real-Loro both-order unnest/swap and global multi-account queries, focused x3, full checks,
  affected/full no-retry E2E, installed CLI lifecycle/offline/two-tab/privacy and exact cleanup.
- **Verdict contract:** review full cumulative range with explicit findings, acceptance mapping,
  commands/repeats, manual evidence, cleanup/Q proposals and one PASS/FAIL. Material P12 findings fail.

## Next root action

Execute and verify only the durably prepared HS-005 `[] -> [x]` marker transaction; no package
dispatch is allowed until it finalizes.
