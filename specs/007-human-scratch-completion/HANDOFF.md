# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P14 / 03
- **Scope IDs:** HS-008 only; import lineage, immutable original amount, accessible amount tooltip
  and reversible import deletion; HS-008 remains incomplete and unchecked
- **State:** changes_requested
- **Task:** `tasks/HS-008-import-lineage.md`; exact 4-line HS-008 block in SCOPE
- **Dependencies:** P09/02 is passed; P14 is independent of blocked P05/P08/P10
- **Literal original BASE:**
  `b9105028926d24a5a0c5454777a6c33379ca606a`
- **Revision-03 pre-implementation HEAD:**
  `3f9597873ea965638a8f53e08ced339cdc3ce8ca`
- **Literal cumulative product/test HEAD:**
  `cf6456eeb5bd4029ae57eeb83da7e53194396a4d`
- **Sole implementer artifact:** `evidence/P14/implementation-03.md`
- **Frozen evidence identity:** SHA-256
  `c07a417ba39a58801e7d411adcd4c87c47614e526d6c35aa1e456a306e85eb8d`, 159 lines /
  11,901 bytes
- **Future immutable review artifact:** `reviews/P14-review-03.md`
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
  and review `e6c4d2fdbd4ce5b2c5d6db75f6451a19d0a1901bb769640a1933e9fa9fdab7c4`.
  Do not edit any prior artifact.
- **Evidence correction requirement:** immutable revision-01 evidence is the fourteenth repository
  `format:check` failure. Revision-02 evidence correctly reports all 14 failures and itself passes.
  Revision-03 evidence must preserve that exact truth and pass formatting before handoff.
- **Implementation-start dirty paths:** root-owned unstaged `HANDOFF.md` and `PROGRESS.md` only;
  index empty; both prior evidence/review pairs are committed and immutable
- **Allowed implementation paths:** only `src/lib/crdt/queries.ts`,
  `src/lib/crdt/context.tsx`, `src/app/(app)/imports/page.tsx`,
  `tests/unit/crdt/transaction-queries.test.ts`, and `tests/e2e/import.spec.ts`. Centralize a pure
  canonical query that enumerates every public top-level and nested transaction representation,
  collapses relocation/conflict copies by logical `id`, and filters active identities with the same
  deletion semantics. Expose that result through a narrowly named context hook and use it only for
  the existing imports-page count boundary. Do not broaden `useActiveTransactions()` because its
  flat parent-only contract serves transaction-grid behavior, and do not change the already sound
  atomic mutation. Touch only proven owners. No component, other UI/CRDT/sync/crypto/server/schema/
  migration/dependency/config/test path, global ledger, prior evidence/review, scratch, FS-001,
  SCOPE, `.claude`, `.codex` or agent configuration without a reproduced blocker and prior root
  expansion.
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
  materially ambiguous after source inspection, record a complete `Q-PROPOSAL-P14-03-*` in the
  evidence, choose the safest reversible implementation and continue; do not ask or pause.
- **Cumulative regression:** do not weaken revision-01 behavior. Retain first-edit origin,
  parent/nested lineage, tooltip accessibility/precision/zoom, atomic live-set deletion/history and
  bounded 1,000-row encrypted persistence unchanged.
- **Required red-to-green proof:** reproduce review F-02 on unchanged revision-02 product through
  the ordinary UI: import a one-row file, then an identical one-row file so the second identity is
  nested under the first and the transaction row exposes the Potential duplicate state. Prove the
  nested import's table/dialog count is zero while confirmation deletes one identity. Then prove
  both parent and nested imports each report one distinct active identity; deleting the nested
  import removes only its exact nested ID plus record, one Undo restores that exact ID/record and
  duplicate state, and one Redo removes them again while preserving the parent and unrelated
  import/manual rows. Unit tests must cover parent+nested enumeration, deleted identities and
  logical-ID deduplication across physical relocation/conflict copies. Retain the revision-02 F-01
  four → ordinary-delete one → dialog three → exact delete/Undo/Redo journey unchanged.
- **Required automation:** repeat the exact F-02 journey at least three times with one worker and
  retries disabled; repeat retained F-01 at least once; run the focused import/transaction profile
  in three clean processes, owner Vitest, full Vitest, typecheck, lint, build, scoped formatting/
  ESLint and exact diff checks. Run the six-file affected E2E matrix and full E2E once each with one
  worker/retries zero. Report every red and inherited failure exactly; no arbitrary waits,
  temporary configs or text-only proof.
- **Manual charter:** use only repository-installed headless `playwright-cli` with a disposable
  authenticated session. Reproduce ordinary duplicate import → parent/nested count one → nested
  delete/Undo/Redo and cross-import/manual isolation, plus retained F-01 stale-parent behavior.
  Sample retained origin tooltip, 200% zoom, 1,000-row reload, offline/duplicate-tab convergence and
  encrypted request privacy rather than relying only on prior evidence. Ask root to start the
  server if absent. Close/delete the session, ask root to stop the server, remove only generated
  artifacts and restore `next-env.d.ts`.
- **Evidence contract:** record exact original BASE, revision-03 pre-HEAD, cumulative HEAD, commits,
  paths and index; F-02 red/green and retained F-01 green; exact parent/nested active logical-ID
  enumeration and deduplication; delete/history/isolation assertions; commands/repeats/counts;
  sanitized manual evidence; cumulative regression evidence; inherited reds; cleanup; frozen
  checks; risks and any complete Q proposal. Explicitly run and report repository `format:check`;
  format `implementation-03.md` before freeze without changing either prior evidence file. Do not
  claim PASS.
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
- **Literal cumulative review HEAD:** `cf6456eeb5bd4029ae57eeb83da7e53194396a4d`
- **Range type:** original P14 BASE through the exact revision-03 product/test HEAD
- **Implementation evidence:** `evidence/P14/implementation-03.md`
- **Sole reviewer artifact:** `reviews/P14-review-03.md`
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit
  or commit
- **Required review focus:** close review-02 F-02 using complete active parent+nested distinct-ID
  enumeration with deletion-equivalent logical identity semantics; independently exercise ordinary
  duplicate import, exact count/delete/Undo/Redo and isolation. Revalidate review-01 F-01 and every
  cumulative HS-008 acceptance clause plus evidence formatting truth.
- **Evidence gate:** inspect the entire cumulative range; independently run F-02 E2E x3 and retained
  F-01, focused x3, owner/full checks, affected/full no-retry E2E, installed-CLI nested count/delete/
  history plus cumulative accessibility/large/offline/privacy samples, repository formatting and
  exact cleanup.
- **Verdict contract:** review the literal range with explicit findings, acceptance mapping,
  commands/repeats, manual evidence, cleanup/Q proposals and one PASS/FAIL. Any material HS-008
  correctness, preservation, persistence, history, accessibility, security or UX finding fails.

## Next root action

Persist immutable revision-03 evidence/review and this failure disposition in an exact-path root
control commit. Then rewrite this handoff for P14 revision 04 with the same original BASE, a new
pre-implementation HEAD, exact `evidence/P14/implementation-04.md` and
`reviews/P14-review-04.md`, and only the tooltip component plus deterministic unit/component/E2E
owners needed to close F-03. Preserve all three prior revisions byte-for-byte and keep HS-008
unchecked.
