# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P14 / 01
- **Scope IDs:** HS-008 only; import lineage, immutable original amount, accessible amount tooltip
  and reversible import deletion; HS-008 remains incomplete and unchecked
- **State:** implementing
- **Task:** `tasks/HS-008-import-lineage.md`; exact 4-line HS-008 block in SCOPE
- **Dependencies:** P09/02 is passed; P14 is independent of blocked P05/P08/P10
- **Literal original BASE / pre-implementation HEAD:**
  `b9105028926d24a5a0c5454777a6c33379ca606a`
- **Sole implementer artifact:** `evidence/P14/implementation-01.md`
- **Future immutable review artifact:** `reviews/P14-review-01.md`
- **Implementation-start dirty paths:** root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; no
  staged, product, test, executable, generated, evidence, review or other dirty path
- **Allowed implementation paths:** only the necessary subset of
  `src/lib/crdt/schema.ts`, `mutations.ts`, `description-aliases.ts`, `context.tsx`, `queries.ts`,
  `maintenance.ts`; `src/lib/sync/manager.ts`; `src/app/(app)/imports/page.tsx`,
  `imports/new/page.tsx`, `transactions/page.tsx`;
  `src/components/features/import/DeleteImportDialog.tsx`;
  `src/components/features/transactions/TransactionRow.tsx`,
  `cells/InlineEditableAmount.tsx`; and focused existing/new
  `tests/unit/crdt/transaction-mutations.test.ts`, `hierarchical-schema.test.ts`,
  `transaction-queries.test.ts`, `tests/unit/sync/manager.test.ts`,
  `tests/integration/transaction-operations.test.ts`, `import.test.ts`,
  `tests/e2e/import.spec.ts`, `transactions.spec.ts`, `undo-redo.spec.ts` and
  `sync-persistence.spec.ts`; plus the root-authorized test-fixture expansion
  `tests/integration/description-alias-actions.test.ts`,
  `tests/integration/description-alias-crdt.test.ts`,
  `tests/integration/description-alias-lookup-lifecycle.test.tsx`,
  `tests/integration/vault-maintenance.test.tsx`,
  `tests/unit/crdt/description-alias-mutations.test.ts`,
  `tests/unit/crdt/maintenance.test.ts` and
  `tests/unit/crdt/transaction-ordering.test.ts`. The seven expanded paths may receive only
  mechanical `originalAmount: undefined` compatibility for existing legacy construction fixtures
  and directly owner-aligned provenance-retention assertions. Touch only proven owners. No other
  parser/component/UI/CRDT/sync/crypto/server/schema/migration/dependency/config/test path, global
  ledger, prior evidence/review, scratch, FS-001, SCOPE, `.claude`, `.codex` or agent configuration
  without a reproduced blocker and prior root expansion.
- **Commit contract:** inspect existing patterns first; stage exact authorized product/test paths
  only; commit product/test work with a short message containing no parentheses; leave evidence
  uncommitted. Never use `git add .` or `git add -A`.
- **Lineage/schema behavior:** every imported parent and nested duplicate retains the exact import
  ID through insertion, query projection, alias operations, move/unnest/swap, maintenance and sync.
  Manual rows never acquire import lineage. Add optional original minor units to parent and nested
  schema in a backward-compatible way; legacy rows without the field remain valid.
- **Original amount behavior:** the first actual amount change on an imported transaction stores
  its pre-edit minor units exactly once. Later amount edits, account/date moves, duplicate
  transformations, alias edits, reload, Undo/Redo, offline persistence and peers never overwrite
  that origin. Manual and unedited imported rows expose no original amount. Centralize this at the
  mutation boundary so inline, bulk, history and future callers cannot bypass it.
- **Tooltip/UX:** use the established shadcn tooltip primitives on the ordinary amount cell. Show
  the original amount only for an edited imported row, formatted with that transaction/account
  currency and correct 0/2/3/8 decimal minor-unit semantics. It must be available by hover and
  keyboard focus with a programmatic accessible name/description, absent from manual/unedited rows,
  and preserve spreadsheet editing, arrows, Tab/Shift+Tab, Enter/Escape, virtualization, mobile,
  dark, reduced motion and 200% zoom.
- **Import deletion:** one user action must atomically soft-delete the import record and remove or
  safely soft-delete every linked parent/nested physical representation across accounts/dates while
  preserving other imports/manual rows and pruning only truly empty buckets. It must be one Undo
  step; Redo repeats the exact logical result. Alias cleanup must remain legal, no stale import row
  or orphan duplicate may survive, and another import's data must never be deleted. The dialog must
  give precise destructive feedback.
- **Data-preservation decision:** follow the PROCESS hierarchy and existing CRDT conventions.
  Preserve reversibility and unrelated data. If retention versus physical-removal semantics remain
  materially ambiguous after source inspection, record a complete `Q-PROPOSAL-P14-01-*` in the
  evidence, choose the safest reversible implementation and continue; do not ask or pause.
- **Large-import persistence / R-023:** reproduce the known 1,000-row encrypted-update overflow at
  the unbounded byte-array-to-base64 conversion. Replace only the proven encoding owner with a
  bounded/library-safe conversion that preserves encrypted bytes and version-vector behavior.
  Prove a 1,000-row import remains navigable, immediately cached, pushes successfully, reloads with
  all rows and recovers offline/reconnect without plaintext or stack overflow.
- **Required red-to-green proof:** first reproduce absent `originalAmount`, overwritten provenance
  risk, split two-action import deletion/history, nested/cross-import edge cases and 1,000-row
  persistence failure. Add table-driven/property or integration coverage for parent/nested lineage,
  first-edit immutability, positive/negative/zero values, USD/JPY/KWD/BTC formatting, legacy
  optionality, move/unnest/swap/copy, cross-import isolation, exact bucket pruning and one-step
  delete Undo/Redo.
- **Required automation:** repeat the focused import/schema/mutation/sync/amount profile in at least
  three clean processes; run full Vitest, typecheck, lint, build, scoped formatting and repository
  checks. Run behavior-led CSV and OFX journeys, amount tooltip/edit/reload, delete import with
  exact-ID Undo/Redo, 1,000-row persistence and affected retained journeys at least three times with
  retries disabled, then full E2E with one worker/retries zero. Report every red and inherited
  failure exactly; no arbitrary waits or text-only proof.
- **Manual charter:** use only repository-installed headless `playwright-cli` with a disposable
  authenticated session. Import two files with duplicates and different currencies; verify exact
  lineage, edit positive/negative/zero amounts twice, hover and focus the tooltip, reload and
  duplicate tab, delete one import, Undo/Redo, cross-import isolation, 1,000-row navigation/reload,
  offline/reconnect, 390px, dark, reduced motion, 200%, roles/privacy/console/network. Reject
  ambiguous destructive feedback or stale rows. Close/delete the session, stop servers, remove only
  generated artifacts and restore `next-env.d.ts`.
- **Evidence contract:** record exact BASE/HEAD/commits/paths/index; every red counterexample;
  schema/migration compatibility; all parent/nested/copy/move/alias/maintenance paths; first-edit
  semantics and currency formatting; atomic delete/history/bucket behavior; bounded base64 design;
  exact commands/repeats/counts; sanitized manual evidence; inherited reds; cleanup; frozen checks;
  risks and any complete Q proposal. Do not claim PASS.
- **Applicable repository guides:** `.claude/skills/import/SKILL.md`,
  `.claude/skills/crdt/SKILL.md`, `.claude/skills/components/SKILL.md`,
  `.claude/skills/sync/SKILL.md` and `.claude/skills/e2e/SKILL.md`; also apply the general money,
  TypeScript, accessibility, security and testing rules.
- **Frozen boundary:** scratch SHA
  `b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018, all 21 normalized blocks exact;
  FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines/25,441 bytes; SCOPE
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Future independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal cumulative review BASE:** `b9105028926d24a5a0c5454777a6c33379ca606a`
- **Range type:** original P14 BASE through the future revision-01 product/test HEAD
- **Implementation evidence:** `evidence/P14/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P14-review-01.md`
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit
  or commit
- **Required review focus:** independently prove immutable import/original-amount provenance across
  all physical forms, accessible currency-correct tooltip, one-action exact import deletion with
  one-step Undo/Redo/cross-import isolation, and durable 1,000-row encrypted persistence. Revalidate
  migration safety, buckets, aliases, history, sync, virtualization and all affected cumulative
  journeys.
- **Evidence gate:** inspect every field-copy and mutation boundary; independently run focused x3,
  full checks, affected/full no-retry E2E, installed-CLI two-import/currency/tooltip/delete/
  history/large/offline/two-tab/responsive/privacy charter and exact cleanup.
- **Verdict contract:** review the literal range with explicit findings, acceptance mapping,
  commands/repeats, manual evidence, cleanup/Q proposals and one PASS/FAIL. Any material HS-008
  correctness, preservation, persistence, history, accessibility, security or UX finding fails.

## Next root action

Dispatch `human_scratch_implementer` for P14 revision 01 at exact BASE
`b9105028926d24a5a0c5454777a6c33379ca606a`; then freeze its product/test HEAD and
`evidence/P14/implementation-01.md` before independent review.
