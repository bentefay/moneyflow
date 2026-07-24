# P13 Independent Review — Revision 03

## Review identity and verdict

- Package / requirement / revision: `P13` / `HS-001` / `03`.
- Literal cumulative reviewed range:
  `415ea080b3b19191fd71601742056a619b4a3080..9f307e200676711ca2a3ba81bd816314807434ad`.
- Frozen revision-03 implementation evidence: `evidence/P13/implementation-03.md`, SHA-256
  `1b6a949b7136b3e5aa3448f9815a9437624b1fb7c80a63951c49555fd67a2f2d`, 212 lines / 14,968 bytes.
- The cumulative range contains exactly 22 paths, 1,898 insertions and 836 deletions. It includes
  the cumulative product/test implementation plus immutable prior evidence, reviews and root
  integration records. The true revision-03 delta is
  `8971b63cf9671652c5739cb68681c42302813f6c..9f307e200676711ca2a3ba81bd816314807434ad`: exactly
  `src/app/(app)/transactions/page.tsx` and `tests/e2e/transactions.spec.ts`, 189 insertions and 38
  deletions. Both cumulative and revision-03 `git diff --check` pass.
- **Verdict: PASS.** Revision 03 closes review-02 F-01. Add expands the canonical prefix only as far
  as the created logical ID requires, scrolls the existing virtual viewport to that exact row and
  derives selection/Bulk Edit only from displayed IDs. The deterministic greater-than-page-size
  counterexample now exposes the selected ordinary row at canonical index 51 immediately while
  preserving canonical order, bounded virtualization, one-step history, persistence and sync. No
  High or Medium finding remains.

## Finding adjudication

| Prior finding                                               | Revision-03 adjudication                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review-02 F-01 — pagination can hide the newly selected row | **Closed.** The exact 51 legal higher-sorted-row case now expands `displayCount` from the containing canonical index, reveals and scrolls to the created ID, reports one visible selection and coherent Bulk Edit, and retains only 17 mounted rows. Undo removes the exact ID; Redo restores it selected at index 51. Reload persists the same defaults and clears transient selection; normal virtual scrolling exposes the row again at index 51. |

No new finding was identified.

## Independent code review

- The existing active transaction query already returns canonical order. Add constructs one
  transaction and compares that same object with the shared `compareTransactionOrder` comparator
  (`page.tsx:289-335`). It computes the smallest 50-row boundary containing the insertion index,
  raises the existing display budget monotonically and sends the identical transaction object to the
  existing CRDT insertion. There is no shadow entity, special entry row, alternate order or
  compatibility write.
- The reveal effect waits for the created ID to enter `displayedTransactions`, locates the existing
  grid/scroll container and scrolls to one row before the target (`page.tsx:198-216`). It clears its
  short-lived target after reconciliation and does not replace or unbound virtualization.
- Displayed selection is now the intersection of raw local IDs and the displayed canonical prefix
  (`page.tsx:172-186`). Counts, large-selection warning, table selection and every bulk mutation use
  that derived set (`page.tsx:188-196,337-455,852-881`). A hidden row can no longer be advertised or
  mutated through Bulk Edit, while the raw ID survives long enough for exact Undo/Redo
  reconciliation.
- Clearing filters remains after the valid account/status guards and before insertion. Invalid
  defaults therefore do not mutate filters or history. Filters and selection remain local React
  state; only the ordinary CRDT Add participates in shared data and Undo.
- Rapid Adds retain distinct UUIDs and monotonic creation instants. Each fresh transaction may
  initially calculate the same insertion point as it becomes the newest same-day item; after the
  three operations settle, the exact IDs occupy canonical indices 51, 52 and 53 with only the newest
  selected. This is correct canonical behavior, not append order.
- The revision-03 E2E directly imports 51 legal future-dated rows, activates an excluding search,
  proves immediate visible selection/defaults/Bulk coherence at index 51, then proves exact-ID Undo,
  Redo and reload persistence (`transactions.spec.ts:304-404`). The test exercises the production
  import and transaction surfaces without a test-only product hook.
- Cumulative inspection found no reintroduced `AddTransactionRow`, add mode, preview entity,
  submit/cancel path, plaintext payload, auth bypass, arbitrary sleep, retry mask or dual write.
  Ordinary rows retain alias editing, date/account/tag/status/amount editing, notes, deletion,
  checkbox/Bulk behavior, keyboard grid navigation, virtualization, offline persistence and
  duplicate-tab convergence.

## Independent automation

| Gate                                                                                             | Independent result                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused Vitest profile: transaction operations/mutations, keyboard navigation and virtualization | PASS in three clean processes; 4 files / 76 tests each in 1.01 s, 1.00 s and 1.01 s.                                                                                                                                                                                                           |
| `pnpm test`                                                                                      | PASS; 60 files / 1,286 tests in 6.19 s.                                                                                                                                                                                                                                                        |
| `pnpm typecheck`                                                                                 | PASS.                                                                                                                                                                                                                                                                                          |
| `pnpm lint`                                                                                      | PASS exit 0; 0 errors and exactly 10 inherited warnings.                                                                                                                                                                                                                                       |
| `pnpm build`                                                                                     | PASS; Next.js 16.2.10 compiled, generated types and built all 17 routes.                                                                                                                                                                                                                       |
| Cumulative changed-path `oxfmt --check`                                                          | PASS; all 14 extant cumulative product/test paths. The fifteenth product path is deleted.                                                                                                                                                                                                      |
| Revision-03 `oxfmt --check`                                                                      | PASS; both changed product/test paths.                                                                                                                                                                                                                                                         |
| Repository `pnpm format:check`                                                                   | FAIL only on the same 13 inherited/root-owned/frozen Markdown paths: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, P12 implementation revisions 03–06, P12 review revisions 05–06 and `specs/human-scratch.md`. No P13 product/test path failed. |
| Cumulative and revision-03 `git diff --check`                                                    | PASS.                                                                                                                                                                                                                                                                                          |
| Exact pagination closure E2E, one worker / no retry                                              | PASS; 1/1 in 16.3 s.                                                                                                                                                                                                                                                                           |
| All four affected E2E files, `--repeat-each=3 --workers=1 --retries=0`                           | PASS; 147/147 in 11.3 minutes. This independently exceeds the submitted 69/69 affected subset.                                                                                                                                                                                                 |
| Full E2E, `--workers=1 --retries=0`                                                              | PASS; 92/92 in 6.0 minutes.                                                                                                                                                                                                                                                                    |

The browser output contained only expected messages from explicit offline, blocked-storage and
negative-auth journeys. Read-only command verification was independently delegated as required by
reviewer authority. The reviewer independently inspected the entire cumulative range, ran the exact
pagination E2E, affected and full browser profiles, and completed the installed-CLI charter.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p13-review-03` against the correctly keyed root-owned server. No MCP, `npx`, headed/debug/UI
  mode, temporary test/config, recovery phrase exposure, arbitrary sleep or request-body dump was
  used.
- Created a fresh identity through normal onboarding while all twelve recovery words remained
  masked. Reveal/copy was never used and no recovery material was read, entered or printed.
- Imported 51 legal `2099-01-01` transactions through the normal file-input/import UI using an
  in-browser `File`; no host task-data file was created. The initial 51-transaction state mounted
  only 14 ordinary rows.
- With a committed no-match search and zero rows, Add created exact ID
  `d96b4776-7b27-423b-afba-8de7fa702a5b` at canonical index 51. Search and all filters cleared, Add
  retained focus, the toolbar reported `52 transactions · 1 selected`, Bulk Edit reported `Edit 1`
  and the exact selected row was visible with date, `Default`, `For Review`, `0.00` and empty
  description defaults. Only 17 rows were mounted and no special entry controls existed.
- Undo removed that exact ID, returned to 51 transactions and cleared selection/Bulk Edit. Redo
  restored the same ID selected at index 51. Hard reload retained 52 transactions and the exact
  defaults, cleared transient selection and exposed the same row at index 51 through normal virtual
  scrolling with 18 mounted rows.
- Three rapid Adds produced three distinct IDs. After reconciliation they occupied canonical indices
  51, 52 and 53, the earlier reviewed ID moved to 54, only the newest ID was selected, Add retained
  focus and only 14 rows were mounted.
- Description ArrowDown moved focus to the next canonical row's Description; Shift+Tab remained
  inside that row and Tab returned to Description. Enter committed `P13-R03-PRIVATE-MARKER-74093`;
  Escape discarded a subsequent edit and restored that value.
- Created `Savings` and `Excluded Tag` through their normal UIs. Search, date, tag, person, account,
  status and duplicates-only exclusions were each activated with zero visible rows. Every Add
  cleared the filter, removed `Clear all`, retained Add focus, exposed exactly one selected ordinary
  row with legal defaults and coherent Bulk Edit, and advanced the durable count from 55 to 62.
- A normal `window.open` duplicate inherited the unlocked session. A no-match search in the original
  remained local: the duplicate retained empty search, 62 transactions and zero selection. With the
  context offline, Add created exact ID `31f5197c-ebfc-4e35-9011-4d646913bd9c`, immediately showed
  63 transactions / one selected / `Saving` with only 14 mounted rows. Reconnection reached `Saved`;
  the duplicate converged to the same ID exactly once while retaining empty search and zero
  selection, with 20 mounted rows.
- A successful same-origin `sync.pushOps` request for the privacy marker was inspected only as a
  boolean; its request body did not contain the plaintext. No payload was printed. All observed
  application requests remained on `localhost`.
- At 390 × 844 with dark preference and reduced motion, the root/body had no page-wide horizontal
  overflow, the main width remained 390, Add and ordinary rows remained visible and only 20 rows
  were mounted. Keyboard navigation produced the inherited generic Button 3 px ring. A synthetic 2×
  zoom applied on top of the already-mobile viewport expanded root scroll width to 556 while Add
  remained rendered; the standard desktop 2× check in the frozen implementation evidence remained
  1280/1280 with no page-wide overflow. The narrow-plus-zoom combination and inherited generic
  Button/theme limitations are disclosed and are not revision-03 regressions in the authorized
  page/test delta.
- A final instrumented online reload reported 63 transactions, `Saved`, zero selection, 14 mounted
  rows, zero new console errors, zero page errors and zero non-local requests. The only six retained
  console errors were the expected `ERR_INTERNET_DISCONNECTED`/failed sync diagnostics during the
  deliberate offline window; the following push succeeded.
- CLI operator corrections were kept visible: initial locators assumed a non-existent filtered grid
  and exact toolbar text without its nested selection suffix; the first post-reload scroll targeted
  the grid instead of its scrolling parent; an initial privacy matcher used `sync/push` rather than
  `sync.pushOps`; and a direct `tab-new` lacked copied session storage. Each timed out without
  contradicting product state, was immediately inspected and rerun with the actual accessible or DOM
  contract. The authenticated duplicate was then created through normal `window.open`.
- The duplicate was closed, the browser was closed, `delete-data` ran and `playwright-cli list`
  returned `(no browsers)`. Root stopped the server, restored `next-env.d.ts` byte-for-byte, moved
  only the 12 new CLI artifacts plus generated `.next`/`test-results` outputs to recoverable trash
  and preserved all older CLI artifacts. No task-owned Next, Playwright or CLI process or port 3000
  listener remained.

## Boundary, frozen sources and questions

- Immutable predecessor hashes remain:
    - revision-01 implementation:
      `910135f64546a22d41218df0f7ce3c00c5b7b5434604108e057e51770a22c9f9`, 227 lines / 15,227 bytes;
    - revision-02 implementation:
      `2ef2070960cac20bf0e9bc138928b3c11c94671f57af2f8a8ba94009e0e81bdd`, 178 lines / 11,584 bytes;
    - revision-01 review: `579a6f08fa3096a92d1695a5de1184e18ce3912e5a651eda1d8202d20a99dd55`, 163
      lines / 14,917 bytes; and
    - revision-02 review: `157dfc363788966f90fd5dca0f23506f65a75f4794261359ab89f443d9603b91`, 204
      lines / 21,835 bytes.
- Frozen human scratch remains SHA-256
  `aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`, 350 lines / 24,247 bytes, with
  HS-001 unchecked pending root integration. Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Immediately before this review artifact, the exact worktree was only root-owned modified
  `HANDOFF.md` and `PROGRESS.md` plus frozen untracked `implementation-03.md`; the index was empty.
  This review is the sole reviewer-created repository artifact. No product, test, source marker,
  ledger, evidence, configuration or prior artifact was edited.
- No `Q-*` proposal is needed. The exact visible-row requirement and canonical-order constraint are
  already resolved by HS-001 and prior review findings.

## Single final verdict

**PASS.** Revision 03 closes the last blocking P13 finding across the exact immutable cumulative
range. Root may preserve this review, integrate P13, and check HS-001 only through the
PROCESS-authorized root completion step.
