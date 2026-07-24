# P13 Implementation Evidence — Revision 02

## Immutable dispatch boundary

- Package / requirement / revision: `P13` / `HS-001` / `02`.
- Cumulative original BASE: `415ea080b3b19191fd71601742056a619b4a3080`.
- Clean revision-02 pre-implementation HEAD: `57398ea27d2af6523d26ccc3227433feaebe29e3`.
- Revision-01 implementation/review and their failure-integration commits are immutable.
- This sole revision-02 worker artifact was created before product/test edits.
- Existing dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; the index was empty.

## F-01 counterexamples

Before the product edit, one temporary soft-assertion browser journey exercised every excluding
filter class against the revision-01 implementation:

- search: a committed no-match query;
- date: `Last year`;
- tag: a fresh `Excluded Tag`;
- person: `Me`;
- account: whichever of fresh `Savings` or `Default` did not match the new row's default account;
- status: `Paid`; and
- duplicates: the duplicates-only toggle.

For each class the table correctly contained zero rows and exposed `Clear all` before Add. After Add
it still contained zero rows, retained the active filter, and reported
`0 transactions (filtered) · 1 selected`. Manually clearing the filter revealed the cumulative
persisted ordinary rows. The final red run traversed all seven counterexamples and emitted the
expected soft failures in 13 seconds. This directly reproduced review-01 F-01 across the complete
filter surface before the two-line product change.

The selected closure policy is to clear all active transaction filters on every valid Add. It keeps
the created entity on the ordinary row path and does not add a compatibility selector, special entry
mode, or filter bypass.

## Implementation

- `handleAddTransaction` now resets the controlled transaction filter state with a fresh
  `createEmptyFilters()` value immediately before the existing transaction insertion. The account
  and default-status validity guards still run first, so an Add that cannot create a valid
  transaction does not alter filter state.
- The existing revision-01 insertion, monotonic creation instant, UUID, defaults, selection and
  focus behavior are unchanged. Each valid Add remains one `user:add` CRDT/history operation;
  clearing local UI filters adds no vault operation or history fragment.
- The newly persisted transaction therefore enters the normal filtered data path immediately. The
  toolbar count and sole selection refer to the same visible ordinary row.
- The new transactions E2E journey creates a second account and tag, then runs Add through all seven
  excluding filter classes. Every step proves the precondition is actually excluding, Add retains
  focus, filters clear, the full cumulative row count is visible, `(filtered)` disappears, exactly
  one ordinary row is selected, and its empty description, nonempty account and `For Review` status
  are present.
- The same journey records the duplicates-case transaction ID. Undo removes that exact row with no
  stale selection or filter; Redo restores the same ID selected; hard reload retains all seven IDs
  with filters empty and transient selection cleared.
- Only the two dispatched product/test paths changed in revision 02. The revision-01 ordinary-row
  architecture and all of its tests remain cumulative.

## Automated validation

All final results below are against the revision-02 implementation:

- The new focused filter journey passed 1/1 in 9.5 seconds with one worker and no retry.
- The cumulative focused Vitest profile (`transaction-mutations.test.ts`,
  `keyboard-navigation.test.ts`, `virtualization.test.tsx`, `transaction-operations.test.ts`) ran
  three clean times. Each passed 4 files / 76 tests; durations were 1.03 s, 1.02 s and 1.03 s.
- `pnpm test`: 60 files / 1,286 tests passed in 5.98 s.
- `pnpm typecheck`: clean.
- `pnpm lint`: exit 0 with exactly the same ten inherited warnings and no P13 error.
- `pnpm build`: clean on Next.js 16.2.10; all 17 routes built.
- Targeted `oxfmt --check` on the two revision-02 paths: clean before commit.
- `git diff --check`: clean before commit.
- The cumulative affected browser matrix expanded from 21 to 22 journeys by adding the complete
  filter-class case. With `--repeat-each=3 --workers=1 --retries=0`, all 66/66 passed in 4.3
  minutes.
- Repository-wide E2E with one worker and no retries passed 91/91 in 5.9 minutes. No retry was
  available to mask a flaky attempt.

The browser test server emitted only the inherited deliberate negative-path messages from tests that
sever authentication, Realtime or network connections. There was no failing assertion.

Repository-wide `pnpm format:check` remains red only on the same 13 inherited root-owned or frozen
Markdown files:

- `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`;
- P12 implementation revisions 03, 04, 05 and 06;
- P12 review revisions 05 and 06; and
- `specs/human-scratch.md`.

This revision-02 evidence and both changed product/test files were target-formatted. None of the 13
inherited files was normalized by this worker.

## Installed-CLI manual charter

This is separate installed-headless `playwright-cli` evidence, not part of the automated browser
counts:

- Disposable session `p13-impl-02` used the repository-installed CLI against a task-owned local dev
  server. The server-only Realtime secret was derived in memory from the running container and was
  never printed or persisted.
- A fresh identity was created through normal onboarding. All twelve recovery words remained masked;
  reveal/copy was not used and no recovery material was read.
- Fresh `Savings` and `Excluded Tag` records were created through their normal UI. The operator then
  activated each of search, date, tag, person, account, status and duplicates excluding filters in
  sequence. Every filter showed zero rows and one active filter before Add. Every Add retained
  focus, cleared the filter, revealed the cumulative 1-through-7 ordinary rows, selected exactly one
  row, and reported the coherent unfiltered count. Search reset to empty and zero special
  submit/cancel controls existed throughout.
- For the seventh row, Undo reduced the count to six, cleared selection and kept filters empty. Redo
  restored the exact ID `3f12b78e-aa48-474f-9ad1-2007e06e5a77`, selected it, and kept filters empty.
- Three rapid pointer Adds then produced three distinct IDs and a total of ten rows. Add retained
  focus, the newest row alone was selected, and no special controls appeared.
- ArrowDown moved Description from row zero to row one; Shift+Tab moved backward to Date; Tab
  returned to Description. `Manual Alias R02` plus Enter persisted and `Discarded R02` plus Escape
  restored the prior empty value. Pointer selection produced two selected ordinary rows. Status
  changed to `Paid`, amount changed to `12.34`, and ordinary two-step deletion removed one exact ID;
  Undo restored the same ID.
- Hard reload retained the ten exact row IDs, the committed alias, status and amount, while clearing
  transient selection and retaining empty filters. A normal `window.open` duplicate inherited the
  authenticated unlocked session.
- In the duplicate, an active no-match search followed by Add cleared the filter, revealed row 11
  and selected exact ID `c7105685-a454-4d1f-bb01-21cf6733778d`. The original converged live to the
  same 11 rows without receiving the duplicate tab's selection.
- With the original browser context offline, another no-match search followed by Add immediately
  cleared the filter, revealed row 12 with ID `c11b181b-6f51-446f-93c6-71d7b58e3949`, and showed
  `Saving`. Reconnection reached `Saved`; the duplicate converged exactly once to 12 rows.
- At 390 × 844 in dark mode with reduced motion, a final excluding-search Add produced row 13 with
  one visible selected ordinary row and empty filters. Window, root client and root scroll widths
  were all 390; root height was 844. Add, the complete filter toolbar and normal row controls
  remained reachable with no special controls.
- Keyboard focus on Add reported a 3 px computed outline width but an inherited `none` outline style
  and no box shadow in this dark state. This reconfirms review-01's cross-cutting generic
  Button/theme focus-ring limitation; those components are outside the exact authorized revision-02
  surface and this revision did not alter their styling.
- At 1280 × 800 with simulated document zoom `2`, Add and all 13 rows remained represented. Root
  client and scroll widths remained exactly 1280, with the 1,600 px scroll height providing the
  expected vertical content area and no page-wide horizontal overflow.
- A normal description edit to `Manual Privacy R02B` produced one `/api/trpc/sync.pushOps?batch=1`
  POST. A boolean-only inspection found that the request body did not contain that plaintext; no
  request body or encrypted payload was printed.
- Final reloads in both authenticated tabs retained exactly 13 rows, one privacy marker and empty
  filters, while clearing selection. Instrumented reloads reported zero failed requests and zero
  responses at or above 400. Final `console error` queries returned zero errors on both tabs.

No MCP browser, `npx`, temporary test/config, headed browser, dashboard, debug/UI mode, recovery
phrase exposure or request-body dump was used.

## Boundary and cleanup

- Exact revision-02 product/test commit: `8f6e4f2ad77da24016169a79286a9727f3394aca`
  (`fix: reveal added transactions through filters`).
- Exact cumulative review range:
  `415ea080b3b19191fd71601742056a619b4a3080..8f6e4f2ad77da24016169a79286a9727f3394aca`. It contains
  20 paths, 1,302 insertions and 823 deletions, including the cumulative immutable revision-01
  implementation.
- Exact revision-02 delta:
  `57398ea27d2af6523d26ccc3227433feaebe29e3..8f6e4f2ad77da24016169a79286a9727f3394aca`. It contains
  only the two authorized paths, 123 insertions and no deletions.
- The index is empty. The working tree contains only root-owned unstaged `HANDOFF.md`/`PROGRESS.md`
  and this sole untracked revision-02 evidence artifact.
- CLI data cleanup reported no residual session data; `playwright-cli list` returned
  `(no browsers)`. Only revision-02-generated CLI files and the generated test-results marker were
  moved to trash; the older CLI artifacts were preserved. The task-owned server was stopped,
  generated `next-env.d.ts` was restored byte-for-byte, and no task-owned Next/Playwright process
  remains.
- The immutable revision-01 evidence remains SHA-256
  `910135f64546a22d41218df0f7ce3c00c5b7b5434604108e057e51770a22c9f9`, 227 lines / 15,227 bytes. The
  immutable revision-01 review remains SHA-256
  `579a6f08fa3096a92d1695a5de1184e18ce3912e5a651eda1d8202d20a99dd55`, 163 lines / 14,917 bytes.
- Frozen source boundary after implementation, automation, manual testing and cleanup:
    - `specs/human-scratch.md`: SHA-256
      `aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`, 350 lines / 24,247 bytes.
    - canonical FS-001 source: SHA-256
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
    - `SCOPE.json`: SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450
      lines / 27,382 bytes.
- There is no unresolved implementation question or `Q-*` proposal. This evidence makes no
  independent-review PASS claim; the exact immutable cumulative range and assigned revision-02
  evidence are ready for independent review.
