# P22 revision 01 — implementation-01 (UR-001 add transaction focuses the description)

**Implementer:** `p22-implementer-01` (fresh context) · **Base HEAD at start:** `20b7475` (root
ledger commit) · **Commits:** `e53a7a4`, `20ee61d`, `2276b90`

## Scope / charter

Implement `UR-001` exactly as its frozen source requires
(`specs/009-user-reported-refinements/spec.md` lines 12-33): creating a transaction must no longer
change the selection set, and must instead focus the new row's description input once the row is
rendered. Filters reset, page extension and scroll-into-view are retained. The focus intent is
consumed exactly once then cleared. The grid is virtualized, so focus must occur only when the row
is actually mounted.

No ledger, marker, `SCOPE.json`, frozen spec, `FINAL-AUDIT.md` or `reviews/**` file was written.

## What changed

### Selection is no longer touched by creation

`handleAddTransaction` (`src/app/(app)/transactions/page.tsx`) previously ended with
`setSelectedIds(new Set([transactionId]))`. That line is removed. Selection means "target for bulk
operations"; a newly created empty row is an edit target, not a bulk-operation target, and replacing
the selection silently discarded an in-progress multi-row selection.

### The existing consume-once reveal channel was extended, not duplicated

Rather than adding a parallel mechanism, the nullable `transactionIdToReveal: string | null` became
a `TransactionRevealIntent` in a new pure module
`src/components/features/transactions/transaction-reveal-intent.ts`, carrying `scrollPending` and
`focusDescriptionPending`. Each step retires independently and the intent becomes `null` once both
have landed, so a landed step cannot re-assert on a later render. Total and side-effect-free; every
intent is keyed by a stable transaction id, never a row index.

The deep-link path is deliberately unchanged — see the confirmation section below.

### Virtualization

`TransactionTable`'s `rangeExtractor` now pins BOTH the currently focused row and the focus-target
row into the virtual range. Unmounting the former loses the caret; unmounting the latter means the
focus request never lands. Focus itself is applied in an effect in `InlineEditableDescriptionAlias`
that runs only when the input ref is non-null, i.e. only when the row is genuinely mounted. No
sleeps, no retries, no polling — the P21 audit fails on those.

## Deep-link `?transaction=` selection behaviour is RETAINED

Required confirmation. `UR-001` scopes only the Add-transaction path. The People page "View
transaction" deep link is untouched:

- `revealExistingTransaction()` constructs
  `{ scrollPending: true, focusDescriptionPending: false }`, so the deep link scrolls and does NOT
  move focus.
- `setSelectedIds(new Set([requestedTransactionId]))` on that path survives verbatim at
  `page.tsx:274`; only the Add-path `setSelectedIds` was removed.

Verified by grep against the tree rather than asserted from the code reading:

```
$ grep -n 'setSelectedIds(new Set(\[requestedTransactionId\]))' page.tsx
274:        setSelectedIds(new Set([requestedTransactionId]));   # deep link: RETAINED

$ grep -c 'setSelectedIds(new Set(\[transactionId\]))' page.tsx
0                                                                # Add path: REMOVED
$ git show 20b7475:.../page.tsx | grep -c 'setSelectedIds(new Set(\[transactionId\]))'
1                                                                # ...and present on base
```

Confirmed empirically as well, which is stronger than either: `people-settlement.spec.ts` already
owns "the deep-linked row lands selected and revealed, and can then be deselected", whose helper
`openSourceTransaction` asserts
`expect(rowById(page, transactionId)).toHaveAttribute("aria-selected", "true")` immediately after
`goto("/transactions?transaction=...")`. That test was NOT modified by this package and passes in
every campaign run below. Had the deep link lost its selection, it would fail.

## E2E migration — all 7 spec files and 3 focus assertions

Seven spec files located the newly created row via `getByRole("row", { selected: true })`, which
encoded the behaviour `UR-001` removes. They now use a new helper `addEmptyTransaction(page)`
(`tests/e2e/helpers/settlement.ts`), which clicks Add and returns the new row's stable id once its
description holds the caret. That is also a strictly better synchronisation point: focus can only
land after the virtualized row mounts, so no sleep and no retry is needed.

| #   | Spec file                                   | Before                                                                              | After                                                                                                                                                                                         |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `tests/e2e/helpers/settlement.ts`           | `selectedRow(page)` = `getByRole("row", {selected:true})`, used by `addTransaction` | `newlyAddedRow(page)` = `[data-transaction-id]:has([data-testid="description-editable"]:focus)`; `addTransaction` delegates to new `addEmptyTransaction`, then addresses the row by stable id |
| 2   | `tests/e2e/transactions.spec.ts`            | `createTestTransaction` waited for one selected row; 6 sites total                  | `addEmptyTransaction` + stable-id locators                                                                                                                                                    |
| 3   | `tests/e2e/description-aliases.spec.ts:271` | `getByRole("row",{selected:true})` after Add                                        | `addEmptyTransaction` + `[data-transaction-id=...]`                                                                                                                                           |
| 4   | `tests/e2e/import.spec.ts:806`              | same                                                                                | same                                                                                                                                                                                          |
| 5   | `tests/e2e/import.spec.ts:983`              | same                                                                                | same                                                                                                                                                                                          |
| 6   | `tests/e2e/people-settlement.spec.ts:500`   | `selectedRow(page)`                                                                 | `rowById(page, await addEmptyTransaction(page))`                                                                                                                                              |
| 7   | `tests/e2e/tab-duplication.spec.ts:150`     | `getByRole("row",{selected:true})`                                                  | `addEmptyTransaction` + stable-id locator                                                                                                                                                     |

Three assertions asserted the Add button retained focus after a click. All three are replaced by
STRONGER claims — not-selected AND description-focused — rather than deleted:

| Site                       | Before                                  | After                                                                                                                           |
| -------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `transactions.spec.ts:194` | `await expect(addButton).toBeFocused()` | `await expect(firstAddedRow.getByTestId("description-editable")).toBeFocused()` plus `expect(checkbox).not.toBeChecked()`       |
| `transactions.spec.ts:274` | `await expect(addButton).toBeFocused()` | `await expect(addedRow.getByTestId("description-editable")).toBeFocused()` plus `expect(toolbar).not.toContainText("selected")` |
| `transactions.spec.ts:410` | `await expect(addButton).toBeFocused()` | `await expect(exactRow.getByTestId("description-editable")).toBeFocused()` plus `expect(toolbar).not.toContainText("selected")` |

Where a test previously asserted `"1 selected"`, it now asserts `not.toContainText("selected")` plus
focus — the stronger claim. **No assertion was weakened or deleted.** `presence.spec.ts` was NOT
modified at all.

## Defect found and fixed: creating a row published a FALSE editing presence

The most important finding of this package, and it was invisible to every static gate.

**Symptom.** Under the first implementation, a peer saw an `editing: true` presence indicator on a
row the creator had merely created and never touched. Measured directly, owner clicks Add once and
touches nothing else:

| Tree                 | Peer sees present rows | Peer sees `editing` on created row |
| -------------------- | ---------------------- | ---------------------------------- |
| base `20b7475`       | `[]`                   | `false`                            |
| first implementation | `["c919b1e0-…"]`       | **`true`**                         |

That is a false signal in a security-relevant channel (P05 / HS-003): a collaborator is told someone
is editing a transaction they have not looked at. This is the same category as the M-1 false-claim
defect that previously failed a P21 audit.

**Cause.** `input.focus()` synchronously fires the delegated `handleRowFocus`
(`TransactionRow.tsx`), which calls `onFieldFocus(marker)` → `handleTransactionFieldFocus` →
`setPresenceState({transactionId, field, editing: true})`. Before `UR-001` nothing ever focused a
description programmatically, so this path could not be reached from Add.

**Fix** (`2276b90`). `handleRowFocus` returns before reporting field focus when the focus is the one
the reveal intent applied. Creating a row therefore reports nothing at all, exactly as it did before
Add moved focus.

Reporting the programmatic focus as merely _viewing_ was tried first and is wrong twice over: it is
equally untrue, and it leaves the session's published state already naming the row, so the user's
first genuine focus is deduplicated by `isSamePresenceState` in `setState` and never reaches peers.
That variant was measured failing: peer saw `[]` where the spec expected the focused row.

Constraints honoured: no `stopPropagation` and no interference with the delegated listener's event
flow (an earlier probe using `stopPropagation` broke delegation and cost
`transactions.spec.ts:407`); suppression scoped to the single programmatic focus; no `as`, `any` or
`!`; `presence.spec.ts`, `use-vault-presence.ts` and `presence.ts` untouched.

**Regression guard.** `tests/e2e/transactions.spec.ts` — "creating a row tells peers nothing until
the user actually edits it" asserts BOTH halves: creation publishes no presence, and a subsequent
real gesture into the same input publishes editing. Verified to FAIL with the fix removed and PASS
with it restored, so it guards the semantic rather than the symptom.

## Investigation record — claims made, retracted and corrected

Recorded in full because two of my intermediate claims were wrong and a reviewer should see the
correction rather than only the conclusion.

1. **RETRACTED: "the regression is one line, `input.focus()`."** A single bisect showed presence
   passing with only `input.focus()` disabled, and I asserted the single-line conclusion too firmly.
   It was too narrow: with the MEMBER seeding every row so the owner never ran the focus effect,
   presence still failed in both directions (`X3b dir1 -> []`, `X3b dir2 -> []`) while base passed
   the identical probe (`X3c dir1 -> ["db6aae42-…"]`, `X3c dir2 -> ["4115d471-…"]`). The focus call
   is necessary to reach the defect but was not a complete account of it.

2. **DISPROVED: the `vaultKey` / `presenceKey` identity-churn hypothesis.** Instrumenting the
   connect effect in `use-vault-presence.ts` showed it running exactly 3 times and then settling,
   identically in passing and failing scenarios:

    ```
    run 1 {"vaultIdChanged":"first","hashChanged":"first","keyIdentityChanged":"first","keyIsNull":true}
    run 2 {"vaultIdChanged":false,"hashChanged":false,"keyIdentityChanged":false,"keyIsNull":true}
    run 3 {"vaultIdChanged":false,"hashChanged":false,"keyIdentityChanged":true,"keyIsNull":false}
    ```

    `presenceKey` identity changes only on the run where the key first arrives non-null. The
    presence channel is NOT torn down. The `vaultKey` `useState<Uint8Array>` identity chain is
    therefore not implicated by this evidence.

3. **CORRECTED: socket-churn misattribution.** I reported `OPEN/OPEN/CLOSE/CLOSE/OPEN/OPEN` realtime
   socket churn as evidence of a remount. It is normal `createNewIdentity` and vault-share
   navigation occurring BEFORE the adds. I read the socket log without correlating it to a timeline.
   There is no remount.

4. **RETRACTED: "`row.focus()` is a no-op on a focused input."** I claimed the browser would not
   move focus from a focused `<input>` to a container `div`, and inferred that `focusRow` therefore
   never moved focus. Both parts are wrong. The row carries `tabIndex={0}`
   (`TransactionRow.tsx:287`), and a probe showed `activeElement` moving from
   `INPUT[description-editable]` to `DIV[transaction-row]`, with `focusRow` PASSING rather than
   timing out. A further detail refutes the same story independently: `ids` sort newest-first, so
   `ids[0]` IS the last-added row — the two rows in my account were the same row. The residual
   question of why the peer saw `[]` in that intermediate state is recorded as Q-P22-01-02 above,
   deliberately as observation plus a labelled inference rather than as a mechanism.

**Standard applied to this section.** Two mechanism claims — items 1 and 4 — were asserted before
they were established and had to be withdrawn. Everything above distinguishes what was OBSERVED
(probe output, quoted verbatim) from what was INFERRED, and no inference in this document is stated
as a finding. The fix that shipped depends on none of the retracted claims: it removes a publish
that should never have occurred, which is verifiable directly from the before/after peer
observations rather than from any theory of the failure.

## Self-caught test bug: DOM order is not creation order

Found by inspection before it ever ran. The new selection-preservation E2E asserted
`readSelectedRowIds(page)` equalled `[existingIds[0], existingIds[2]]` in CREATION order.
`compareTransactionOrder` (`src/lib/crdt/queries.ts:108-126`) sorts by date descending then
`creationInstant` DESCENDING, so rows render newest-first and `readSelectedRowIds` returns DOM
order. The assertion would have failed. Both sides are now sorted and compared as a set. Recorded
because the same newest-first ordering also invalidated an intermediate diagnosis: `ids[0]` IS the
last-added row, not a different one.

## Second test-only bug fixed: obsolete deselect click (`20ee61d`)

The first campaign run gave 32 failed / 133 passed. 30 were one helper bug, not a product defect:
`createTestTransaction` clicked the new row's checkbox to CLEAR the selection Add used to apply.
With Add no longer selecting, that click SELECTED the row, and the next line
`expect(row).toHaveAttribute("aria-selected", "false")` failed. The click is removed and the
assertion KEPT, so the invariant stays guarded for every caller. That campaign was voided and
restarted from run 1 because the tree changed mid-campaign.

## Q-proposal — programmatic focus deliberately publishes no presence

Recorded so a future reader knows this was a considered decision, not an oversight.

**Q-P22-01-01.** `UR-001` introduces the app's first programmatic caret placement. The decision
taken here is that a focus the app performs on the user's behalf publishes NO presence, because
presence answers "is a person working on this row" and must describe a person rather than a render.
The alternative — publishing a viewing-only state — was implemented, measured and rejected: it is
equally untrue, and it suppresses the user's first genuine focus via `setState` deduplication. If a
future requirement wants "someone just created this row" visible to peers, that needs a distinct
presence kind rather than reusing focus/editing.

## Q-proposal — latent presence drop under rapid successive publishes (NOT fixed here)

**Q-P22-01-02.** Routed out of `UR-001` by root for the P21 audit as a P05/HS-003 finding. Recorded
as OBSERVATION plus an explicitly-labelled inference, because the mechanism is NOT proven.

**What was observed.** On `20ee61d` — i.e. BEFORE the spurious publish was suppressed — with three
Adds in quick succession followed by `focusRow(ids[0])`:

```
PUBLISH {"incoming":{"transactionId":"60c48aee…","field":"description","editing":true},"deduped":false,"disposed":false}
PUBLISH {"incoming":{"editing":false},"deduped":false,"disposed":false}
PUBLISH {"incoming":{"transactionId":"36060262…","field":"description","editing":true},"deduped":false,"disposed":false}
PUBLISH {"incoming":{"editing":false},"deduped":false,"disposed":false}
PUBLISH {"incoming":{"transactionId":"48cb56fe…","field":"description","editing":true},"deduped":false,"disposed":false}
--- focusRow(ids[0]) ---
PUBLISH {"incoming":{"transactionId":"48cb56fe…","editing":false},"deduped":false,"disposed":false}

activeElement AFTER seeding: {"tag":"INPUT","testid":"description-editable","row":"48cb56fe…"}
focusRow threw: NO - focusRow PASSED
activeElement AFTER focusRow: {"tag":"DIV","testid":"transaction-row","row":"48cb56fe…"}
member present rows: []
expected by spec:    ["48cb56fe…"]
```

So: the correct `transactionId` was published, `deduped:false` so it was genuinely sent,
`disposed:false` so the manager was live, focus really did move, and the peer still showed `[]`.
Note `ids` sort newest-first, so `ids[0]` IS the last-added row `48cb56fe…` — the published row and
the expected row are the same row.

**What is NOT established.** Why the peer did not render it. The render path is not obviously at
fault: `buildTransactionPresence` (`presence-protocol.ts:367-378`) buckets on `transactionId`
regardless of `editing`, and `TransactionRow.tsx:213` renders on
`editingByOthers[0] ?? focusedByOthers[0]`, so a viewing-only state should render. A lost-update
race under rapid successive writes to the same `transactionId` is a plausible INFERENCE, not a
finding. It is deliberately not asserted here.

**Why it does not block `UR-001`.** The drop is downstream of the spurious publishes and did not
reproduce once they were removed: with the accepted fix, `presence.spec.ts` passes 3/3 unmodified
and the full suite is green across the campaign below. No further investigation was spent on this
package's time.

## Environment — E2E required worktree isolation

`pnpm test:e2e` could not run in the main checkout. Playwright's `webServer` uses
`reuseExistingServer: false`, and Next 16 acquires a dev lock at `path.join(distDir, 'lock')`
(`node_modules/next/dist/server/lib/router-utils/setup-dev-bundler.js:160`) — keyed on the project's
distDir, NOT the port. A dev server already running in this directory therefore blocks the suite
even though port 3000 was free:

```
[WebServer] ⨯ Another next dev server is already running.
[WebServer] - Local:        http://localhost:3001
Error: Process from config.webServer was not able to start. Exit code: 1
```

Resolved by root creating a git worktree at `/tmp/mf-e2e-p22` with its own distDir and therefore its
own lock. The other dev server was left untouched throughout. `.next/dev/lock`,
`playwright.config.ts` and `next.config.ts` were NOT modified.

## Validation — FULL suite, `--retries=0`, per-run digest

Command per run: `CI=true pnpm test:e2e --retries=0 --workers=4` in `/tmp/mf-e2e-p22`, 166 tests /
22 files. Digest column is `md5sum <7 load-bearing product+test files> | md5sum`, verified before
every run to prove the tree did not drift mid-campaign.

The digest `caf65ec5a9c37dc0bce9328dd57797c5` was verified IDENTICAL immediately before every one of
the six runs, and re-verified unchanged after run 6. The campaign is therefore valid evidence for
one unchanging tree — no mid-campaign drift, no restart required.

| Run | Digest      | Result                  | Duration |
| --- | ----------- | ----------------------- | -------- |
| 1   | `caf65ec5…` | 1 failed / 165 passed † | 4.0m     |
| 2   | `caf65ec5…` | **166 passed**          | 3.9m     |
| 3   | `caf65ec5…` | **166 passed**          | 4.0m     |
| 4   | `caf65ec5…` | **166 passed**          | 3.9m     |
| 5   | `caf65ec5…` | **166 passed**          | 3.9m     |
| 6   | `caf65ec5…` | **166 passed**          | 3.8m     |

**5 of 6 runs fully green. Zero failures in any test this package touched, across all six runs.**
`presence.spec.ts` — unmodified by this package — passed 6/6, as did every migrated spec and both
new guards.

† **Run 1, `passkey.spec.ts:148`** ("a passkey added to a recovery identity unlocks the SAME
identity"), classified from exact error text before reporting, per the load-flake discipline:

```
Test timeout of 30000ms exceeded.
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('unlock-button')
    - locator resolved to <button disabled … data-testid="unlock-button" …>
    - attempting click action
      48 × waiting for element to be visible, enabled and stable
         - element is not enabled
```

**Pre-existing, not introduced here.** `evidence/P20B/implementation-05.md:74-80` records the
identical signature — `locator.click` 30s timeout on `getByTestId("unlock-button")` amid
`tRPC … Request authentication failed` server logs — as an _incidental_ failure at 1/8 runs, and
states explicitly that it is a "different subsystem (WebAuthn recovery-unlock + sync auth),
different failure mode (action-click timeout …). Not the virtualized-count class." The same
signature appears in three further P20B artifacts. It is in WebAuthn recovery-unlock, touches
nothing `UR-001` changed, and passed in runs 2-6 here (1/6). Classified as the documented
pre-existing flake class, NOT a product defect from this package.

Load context: the human principal was actively using the application against a separate dev server
throughout the campaign, so these runs were executed under genuine concurrent load — the condition
this repo's documented load-dependent flake class feeds on.

## Static gates

- `pnpm typecheck` — **PASS**, clean.
- `pnpm lint` — **PASS**, 0 errors. One PRE-EXISTING `react-hooks/incompatible-library` **warning**
  at `src/components/features/transactions/TransactionTable.tsx:422` on the `useVirtualizer(...)`
  call. Verified present verbatim on base `20b7475` (`git show 20b7475:…TransactionTable.tsx` line
  401). Not introduced here, not an error, correctly NOT fixed.
- `pnpm format:check` — my changed files are clean under `oxfmt --check`. The bare repo-wide command
  fails on ~15 PRE-EXISTING frozen `specs/**` markdown files owned by root, which I did not touch.
  Standing condition, correctly NOT fixed.
- `pnpm test` (unit) — **PASS**: 112 files, 2100 passed / 2 skipped, up from 111 / 2091 on base. The
  9 new tests are `tests/unit/transactions/add-transaction-focus.test.tsx`.
- `pnpm build` — **PASS**.

### The static gates did NOT catch either presence finding

This is the strongest single argument in this package, so it is stated plainly rather than buried.

`e53a7a4` was **five-checks green** — typecheck, lint, format, **2100 unit tests**, and build all
passed on the exact commit that shipped a false `editing: true` presence signal to every peer. Both
findings in this document — the false-editing-presence defect AND the latent rapid-transition drop
recorded as Q-P22-01-02 — were invisible to all five, and surfaced only under full-suite E2E driving
two browser contexts and two identities against a live Supabase realtime stack.

The reason is structural rather than a gap in the unit suite: `tests/unit/` has no coverage of the
presence channel over a real socket, and cannot easily have it, because the defect is a
cross-session observation. Nothing a single process asserts about its own state detects "the OTHER
participant is being told something untrue".

The conclusion for future packages: **a green `pnpm test` is evidence that pure logic is sound and
nothing more.** For any change touching focus, selection, presence, sync, or anything a second tab
or second identity could observe, full-suite E2E is the only gate that counts — and reporting "five
of six checks pass" on such a change overstates the assurance actually held.

## Provenance

- Base at start: `20b7475`.
- `e53a7a4` — feat: focus new transaction description instead of selecting the row. 13 files, +519 /
  -105. Committed on `main` with E2E unvalidated, under explicit root authorisation, because the
  work was otherwise trapped in an uncommitted tree that a worktree could not see.
- `20ee61d` — fix: drop obsolete deselect click from the E2E create helper (worktree).
- `2276b90` — fix: stop a programmatic caret placement from advertising presence (worktree).
- `20ee61d` and `2276b90` were made in `/tmp/mf-e2e-p22` and require reconciliation onto `main` by
  root.
- Untracked `.claude/agent-memory/` and `evidence/P08/implementation-01.md` were left untouched, as
  was the generated `next-env.d.ts`.

## Secret-safety

No vault master key, seed phrase, recovery material, `crypto_box` secret, `SUPABASE_JWT_SECRET`
value, presence key, invite fragment or bearer secret, or vault plaintext appears in the code
changes, tests, probes, logs or this evidence. Presence instrumentation used during investigation
logged only transaction ids, boolean `editing` flags and field NAMES — never field values, never key
material — and every instrumentation patch was reverted and verified by md5 before committing. Tests
use synthetic vaults created per run.
