# P13 Implementation Evidence — Revision 03

## Immutable dispatch boundary

- Package / requirement / revision: `P13` / `HS-001` / `03`.
- Cumulative original BASE: `415ea080b3b19191fd71601742056a619b4a3080`.
- Clean revision-03 pre-implementation HEAD: `8971b63cf9671652c5739cb68681c42302813f6c`.
- Revisions 01 and 02, their evidence/reviews and failure-integration commits are immutable.
- This sole revision-03 worker artifact was created before product/test edits.
- Existing dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; the index was empty.

## F-01 counterexample

Before the product edit, the revision-02 page was exercised with a normal 51-row CSV import whose
legal `2099-01-01` dates place every imported transaction ahead of a transaction added today in the
canonical comparator. The initial displayed page was therefore the first 50 of 51 persisted rows.
After a committed no-match search, Add correctly cleared the filter, persisted an exact ordinary row
and reported the superficially coherent `52 transactions · 1 selected` toolbar and `Edit 1` bulk
control. The selected row itself was absent from the rendered table because its canonical index was
51 and the displayed prefix was still capped at 50.

The behavior-led test was written and run against that unchanged page before the product edit. It
failed exactly at the selected ordinary row visibility assertion: one failed test in approximately
18 seconds with one worker and no retry. This directly reproduces review-02 F-01 with more than
`PAGE_SIZE` legal, higher-sorted rows and proves that clearing filters alone did not keep the
created entity in the displayed surface.

## Implementation

- Add now constructs the exact transaction once, calculates its insertion point with the shared
  canonical `compareTransactionOrder` comparator, and expands `displayCount` to the smallest
  `PAGE_SIZE` boundary containing that index. The CRDT insertion receives that same object; there is
  no preview row, compatibility path, special entry mode or alternate ordering.
- A short-lived reveal target waits until the created ID is present in the displayed canonical
  prefix, then scrolls the existing virtualized transaction viewport so that the row and one prior
  neighbor are visible. This is an ordinary effect on the existing grid and preserves Add focus. No
  table component or generic control was changed.
- Selection-derived count, warning and bulk-edit inputs now intersect the raw local selection with
  the displayed transaction IDs. Consequently the toolbar and Bulk Edit cannot advertise or act on a
  selected entity outside the displayed prefix. The raw local ID is retained so Undo removes it
  cleanly and Redo can restore that same exact ID selected when it re-enters the displayed prefix.
- Canonical prefix pagination and bounded row virtualization remain intact. The display budget is
  raised only to the boundary required for the added row; the implementation does not render the
  whole dataset.
- The new E2E imports 51 future-dated transactions through the normal import workflow, commits an
  excluding search, and proves that Add clears filters, retains focus, reports 52/one selected,
  exposes coherent Bulk Edit, and reveals the selected ordinary row at canonical index 51 with empty
  description, current date, `Default`, `For Review` and `0.00` defaults.
- That journey records the generated transaction ID. Undo removes the exact row and clears visible
  selection/Bulk Edit; Redo restores the same ID selected at index 51. Hard reload retains the exact
  empty row and defaults, clears transient selection, and makes it reachable through the existing
  normal pagination/virtual-scroll surface.
- Only the two dispatched product/test paths changed in revision 03. Revisions 01 and 02 and their
  cumulative ordinary-row/filter tests remain unchanged.

## Automated validation

All final results below are against the revision-03 implementation:

- The new focused pagination journey passed 1/1 in 9.4 seconds with one worker and no retry.
- The cumulative focused Vitest profile (`transaction-mutations.test.ts`,
  `keyboard-navigation.test.ts`, `virtualization.test.tsx`, `transaction-operations.test.ts`) ran
  three clean times. Each passed 4 files / 76 tests; durations were 1.01 s, 1.02 s and 1.02 s.
- `pnpm test`: 60 files / 1,286 tests passed in 6.21 s.
- `pnpm typecheck`: clean.
- `pnpm lint`: exit 0 with exactly the same ten inherited warnings and no P13 error.
- `pnpm build`: clean on Next.js 16.2.10; all 17 routes built.
- Targeted `oxfmt --check` on the two revision-03 paths and this evidence: clean before product
  commit.
- `git diff --check`: clean before and after product commit.
- The cumulative affected browser matrix expanded from 22 to 23 journeys by adding the pagination
  boundary case. It covered transactions, description aliases, tab duplication, Undo/Redo and
  virtualization. With `--repeat-each=3 --workers=1 --retries=0`, all 69/69 passed in 4.5 minutes.
- Repository-wide E2E with one worker and no retries passed 92/92 in 6.0 minutes. No retry was
  available to mask a flaky attempt.

One combined diagnostic run of the existing seven-filter, pagination and 500-row virtualization
journeys passed the first two, then the unchanged 500-row journey timed out at its five-second
duplicate-tab `500 transactions` visibility assertion. Immediate isolated rerun of that exact
unchanged journey passed 3/3, approximately 29 seconds per attempt. It also passed in the final
69/69 affected matrix and 92/92 repository-wide run. This was an inherited timing red, not hidden or
used as final evidence.

The browser test server emitted only the inherited deliberate negative-path messages from tests that
sever authentication, Realtime or network connections. There was no failing assertion in a final
run.

Repository-wide `pnpm format:check` remains red only on the same 13 inherited root-owned or frozen
Markdown files:

- `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`;
- P12 implementation revisions 03, 04, 05 and 06;
- P12 review revisions 05 and 06; and
- `specs/human-scratch.md`.

This revision-03 evidence and both changed product/test files were target-formatted. None of the 13
inherited files was normalized by this worker.

## Installed-CLI manual charter

This is separate repository-installed, headless `playwright-cli` evidence, not part of the automated
browser counts:

- Disposable session `p13-implementation-03` used the repository-installed CLI against the
  root-owned keyed local dev server. A fresh identity was created through normal onboarding. All
  twelve recovery words remained masked; reveal/copy was not used and no recovery material was read.
- A normal import workflow loaded 51 legal future-dated CSV transactions into `Default`. The file
  input received an in-memory browser `File` through its normal change event after the CLI rejected
  two unsupported direct payload attempts; no task-data host file was created. The initial toolbar
  showed 51 transactions while only 14 ordinary rows were rendered, establishing bounded
  virtualization.
- With a committed no-match search showing zero rows, Add produced exact ID
  `c8a3c379-f79f-4e4e-b346-b004205d2552` at canonical index 51. Add retained focus, search and all
  filters cleared, the toolbar reported 52/one selected, Bulk Edit reported one, and the selected
  empty ordinary row was visible with `Default`, `For Review` and zero amount. Only 17 rows were
  rendered; the existing viewport had scrolled to the new row. No special controls existed.
- Undo removed that exact row, returned to 51 and cleared selection/Bulk Edit. Redo restored the
  same ID selected at index 51. Hard reload retained all 52 rows and the exact empty defaults while
  clearing selection; ordinary scrolling through the existing viewport revealed the exact row at
  index 51.
- Three rapid pointer Adds produced three distinct IDs and 55 total transactions while Add retained
  focus, only the newest row was selected, only 14 rows were rendered and no special controls
  existed. ArrowDown moved Description to the next row; Shift+Tab moved backward to Date; Tab
  returned to Description.
- `Manual Alias R03` plus Enter persisted, while `Discarded R03` plus Escape restored the prior
  empty value. Pointer selection produced two selected ordinary rows and coherent `Edit 2`. Another
  row changed to `Paid` and `12.34`; the normal two-click delete confirmation removed its exact ID
  and Undo restored the same ID and values.
- The first delete locator looked for the wrong accessible name and timed out; the UI correctly
  reset its three-second confirmation state. The repeated normal two-click flow used the actual
  `Click again to confirm delete` title and succeeded. Similarly, a first post-reload viewport
  scroll reached one pagination boundary rather than the required second boundary; continuing the
  same normal scrolling revealed all four exact manual IDs. These were operator corrections, not
  product failures.
- A normal `window.open` duplicate inherited the authenticated unlocked session. A no-match search
  there followed by Add created exact ID `446d643d-3890-4550-aa58-3f8f0953b0e5` at index 51, cleared
  filters and showed 56/one selected. The original converged to the same data count without
  receiving the duplicate's local selection.
- With the original browser context offline, another no-match search followed by Add created exact
  ID `94c4f31c-d25b-4e8a-ac81-805f4423f68b` at index 51, immediately cleared filters, exposed the
  selected row and showed `Saving`. Reconnection reached `Saved`; the duplicate converged to the
  same exact ID while retaining only its own prior local selection. A strict-text wait for
  `57 transactions` initially timed out because the visible toolbar included
  `57 transactions · 1 selected`; immediate inspection confirmed convergence.
- At 390 × 844 in dark mode with reduced motion, an excluding-search Add created exact ID
  `8182ca38-4918-4c04-9c19-2f0390238cd8` at index 51. Window, root client and root scroll widths
  were all 390; height was 844. Add remained focused, the selected ordinary row, filters and Bulk
  Edit remained reachable, only 13 rows were rendered, and no special controls existed.
- Keyboard focus on Add reported a 3 px computed outline width but an inherited `none` outline style
  and no box shadow in this dark state. The body also retained its inherited light background. These
  reconfirm the cross-cutting generic Button/theme limitations already recorded by earlier reviews;
  those components were outside the exact authorized revision-03 surface.
- At 1280 × 800 with simulated document zoom `2`, window, root client and root scroll widths
  remained exactly 1280. The expected 1,600 px document height supplied vertical content space; Add
  and the exact selected row remained visible with no page-wide horizontal overflow.
- A normal description edit to `Manual Privacy R03` produced one successful
  `/api/trpc/sync.pushOps?batch=1` POST. A boolean-only inspection found that the request body did
  not contain that plaintext; no request body or encrypted payload was printed. Reload retained the
  marker.
- Fresh `Savings R03` and `Excluded Tag R03` records were created through their normal UIs. With
  more than `PAGE_SIZE` rows, search, date, tag, person, account, status and duplicates excluding
  filters were each exercised in sequence. Each had one active exclusion before Add; Add retained
  focus, cleared every filter, exposed its exact newly created ordinary row at canonical index 51,
  reported one visible selection/coherent Bulk Edit, and used no special controls. The counts
  advanced from 59 through 65.
- The last matrix Add was not durably pushed despite a stale `Saved` indicator, so an immediate
  reload returned to 64. The operator repeated the ordinary duplicates-filter Add and observed the
  successful sync POST. Both tabs then converged to 65. Final instrumented reloads in both tabs
  reported 65, `Saved`, empty search/filters, zero selection, zero console/page errors, zero failed
  requests and zero responses at or above 400.

The CLI file chooser was dismissed with an empty `/dev/null` upload before the successful normal
in-page file event. No MCP browser, `npx`, temporary test/config, headed browser, dashboard,
debug/UI mode, recovery phrase exposure or request-body dump was used.

## Boundary and cleanup

- Exact revision-03 product/test commit: `9f307e200676711ca2a3ba81bd816314807434ad`
  (`fix: reveal added rows across pagination`).
- Exact cumulative review range:
  `415ea080b3b19191fd71601742056a619b4a3080..9f307e200676711ca2a3ba81bd816314807434ad`. It contains
  22 paths, 1,898 insertions and 836 deletions, including the cumulative immutable revision-01 and
  revision-02 implementations.
- Exact revision-03 delta:
  `8971b63cf9671652c5739cb68681c42302813f6c..9f307e200676711ca2a3ba81bd816314807434ad`. It contains
  only the two authorized paths, 189 insertions and 38 deletions.
- The index is empty. The working tree contains only root-owned unstaged `HANDOFF.md`/`PROGRESS.md`
  and this sole untracked revision-03 evidence artifact.
- CLI cleanup reported no retained browser user data; `playwright-cli list` returned
  `(no browsers)`. Only revision-03-generated CLI artifacts and the generated test-results marker
  were moved to trash; older CLI artifacts were preserved. The root stopped the keyed server,
  generated `next-env.d.ts` was restored byte-for-byte, and no task-owned Next/Playwright process
  remains.
- Immutable predecessor hashes remain:
    - revision-01 implementation:
      `910135f64546a22d41218df0f7ce3c00c5b7b5434604108e057e51770a22c9f9`, 227 lines / 15,227 bytes;
    - revision-02 implementation:
      `2ef2070960cac20bf0e9bc138928b3c11c94671f57af2f8a8ba94009e0e81bdd`, 178 lines / 11,584 bytes;
    - revision-01 review: `579a6f08fa3096a92d1695a5de1184e18ce3912e5a651eda1d8202d20a99dd55`, 163
      lines / 14,917 bytes; and
    - revision-02 review: `157dfc363788966f90fd5dca0f23506f65a75f4794261359ab89f443d9603b91`, 204
      lines / 21,835 bytes.
- Frozen source boundary after implementation, automation, manual testing and cleanup:
    - `specs/human-scratch.md`: SHA-256
      `aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`, 350 lines / 24,247 bytes.
    - canonical FS-001 source: SHA-256
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
    - `SCOPE.json`: SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450
      lines / 27,382 bytes.
- There is no unresolved implementation question or `Q-*` proposal. This evidence makes no
  independent-review PASS claim; the exact immutable cumulative range and assigned revision-03
  evidence are ready for independent review.
