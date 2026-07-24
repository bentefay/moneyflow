# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P14 / 04
- **Scope IDs:** HS-008 only; import lineage, immutable original amount, accessible amount tooltip
  and reversible import deletion; HS-008 remains unchecked until the separate root marker
  transaction
- **State:** passed; revisions 01–04 are immutable; HS-008 marker transaction is durably prepared
- **Task:** `tasks/HS-008-import-lineage.md`; exact 4-line HS-008 block in SCOPE
- **Dependencies:** P09/02 is passed; P14 is independent of blocked P05/P08/P10
- **Literal original BASE:**
  `b9105028926d24a5a0c5454777a6c33379ca606a`
- **Revision-04 pre-implementation HEAD:**
  `8fc2163b6a44cb01775d4134f702b98f4ff9a680`
- **Literal cumulative product/test HEAD:**
  `305d6613673cf200d456276c076463b68c075500`
- **Sole implementer artifact:** `evidence/P14/implementation-04.md`
- **Frozen evidence identity:** SHA-256
  `c68488162a547ca369a8cd7734b40dccc95140407ec9c931efdb6b8e4b7521d3`, 184 lines /
  13,865 bytes
- **Frozen revision-04 review:** `reviews/P14-review-04.md`, PASS, SHA-256
  `11d524993eb312b318ebc3ec5c66a88fbbe68a580ef1103d66deb30fd3149d99`, 202 lines /
  16,035 bytes. F-03 closes with every sampled tooltip/text/arrow rectangle contained at an exact
  eight-pixel minimum margin; F-02/F-01 and the full cumulative HS-008 range remain green.
- **Root PASS integration:** `a2182116db08200b8b4df28412512b9ca3406aa2`
- **Revision-03 review identity:** FAIL, SHA-256
  `e5df38ff0486c5f65d8f734e7dcdd87522ea169667f477d1bdaac6f1f1b57af8`, 201 lines /
  16,049 bytes
- **Blocking revision-03 finding:** F-03 Medium Accessibility/UX. At 390x844 with 200% document
  zoom, dark mode and reduced motion, the original-amount tooltip is row-position dependent:
  focus/hover on a lower visible edited imported row places the tooltip wholly below the viewport,
  and an offset virtualized row places it 42px beyond the right edge, while the first-row control is
  contained and programmatic description remains correct. Revision 04 must make positioning
  collision-aware in the actual zoomed viewport/nested scroll context and add deterministic
  focus+hover containment coverage at lower vertical and right-offset positions.
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
- **Prior immutable evidence/reviews:** revision-01 evidence
  `7e4c4f8244484ee8885ecc4c547069a10d7891689a917e3332a652574754c522` and review
  `92bbcf462e6cceb973adb9525402cc357ed37706d67752169506ae286e1b621f`; revision-02
  evidence `e7d8dcf685f920f1ab182a2719fb3573fc3daceb199c01852505eaefad5eeb52`
  and review `e6c4d2fdbd4ce5b2c5d6db75f6451a19d0a1901bb769640a1933e9fa9fdab7c4`;
  revision-03 evidence `c07a417ba39a58801e7d411adcd4c87c47614e526d6c35aa1e456a306e85eb8d`
  and review `e5df38ff0486c5f65d8f734e7dcdd87522ea169667f477d1bdaac6f1f1b57af8`.
  Do not edit any prior artifact.
- **Evidence correction requirement:** immutable revision-01 evidence is the fourteenth repository
  `format:check` failure. Revision-02 evidence correctly reports all 14 failures and itself passes.
  Revision-04 evidence must preserve that exact truth and pass formatting before handoff.
- **Implementation-start dirty paths:** root-owned unstaged `HANDOFF.md` and `PROGRESS.md` only;
  index empty; all three prior evidence/review pairs are committed and immutable
- **Allowed implementation paths:** only
  `src/components/features/transactions/cells/InlineEditableAmount.tsx`,
  `tests/e2e/import.spec.ts`, and, if meaningful non-layout behavior needs focused ownership, the
  exact new path `tests/unit/components/inline-editable-amount.test.tsx`. Fix collision-aware
  placement at the actual zoomed viewport/nested virtualized scroll boundary while keeping the
  established shadcn/Radix tooltip semantics and current accessible input description. Do not edit
  the shared tooltip primitive unless a reproducible component-local impossibility is first
  reported to root and root explicitly expands scope. No other component/UI/CRDT/import/sync/
  crypto/server/schema/migration/dependency/config/test path, global ledger, prior evidence/review,
  scratch, FS-001, SCOPE, `.claude`, `.codex` or agent configuration without a reproduced blocker
  and prior root expansion.
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
  give precise destructive feedback from the current live logical-identity set.
- **Data-preservation decision:** follow the PROCESS hierarchy and existing CRDT conventions.
  Preserve reversibility and unrelated data. If retention versus physical-removal semantics remain
  materially ambiguous after source inspection, record a complete `Q-PROPOSAL-P14-04-*` in the
  evidence, choose the safest reversible implementation and continue; do not ask or pause.
- **Cumulative regression:** do not weaken revision-01 behavior. Retain first-edit origin,
  parent/nested lineage, tooltip accessibility/precision/zoom, atomic live-set deletion/history and
  bounded 1,000-row encrypted persistence unchanged.
- **Required red-to-green proof:** before product code, add a checked-in behavior-led browser
  regression that reproduces F-03 on exact unchanged revision-03 behavior. Through ordinary import
  and amount editing, use 390x844, 200% document zoom, dark mode and reduced motion. For a lower
  vertically positioned visible edited row and a right-offset visible virtualized row, exercise
  both keyboard focus and pointer hover, assert the complete tooltip text, and require every tooltip
  bounding-box edge to stay within the actual viewport. Retain a favorable first-row control so the
  red proves position dependence. Make those same deterministic samples green without hiding the
  tooltip, weakening the visual requirement, relying only on `aria-description`, disabling zoom/
  virtualization/collision handling or adding arbitrary waits. Retain F-02 normal nested-import
  count/delete/Undo/Redo x3 and F-01 stale-count history at least once unchanged.
- **Required automation:** repeat the exact new F-03 containment journey at least three times with
  one worker and retries disabled; retain F-02 x3 and F-01 once; run the focused import/transaction/
  component profile in three clean processes, owner Vitest, full Vitest, typecheck, lint, build,
  scoped formatting/ESLint and exact diff checks. Run the six-file affected E2E matrix and full E2E
  once each with one worker/retries zero. Report every red and inherited failure exactly; no
  arbitrary waits, temporary configs, CSS-only assertion substitutes or text-only proof.
- **Manual charter:** use only repository-installed headless `playwright-cli` with a disposable
  authenticated session. Reproduce the exact F-03 lower-row and right-offset focus+hover geometry at
  390x844/200% zoom in dark/reduced-motion and record input/tooltip boxes plus full containment.
  Sample first-row control, correct role/name/description, long currency text and tooltip contrast.
  Then retain nested count/delete/history, 1,000-row reload/virtualization, offline/duplicate-tab
  convergence and encrypted request privacy rather than relying only on prior evidence. Ask root to
  start the server if absent. Close/delete the session, ask root to stop the server, remove only
  generated artifacts and restore `next-env.d.ts`.
- **Evidence contract:** record exact original BASE, revision-04 pre-HEAD, cumulative HEAD, commits,
  paths and index; F-03 red/green geometry for every required focus/hover position; retained F-02/
  F-01 greens; exact positioning mechanism and accessibility semantics; commands/repeats/counts;
  sanitized manual evidence; cumulative regression evidence; inherited reds; cleanup; frozen
  checks; risks and any complete Q proposal. Explicitly run and report repository `format:check`;
  format `implementation-04.md` before freeze without changing any prior evidence. Do not claim
  PASS.
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
- **Literal cumulative review HEAD:** `305d6613673cf200d456276c076463b68c075500`
- **Range type:** original P14 BASE through the exact revision-04 product/test HEAD
- **Implementation evidence:** `evidence/P14/implementation-04.md`
- **Sole reviewer artifact:** `reviews/P14-review-04.md`
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit
  or commit
- **Required review focus:** close review-03 F-03 with real 390x844/200%-zoom focus and hover
  containment across first, lower and right-offset virtualized rows, while preserving accessible
  description, tooltip text/contrast, editing/navigation and non-origin absence. Revalidate closed
  F-02/F-01 and every cumulative HS-008 acceptance clause plus evidence formatting truth.
- **Evidence gate:** inspect the entire cumulative range; independently run F-03 E2E x3, F-02 x3
  and retained F-01, focused x3, owner/full checks, affected/full no-retry E2E, installed-CLI exact
  positional geometry plus cumulative count/delete/history/large/offline/privacy samples,
  repository formatting and exact cleanup.
- **Verdict contract:** review the literal range with explicit findings, acceptance mapping,
  commands/repeats, manual evidence, cleanup/Q proposals and one PASS/FAIL. Any material HS-008
  correctness, preservation, persistence, history, accessibility, security or UX finding fails.

## Next root action

Execute and verify only the durably prepared HS-008 `[] -> [x]` marker transaction; no package
dispatch is allowed until it finalizes.
