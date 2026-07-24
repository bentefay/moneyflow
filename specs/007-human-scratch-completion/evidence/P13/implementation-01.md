# P13 Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package / requirement / revision: `P13` / `HS-001` / `01`.
- Literal original BASE and clean pre-implementation HEAD:
  `415ea080b3b19191fd71601742056a619b4a3080`.
- This is the sole writable worker artifact and was created before product/test edits.
- Existing dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; the index was empty.
- The initial authorized product/test surface was the transactions page, row, table, toolbar,
  keyboard/grid hooks, narrow transaction action support if needed, and focused unit, integration
  and E2E coverage named by the dispatch.
- Root recorded two reproduced-blocker expansions before either expanded path was edited:
    - `src/components/features/transactions/index.ts`, solely to remove dead exports after deleting
      `AddTransactionRow.tsx`.
    - `tests/e2e/description-aliases.spec.ts` and `tests/e2e/tab-duplication.spec.ts`, solely to
      replace their selected obsolete special-add-row interactions with ordinary-row interactions
      and to preserve the Add-then-alias-edit Undo boundary.
- No product path outside that resulting authorization was edited. No root ledger, SCOPE source,
  scratch source, agent configuration, prior evidence/review, or future review artifact was edited
  by this worker.

## Counterexamples

The pre-implementation code and a no-retry browser counterexample established the requirement as red
before product edits:

- `page.tsx` held a single `isAddingTransaction` flag; `TransactionTableToolbar` disabled Add while
  that flag was set; `TransactionTable` rendered `AddTransactionRow`; and `TransactionRow` carried
  an `"add"` mode with local form state and description validation.
- After the first Add click, the UI had zero ordinary `transaction-row` elements, one
  `new-transaction-description`, one `add-transaction-submit`, and one `add-transaction-cancel`. The
  toolbar Add control was disabled and the submit control stayed disabled while description was
  empty. The focused no-retry journey emitted every soft counter-assertion before timing out.
- The retained account-form, description-alias and browser-duplicated-tab journeys then reproduced
  their own obsolete-selector reds: each waited for the removed special description/amount surface
  instead of an ordinary selected transaction row. Those exact reproductions preceded root's test
  path expansion.

This was deterministic behavioral evidence, not a static-only inference. The final green journey
uses the same user-facing Add entry point and explicitly asserts the absence of the former special
controls.

## Implementation

### Ordinary creation path

- `page.tsx` now inserts a complete transaction entity immediately through the existing
  `useTransactionActions().insertTransaction` action. There is no intermediate add-form boolean or
  submit/cancel lifecycle.
- Every click generates a UUID and valid defaults: today's ISO date, first active account, default
  status (`For Review` in a fresh vault), zero minor units in the account currency, empty notes,
  tags and allocations, no import provenance, no deleted marker, an empty imported-description
  field, and no description-alias ID.
- Creation instants are monotonic within the mounted page. If the clock does not advance between
  rapid clicks, the next instant is the previous one plus one nanosecond. The existing created-at/ID
  ordering therefore remains deterministic and each rapid click yields a distinct newest row.
- The new entity is the sole selected transaction after insertion while the Add button retains
  browser focus. Derived selection intersects stored selection IDs with currently active
  transactions, so Undo cannot expose a stale selection for a removed row.
- Every Add is an existing transaction `"add"` user action. Undo removes exactly that row and Redo
  restores the same transaction ID; no follow-up initialization mutation fragments the action.

### One normal row implementation

- `AddTransactionRow.tsx` was deleted. Its dead `NewTransactionData` and `TransactionRowMode` barrel
  exports were removed.
- `TransactionRow` no longer accepts an add mode or owns add-only date, description, account,
  status, amount, submit or cancel state. A transaction is required and the component always renders
  the normal checkbox, date, description, account, tags, status, amount, notes, delete, duplicate
  and presence affordances.
- Normal rows expose `data-transaction-id` so tests and accessibility-oriented manual inspection can
  follow logical identity across Undo, Redo, reload and synchronization without inspecting CRDT
  internals.
- `TransactionTable`, its toolbar and page call site no longer accept or gate on add-mode props. The
  toolbar Add action remains enabled during rapid creation, and the ordinary empty-table state
  remains visible only until the first persisted transaction enters the query.
- Empty description is legal. The initial transaction has no description alias. Editing its
  description flows through the already-reviewed HS-004 callbacks, creating/selecting an alias
  rather than writing manual plaintext into imported description provenance.

### Grid and virtualization preservation

- Backward `Shift+Tab` navigation was completed for both editing and non-editing states: it moves to
  the previous cell, crosses to the prior row's final cell, and clears at the first boundary.
- Ordinary Arrow navigation and forward Tab remain on the same grid path. No add-only focus
  exception remains.
- Virtual row pinning still resolves the focused transaction by ID after row insertion and index
  recalculation. Focus is not attached to a stale array index when a new row sorts ahead.

### Coverage added or retained

- Mutation unit coverage proves multiple distinct valid empty entities, absent alias/import/deleted
  state, and stable ID tie-breaking.
- Integration coverage serializes and restores rapidly created monotonic rows through a snapshot and
  proves newest-first ordering survives the round trip.
- Keyboard unit coverage covers backward navigation within a row, across rows and while saving an
  edit. Virtualization coverage proves a focused row remains pinned when a row is inserted ahead.
- Transactions E2E covers rapid three-click creation, defaults, one predictable selection, stable
  Add focus, all ordinary controls, no special controls, ArrowDown, Shift+Tab/Tab, Enter alias
  commit, Escape draft revert and hard reload.
- Offline/two-tab E2E covers two offline Adds, the failed push, reconnect, `Saved`, convergence to
  exactly three rows on both authenticated tabs and reload without stale selection.
- Undo/redo E2E records three unique IDs, removes/restores exactly one logical row per step, and
  separately exercises ordinary deletion Undo/Redo.
- Retained description-alias coverage proves that the first Undo removes a manual alias edit while
  retaining the same empty row, the second removes the Add, and two Redos restore the same ID and
  alias. Captured push bodies remain encrypted and do not include the manual alias plaintext.
- Retained duplicated-tab coverage now performs Add, description and amount as three ordinary
  actions and expects exactly those three encrypted vault operations without receiver echo.

## Automated validation

All feature and repository-wide green results below are after the final implementation:

- Focused Vitest set, run three clean times with the same four files:
  `transaction-mutations.test.ts`, `keyboard-navigation.test.ts`, `virtualization.test.tsx`, and
  `transaction-operations.test.ts`. Each invocation passed 4 files / 76 tests; reported durations
  were 1.01 s, 1.02 s and 999 ms.
- `pnpm test`: 60 files / 1,286 tests passed in 6.29 s.
- `pnpm typecheck`: clean.
- `pnpm lint`: exit 0. It retained exactly ten unrelated warnings already present in the tree,
  including the TanStack incompatible-library diagnostic and existing unused-import diagnostics; P13
  introduced no lint error.
- `pnpm build`: clean on Next.js 16.2.10; all 17 routes built.
- Targeted `oxfmt --check` across all 15 committed paths: clean.
- `git diff --check`: clean before and after the commit.
- Full transactions E2E with one worker and no retries: 37/37 passed in 2.4 minutes.
- Focused retained E2E for the changed alias, duplication and Undo paths: 3/3 passed in 21.3 s.
- Affected browser matrix spanning 21 P13 and neighboring transaction journeys, repeated three times
  with one worker and no retries: 63/63 passed in 4.0 minutes.
- Repository-wide `pnpm exec playwright test --workers=1 --retries=0 --reporter=dot`: 90/90 passed
  in 5.8 minutes. No retry was available to hide a flaky attempt.

Browser test server output included only already-characterized negative-path authentication,
Realtime and explicit-offline diagnostics from tests that deliberately sever those connections.
There was no failing assertion.

Repository-wide `pnpm format:check` remains red only on the 13 inherited, root-owned or frozen
Markdown files already identified before this package:

- `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`;
- P12 implementation revisions 03, 04, 05 and 06;
- P12 review revisions 05 and 06; and
- `specs/human-scratch.md`.

None of those files was formatted, staged or normalized by this worker. The P13 worker evidence is
target-formatted separately below.

## Installed-CLI manual charter

This section is installed-headless `playwright-cli` evidence, separate from automated
`@playwright/test` counts:

- Session `p13-impl-01` used the repository-installed CLI against a task-owned local dev server. The
  server-only local Realtime JWT was derived in memory from the running container and was never
  printed or persisted.
- A fresh identity was created through normal onboarding. All 12 recovery words remained masked; the
  reveal/copy controls were not used and no recovery material was read.
- The empty Transactions page exposed the named Add action and `No transactions yet`. Three rapid
  pointer Add clicks produced three distinct `data-transaction-id` values. Focus remained on Add
  after every click. The final state exposed one selected newest row, three normal checkboxes and
  rows, current dates, `Default` accounts, `For Review` statuses, `0.00` amounts, Add notes and
  two-step Delete controls, with zero special submit/cancel controls.
- Pointer and keyboard interaction moved Description down one row with ArrowDown, moved backward to
  Date with Shift+Tab, and returned to Description with Tab. Typing `Manual Alias` then Enter
  committed an alias-backed value; typing `Discarded Draft` then Escape restored the empty value.
  Pointer selection, status change to `Paid`, amount change to `12.34`, and ordinary two-step delete
  all worked on the same normal surface.
- One operator-only correction is retained: an exploratory sequence pressed Enter on the already
  editable empty description before typing. Enter correctly committed and blurred; typing afterward
  targeted the grid, where the ordinary `D` shortcut deleted its focused row. This was not treated
  as an Escape/product failure. A new third row was added and the intended direct
  type-then-Enter/type-then-Escape sequences then passed with three stable IDs.
- Ordinary deletion changed the exact ID sequence from three rows to two; one Undo restored the
  deleted ID and one Redo removed it again. A subsequent Add created
  `5ad819ef-b9ec-412d-982c-7a6075323add`; Undo removed that exact ID and Redo restored the same ID
  as the newest row.
- A hard reload retained all three then-current IDs, the manual alias, empty descriptions, Paid
  status and `12.34` amount. The Add control remained enabled and no special controls appeared.
- A normal `window.open` duplicate inherited the authenticated unlocked session. Editing the newest
  row to `Duplicate Sync` in the duplicate converged live to the original with the same three rows.
- The original was then placed offline and Add immediately produced a fourth ordinary row with ID
  `14075548-8a4f-4fd1-b73d-97912a27abb5`. Reconnection reached accessible `Saved`; the duplicate
  converged to exactly four rows, and reload retained the same four IDs. The recovered request log
  showed successful `sync.pushOps`, `sync.getUpdates` and `realtime.authorize` responses.
- The original tab's console contained exactly two expected `net::ERR_INTERNET_DISCONNECTED`
  authorization resource errors from the explicit offline window. The duplicate tab's final
  `console error` query returned zero errors. No unexpected console error, infinite loading state,
  duplicate ID or stuck Saving state remained after reconnect/reload.
- At 390x844 in repository dark mode with reduced motion, `innerWidth`, root `clientWidth` and root
  `scrollWidth` were all exactly 390; root height was 844. Add and all four normal rows remained
  reachable, Add retained focus, its dark focus ring was computed as a 3 px ring, and no special
  controls appeared.
- At a 1280x800 viewport with simulated CSS zoom `2`, the Add control remained visible and focused,
  measured 295.875 by 64 CSS pixels, and the grid remained in its scrollable content area. Root
  client and scroll width both remained 1280, so the zoom check introduced no page-wide horizontal
  overflow.

No MCP browser, `npx`, temporary test/config, headed browser, dashboard, debug/UI mode, or timing
sleep was used.

## Boundary and cleanup

- Exact product/test commit: `6276108f4ebae4e63a23cbf5d532b8843e9f0a98`
  (`feat: add ordinary empty transaction rows`).
- Exact review range:
  `415ea080b3b19191fd71601742056a619b4a3080..6276108f4ebae4e63a23cbf5d532b8843e9f0a98`.
- The range contains exactly 15 authorized product/test paths, 626 insertions and 679 deletions. Its
  only deletion is the obsolete `AddTransactionRow.tsx`.
- The index is empty. After the commit, the working tree contains only root-owned unstaged
  `HANDOFF.md`/`PROGRESS.md` and this sole untracked worker evidence directory.
- CLI browser `p13-impl-01` was closed; CLI session data was deleted; `playwright-cli list` returned
  `(no browsers)`. Only this session's generated CLI files and the generated test-results marker
  were moved to trash; pre-existing CLI artifacts were preserved.
- The task-owned dev server was stopped and generated `next-env.d.ts` was restored byte-for-byte. No
  task-owned Next/Playwright process remains.
- Frozen boundary after all implementation, automation, manual testing and cleanup:
    - `specs/human-scratch.md`: SHA-256
      `aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`, 350 lines / 24,247 bytes.
    - immutable FS-001 source: SHA-256
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
    - `SCOPE.json`: SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450
      lines / 27,382 bytes.
- There is no unresolved implementation question or `Q-*` proposal. This artifact makes no
  independent-review PASS claim; the exact immutable range and this assigned evidence are ready for
  reviewer inspection.
