# P13 Independent Review — Revision 02

## Review identity and verdict

- Package / requirement / revision: `P13` / `HS-001` / `02`.
- Literal cumulative reviewed range:
  `415ea080b3b19191fd71601742056a619b4a3080..8f6e4f2ad77da24016169a79286a9727f3394aca`.
- Frozen revision-02 implementation evidence: `evidence/P13/implementation-02.md`, SHA-256
  `2ef2070960cac20bf0e9bc138928b3c11c94671f57af2f8a8ba94009e0e81bdd`, 178 lines / 11,584 bytes.
- The cumulative range contains four commits, exactly 20 paths, 1,302 insertions and 823 deletions.
  It includes the 15 cumulative product/test paths plus the committed revision-01 root integration
  artifacts. The true revision-02 product/test delta is
  `57398ea27d2af6523d26ccc3227433feaebe29e3..8f6e4f2ad77da24016169a79286a9727f3394aca`: exactly
  `page.tsx` and `transactions.spec.ts`, 123 insertions and no deletions. Both cumulative and
  revision-02 `git diff --check` pass.
- **Verdict: FAIL.** Revision 02 correctly clears all seven transaction filter classes and closes
  the small-dataset reproduction from review 01. It does not guarantee that the selected created row
  crosses the separate 50-row pagination boundary. Fifty or more legal higher-sorted transactions
  leave the new transaction persisted and selected but invisible until the operator scrolls far
  enough to load another page. Review-01 F-01's required “every Add reveals its row; selection never
  targets an invisible row” closure therefore remains open. HS-001 must remain unchecked.

## Finding

### F-01 — High / blocking: pagination can still hide the newly selected row

Revision 02 resets the controlled filters immediately before insertion
(`src/app/(app)/transactions/page.tsx:267-302`). That is sufficient while the unfiltered result has
fewer than `PAGE_SIZE` rows. The independent installed-CLI matrix proved search, date, tag, person,
account, status and duplicates-only all change from zero visible rows with one active filter to the
complete small result, no active filter and exactly one visible selected ordinary row.

The page has a separate visibility boundary that the Add handler does not reconcile:

- `PAGE_SIZE` is 50 and `displayCount` initially remains 50 (`page.tsx:55-56,129-130`);
- the unfiltered result is sliced before table construction (`page.tsx:189-194`);
- derived selection is intersected with every active transaction ID, not the displayed IDs
  (`page.tsx:132-142`); and
- canonical order is date descending before creation instant (`src/lib/crdt/queries.ts:134-142`),
  while Add legally creates today's date.

The deterministic real-app reproduction used only normal UI interactions:

1. Start with 14 ordinary transactions and import 51 valid transactions dated `2030-01-01`; the
   toolbar reports 65 transactions.
2. Apply a committed no-match search. The table has zero rows, exposes `Clear all`, and reports
   `0 transactions (filtered)`.
3. Activate Add. Search and `Clear all` reset correctly, but the toolbar becomes
   `66 transactions · 1 selected` while the accessible selected-row count remains zero. Every
   rendered row is one of the future imports.
4. Scroll to the current page boundary. Load-more advances the slice and the selected ordinary empty
   row finally appears with ID `66b67ee1-41c5-407c-ad8d-b32249a296c4`, date `7/24`, empty
   description, `Savings R02 Review`, `For Review` and `0.00`.
5. Undo removes that exact ID and Redo restores it selected. Reload persists the transaction and
   clears transient selection, but resets the 50-row boundary; the ID is again absent until
   load-more.

Future-dated transactions are legal through both import and the unrestricted normal date editor. The
defect is therefore a reachable acceptance failure, not malformed data. It recreates the review-01
contradiction: the toolbar and Bulk Edit target a selected transaction that the operator cannot see
or edit, and the immediate ordinary row promised by HS-001 is absent. The new E2E covers seven
filter classes only with seven total rows. The existing 500-row virtualization journey uses
past-dated rows, so today's Add would sort ahead of them and cannot expose this case.

Required closure: reconcile the created logical ID with both filters and pagination in the same Add
interaction. Preserve canonical ordering and bounded virtualization, but ensure the newly created
normal row is included and visible without requiring scroll/load-more, and ensure derived
selection/count state cannot target a row outside the displayed surface. Add behavior-led E2E with
more than `PAGE_SIZE` legal higher-sorted rows, an active excluding filter, Add, a visible selected
ordinary row, coherent count/filter state, one-step Undo/Redo of the exact ID, and
reload/persistence proof. Do not reintroduce a special entry mode or compatibility form.

## Revision-01 finding adjudication

| Prior finding                                 | Revision-02 adjudication                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 active filters hide the new selected row | **Filter-control portion closed; whole visibility gate still open.** `setFilters(createEmptyFilters())` runs only after valid account/status guards and remains local React state. Search, date, tag, person, account, status and duplicates-only each clear and reveal a selected row in the new small-dataset E2E and independent manual matrix. Filter reset creates no CRDT update or Undo fragment. However, pagination can still exclude the created ID after the filters clear, so “every Add reveals its row” and “selection never targets an invisible row” remain unsatisfied as described above. |

## Other acceptance, safety and compatibility observations

- The revision-01 ordinary-row architecture remains intact. Each valid Add generates a UUID,
  monotonic local creation instant and legal empty defaults, then uses the existing `user:add`
  transaction action. Invalid account/default-status state returns before filters are changed.
- Filters remain a page-local `useState` value. Duplicate tabs retain independent filter and
  selection state while their transaction documents converge. Undo/Redo changes the CRDT Add only
  and leaves the cleared local filter state outside history.
- Static search found no production reference to `AddTransactionRow`, `NewTransactionData`,
  `TransactionRowMode`, `isAddingTransaction`, add mode or the removed submit/cancel controls. The
  remaining selector references are explicit E2E absence assertions.
- Empty rows retain the ordinary checkbox, alias-backed description editor, date/account/tag/status/
  amount editors, notes, two-step delete, grid navigation, virtualization and bulk selection. The
  HS-004 alias path remains separate from Add in history and encrypted sync.
- Rapid Adds keep distinct IDs and monotonic order. Undo removes one Add at a time; Redo restores
  the same logical IDs. Offline persistence and duplicate-tab convergence remain one-copy and do not
  synchronize local selection or filters.
- No arbitrary sleep, retry mask, test-only production hook, plaintext financial payload, auth
  bypass, secret exposure or compatibility dual-write was found in the cumulative range.

## Independent automation

| Gate                                                                                             | Independent result                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused Vitest profile: transaction operations/mutations, keyboard navigation and virtualization | PASS in three clean processes; 4 files / 76 tests each (999 ms, 990 ms and 999 ms).                                                                                                                                                                                                                                                                                                         |
| `pnpm test`                                                                                      | One delegated run overlapped the CPU-heavy affected E2E and failed only `detectDuplicates performance > scales linearly with input size` at ratio 4.824358422867408 versus `< 4`; 1,285/1,286 passed. Its immediate isolated diagnostic passed. After the E2E process exited, a clean sequential full rerun PASSed 60 files / 1,286 tests in 6.41 s.                                        |
| Exact performance diagnostic                                                                     | PASS in three additional separate clean processes using `pnpm exec vitest run tests/unit/import/duplicates.test.ts -t 'scales linearly with input size'`: 1 passed / 42 skipped each, total durations 1.32 s, 1.33 s and 1.31 s; test bodies 611 ms, 613 ms and 604 ms. This controlled rerun explains the first red as concurrent machine load rather than accepting an unexplained flake. |
| `pnpm typecheck`                                                                                 | PASS.                                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm lint`                                                                                      | PASS exit 0; 0 errors / exactly 10 inherited warnings. No P13 error was introduced.                                                                                                                                                                                                                                                                                                         |
| `pnpm build`                                                                                     | PASS; Next 16.2.10 compiled, generated types and built all 17 routes.                                                                                                                                                                                                                                                                                                                       |
| Cumulative changed-path `oxfmt --check`                                                          | PASS; all 14 extant cumulative product/test paths. The fifteenth product path is deleted.                                                                                                                                                                                                                                                                                                   |
| Revision-02 `oxfmt --check`                                                                      | PASS; both changed product/test paths.                                                                                                                                                                                                                                                                                                                                                      |
| Repository `pnpm format:check`                                                                   | FAIL only on the same 13 inherited/root-owned/frozen Markdown files: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, P12 implementation revisions 03–06, P12 review revisions 05–06 and `specs/human-scratch.md`. No P13 path failed.                                                                                                           |
| Cumulative and revision-02 `git diff --check`                                                    | PASS.                                                                                                                                                                                                                                                                                                                                                                                       |
| Affected no-retry E2E matrix, 22 journeys with `--repeat-each=3 --workers=1`                     | PASS; 66/66 in 4.4 minutes.                                                                                                                                                                                                                                                                                                                                                                 |
| Full no-retry E2E, `--workers=1`                                                                 | PASS; 91/91 in 5.8 minutes.                                                                                                                                                                                                                                                                                                                                                                 |

The green browser automation is reported exactly but contains no higher-sorted pagination Add case.
Read-only command verification was independently delegated as required by reviewer authority. The
reviewer independently inspected every cumulative path, ran both E2E profiles, diagnosed the
performance red sequentially and performed the complete installed-CLI charter.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p13-review-02` against the correctly keyed root-owned server. No MCP, `npx`,
  headed/UI/debug/pause mode, temporary test/config or arbitrary timing wait was used.
- Created a fresh authenticated state while all twelve recovery words remained masked. The phrase
  was never revealed, read, copied, entered or printed.
- Created `Savings R02 Review` and `Excluded Tag R02 Review` through named normal controls. For each
  of search, date, tag, person, account, status and duplicates-only, the precondition had zero rows
  plus one `Clear all`; Add cleared the filter, retained focus, revealed the complete cumulative
  small result, selected exactly one ordinary row and removed `(filtered)`. Search reset to empty.
- One exploratory combined filter script stopped when accessible name `Tags` correctly matched both
  the filter and selected-row Bulk Edit control. The matrix was rerun with the specific first named
  filter control; this was a strict-selector correction, not an application failure. Search and date
  were also rerun independently so every class has an explicit final observation.
- The final small-matrix row had ID `d8aa0187-663d-49c5-92d5-b33ecc94ee9d`. One Undo changed nine
  rows to eight, removed that exact ID and cleared selection; Redo restored the same ID selected
  with filters empty.
- Three rapid pointer Adds produced three distinct IDs and 12 total rows. Add retained focus, only
  the newest row was selected and zero special description/submit/cancel controls existed.
- ArrowDown moved Description from row zero to row one; Shift+Tab moved to the same row's Date and
  Tab returned to Description. `Manual Alias R02 Review` plus Enter persisted through the alias
  route; `Discarded R02 Review` plus Escape restored the prior empty value.
- Ordinary checkbox selection, status change to `Paid`, amount change to `12.34`, two-step delete
  and one-step delete Undo all passed for exact ID `8c9e6ea1-c97e-4b50-a45c-201954f3f65e`. Reload
  retained 12 unique IDs, the alias, status and amount while clearing transient selection and
  retaining empty filters.
- A normal `window.open` duplicate inherited the authenticated unlocked session. Excluding search
  plus Add in the duplicate cleared only that tab's filters, created ID
  `3cb66d91-4da2-47d1-9e44-be9cc3150a31`, selected it only there and converged exactly once to the
  original. An offline excluding-search Add similarly revealed ID
  `f24fbe43-c3b9-4c46-abad-300ad67a8e97`; reconnect reached `Saved` and both tabs converged to 14
  rows.
- The 51-row future import used the normal file-input, column auto-detect, account choice and
  `Import 51 Transactions` action. Three unsupported run-code payload construction attempts were
  rejected before any import state change; the actual in-memory CSV was then supplied through the
  browser's normal file-input event without creating a host file. That flow produced the blocking
  pagination reproduction and exact ID documented in F-01.
- At 390 × 844 with dark preference and reduced motion, inner/client/scroll widths were all 390 and
  the responsive header, complete filter toolbar, Add and ordinary rows remained represented. The
  computed body background remained white, the inherited P20A/P20B theme limitation.
- Keyboard-focused Add exposed the same inherited 3 px generic Button ring as revision 01: text
  `lab(48.0876 -2.03595 -16.5814)`, transparent button over
  `oklab(0.967998 -0.00264332 -0.00646251 / 0.3)`, and ring
  `oklab(0.703997 -0.00914919 -0.038923 / 0.5)`. The previously computed ratios remain approximately
  4.64:1 for text and 1.54:1 for the generic ring. The unchanged Button/theme limitation is
  disclosed rather than misattributed as a revision-02 regression.
- At 1280 × 800 with CSS zoom 2, client and scroll widths remained 1280, Add and the transaction
  grid stayed visible, and the expected vertical content area expanded to 1,600 px without page-wide
  horizontal overflow.
- Editing the pagination row to `Manual Privacy R02 Review` produced a `sync.pushOps` POST whose
  body did not contain that plaintext. Both tabs converged to the value and 66 transactions. Final
  reloads left filters empty and selection clear; final console error queries returned zero in both
  tabs, and all listed vault/sync/Realtime/import requests were 200.
- The duplicate was closed, the CLI browser was closed, and `delete-data` reported no residual user
  data. Root stopped the server and moved only review-generated build/test/CLI artifacts to
  recoverable trash while preserving older artifacts.

## Boundary, frozen sources and questions

- Frozen revision-01 evidence remains SHA-256
  `910135f64546a22d41218df0f7ce3c00c5b7b5434604108e057e51770a22c9f9`; immutable review 01 remains
  SHA-256 `579a6f08fa3096a92d1695a5de1184e18ce3912e5a651eda1d8202d20a99dd55`, 163 lines / 14,917
  bytes.
- Frozen human scratch remains SHA-256
  `aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`, 350 lines / 24,247 bytes, with
  HS-001 unchecked. Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Before this review artifact, the exact worktree was root-owned modified `HANDOFF.md` and
  `PROGRESS.md` plus frozen untracked `implementation-02.md`; the index was empty. This review is
  the sole reviewer-created repository artifact. No product, test, source marker, ledger, evidence,
  configuration or prior artifact was edited.
- No `Q-*` proposal is needed. HS-001 and review-01 F-01 already require the created row to be
  immediately visible and prohibit invisible selection. Pagination is an implementation defect, not
  an unresolved product choice.

## Single final verdict

**FAIL.** Revision 02 correctly clears every excluding transaction filter and preserves ordinary
row/history/sync behavior, but pagination can still hide the newly persisted selected row. Root must
preserve this immutable review, keep HS-001 unchecked and route the remaining F-01 closure into P13
revision 03.
