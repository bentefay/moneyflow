# P14 Implementation Evidence — Revision 03

## Immutable dispatch boundary

- Package / requirement / revision: `P14` / `HS-008` / `03`.
- Literal cumulative review BASE: `b9105028926d24a5a0c5454777a6c33379ca606a`.
- Exact revision-03 preimplementation HEAD: `3f9597873ea965638a8f53e08ced339cdc3ce8ca`.
- Immutable revision-02 FAIL: `reviews/P14-review-02.md`, SHA-256
  `e6c4d2fdbd4ce5b2c5d6db75f6451a19d0a1901bb769640a1933e9fa9fdab7c4`, 191 lines / 14,936 bytes.
- This sole revision-03 worker artifact was created before any revision-03 product or test edit.
  Existing dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; the index was empty.
- The future reviewer artifact `reviews/P14-review-03.md` did not exist and was not created.

## F-02 red-to-green proof

- The checked-in E2E was first added without a product edit. It creates a parent import and an
  identical second import through the ordinary CSV UI, proves the second logical identity is nested
  behind `Potential duplicate`, adds manual and unrelated imported survivors, then checks the nested
  import's table/dialog count and exact confirm/Undo/Redo boundary.
- Against unchanged revision-02 product, this exact retries-disabled command:
  `pnpm exec playwright test tests/e2e/import.spec.ts --grep "nested duplicate import count matches" --project=chromium --workers=1 --retries=0 --reporter=list`
  failed **1/1** in 18.0s because the nested import table cell expected `1` and received `0`.
- Without changing product code, the expected table/dialog value was temporarily changed to zero.
  The same journey then passed **1/1** in 11.2s: confirmation removed the nested import record and
  `Potential duplicate`, Undo restored both and Redo removed both, while the parent, unrelated
  import and manual row survived. The final expectation was restored to one before implementation.
  This proves unchanged revision-02 displayed zero while deleting one linked logical identity.
- Two unit tests were also added before product code. They require public parent and nested logical
  IDs exactly once across physical account copies, deleted identities excluded, and an ID with one
  active plus one deleted physical representation retained once. The unchanged-product command:
  `pnpm exec vitest run tests/unit/crdt/transaction-queries.test.ts --pool=forks --maxWorkers=1`
  reported **2 failed / 39 passed** in 830ms because the new query did not exist.
- After implementation, that exact unit command passed **1 file / 41 tests** in 826ms. The exact
  final E2E command passed **1/1** in 11.6s (8.5s test), then its no-retry `--repeat-each=3` gate
  passed **3/3** in 26.0s with test durations 8.2s, 7.0s and 7.0s.
- The retained F-01 journey:
  `pnpm exec playwright test tests/e2e/import.spec.ts --grep "CSV and OFX lineage survives edits/reload and delete is isolated one-step history" --project=chromium --workers=1 --retries=0 --reporter=list`
  also passed **1/1** in 11.2s (8.2s test).

## Implementation and acceptance mapping

- `getActivePublicTransactionIdentities()` is a pure query over every account/year/month/day bucket.
  It enumerates public parent transactions and materialized nested `suspectedDuplicates`, filters
  deleted physical representations before canonicalization, and uses the established deterministic
  logical-ID canonicalizer. Physical relocation/conflict copies therefore contribute once, and a
  deleted copy cannot hide an active copy of the same ID.
- `useActivePublicTransactionIdentities()` exposes only that projection. It is intentionally
  separate from `useActiveTransactions()`, whose parent-only transaction-grid contract is unchanged.
- The Imports page alone consumes the broader projection and memoizes current counts by non-empty
  `importId`. Table and destructive dialog now use one active logical identity-set cardinality for
  both top-level and nested imported transactions.
- No schema, persisted data, parser, import metadata, mutation, history, sync, cryptography or
  server code changed. The independently reviewed atomic delete action remains the sole confirm
  handler.
- Unit coverage owns parent+nested enumeration, active/deleted semantics and logical-ID
  deduplication. The behavior-led E2E owns normal duplicate creation, table/dialog count one, exact
  nested record/identity deletion, one-action Undo/Redo and unrelated parent/import/manual
  preservation.
- The revision-03 production implementation is three small boundaries: a 34-line query addition, a
  narrow 10-line hook plus import, and the Imports-page hook/count substitution.

## Automated validation

- Focused cumulative profile, run in three separate clean processes:
  `pnpm exec vitest run tests/unit/crdt/hierarchical-schema.test.ts tests/unit/crdt/transaction-mutations.test.ts tests/unit/crdt/transaction-queries.test.ts tests/integration/transaction-operations.test.ts tests/unit/sync/manager.test.ts --pool=forks --maxWorkers=1`
  passed **5 files / 120 tests** each time in 4.32s, 4.30s and 4.29s.
- Expanded owner profile across the 12 cumulative P14 query/mutation/alias/maintenance/sync owners
  passed **12 files / 197 tests** in 15.98s.
- `pnpm test` passed **60 files / 1,298 tests** in 6.32s on its first run.
- `pnpm typecheck` passed. `pnpm lint` exited zero with **0 errors / 10 warnings**: the established
  TanStack Virtual compiler warning and nine inherited unused-symbol warnings. Exact revision-03
  scoped ESLint exited zero with three inherited unused-symbol warnings; cumulative changed-path
  ESLint exited zero with nine inherited warnings.
- `pnpm build` passed compilation, TypeScript, page data, all **17 pages**, and route generation.
- Exact revision-03 `oxfmt --check` passed all five paths. Cumulative changed-path `oxfmt --check`
  passed all **25 TypeScript/TSX paths**. `git diff --check` passed before staging, on the exact
  staged diff and on the committed cumulative range.
- The six-file affected Chromium matrix (`import`, `transactions`, `undo-redo`, `sync-persistence`,
  `description-aliases`, `tab-duplication`), with one worker and retries zero, passed **61/61 in 4.5
  minutes**.
- Full Chromium E2E with one worker and retries zero passed **94/94 in 6.2 minutes**. Expected
  authentication/offline fetch and presence logs occurred only in their explicit scenarios; no test
  failed or retried.
- After formatting this artifact, repository `pnpm format:check` truthfully exited 1 on the same
  **14 inherited Markdown paths** recorded by revision 02: six root ledgers, four P12 implementation
  artifacts, immutable P14 implementation-01, two P12 reviews and frozen `specs/human-scratch.md`.
  Revision-03 evidence was not in the failure list and passes its exact-path check.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli` with unique disposable session
  `p14-rev03` against the root-owned keyed server. Onboarding never activated the recovery reveal
  control and never read, copied or printed a recovery word.
- Created identical parent/nested CSV imports through the ordinary UI, a manual survivor and an
  unrelated imported survivor. The parent, nested and unrelated import cells each displayed `1`; the
  parent exposed `Potential duplicate`; and the nested alert dialog said one transaction.
- Confirm removed only the nested record and marker. Parent/manual/unrelated identities each
  remained once. One Undo restored exactly the marker and record; one Redo removed them again while
  every survivor remained.
- Separately imported four rows. The positive amount retained exact first origin `USD 2.50` through
  edits to `3` and `4`, with accessible name `Transaction amount in USD` and description
  `Original imported amount: USD 2.50`; the untouched zero row had no origin description. Normal
  delayed hover exposed the matching tooltip. The immutable revision-02 evidence and independent
  review remain the credited 390x844/200%-zoom containment and contrast samples because revision 03
  did not change that component; no new zoom sample is credited here.
- Ordinary deletion removed one of those four identities. Imports then displayed `3`, the dialog
  said three and described other-import/manual preservation plus one-action Undo, and confirm
  removed exactly the other three. Undo restored those three while the independently deleted row
  remained absent; Redo removed only the restored set. Manual and unrelated imported survivors
  remained throughout.
- Generated and imported a real 1,000-row CSV through the ordinary UI. Import/navigation completed
  in 1.795s, the app reached **1,003 transactions** while only **14 rows** were mounted, reload
  retained 1,003, and exact final-description search returned one row with `1000.00`.
- Boolean-only inspection of a successful `sync.pushOps` request body found `encryptedData` and
  `versionVector`; neither sampled first/last plaintext description nor filename appeared.
- A normally opened authenticated duplicate tab loaded all 1,003 transactions. Offline editing of
  the first large-import amount from `1.00` to `2` retained exact origin `USD 1.00`; reconnection
  reached Saved and the duplicate converged to `2.00` with the same origin. A subsequent online edit
  to `3` converged live in both tabs and supplied the successful encrypted-request sample.
- Final reload showed 1,003 transactions and Saved with **0 console errors / 0 warnings**. The
  duplicate was closed, `delete-data` ended the disposable browser, and browser listing was empty.
  Root then stopped the keyed server and recoverably moved only revision-03 `.next`, `test-results`
  and the 11 newly generated CLI files, preserving older CLI artifacts.

## Questions and risks

- No product ambiguity was encountered. F-02 is a settled destructive-feedback mismatch and the
  required identity semantics were explicit in the failed review.
- The query is linear in materialized parent plus nested physical representations and allocates only
  the active representation array plus the established logical-ID map. It introduces no write,
  persistence, encryption or retry surface.
- The principal residual boundary remains the pre-existing very-large multi-peer CRDT scale already
  recorded by prior P14 evidence. Revision-03 tests explicitly protect relocation/conflict
  deduplication and active/deleted representation ordering.

## Boundary and cleanup

- Exact revision-03 product/test commit: `cf6456eeb5bd4029ae57eeb83da7e53194396a4d`
  (`Count nested imported transaction identities`), **5 authorized paths**, 275 insertions and 5
  deletions. Evidence was deliberately excluded.
- Exact cumulative review range:
  `b9105028926d24a5a0c5454777a6c33379ca606a..cf6456eeb5bd4029ae57eeb83da7e53194396a4d`. The
  revision-03 delta from preimplementation HEAD is exactly the five paths above; the cumulative
  range is **31 paths**, 2,099 insertions and 177 deletions, including earlier authorized P14 work
  and root-owned control commits.
- Root restored generated `next-env.d.ts`, stopped the keyed server, and recoverably cleaned only
  revision-03 task artifacts. The index is empty; only root-owned modified `HANDOFF.md` /
  `PROGRESS.md` and this assigned uncommitted evidence file remain. No revision-03 review artifact
  was created.
- Frozen boundary:
    - scratch `b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`, 350 lines / 24,248
      bytes;
    - FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
      bytes;
    - SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382
      bytes.
- Scratch checked set remains HS-001/HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018. HS-008
  was not edited or checked. SCOPE, both frozen sources and every immutable prior evidence/review
  artifact were not edited.
