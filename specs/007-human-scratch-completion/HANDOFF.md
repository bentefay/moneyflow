# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P13 / 01
- **Scope IDs:** HS-001 only; normal persisted empty Add Transaction rows; HS-001 remains incomplete
  and unchecked
- **State:** changes_requested; revision 01 becomes immutable after root persistence; HS-001 remains
  unchecked
- **Task:** `tasks/HS-001-add-transaction-rows.md`; exact 5-line HS-001 block in SCOPE
- **Dependencies:** P09/02 and P11A–C are passed; P13 is independent of blocked P05/P08/P10
- **Literal original BASE / pre-implementation HEAD:**
  `415ea080b3b19191fd71601742056a619b4a3080`
- **Literal revision-01 product/test HEAD:** `6276108f4ebae4e63a23cbf5d532b8843e9f0a98`
- **Revision-01 commit:** `6276108f4ebae4e63a23cbf5d532b8843e9f0a98`; exactly 15 authorized
  product/test paths, including deletion of the dead `AddTransactionRow.tsx`
- **Frozen implementation evidence:** `evidence/P13/implementation-01.md`, SHA-256
  `910135f64546a22d41218df0f7ce3c00c5b7b5434604108e057e51770a22c9f9`, 227 lines/15,227 bytes
- **Allowed implementation paths:** the necessary subset of
  `src/app/(app)/transactions/page.tsx`,
  `src/components/features/transactions/AddTransactionRow.tsx`,
  `TransactionRow.tsx`, `TransactionTable.tsx`, `TransactionTableToolbar.tsx`,
  `index.ts`, `hooks/useGridCellNavigation.ts`, `hooks/useKeyboardNavigation.ts`; narrowly
  `src/lib/crdt/context.tsx` and `mutations.ts` only if the ordinary persisted insert/default
  mutation cannot be correct through the existing API; focused existing/new
  `tests/unit/crdt/transaction-mutations.test.ts`,
  `tests/unit/transactions/keyboard-navigation.test.ts`,
  `tests/unit/transactions/virtualization.test.tsx`,
  `tests/integration/transaction-operations.test.ts`, `tests/e2e/transactions.spec.ts` and
  `tests/e2e/undo-redo.spec.ts`, plus exact retained-journey updates in
  `tests/e2e/description-aliases.spec.ts` and `tests/e2e/tab-duplication.spec.ts`.
  No other components/routes/styles/schema/migrations/import/sync/transport/server/database/auth/
  crypto/realtime, dependencies/config, global ledgers, prior evidence/reviews, scratch, FS-001,
  SCOPE, `.claude`, `.codex` or agent configuration without a reproduced blocker and prior root
  expansion.
- **Root authority expansion:** `src/components/features/transactions/index.ts` is authorized only
  to remove the dead `AddTransactionRow` barrel export after the in-scope component deletion. No
  other barrel/component/helper expansion is authorized. `tests/e2e/description-aliases.spec.ts`
  and `tests/e2e/tab-duplication.spec.ts` are authorized only to replace independently reproduced
  removed special-form selectors with the selected ordinary-row workflow and correct the associated
  Add-then-edit Undo expectation.
- **Sole implementer artifact:** `evidence/P13/implementation-01.md`
- **Future immutable review artifact:** `reviews/P13-review-01.md`
- **Commit contract:** inspect existing patterns first; stage exact authorized paths only; commit
  product/test work with a short message containing no parentheses; leave evidence uncommitted.
  Never use `git add .` or `git add -A`.
- **Review-start dirty paths:** root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus the sole
  untracked frozen implementation evidence; no staged, product, executable, generated or other dirty
  path
- **Required behavior:** every Add click atomically inserts a distinct persisted transaction with
  valid defaults and predictable selection/focus. Rapid clicks create multiple rows. Each row
  immediately uses the normal selectable/editable/deletable/status/account/date/grid affordances;
  no confirm/cancel/add-only controls or single-add disabling remain. Empty manual description is
  valid; later text uses HS-004 alias semantics rather than imported raw description.
- **Persistence/history/convergence:** empty rows survive reload, offline cache and reconnect; two
  tabs converge without duplicate IDs or stuck state. Each Add is one user Undo step; redo restores
  the same logical row. Deletion and subsequent Undo/Redo retain normal transaction behavior.
- **Grid/virtualization:** preserve sort/date behavior, virtual focus/scroll stability, row
  selection, Arrow navigation and Tab/Shift+Tab/Enter/Escape conventions. Three rapid rows must be
  independently reachable without surprise focus jumps. Preserve accessible names and normal row
  controls at desktop, narrow width and 200% zoom.
- **Required red-to-green proof:** reproduce the current single `isAddingTransaction` gate,
  disabled Add button, description-required special form and confirm/cancel affordances before
  changing behavior. Add deterministic unit/integration coverage for valid empty defaults, unique
  IDs, insertion/order, persistence/convergence and one-step Undo/Redo; add behavior-led E2E steps
  for rapid multiple Add clicks, ordinary editing/selection/deletion/arrows/reload/two-tab/offline.
- **Required automation:** repeat the focused P13 unit/integration profile in at least three clean
  processes; run full Vitest, typecheck, lint, build, changed-path formatting and repository checks.
  Repeat affected E2E journeys at least three times with retries disabled and run the full no-retry
  E2E suite. Report every red and inherited failure exactly; no arbitrary waits or text-only
  assertions.
- **Manual charter:** use only repository-installed headless `playwright-cli` with a disposable
  authenticated session. Add three empty rows rapidly; inspect focus, scrolling, layout and ordinary
  controls with pointer/keyboard; exercise arrows, Tab/Shift+Tab, Enter/Escape, selection, edits,
  delete, Undo/Redo, reload, authenticated duplicate tab, offline/reconnect, 390px, dark,
  reduced-motion, 200%, roles/privacy/console/network. Close/delete the session, stop servers, remove
  only generated artifacts and restore `next-env.d.ts`.
- **Evidence contract:** record exact BASE/HEAD/commits/paths/index; red counterexamples; final
  architecture and default entity values; focus/virtualization/sort semantics; CRDT mutation,
  persistence/sync and Undo grouping; exact commands/repeats/counts; sanitized manual evidence;
  inherited reds; cleanup; frozen checks; risks and complete Q proposals. Do not claim PASS.
- **Applicable repository guides:** `.claude/skills/components/SKILL.md`,
  `.claude/skills/crdt/SKILL.md`, `.claude/skills/sync/SKILL.md` and
  `.claude/skills/e2e/SKILL.md`; use draft-style CRDT mutations, established UI patterns,
  behavior-led selectors and no arbitrary sleeps.
- **Frozen boundary:** scratch SHA
  `aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`, checked set
  HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018, all 21 normalized blocks exact; FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Review dispatch

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal cumulative review BASE:** `415ea080b3b19191fd71601742056a619b4a3080`
- **Literal revision-01 HEAD:** `6276108f4ebae4e63a23cbf5d532b8843e9f0a98`
- **Range type:** original P13 BASE through revision-01 product/test HEAD
- **Implementation evidence:** `evidence/P13/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P13-review-01.md`
- **Revision-01 review:** FAIL, SHA-256
  `579a6f08fa3096a92d1695a5de1184e18ce3912e5a651eda1d8202d20a99dd55`, 163 lines/14,917 bytes.
  F-01 High proves an active excluding filter hides the newly persisted selected row, leaving zero
  visible rows with one invisible selection.
- **Revision-01 failure integration commit:** `f54526821bec08698214065c48ea237bf718fe15`
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit
  or commit
- **Required review focus:** independently prove the special add mode is removed, every Add is an
  ordinary persisted empty row, rapid adds are unique, grid focus/navigation/virtualization remain
  stable, alias semantics are legal, and reload/offline/two-tab/Undo/Redo behavior is exact.
- **Evidence gate:** inspect the complete range and every production Add surface; independently run
  focused tests x3, full checks, affected/full no-retry E2E, installed-CLI pointer/keyboard/
  responsive/offline/two-tab/privacy charter and exact cleanup.
- **Verdict contract:** review the literal range with explicit findings, acceptance mapping,
  commands/repeats, manual evidence, cleanup/Q proposals and one PASS/FAIL. Any material HS-001
  correctness, persistence, grid, accessibility or UX finding fails.

## Next root action

Link the immutable revision-01 failure integration commit, then dispatch P13 revision 02 for F-01
over the same original BASE.
