# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P15 / 01
- **Scope IDs:** HS-013 only; whole imports-list and transactions-table file drop targets; HS-013
  remains incomplete and unchecked
- **State:** changes_requested; revision 01 becomes immutable after root persistence; HS-013 remains
  unchecked
- **Task:** `tasks/HS-013-import-drop-zones.md`; exact one-line HS-013 block in SCOPE
- **Dependency:** P14/04 and HS-008 are passed. P14 integration is
  `a2182116db08200b8b4df28412512b9ca3406aa2`; marker completion is
  `b3e96ba9e9487d13df56956d220fffca63d6482d`.
- **Literal original cumulative review BASE:**
  `b3e96ba9e9487d13df56956d220fffca63d6482d`
- **Exact clean implementation-start/control HEAD:**
  `f0373722ffeca6812820f5270190c203300f712b`
- **Literal revision-01 product/test HEAD:**
  `d652032ea4f738e06fd5a29018bd341010285696`
- **Sole implementer artifact:** `evidence/P15/implementation-01.md`
- **Frozen evidence identity:** SHA-256
  `5ad467cdaaec07685d20fdeff28aff1d5564e571fbd5e3ca99d6a452c97cd05e`, 177 lines /
  13,180 bytes
- **Sole reviewer artifact:** `reviews/P15-review-01.md`
- **Frozen revision-01 review:** FAIL, SHA-256
  `4da58be357d490f28d5fbe0858a0e428ef8842258adcc2a87dd942da5b86cd44`, 227 lines /
  16,347 bytes
- **Blocking findings:** F-01 rejects valid XML-declaration/OFX-2.x files before the parser; F-02
  accepts obvious JSON renamed as CSV; F-03 alert contrast is 4.2259:1 light and 2.7605:1 dark;
  F-04 centers guidance and bottom-anchors alerts wholly below the viewport at 390x844/200% zoom;
  F-05 pure enter/leave depth strands the overlay when an entered virtual child unmounts before its
  leave. Revision 02 must close all five with checked-in behavior coverage while retaining every
  green revision-01 flow.
- **Implementation-start boundary:** clean HEAD/index/worktree; all P14 artifacts and the HS-008
  marker are committed and immutable
- **Allowed implementation paths:** exactly existing
  `src/app/(app)/layout.tsx`, `src/app/(app)/imports/page.tsx`,
  `src/app/(app)/imports/new/page.tsx`, `src/app/(app)/transactions/page.tsx`,
  `src/components/features/import/FileDropzone.tsx`,
  `src/components/features/import/index.ts`, `src/lib/import/index.ts` and
  `tests/e2e/import.spec.ts`; exact optional new owners
  `src/components/features/import/ImportFileTransferProvider.tsx`,
  `src/components/features/import/ImportDropTarget.tsx`,
  `src/lib/import/file-validation.ts`, `tests/unit/import/file-validation.test.ts` and
  `tests/unit/components/import-drop-target.test.tsx`. Do not edit ImportPanel/parser/CRDT/sync/
  crypto/server/schema/migration/dependency/config or any other source/test path unless a
  reproducible owner blocker is first reported and root explicitly expands the list. Never edit
  ledgers, prior evidence/reviews, scratch, FS-001, SCOPE, `.claude`, `.codex` or agent
  configuration.
- **Commit contract:** inspect existing patterns before editing. Stage exact authorized
  product/test paths only, commit with a short message containing no parentheses, and leave the sole
  evidence artifact uncommitted. Never use `git add .` or `git add -A`.

## Required behavior and boundaries

- **One validated path:** picker and drop must use one typed validation contract for supported CSV,
  OFX and QFX files. Preserve the existing secure 10 MiB limit unless source evidence requires a
  stricter bound. Reject zero-byte, unsupported, multiple, oversized, unreadable and clearly
  content-spoofed inputs with specific actionable errors. Validate before navigation and before
  replacing a pending accepted file. Expected input failures are typed results, not exceptions.
- **Whole-surface targets:** the visible imports-list content and ordinary transactions-table
  surface accept a single supported file at every child cell, empty region, filtered/virtualized
  scroll position and edge. Do not turn the global app shell, navigation, dialogs or portaled
  controls into drop targets.
- **Stable drag lifecycle:** use a deterministic nested-enter depth or equivalent related-target
  invariant. Child enter/leave, virtual-row mount/unmount, repeated edge crossings and a drag ending
  outside the target must not flicker, strand the overlay or navigate. `dropEffect` must honestly
  indicate whether the payload is acceptable.
- **Shared transfer:** remove the `FileReader` → JSON → `sessionStorage.pendingImportFile` content
  copy. Transfer the original browser `File` through a bounded provider owned by the persistent app
  layout or an equivalently scoped, typed, cleanup-safe mechanism. A successful take is one-shot;
  invalid drop, cancel/back, route replacement, vault switch and logout must not leak or silently
  replay stale financial file content. Do not persist plaintext file content in session/local
  storage, IndexedDB, URLs, logs or server requests.
- **Workflow preservation:** a valid drop navigates to the existing `/imports/new` workflow with
  the exact file and enters the same parse/mapping/format/duplicate/account/preview stages as the
  picker. It must not create an import or transactions until the existing explicit confirmation.
  Cancel/back returns to the source page without data mutation; a later picker/drop remains usable.
- **Accessible UX:** use shared established tokens and a single reusable drop-target/overlay owner.
  The overlay must describe CSV/OFX/QFX support, remain visually stable over scrolled and virtualized
  content, support light/dark and reduced motion, preserve existing table scrolling/selection, and
  never trap pointer or focus. Invalid feedback must use an accessible alert/live region and focus
  restoration. The Imports `Import new file` picker remains a labelled keyboard alternative;
  direct `/imports/new` picker behavior remains unchanged.
- **Preservation:** retain P14 lineage, original-amount tooltip and import delete/history behavior;
  P13 filter/pagination/add-row selection; current imported-content parsing/encoding and account/
  template behavior; encrypted local-first persistence; responsive layout and virtualization.
  Never inspect or record recovery words, decrypted vault payloads or user financial fixture
  content beyond synthetic test data.
- **Decision rule:** use existing secure behavior for size and single-file policy. If an ambiguity
  materially remains after source inspection, record a complete `Q-PROPOSAL-P15-01-*` in evidence,
  apply the PROCESS decision hierarchy and continue; do not ask the human or pause.

## Required evidence

- **Red-to-green:** first add checked-in behavior-led tests that fail on unchanged BASE for at least
  the missing transactions drop target, imports nested-drag stability, multiple/empty/oversize/
  spoofed rejection before navigation, and removal of plaintext sessionStorage handoff. Preserve
  the red command/output in evidence, then make those exact tests green.
- **Unit/component automation:** cover the pure validation result matrix, mixed-case names and MIME
  mismatch/content sniffing; one-shot transfer/cleanup; nested enter/leave depth, outside exit/drop,
  invalid accessible error and noninterference with children/scroll. Avoid fabricated production
  hooks and arbitrary waits.
- **E2E automation:** use actual browser `File`/`DataTransfer` payloads and drag event sequences.
  Exercise representative CSV and OFX drops on both Imports and Transactions surfaces, including
  child cells, filtered/virtualized transaction rows, scrolled imports content and edges. Prove the
  exact file reaches preview but no import exists before confirmation; cancel/back preserves data
  and source state; successful confirmation still works. Cover QFX or parser-equivalent support,
  nested no-flicker, repeated enter/leave/outside cleanup, multiple/empty/unsupported/oversize/
  unreadable-or-spoofed errors, same-file retry, picker keyboard path and absence of pending file
  content from storage/URL/network/console. Repeat focused journeys at least three times with one
  worker and retries zero.
- **Regression gates:** run focused new unit/component tests in three clean processes; the import
  unit/integration profile; owner transaction/import tests; full Vitest, typecheck, lint, build,
  exact changed-path format/ESLint and `git diff --check`. Run the affected Import/Transactions E2E
  matrix and full E2E once each with one worker and retries zero. Run repository `format:check` and
  report its exact inherited baseline without rewriting frozen/historical Markdown.
- **Manual installed-CLI charter:** use only repository-installed headless `playwright-cli` with a
  unique disposable session and a root-owned keyed server. Through ordinary authenticated UI,
  sample valid CSV/OFX on both surfaces at child/edge/scrolled/filtered positions; repeated nested
  enter/leave and outside exit; invalid/multiple/empty/oversize/spoofed feedback; picker keyboard
  alternative; cancel/back/focus; preview then one confirmed import; responsive widths, dark and
  reduced motion. Inspect overlay stability, mounted row count, console/network and all browser
  storage for synthetic filename/content leakage. Close/delete the session; ask root to stop the
  server; remove only current generated artifacts and restore `next-env.d.ts`.
- **Evidence artifact:** record literal BASE, product/test HEAD and commit(s); exact paths/index;
  static owner analysis; red and green commands/results/repeats/counts; typed validation/transfer/
  cleanup design; actual DataTransfer assertions; sanitized manual observations; P13/P14
  preservation; storage/network/privacy inspection; all inherited failures; cleanup; frozen
  boundaries; applicable risks and any complete Q proposal. Format the new evidence before freeze
  and do not claim independent PASS.
- **Applicable repository guides:** `.claude/skills/import/SKILL.md`,
  `.claude/skills/components/SKILL.md`, `.claude/skills/e2e/SKILL.md`; apply CRDT/sync guidance when
  validating preservation, plus general money, TypeScript, accessibility, security and testing
  rules.
- **Frozen boundary:** scratch SHA
  `f0adfef6e19b80969dae748cf8c616614af61ba778837234c97af385a19adcb1`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-014/HS-017/HS-018, all 21 normalized blocks
  exact; FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines/25,441 bytes; SCOPE
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal cumulative review BASE:** `b3e96ba9e9487d13df56956d220fffca63d6482d`
- **Literal review HEAD:** `d652032ea4f738e06fd5a29018bd341010285696`
- **Range type:** original P15 BASE through the exact revision-01 product/test HEAD
- **Implementation evidence:** `evidence/P15/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P15-review-01.md`
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit
  or commit
- **Required review focus:** independently prove both whole-surface drop targets, one shared typed
  validator/transfer, real DataTransfer nested stability, accessible pre-navigation failures,
  one-shot plaintext-free handoff and unchanged explicit-confirmation import workflow. Revalidate
  P13/P14 behavior, scale, responsive/dark/reduced-motion, offline/local-first privacy and exact
  cleanup.
- **Verdict contract:** review literal BASE..HEAD with explicit findings, acceptance mapping,
  independent commands/repeats, installed-CLI evidence, cleanup/Q proposals and one PASS/FAIL. Any
  material correctness, data-loss, stale-replay, accessibility, privacy, large-file or regression
  finding fails.

## Next root action

Persist immutable revision-01 evidence/review, all five findings and risk transcriptions in an
exact-path root control commit. Then dispatch P15 revision 02 over the same original BASE with new
exact artifacts `evidence/P15/implementation-02.md` and `reviews/P15-review-02.md`; keep HS-013
unchecked.
