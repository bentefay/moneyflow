# P14 Implementation Evidence — Revision 02

## Immutable dispatch boundary

- Package / requirement / revision: `P14` / `HS-008` / `02`.
- Literal cumulative review BASE: `b9105028926d24a5a0c5454777a6c33379ca606a`.
- Exact revision-02 preimplementation HEAD: `7db79a68db5e08f9ad4f8dfd0b01fb16b31b98a2`.
- Immutable revision-01 FAIL: `reviews/P14-review-01.md`, SHA-256
  `92bbcf462e6cceb973adb9525402cc357ed37706d67752169506ae286e1b621f`, 171 lines / 13,684 bytes.
- This sole revision-02 worker artifact was created before any revision-02 product or test edit.
  Existing dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; the index was empty.
- The future reviewer artifact `reviews/P14-review-02.md` did not exist and was not created.

## F-01 red-to-green proof

- The checked-in journey was first changed without a product edit to import four CSV rows, capture
  all four canonical transaction IDs, ordinarily delete one through the row's two-confirm control,
  assert that ID absent and the other three IDs visible, then open the import confirmation.
- Against unchanged revision-01 product, this exact retries-disabled command:
  `pnpm exec playwright test tests/e2e/import.spec.ts --grep "CSV and OFX lineage survives" --project=chromium --workers=1 --retries=0 --reporter=list`
  failed **1/1** in the destructive-dialog step. The three surviving IDs were already proven live,
  but the alert dialog expected `3 transactions` and received
  `This will also delete 4 transactions linked to this import`. An earlier assertion ordering
  independently observed the Imports table cell expected `3` and received `4`.
- The product change reads `useActiveTransactions()`, which is the existing active canonical logical
  projection. It counts each current canonical transaction once by its non-empty `importId` and
  passes that live value through the existing `ImportData.transactionCount` boundary. The Imports
  table and its dialog therefore display the same identity-set cardinality the user can currently
  see, rather than immutable `Import.transactionCount` batch metadata.
- The final journey asserts the table cell and alert dialog both say three, confirms deletion of
  exactly those three IDs plus the import record, and proves the OFX import/manual IDs remain. One
  Undo restores the three and record while the independently deleted fourth ID remains absent; one
  Redo removes only the restored set again.
- The exact final journey passed **3/3** with one worker, retries zero and `--repeat-each=3`;
  individual test durations were 8.0s, 6.9s and 6.9s (**25.7s** total command).

## Implementation and acceptance mapping

- `src/app/(app)/imports/page.tsx` is the sole production owner. It memoizes current canonical
  active transaction counts by import ID and uses zero for an active import with no current linked
  transaction. No stored import metadata, schema, parser, CRDT mutation, history, sync, crypto or
  server behavior changed.
- The already-reviewed atomic action remains the only confirm handler. It continues scanning every
  physical parent/nested representation, preserving unrelated rows, cleaning aliases and
  soft-deleting the import record in one Loro history action.
- The expanded existing E2E remains a behavior-led CSV/OFX journey. It now records the three live
  target IDs and independently deleted ID, verifies current table/dialog feedback, and asserts exact
  record/row/isolation state after confirm, Undo and Redo.
- Revision-01 lineage, immutable first-origin capture, 0/2/3/8-decimal tooltip presentation,
  accessible 200%-zoom behavior, nested/cross-import deletion, one-action history, 1,000-row bounded
  encrypted persistence and privacy implementation paths are unchanged.
- No focused non-UI test owner was necessary. The existing canonical projection and cumulative
  integration/unit coverage already own its deduplication and active-row semantics.

## Automated validation

- Focused cumulative profile, run in three separate clean processes:
  `pnpm exec vitest run tests/unit/crdt/hierarchical-schema.test.ts tests/unit/crdt/transaction-mutations.test.ts tests/unit/crdt/transaction-queries.test.ts tests/integration/transaction-operations.test.ts tests/unit/sync/manager.test.ts --pool=forks --maxWorkers=1`
  passed **5 files / 118 tests** each time in 4.30s, 4.30s and 4.29s.
- Expanded owner profile across the 12 revision-01 query/mutation/alias/maintenance/sync owners
  passed **12 files / 195 tests** in 16.33s.
- The first `pnpm test` run reported one inherited timing-sensitive red:
  `detectDuplicates performance > scales linearly with input size` measured ratio `4.25316937134327`
  against `<4`; **1,295/1,296** tests passed. The changed paths do not own the import duplicate
  algorithm. Its immediate isolated clean-process diagnostic passed **1 file / 43 tests** in 1.64s,
  and the subsequent clean sequential `pnpm test` rerun passed **60 files / 1,296 tests** in 6.09s.
- `pnpm typecheck` passed. `pnpm lint` exited zero with **0 errors / 10 inherited warnings**: one
  existing TanStack Virtual compiler warning and nine existing unused-symbol warnings in cumulative
  P14 query/test files. Scoped ESLint on both revision-02 paths passed without output.
- `pnpm build` passed compilation, TypeScript, page data, all **17 static pages**, and route
  generation.
- Scoped `oxfmt --check` passed both revision-02 TypeScript/TSX paths. `git diff --check` passed
  before staging, on the exact staged diff, after commit and after root cleanup.
- The six-file affected Chromium matrix: `import.spec.ts`, `transactions.spec.ts`,
  `undo-redo.spec.ts`, `sync-persistence.spec.ts`, `description-aliases.spec.ts` and
  `tab-duplication.spec.ts`, with one worker and retries zero, passed **60/60 in 4.4 minutes**.
- Full Chromium E2E with one worker and retries zero passed **93/93 in 6.1 minutes**. Its expected
  offline fetch/presence logs were confined to explicit offline/reconnect tests; no test failed or
  retried.
- After formatting this artifact, repository `pnpm format:check` truthfully exited 1 on the same
  **14 inherited Markdown paths**: DECISIONS, DEPENDENCIES, HANDOFF, PROGRESS, QUESTIONS, RISKS,
  four P12 implementation artifacts, immutable revision-01 P14 implementation evidence, two P12
  review artifacts, and frozen `specs/human-scratch.md`. This revision-02 evidence was not in the
  failure list and passed its exact-path check. Immutable revision-01 evidence remains the
  fourteenth failure identified by its independent review and was not edited.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli` with disposable session `p14-rev02`
  against the root-owned keyed server. Onboarding was completed without clicking the recovery-word
  reveal control or reading/printing any seed word.
- Imported a four-row USD batch, edited positive `2.50` through `3` and `4`, and observed accessible
  name `Transaction amount in USD`, description `Original imported amount: USD 2.50`, and the hover
  tooltip with the same exact origin.
- At 390x844 and PROCESS 200% zoom, the tooltip box was x=26..384/y=680..768, direct text lines
  x=50..253.53/y=691..756, and arrow x=359.86..388.14/y=749.86..778.14. Deterministic containment
  checks returned true for the complete box, every rendered text line and the arrow.
- Imported a real generated 1,000-row CSV through the ordinary UI. Navigation and Saved completed in
  5.788s. The observed `sync.pushOps` response was HTTP 200; boolean-only body inspection found
  `encryptedData` and `versionVector`, but neither final plaintext description `CLI R2 large 0999`
  nor filename. Reload recovered `1005 transactions`, mounted only 18 virtualized rows, and exact
  filtered final row `CLI R2 large 0999` with `1000.00`.
- In the final exact in-app-navigation history cycle, a fresh four-row target was imported and one
  row ordinarily deleted. The three other logical IDs remained. The Imports target cell showed `3`;
  the separate large-import cell showed `1000`; the named `alertdialog` said `3 transactions` and
  explicitly preserved other imports/manual rows and described one-action Undo.
- Confirm left 1,001 logical transactions. The separately recorded manual ID remained visible. One
  Undo restored each of the three live target descriptions exactly once while the independently
  deleted row remained zero; Redo was enabled and removed all three again while that row remained
  zero. After Redo the target import row was absent, the manual ID remained visible, and the large
  import retained cell count `1000` plus exact last-row count one.
- Exploratory history probes that used hard `page.goto` after deletion remounted the vault provider
  and therefore had disabled local Undo/Redo; they were rejected and not credited. The final
  successful cycle used the application's own Imports/Transactions links after every mutation,
  matching the checked-in user journey.
- A normally opened duplicate tab reached the authenticated transaction table. While offline, the
  primary tab edited large imported row `1.00` to `2`, immediately retaining accessible origin
  `USD 1.00`. Reconnection reached Saved; duplicate-tab reload recovered `2.00` and the same origin.
- Final online CLI console capture reported **0 errors / 0 warnings**. The duplicate was closed,
  final state had one Saved tab, `delete-data` closed the browser, and browser listing was empty.
  Root then stopped the keyed server and recoverably cleaned only task-generated artifacts.

## Questions and risks

- No Q proposal is required. F-01 was a settled presentation defect: the requirement, failed review
  and established canonical query projection jointly determine current logical count semantics.
- Residual risk is limited to the same very large multi-peer boundaries recorded in revision 01.
  This revision performs one linear pass over the already materialized canonical active array and
  adds no persistence, mutation or encryption surface.
- The stored original batch size remains intact in CRDT data for historical/internal use; only the
  existing table/dialog presentation boundary now receives the live linked count.

## Boundary and cleanup

- Exact revision-02 product/test commit: `93d89145fe910a1348ccd4a4f0c79f2022801465`
  (`Report current imported transaction counts`), **2 authorized paths**, 58 insertions and 11
  deletions. Evidence was deliberately excluded.
- Exact cumulative review range:
  `b9105028926d24a5a0c5454777a6c33379ca606a..93d89145fe910a1348ccd4a4f0c79f2022801465`. The
  revision-02 delta from preimplementation HEAD is exactly the two paths above; the cumulative range
  is 28 paths, 1,437 insertions and 176 deletions, including prior authorized P14 work and
  root-owned control commits.
- Root restored generated `next-env.d.ts`, stopped the task-owned server, and moved revision-02
  `.next`, `test-results` and CLI artifacts to recoverable trash while preserving older artifacts.
  The index is empty; only root-owned modified `HANDOFF.md` / `PROGRESS.md` and this assigned
  uncommitted evidence file remain. No revision-02 review artifact was created.
- Frozen boundary:
    - scratch `b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`, 350 lines / 24,248
      bytes;
    - FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
      bytes;
    - SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382
      bytes.
- Scratch checked set remains HS-001/HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018; HS-008
  was not edited or checked. SCOPE, both frozen sources, immutable revision-01 evidence and
  immutable revision-01 review were not edited.
