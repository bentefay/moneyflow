# P13 Independent Review — Revision 01

## Review identity and verdict

- Package / requirement / revision: `P13` / `HS-001` / `01`.
- Literal reviewed range:
  `415ea080b3b19191fd71601742056a619b4a3080..6276108f4ebae4e63a23cbf5d532b8843e9f0a98`.
- Frozen implementation evidence: `evidence/P13/implementation-01.md`, SHA-256
  `910135f64546a22d41218df0f7ce3c00c5b7b5434604108e057e51770a22c9f9`, 227 lines / 15,227 bytes.
- The range is one commit, exactly 15 product/test paths, 626 insertions and 679 deletions. Its only
  deleted path is the obsolete `AddTransactionRow.tsx`. `git diff --check BASE..HEAD` passes.
- **Verdict: FAIL.** The ordinary empty-row architecture, defaults, history behavior, reload,
  offline convergence and duplicate-tab behavior are sound. However, Add does not account for the
  active transaction filters. A filter that excludes the legal defaults leaves the newly persisted
  and selected transaction invisible, so the required immediate ordinary row is absent and the UI
  reports a selected transaction the operator cannot reach. HS-001 must remain unchecked.

## Finding

### F-01 — High / blocking: active filters hide the new row while it remains selected

The page filters every transaction before constructing the table rows
(`src/app/(app)/transactions/page.tsx:164-205`). Selection is intersected only with all active
transaction IDs, not with the filtered/displayed IDs (`page.tsx:132-142`). The new Add handler
persists a default transaction and selects its ID, but it neither clears/adjusts the filters nor
otherwise guarantees the row is included in the displayed set (`page.tsx:267-300`).

This produces a deterministic user-visible contradiction:

1. On a populated Transactions page, enter search text that matches no row and apply it.
2. The table correctly shows zero rows and its empty state.
3. Activate `Add transaction`.
4. The transaction is persisted, but the table still shows zero rows and the empty state. The
   toolbar reads `0 transactions (filtered) · 1 selected`, and Bulk Edit exposes `Edit 1` for an
   invisible transaction.
5. Clear the search. The new ordinary empty row appears selected, proving that Add succeeded but
   failed to reveal the immediate row.

The independent installed-CLI reproduction used `definitely-no-match-p13`; the row count stayed zero
after Add, then clearing search revealed the fifth row with a distinct generated ID. The same
failure applies to any account, tag, person, status, date, duplicates-only or search filter that
excludes the new row's defaults. The removed special Add row was outside this filtered data path, so
this is a direct regression at the replacement boundary. None of the checked-in changed E2E cases
activates an excluding filter before Add.

Required closure: make every Add activation reveal its newly created normal row predictably. A valid
implementation may atomically clear the active filters before/with creation, or may define a narrow
explicit visibility rule for the just-created normal row, but it must not reintroduce a
compatibility form or special entry mode. Selection/count state must never target an invisible row.
Add behavior-led E2E coverage for every filter class or a justified representative matrix, including
active excluding filter → Add → visible normal row and coherent filter/count/selection state, plus
reload and Undo/Redo of that journey.

## Other acceptance, safety and compatibility observations

- Each Add invocation generates a UUID and immediately calls the existing transaction insertion
  boundary with origin `user:add`. The transaction uses today's date, empty description/notes, empty
  tags/allocations, zero minor units, the first active account, the default status, no import
  metadata, no deletion marker and a monotonic local creation instant.
- The special add-row component, type modes and exports are removed. Static search found no
  production reference to `AddTransactionRow`, `NewTransactionData`, `TransactionRowMode`,
  `isAdding` or the removed submit/cancel selectors. The E2E references that remain are explicit
  zero-count absence assertions.
- New transactions use the same row, checkbox, selection, editors, delete action, focus grid,
  virtualization and alias route as persisted rows. The description editor still exercises the
  HS-004 alias mutation path rather than adding a plain-text compatibility write.
- Rapid Add clicks receive distinct IDs and creation instants. One Undo removes only the latest Add
  operation; Redo restores the same logical ID and selection. A pending description blur followed by
  Add also remained a separate history operation: Undo removed the Add while retaining the
  description edit.
- The table's ID-keyed selection and virtual-focus pinning preserve logical identity across the
  normal sorted data path. Undo intentionally drops a deleted ID from derived active selection, and
  Redo restores the same selected ID.
- The changed `useKeyboardNavigation` helper is not the production table's current navigation
  implementation; the table uses `useGridCellNavigation`. Native Tab/Shift+Tab behavior and the
  ordinary grid's arrow navigation nevertheless passed both focused tests and installed-CLI checks.
- No arbitrary timing sleeps, retry masks, plaintext financial payload, secret exposure, auth bypass
  or compatibility dual-write was found in the exact range.

## Independent automation

| Gate                                                                                             | Independent result                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused Vitest profile: transaction operations/mutations, keyboard navigation and virtualization | PASS in three clean processes; 4 files / 76 tests each (990 ms, 997 ms and 1.00 s).                                                                                                                                                                                                       |
| `pnpm test`                                                                                      | PASS; 60 files / 1,286 tests in 6.32 s.                                                                                                                                                                                                                                                   |
| `pnpm typecheck`                                                                                 | PASS.                                                                                                                                                                                                                                                                                     |
| `pnpm lint`                                                                                      | PASS exit 0; 0 errors / exactly 10 inherited warnings. Changed-path warnings are unused type imports in query/mutation tests; no P13 lint error was introduced.                                                                                                                           |
| `pnpm build`                                                                                     | PASS; Next 16.2.10 compiled, generated types and built all 17 routes.                                                                                                                                                                                                                     |
| Changed-path `oxfmt --check`                                                                     | PASS; all 14 extant changed paths. The fifteenth path is deleted.                                                                                                                                                                                                                         |
| Repository `pnpm format:check`                                                                   | FAIL only on the 13 inherited/root-owned/frozen Markdown files: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, P12 implementation revisions 03–06, P12 review revisions 05–06 and `specs/human-scratch.md`. No P13 product/test path failed. |
| `git diff --check BASE..HEAD`                                                                    | PASS.                                                                                                                                                                                                                                                                                     |
| Affected no-retry E2E matrix, 21 journeys with `--repeat-each=3 --workers=1`                     | PASS; 63/63 in 4.2 minutes.                                                                                                                                                                                                                                                               |
| Full no-retry E2E, `--workers=1`                                                                 | PASS; 90/90 in 5.8 minutes.                                                                                                                                                                                                                                                               |

The green automation is reported exactly but does not cover F-01's deterministic active-filter
journey. Read-only command verification was independently delegated as required by the reviewer
authority; the reviewer independently inspected every path in the exact range, ran the affected and
full browser suites, and performed the installed-CLI manual charter.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p13-review-01` against the correctly keyed local server. No MCP, `npx`, headed/UI/debug/pause
  mode, temporary test/config or arbitrary wait was used.
- Created a fresh authenticated state while all twelve recovery words remained masked. The phrase
  was never revealed, read, copied, entered or printed.
- Three rapid pointer Add activations produced three distinct IDs. Add remained focused, exactly the
  newest row was selected, and all three rows exposed ordinary checkboxes, current date, `Default`
  account, `For Review` status and `0.00` amount. No special new-description, submit or cancel
  control existed.
- ArrowDown from the first Description focused the second row's Description. Shift+Tab moved to that
  row's Date and Tab returned to Description. `P13 Manual Alias` plus Enter persisted through the
  alias path; `Discarded Draft` plus Escape restored the prior empty value.
- Filled `P13 blur boundary` without Enter, then activated Add. One Undo removed only the new row
  and retained `P13 blur boundary`; Redo restored the exact new ID. Ordinary two-step pointer
  deletion removed that ID, and Undo restored it.
- The blocking filter reproduction above left `0 transactions (filtered) · 1 selected` and `Edit 1`
  visible while the table remained empty. Clearing search revealed the persisted selected ordinary
  row.
- Reload preserved the exact ordered five IDs and their descriptions. Selection correctly cleared on
  reload. A normally opened authenticated duplicate tab contained the same five IDs and showed two
  online presence entries.
- With the original context offline, Add immediately created a sixth ordinary row and showed
  `Saving`. Reconnection reached `Saved`; both tabs converged to the same exact ordered six IDs.
  Final console error inspection returned zero in both tabs, and the final vault/sync/Realtime
  requests were successful.
- Pointer checkbox selection produced an ordinary selected row and `Edit 1`. At 390 × 844 with dark
  preference and reduced motion, document/client/scroll widths were all 390; Add and all six rows
  remained represented and no special controls appeared. At 1280 × 800 with CSS zoom 2, the page
  retained 1280 px client/scroll width and Add plus the grid remained accessible.
- Keyboard traversal exposed a 3 px focus ring on Add. Its text contrast was approximately 4.64:1
  against the effective background, while the inherited generic Button ring computed at
  approximately 1.54:1 against that background. The Button component and theme were outside the P13
  range, so this is recorded as an inherited cross-cutting accessibility limitation rather than a
  second P13 regression.
- The CLI session was closed and data deletion reported no residual session data. Root stopped the
  task-owned server and removed only review-generated browser/test/build residue while preserving
  pre-existing artifacts.

## Boundary, frozen sources and questions

- Frozen human scratch remains SHA-256
  `aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`, 350 lines / 24,247 bytes, with
  HS-001 unchecked.
- Canonical FS-001 source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Before this review artifact, the only persistent worktree entries were root-owned modified
  `HANDOFF.md` and `PROGRESS.md` plus frozen untracked `implementation-01.md`; the index was empty.
  This review is the sole reviewer-created repository artifact. No product, test, source marker,
  ledger, evidence, configuration or prior-review file was edited.
- No `Q-*` proposal is needed. The requirement that Add immediately create a visible ordinary empty
  row and keep selection coherent is settled by HS-001; F-01 is an implementation defect, not a
  product ambiguity.

## Single final verdict

**FAIL.** P13 revision 01 correctly replaces the special add form with persistent normal rows and
passes its existing automation and ordinary manual journeys, but an active excluding filter hides
the newly created selected transaction. Root must preserve this immutable review, keep HS-001
unchecked and route F-01 into P13 revision 02.
