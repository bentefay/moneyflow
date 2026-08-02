# P31 / P32 — independent review, revision 01

**Verdict: PASS** — for both **UR-010** (P31) and **UR-011** (P32).

- **Reviewer:** `p31-reviewer-01` (distinct from `p31-implementer-01`; no product code edited)
- **Requirements:** UR-010 (`specs/012-transaction-selection/spec.md:11-29`), UR-011 (`:31-55`).
  Frozen source read only; never edited, no markers added.
- **BASE:** `054f77e057b4af9921afc81d1459f5a00d92193e`
- **Reviewed HEAD:** `0e27694e68cb57b4dc88f7ccf47eae00b97cfa88` — **not the dispatched `362287c`.**
  See F-1: the tree moved under this review and every measurement below was re-taken at `0e27694`.
- **Evidence read:** `evidence/P31/implementation-01.md`, `evidence/P32/implementation-01.md`
- **Non-blocking findings:** F-1 (tree drift, handled), F-2 (toast stacking, advisory), F-3
  (`matchingRowIds` optional prop, carried risk). **No blocking finding.**

Every statement below is labelled **MEASURED** (I ran it and read the output) or **INFERRED** (read
from source without executing that specific path).

---

## How this review was conducted, and one constraint on it

**MEASURED.** The dispatch forbade taking port :3000, so **no E2E run was performed.** Static review
plus unit/integration only. The E2E results quoted here are the implementer's, assessed as evidence
rather than reproduced — see "Campaign assessment" for how far I think they carry.

**MEASURED.** All mutation testing was done in a **private sandbox**, never in the shared checkout:
copies of the committed sources were extracted with `git show <HEAD>:<path>` into `.p31rev/` with
imports rewritten, driven by a scratch vitest config. No shared product or test file was modified at
any point by me. Both scratch paths were deleted; `git status --porcelain -- src tests` is empty at
the end of this review, and the full suite was re-run green afterwards.

---

## F-1 — The reviewed tree moved mid-review, and the moved file is P31's own

**MEASURED. Non-blocking; recorded because it invalidates a naive reading of the dispatch.**

The dispatch pinned `362287c` and told me to verify ancestry "before reading a line of diff". I did:
`git merge-base --is-ancestor 362287c HEAD` passed, and `git rev-parse HEAD` was `362287c`.

At **20:44:27** — while I was reading — `src/components/features/transactions/table-selection.ts`
went dirty in the shared checkout with the identity short-circuit removed from
`reconcileToMatchingRows`. **My first unit run, at 20:45:00, therefore landed on a mutated working
tree rather than the committed one.** I did not restore it (not mine to touch), messaged
`p31-implementer-01`, and moved my own work into an isolated sandbox.

That edit was subsequently **committed**, along with a test change, as part of eight commits that
landed between the dispatch and now:

| Commit                                                                    | Effect on P31/P32 files                                                                         |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `b138894`                                                                 | `table-selection.ts` — removes the `previousMatchingRowIds === nextMatchingRowIds` early return |
| `0398d19`                                                                 | `selection.test.ts` — widens "preserves identity when nothing changed" to both baselines        |
| others (`147c05f`, `2c4ba33`, `078d2b9`, `b6950ca`, `5b0c441`, `0e27694`) | P30 files and control artifacts only — **MEASURED** via `git diff --name-only`                  |

**Consequence, stated plainly: a verdict measured only at `362287c` would not describe HEAD.** I
therefore discarded the first battery and re-ran everything at `0e27694`. Kill counts were identical
across both trees for the eight mutations common to them, and I added a ninth for the newly exposed
code path. **Root must record the reviewed HEAD as `0e27694`, not `362287c`.**

I assessed both commits on their merits rather than treating the drift as disqualifying:

- **`b138894` is correct. MEASURED.** The removed guard compared the two id arrays by reference. The
  _only_ product caller is `page.tsx:285`, which performs exactly that comparison itself
  (`if (matchingIdsAtSelection !== filteredTransactionIds)`) before calling. `grep -rn` over `src`
  confirms no other call site. So the guard could not fire in the product. Its removal is a genuine
  simplification, not a loosening.
- **`0398d19` is a real strengthening. MEASURED.** With the early return gone, the _trailing_
  identity block became the sole thing keeping a same-reference call allocation-free, and
  `reconcileToMatchingRows` is re-exported from `index.ts`, so a future caller can reach it without
  the caller-side comparison. Deleting that trailing block (**M9**) reddens exactly that test. The
  commit's own claim checks out.

---

## UR-010 — shift-click extends deselection symmetrically

### The defect was real, and the stated root cause is the actual one

**MEASURED.** At BASE, `useTableSelection.ts` (`054f77e`, lines ~106-133) the shift branch reads:

```js
for (let i = from; i <= to; i++) {
    newIds.add(filteredIds[i]);      // add, unconditionally — never delete
}
...
setLastSelectedId(id);               // which row, never what was done to it
```

Both halves of the diagnosis hold: the range could only ever add, and `lastSelectedId` carried no
outcome, so the code had no information from which to choose a direction.

### The anchor now carries its action — verified structurally and by mutation

**MEASURED.** `table-selection.ts:232-235` defines `SelectionAnchor = { rowId, outcome }` with
`SelectionOutcome = "selected" | "deselected"`. `useTableSelection.ts:92-116` binds the spanned rows
and the outcome into one value, applies `anchor.outcome` to the whole range, and re-anchors on the
clicked row carrying that same outcome.

### Clause-by-clause

| Frozen clause                                                                            | Status                  | Evidence                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:22-23` range applies the anchor's own outcome                                          | **PASS**                | **MEASURED** — mutation M4 (range forced to always select, i.e. the original bug) kills **5** tests; M5 (anchor always records `"selected"`) kills **4**                                           |
| `:24-25` range covers every row between the ends in the table's current order, inclusive | **PASS**                | **MEASURED** — `findRowRange`/`rowIdsInRange` operate on `matchingRowIds` (the filtered, sorted set), not the page. M6 (range clipped to the first 50 ids) kills 2 tests that name a 5,000-row set |
| `:26` rows outside the range keep their state                                            | **PASS**                | **MEASURED** — `setRowsSelected` writes only the named ids; "leaves rows outside the deselected range exactly as they were" dies under M4                                                          |
| `:27` the clicked row becomes the new anchor                                             | **PASS**                | **MEASURED** — "carries a deselecting anchor across successive shift-clicks" asserts the anchor value _and_ that a second shift-click continues deselecting; dies under M4 and M5                  |
| `:28` no anchor ⇒ ordinary single toggle                                                 | **PASS**                | **INFERRED** from `rangeGesture` returning `null` when `anchor == null`; three tests cover no-anchor, retired-anchor and stale-anchor                                                              |
| `:29` keyboard follows the same rule                                                     | **PASS, with a caveat** | See below                                                                                                                                                                                          |

### The blindness test, applied

**MEASURED.** This is where the package earns the verdict. The four pre-existing range tests assert
only "the range is selected" and **pass against the original defect** — the implementer says so, and
M4 confirms it: under M4 those four stay green while five _new_ assertions go red. The new tests
deliberately begin ranges by _deselecting_, and assert flanking rows are untouched, which is what
separates "deselected the range" from "cleared the selection". Both directions are pinned.

### `:29` keyboard — I agree with the implementer's deviation, and state its limit

**INFERRED (mechanism) / MEASURED (structure).** The row checkbox is a real `button`
(`CheckboxCell.tsx:70` renders Radix `Checkbox`), and `CheckboxCell.handleClick` reads
`event.shiftKey` off the click event. A browser synthesises a click carrying `shiftKey` from
`Shift+Space` on a focused button, so the keyboard reaches the _same_ `toggleRow`. Adding a separate
keyboard path would duplicate the logic and risk exactly the asymmetry UR-010 is about. **The
deviation is right.**

**T021e does genuinely exercise both directions — MEASURED by reading it.**
`transactions.spec.ts:2157-2184`: step 1 focuses row 0's checkbox, presses `Space`, then focuses row
2 and presses `Shift+Space`, asserting rows 0-2 selected and row 3 **not** selected. Step 2 presses
`Space` on row 0 to _deselect_ it (asserting `aria-selected=false`), then `Shift+Space` on row 1,
asserting rows 0 **and** 1 are `false` while row 2 remains `true`. That final assertion is the
discriminating one: under the original defect the shift-range could only add, so row 1 would read
`true`. It is a real keyboard gesture — `page.keyboard.press`, no synthetic click.

**The caveat, and it is the implementer's own R-1: I could not run it.** Port discipline barred E2E,
and jsdom cannot synthesise a click from keyboard activation, so `:29` rests entirely on the
implementer's reported Chromium result. I accept it — the test is correctly constructed and the
implementer reports it green in four independent runs — but **root should know that no reviewer has
independently executed the only evidence for `spec.md:29`.** If root wants that closed, the cheapest
action is a single `--grep T021e` run once the port frees up. I did not run it rather than take a
port I was told another agent holds.

---

## UR-011 — the header checkbox covers every matching row

### Both narrowings were real, and both are gone

**MEASURED.** At BASE the table derived `filteredIds` from `transactions`, which the page supplied
as `displayedTransactions = filteredTransactions.slice(0, displayCount)` with `PAGE_SIZE = 50`. The
implementer also names a **second** narrowing root did not: the page intersected the selection with
the displayed ids before feeding the bulk handlers. I confirm both are removed — `page.tsx:1326`
passes the full `filteredTransactionIds`, and `collectSelectedTransactions` (`page.tsx:343-347`)
filters `filteredTransactions`, not `displayedTransactions`. All **six** bulk handlers call it
(`grep` shows six call sites at `:776,791,808,825,845,862`).

### Fixtures actually exceed PAGE_SIZE — the point the dispatch flagged

**MEASURED.** `PAGE_SIZE = 50` (`page.tsx:92`). The dispatch is right that a sub-50 fixture is
blind.

- Page-level unit: `TOTAL_TRANSACTIONS = 400`, virtualizer mounts `MOUNTED_ROW_COUNT = 8`.
  Assertions name `tx-0399` and `tx-0060` — both past the 50-row page and never rendered — and
  assert `updatedIds.size === 400`.
- E2E `T021f`: imports **500** rows, asserts fewer than 60 have elements, then `Edit 500` and
  `500 selected`. Under the defect both read 50.
- Hook-level: 5,000 and 100,000-row sets.

**One fixture is under 50: `T021g` uses 3 rows.** That is fine — **INFERRED** — because T021g tests
filter re-derivation, not page-crossing, and the page-level unit covers re-derivation at 400 rows.
Not a finding.

### Clause-by-clause

| Frozen clause                                                            | Status   | Evidence                                                                                                                            |
| ------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `:43-44` selects every matching row incl. unrendered and beyond the page | **PASS** | **MEASURED** — M1 (baseline forced to `"no-rows"`) kills **13** tests                                                               |
| `:45` clearing clears the same set                                       | **PASS** | **MEASURED** — "clears that same set, including the rows never rendered"; page-level clear asserts `statusUpdates` stays empty      |
| `:46-47` header reflects the whole filtered set                          | **PASS** | **MEASURED** — M7 (tri-state never reports `"some"`) kills **6**, including a fast-check property                                   |
| `:48` filter change re-derives the acted-on set                          | **PASS** | **MEASURED** — M2 (`reconcileToMatchingRows` no-op) kills **4**                                                                     |
| `:49-50` bulk actions reach rows never rendered                          | **PASS** | **MEASURED** — page-level test asserts set membership of recorded mutations for `tx-0399`/`tx-0060`, not "the visible rows updated" |
| `:52-55` efficiency                                                      | **PASS** | See next section                                                                                                                    |

### The efficiency clause — I verified the claim rather than accepting it

The dispatch asked me to find the O(matching) operations and confirm they are confined to bulk
actions. **MEASURED**, by reading every exported function and every product call site:

| Operation                          | Cost                                                           | Where                                                                                                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ALL_MATCHING_ROWS_SELECTED`       | **O(1)** — module constant, `exceptions.size === 0` at 100,000 | `table-selection.ts:37`                                                                                                                                                                    |
| `selectedRowCount`                 | **O(1)** — one subtraction                                     | `:63-70`                                                                                                                                                                                   |
| `selectionHeaderState`             | **O(1)** — two integer comparisons                             | `:79-87`                                                                                                                                                                                   |
| `isRowSelected` (per rendered row) | **O(1)** set lookup ⇒ O(window) per render                     | `:43-47`                                                                                                                                                                                   |
| `setRowsSelected`                  | O(rows named), not O(matching)                                 | `:90-105`                                                                                                                                                                                  |
| `selectedRowIdsWithin`             | **O(matching)**                                                | called **only** from `collectSelectedTransactions`, a `useCallback` — **not** a `useMemo` — invoked solely inside the six bulk handlers                                                    |
| `singleSelectedRowId`              | **O(matching)** worst case                                     | `TransactionTable.tsx:342`, on the document keydown path — **but guarded**: it returns early unless the O(1) `selectedRowCount(...) !== 1`, so the scan cannot run under a large selection |
| `reconcileToMatchingRows`          | **O(matching)**                                                | render-path, but only when `filteredTransactionIds` changes _identity_                                                                                                                     |

**The claim holds.** Nothing derives the selection or the header's state by a scan, so the "rendered
× matching" product the clause forbids does not occur. The `singleSelectedRowId` guard is the subtle
one and it is correct — I checked it specifically because an unguarded O(matching) call on every
keydown would have violated `:54-55`.

`reconcileToMatchingRows` on the render path is the one residual (the implementer's R-3).
`filteredTransactions` is memoised on `[transactions, filters, aliasLookup]` (**MEASURED**,
`page.tsx:244-268`), so it runs once per real change, never per render or per click. Correctly
disclosed; not a finding.

### The data-loss defect — both halves verified, including the CRDT case

This is the most important thing in the package, and the dispatch was right to single it out. Under
an `all-matching` baseline, a _widened_ filter would silently acquire rows the user never selected,
and a bulk **delete** would then destroy them.

**MEASURED — both halves:**

- **Rows that stop matching drop out.** M2 kills "drops rows that no longer match, so they cannot
  reach a later bulk action".
- **Rows that only just start matching stay unselected.** M3 (newly-matching branch deleted — the
  implementer's own first-cut defect) kills **3** tests, including the fast-check property
  "re-derives as a true intersection".

**The CRDT peer-insert case: I tested it myself, because no existing test covers it.** **MEASURED.**
The dispatch asked for a peer's insert adding a matching row under a standing "all selected". The
committed tests exercise widening via the _search filter_; none drives a store notification. I wrote
a throwaway probe that selected all 400 rows, then pushed a new matching transaction into the fake
vault and fired the `useSyncExternalStore` listeners — which is how a replicated insert actually
arrives. Result:

```
editLabelMentions:          400      (not 401 — the peer's row did not join)
headerState:                "mixed"  (correctly no longer "all")
peerRowSelectedByBulkAction: false
bulkActionCount:            400
```

**The CRDT case is correct.** The insert changes `filteredTransactions`' identity, reconciliation
runs, and the new row lands in the exception set. A bulk delete would spare it. Probe deleted.

I am **not** raising the absence of a committed peer-insert test as a finding: the behaviour is
correct, and it is covered in substance by the fast-check intersection property, which quantifies
over arbitrary before/after matching sets and therefore includes "a row appears that was not there
before". Recorded as an observation for root's judgement only.

---

## Mutation testing — the full battery

**MEASURED.** Nine mutations, each applied to a sandbox copy, run, then reverted. Baseline before
and after: **34 passed**. The two files were byte-identical to pristine after every mutation
(`diff -q`), and `git status --porcelain -- src tests` was empty at the end.

| #   | Mutation                                                    | Tests killed |
| --- | ----------------------------------------------------------- | ------------ |
| M1  | `ALL_MATCHING_ROWS_SELECTED.baseline` forced to `"no-rows"` | **13**       |
| M2  | `reconcileToMatchingRows` made a no-op                      | **4**        |
| M3  | newly-matching branch removed (the data-loss defect)        | **3**        |
| M4  | range always selects (the original UR-010 bug)              | **5**        |
| M5  | anchor always records `"selected"`                          | **4**        |
| M6  | range clipped to the first 50 matching ids                  | **2**        |
| M7  | header tri-state never reports `"some"`                     | **6**        |
| M8  | `selectedRowCount` ignores exceptions under `all-matching`  | **9**        |
| M9  | trailing identity-preservation block removed                | **1**        |

**No mutation survived.** M1, M4 and M6 reproduce the implementer's reported counts exactly (13, 5,
2), which corroborates that its own blindness table was measured rather than reasoned. M8 is mine
and is the sharpest: it kills all three fast-check properties, which is the correct signature for
breaking the invariant those properties exist to protect.

---

## Campaign assessment — the dispatch asked me to judge it either way

**MEASURED.** The digests verify exactly:

| Tree                   | `transactions.spec.ts` | `table-selection.ts` | `useTableSelection.ts` |
| ---------------------- | ---------------------- | -------------------- | ---------------------- |
| `82eafa1` (run 1)      | `4e4289ecdab7`         | —                    | —                      |
| `07bc3d4` (runs 2-4)   | `ae01e23a7b6d`         | `8602eb31a503`       | `1ac828cc7b54`         |
| `d6567f6` (run 5)      | `ae01e23a7b6d`         | `8602eb31a503`       | `1ac828cc7b54`         |
| `362287c` (dispatched) | `ae01e23a7b6d`         | `8602eb31a503`       | `1ac828cc7b54`         |

**The byte-identical claim for runs 2-5 is true**, and the three files were unchanged through the
dispatched commit. The run-1 spec digest differs, exactly as disclosed.

**My judgement: the evidence supports the UR-010/UR-011 claim, with one qualification.**

- Runs 2-5 are **four** runs on a byte-identical selection surface, `--retries=0`, full suite. All
  five selection journeys pass in all four, with **zero** failures in `transactions.spec.ts`.
  Against the campaign discipline this goal uses — repeated full-suite runs, never isolation — that
  is sufficient for a _stable pass_ on this package's own tests.
- Run 1 is correctly **excluded** from the stability claim: different tree, and its two failures
  were the implementer's own bad locator (`getByPlaceholder(/search transactions/i)` against a page
  that overrides the placeholder), fixed in `07bc3d4`. Self-reported, root-caused, fixed — that is
  the right handling, and it is a good sign that a real browser caught a defect the jsdom test could
  not.
- The four persistent failures are P30's `rule-creation-controls.spec.ts`. **MEASURED** that none of
  P31's commits touches `InlineEditableTags.tsx`. Not a P31/P32 regression.

**The qualification — and it is why I flag it rather than wave it through.** Runs 2-5 do **not**
describe the tree I am passing. Commits `b138894` and `0398d19` changed `table-selection.ts` and
`selection.test.ts` _after_ run 5, so **no E2E run exists for the exact HEAD being reviewed.** I
judge the risk **low**: the product delta is the removal of a provably unreachable branch, and I
re-ran the full unit suite green at `0e27694` (2443 passed, 2 skipped, 126 files) plus all nine
mutations. But it is a real gap, it is the kind of gap this goal has been bitten by before, and
**root should decide whether one confirming full-suite E2E run at `0e27694` is wanted before
integration.** I could not run it myself under the port rule.

---

## F-2 — `LARGE_SELECTION_THRESHOLD`: the open question routed to me

**Ruling: the implementer's option (a) — leave it — is adequate. I land with the implementer.**
Non-blocking. But I measured the behaviour rather than reasoning about it, and found something the
evidence does not mention, which changes _why_ I say adequate.

**MEASURED.** `page.tsx:349-356` fires the toast from a `useEffect` keyed on
`[selectedCount, toast]`. `ToastProvider` (`src/components/ui/toast.tsx:68-83`) **appends** — no
dedupe, no cap, 4s auto-dismiss. So the toast fires on **every change** to `selectedCount`, not once
per select-all. I probed at 600 rows:

```
toasts visible after select-all:                    1
toasts visible after 3 further row deselections:    4
```

**Four stacked toasts, all saying "Large selections may be slow", from four ordinary gestures.**
Deselecting rows one at a time after a filter-wide select-all — a completely normal way to refine a
selection — produces one warning per click until they age out. At hundred-thousand scale the count
in each is different (100000, 99999, 99998…), so they are not even visually identical.

**Why I still rule it adequate, and do not require a change:**

1. **It is out of the frozen scope.** `spec.md:31-55` governs what the header selects, what it
   reports, and how efficiently. It says nothing about warning copy or thresholds. UR-011 is
   satisfied either way — this cannot block a UR-011 verdict without inventing requirement text.
2. **The claim stays true.** The _action_ on 100,000 rows genuinely is slow. The toast is advisory
   and non-blocking; nothing is lost or mis-stated.
3. **Pre-existing in kind.** The stacking behaviour is a property of the toast provider and the
   effect's dependency list, both of which predate this change. UR-011 raised its _frequency_ by
   removing the page cap, but did not introduce the mechanism.
4. **The reversible default is right.** Any of the three options is a one-line change later, with no
   state, storage or API implication.

**What I would tell the principal:** the honest fix is not the threshold number, it is that the
effect fires on every count change. A `useRef` latch that warns once per transition _into_ a large
selection would remove the stacking entirely and is smaller than re-wording the copy. I am
**recording that as a suggestion, not a required change** — it is product judgement outside the
frozen text, and `Q-PROPOSAL-P32-01-01` is the correct venue. Root should keep that question open
for the principal with this measurement attached, since it makes the question concrete: it is not
"does the toast read well at 100,000" but "should four of them stack up while I refine a selection".

---

## F-3 — `matchingRowIds` is optional and silently falls back to the rendered rows

**Non-blocking; the implementer's R-2, which I confirm and slightly sharpen.**

**MEASURED.** `TransactionTableProps.matchingRowIds` is optional (`TransactionTable.tsx:60`) and
`selectableRowIds = matchingRowIds ?? renderedRowIds` (`:303`). A caller that omits it gets
page-scoped selection back — i.e. **the exact UR-011 defect** — with no type error.

The only product render site is `page.tsx:1318`, which passes it (**MEASURED** via
`grep -rn "<TransactionTable"`; the other hits are tests and an unrelated skeleton). So the product
is correct today.

**Why I am not failing on it:** the optionality is what keeps the narrower existing call sites
(`add-transaction-focus.test.tsx`, `virtualization.test.tsx`) valid, the fallback is the
conservative choice, and it is disclosed. A stricter design would make the prop required and have
callers pass the rendered ids explicitly, which is a larger change than this requirement needs.
Recorded so a future caller is not surprised.

---

## Repo rules, environment and secret safety

- **Type safety — PASS. MEASURED.** No `as`, no `any`, no `!` in the reviewed product diff. I
  grepped `table-selection.ts`, `useTableSelection.ts` and the `page.tsx` selection region; every
  hit was the English word "as" inside a comment. The model is immutable throughout (`readonly`
  fields, `ReadonlySet`, every operation returns a new value), with `SelectionBaseline` and
  `SelectionOutcome` as string-literal unions rather than booleans — which is what makes the
  anchor's outcome legible.
- **Debug leftovers — PASS. MEASURED.** `console.log` in `src`: **14 at BASE → 11 at HEAD**, exactly
  as claimed. The three removed are the ones that were in `useTableSelection.ts`; that file now has
  zero, as does the whole transactions feature directory.
- **`pnpm typecheck`** — **PASS. MEASURED.**
- **`pnpm lint`** — **0 errors, 1 warning. MEASURED.** The warning is the TanStack Virtual
  react-compiler note at `TransactionTable.tsx:455`, and it is **pre-existing**: the same
  `useVirtualizer({` call is at line 426 of the BASE file. Not introduced here.
- **`pnpm exec oxfmt --check`** on all nine reviewed files — **clean. MEASURED.** I did **not** run
  bare `pnpm format`, which would reflow frozen `specs/**`.
- **`pnpm test`** — **2443 passed, 2 skipped, 126 files, at `0e27694`. MEASURED.** The four P31/P32
  unit files alone: 49 passed.
- **`pnpm test:e2e`** — **NOT RUN.** Port :3000 held by `p30-implementer-01` per the dispatch. This
  is the one gap in my coverage and it is disclosed above in full.
- **Secret safety — PASS, no leak. MEASURED.** I grepped the added lines of the reviewed diff for
  seed phrases, mnemonics, `SUPABASE_JWT_SECRET`, service-role keys, private-key headers, master-key
  assignments and password literals: **zero hits.** All fixtures are synthetic (`tx-0000`-style ids,
  `Groceries N`/`Fuel N`, `Virtual Transaction NNNN`). No vault plaintext anywhere.
- **Scratch hygiene — MEASURED.** `.p31rev/`, `.p31rev2/` and two scratch vitest configs created and
  deleted. `git status --porcelain -- src tests` empty at close. I never used `git stash`, never ran
  `git checkout --` on anything, and never restored another agent's file.

---

## Where the dispatch was wrong, and where it was right

**Right, and materially so:** the hunk-level attribution for `page.tsx` (lines 644-671 are P30's — I
confirmed the `isPending` prop and the reconciliation comment sit exactly there); the warning that
`e97b3f7` fuses two packages; the insistence on checking fixture sizes against `PAGE_SIZE`; and the
blindness framing, which is precisely what separates the four old range tests from the five new
ones.

**Wrong in one respect, through no fault of the dispatcher:** the pinned HEAD `362287c` was stale
within minutes of dispatch, and the file that moved was P31's own core model. The ancestry check the
dispatch rightly demanded is, as it says, "only valid for the instant it ran" — this review is a
worked example of that. **Any handback of this verdict must quote `0e27694`.**

**One dispatch expectation I did not meet, deliberately:** I was asked to confirm `T021e`. I
confirmed its _construction_ is sound and discriminating in both directions, but I could not
_execute_ it. Saying "verified" would have been the blind assertion this goal keeps warning about.

---

## Verdict

**PASS for UR-010 and PASS for UR-011.**

The requirement text is satisfied clause by clause; the two defects named in the frozen source are
genuinely fixed rather than papered over; the efficiency clause is met by a representation whose
O(matching) operations I traced individually and found confined to bulk actions; the data-loss
defect the implementer caught in its own first cut is correctly fixed in both directions, including
the CRDT peer-insert case which I tested myself; and nine mutations — including the original bug,
reproduced — all die. The evidence files are accurate everywhere I checked them, including the parts
that are unflattering to the implementer, which is worth saying.

**Three items for root, none blocking:**

1. **Record the reviewed HEAD as `0e27694`, not `362287c`** (F-1).
2. **Decide whether one confirming full-suite E2E run at `0e27694` is wanted** before integration —
   no E2E has run on the exact reviewed tree, and `T021e` is the sole evidence for `spec.md:29`.
3. **Keep `Q-PROPOSAL-P32-01-01` open** for the principal with the F-2 measurement attached: toasts
   stack four-deep during ordinary selection refinement.
