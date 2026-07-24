# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P14 / 02
- **Scope IDs:** HS-008 only; import lineage, immutable original amount, accessible amount tooltip
  and reversible import deletion; HS-008 remains incomplete and unchecked
- **State:** changes_requested
- **Task:** `tasks/HS-008-import-lineage.md`; exact 4-line HS-008 block in SCOPE
- **Dependencies:** P09/02 is passed; P14 is independent of blocked P05/P08/P10
- **Literal original BASE / pre-implementation HEAD:**
  `b9105028926d24a5a0c5454777a6c33379ca606a`
- **Revision-02 pre-implementation HEAD:**
  `7db79a68db5e08f9ad4f8dfd0b01fb16b31b98a2`
- **Literal cumulative product/test HEAD:**
  `93d89145fe910a1348ccd4a4f0c79f2022801465`
- **Sole implementer artifact:** `evidence/P14/implementation-02.md`
- **Frozen evidence identity:** SHA-256
  `e7d8dcf685f920f1ab182a2719fb3573fc3daceb199c01852505eaefad5eeb52`, 156 lines /
  11,793 bytes
- **Future immutable review artifact:** `reviews/P14-review-02.md`
- **Revision-02 review identity:** FAIL, SHA-256
  `e6c4d2fdbd4ce5b2c5d6db75f6451a19d0a1901bb769640a1933e9fa9fdab7c4`, 191 lines /
  14,936 bytes
- **Blocking revision-02 finding:** F-02 Medium Requirements/UX. The new
  `useActiveTransactions()`/`getAllTransactions()` count includes top-level transactions but omits
  distinct imported identities stored in `suspectedDuplicates`; the atomic delete scans and removes
  those nested identities. Normal UI reproduction imported one identical second file, displayed
  table/dialog count zero, and confirmation deleted one nested linked transaction. Revision 03 must
  enumerate/deduplicate every active parent and nested logical ID with the same identity semantics
  as deletion and add an ordinary-import nested duplicate → count one → delete/Undo/Redo E2E.
- **Revision-01 review identity:** FAIL, SHA-256
  `92bbcf462e6cceb973adb9525402cc357ed37706d67752169506ae286e1b621f`, 171 lines /
  13,684 bytes
- **Blocking revision-01 finding:** F-01 Medium Requirements/UX. After an ordinary deletion leaves
  three live rows linked to a four-row import, the imports table and destructive dialog still use
  immutable original `Import.transactionCount=4`; the atomic operation correctly deletes only the
  live three. Revision 02 must derive destructive feedback from the same current linked identity set
  as the delete operation and add the exact four → ordinary-delete one → dialog three → delete →
  one-step Undo/Redo isolation journey. The independently deleted row must remain deleted.
- **Evidence correction requirement:** immutable revision-01 evidence itself is the fourteenth
  repository `format:check` failure and incorrectly described the repository result as the prior
  thirteen paths. Do not edit that frozen file; revision-02 evidence must report repository
  formatting exactly and pass formatting for its newly assigned artifact before handoff.
- **Implementation-start dirty paths:** root-owned unstaged `HANDOFF.md` and `PROGRESS.md` only;
  index empty; revision-01 evidence/review are committed and immutable
- **Allowed implementation paths:** only `src/app/(app)/imports/page.tsx`,
  `src/components/features/import/ImportsTable.tsx`,
  `src/components/features/import/DeleteImportDialog.tsx`,
  `tests/e2e/import.spec.ts`, and—only if a focused non-UI owner is proven necessary—
  `tests/integration/transaction-operations.test.ts` or
  `tests/unit/crdt/transaction-queries.test.ts`. Prefer deriving the live linked count from the
  existing `useActiveTransactions()` canonical projection in the imports page and passing it
  through the existing `ImportData` boundary; do not change the already sound atomic mutation.
  Touch only proven owners. No other UI/CRDT/sync/crypto/server/schema/migration/dependency/config/
  test path, global ledger, prior evidence/review, scratch, FS-001, SCOPE, `.claude`, `.codex` or
  agent configuration without a reproduced blocker and prior root expansion.
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
  materially ambiguous after source inspection, record a complete `Q-PROPOSAL-P14-02-*` in the
  evidence, choose the safest reversible implementation and continue; do not ask or pause.
- **Cumulative regression:** do not weaken revision-01 behavior. Retain first-edit origin,
  parent/nested lineage, tooltip accessibility/precision/zoom, atomic live-set deletion/history and
  bounded 1,000-row encrypted persistence unchanged.
- **Required red-to-green proof:** reproduce review F-01 on unchanged revision-01 product: import
  four, ordinary-delete one, prove exactly three live linked rows while the dialog says four. Then
  make both the imports presentation and destructive dialog truthful about the current linked set
  using canonical transaction identity. Add a checked-in behavior-led E2E that asserts dialog three,
  confirms deletion of exactly those three plus the import record, preserves another import/manual
  rows, makes one Undo restore exactly those three plus record while the independently deleted row
  stays absent, and makes one Redo remove only that restored set again.
- **Required automation:** repeat the exact F-01 journey at least three times with one worker and
  retries disabled; run the focused import/transaction profile in three clean processes, owner
  Vitest, full Vitest, typecheck, lint, build, scoped formatting/ESLint and exact diff checks. Run
  the six-file affected E2E matrix and full E2E once each with one worker/retries zero. Report every
  red and inherited failure exactly; no arbitrary waits, temporary configs or text-only proof.
- **Manual charter:** use only repository-installed headless `playwright-cli` with a disposable
  authenticated session. Reproduce four → ordinary-delete one → live/import/dialog counts, then
  confirm/Undo/Redo and cross-import/manual isolation. Sample retained origin tooltip, 200% zoom,
  1,000-row reload, offline/duplicate-tab convergence and encrypted request privacy rather than
  relying only on prior evidence. Close/delete the session, stop servers, remove only generated
  artifacts and restore `next-env.d.ts`.
- **Evidence contract:** record exact original BASE, revision-02 pre-HEAD, cumulative HEAD, commits,
  paths and index; F-01 red/green; exact live-count identity derivation; stale-row/delete/history
  assertions; commands/repeats/counts; sanitized manual evidence; cumulative regression evidence;
  inherited reds; cleanup; frozen checks; risks and any complete Q proposal. Explicitly run and
  report repository `format:check`; format `implementation-02.md` before freeze without changing
  revision-01 evidence. Do not claim PASS.
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

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal cumulative review BASE:** `b9105028926d24a5a0c5454777a6c33379ca606a`
- **Literal cumulative review HEAD:** `93d89145fe910a1348ccd4a4f0c79f2022801465`
- **Range type:** original P14 BASE through the exact revision-02 product/test HEAD
- **Implementation evidence:** `evidence/P14/implementation-02.md`
- **Sole reviewer artifact:** `reviews/P14-review-02.md`
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit
  or commit
- **Required review focus:** close review-01 F-01 with the same live linked identity semantics as
  atomic deletion, exact stale-row history/isolation behavior and truthful table/dialog copy.
  Revalidate every cumulative HS-008 acceptance clause and the evidence formatting correction.
- **Evidence gate:** inspect the entire cumulative range; independently run F-01 E2E x3, focused x3,
  owner/full checks, affected/full no-retry E2E, installed-CLI stale-count/delete/history plus
  cumulative accessibility/large/offline/privacy samples, repository formatting and exact cleanup.
- **Verdict contract:** review the literal range with explicit findings, acceptance mapping,
  commands/repeats, manual evidence, cleanup/Q proposals and one PASS/FAIL. Any material HS-008
  correctness, preservation, persistence, history, accessibility, security or UX finding fails.

## Next root action

Persist immutable revision-02 evidence/review and this failure disposition in an exact-path root
control commit. Then rewrite this handoff for P14 revision 03 with the same original BASE, a new
pre-implementation HEAD, exact `evidence/P14/implementation-03.md` and
`reviews/P14-review-03.md`, and the narrow query/context/page/test owners needed to close F-02.
Preserve both prior revisions byte-for-byte and keep HS-008 unchecked.
