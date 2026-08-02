# P32 — UR-011 implementation evidence, revision 01

- **Package/revision:** P32 / 01
- **Requirement:** UR-011, frozen source `specs/012-transaction-selection/spec.md` lines 31-55
  (markerless, immutable — not read for edit, not edited)
- **Implementer:** `p31-implementer-01`
- **BASE:** `054f77e057b4af9921afc81d1459f5a00d92193e`
- **HEAD:** `256e53326085964a9ddf85d603cb847d52fe7ba5`
- **E2E:** full suite `--retries=0` in `/tmp/mf-p31`, **185 passed / 4 failed** on the final tree.
  **Not a valid single-tree campaign** — 5 runs spanned 2 trees, and the tree also carried P30's
  unreviewed work. `T021f` and `T021g` pass; all 4 failures are P30's
  `rule-creation-controls.spec.ts`. Full campaign table and analysis in
  `evidence/P31/implementation-01.md`.
- **Range:** non-empty
- **Companion package:** P31 / UR-010, same change set. See `evidence/P31/implementation-01.md` for
  the shared changed-path list, command results, repo-rule and secret-safety statements, which apply
  identically here and are not repeated in full.

## Acceptance mapping — UR-011 clause by clause

| Frozen clause (`spec.md`)                                                                                                     | Where satisfied                                                                                                         | Test                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `:43-44` header selects every matching transaction, including unrendered rows and rows beyond the loaded page                 | `selectAll` reports `ALL_MATCHING_ROWS_SELECTED`; the page passes the full `filteredTransactionIds`, not the page slice | unit "selects rows that are neither rendered nor paged in"; page-level "selects every matching transaction, not merely the rows with a rendered element"; E2E `T021f`                                                                                                                            |
| `:45` clearing clears that same set                                                                                           | `selectAll` reports `NO_ROWS_SELECTED` when the header state is `"all"`                                                 | unit "clears that same set, including the rows never rendered"; page-level "clears the whole matching set"                                                                                                                                                                                       |
| `:46-47` header reflects the whole filtered set: selected / indeterminate / clear                                             | `selectionHeaderState` compares `selectedRowCount` against `matchingRowCount`                                           | unit "counts and reports the header state without inspecting any row", "goes indeterminate as soon as one matching row is deselected"; page-level "reports indeterminate when one unrendered row is excluded"                                                                                    |
| `:48` changing the filters re-derives the set the header acts on and reports                                                  | `reconcileToMatchingRows`, applied during render in `page.tsx` when `filteredTransactionIds` changes identity           | unit "drops rows that no longer match", "keeps select-all meaning the new, narrower matching set", "does NOT select rows that have only just started matching"; page-level "re-derives the set when the filters change", "does not sweep in rows that a relaxed filter brings back"; E2E `T021g` |
| `:49-50` bulk actions apply to every selected transaction, including rows never rendered                                      | `collectSelectedTransactions` filters `filteredTransactions`, not `displayedTransactions`; all six bulk handlers use it | page-level "applies a bulk action to rows that were never rendered and lie beyond the loaded page"; E2E `T021f`                                                                                                                                                                                  |
| `:52-55` efficiency: no forced render, no page loads to enumerate, responsive at 100,000, no scan costing rendered × matching | Baseline-plus-exceptions representation — see below                                                                     | unit "does not materialise an id per matching row", "keeps a widened set cheap"                                                                                                                                                                                                                  |

## Root cause, confirmed rather than assumed

Root's diagnosis was correct. `TransactionTable.tsx:274` derived `filteredIds` from `transactions`,
which the page supplied as `tableData` = `displayedTransactions` =
`filteredTransactions.slice(0, displayCount)` with `PAGE_SIZE = 50`. Select-all therefore covered
the loaded page only.

There was a second narrowing root did not name, and it is the one that made bulk actions wrong even
for rows that _were_ selected: `page.tsx` computed
`selectedTransactionIds = selectedIds ∩ displayedTransactionIds` and fed **that** to every bulk
handler and to the count. So even a correct wide selection would have been filtered back down to the
page before any mutation ran. Both narrowings are removed.

## The representation, and why a materialised Set is not it

`spec.md:52-55` is a hard requirement, so selection is modelled as a **baseline plus exceptions**
(`src/components/features/transactions/table-selection.ts`):

```
baseline:  "all-matching" | "no-rows"
exceptions: ReadonlySet<string>   // rows whose state is the opposite of the baseline
```

Consequences, each asserted rather than asserted-about:

- **Select-all is constant size.** `ALL_MATCHING_ROWS_SELECTED` has `exceptions.size === 0` at
  100,000 matching rows. Nothing is enumerated, so no row is forced to render and no page is loaded
  to enumerate it.
- **The header's own state is two integer comparisons.** `selectedRowCount` is
  `matchingRowCount - exceptions.size` under the `all-matching` baseline and `exceptions.size`
  otherwise; `selectionHeaderState` compares that against `matchingRowCount`. No scan, so nothing
  costs rendered-rows × matching-rows. The pre-change `isAllSelected` looped `filteredIds` on every
  render, which is precisely the scan the clause forbids once `filteredIds` is the full matching
  set.
- **One row's state is one set lookup**, so rendering a virtual window costs O(window).
- **The one O(matching) operation is enumerating for a bulk action**, which is irreducible when the
  action itself touches N rows. It is deliberately a `useCallback`, not a `useMemo`, so it runs only
  when a bulk action fires — never on render, toggle, or header derivation.

Also removed: each of the six bulk handlers previously did `transactions.find((t) => t.id === id)`
per selected id, i.e. O(selected × all). With page-scoped selection that was ~50 × N; with
filter-wide selection it would have been N². They now iterate one pre-filtered list.

## A defect in my own first cut, found and fixed

The first version reconciled filter changes by intersecting only the exception set. Under an
`all-matching` baseline that is wrong in a way that destroys data: **widening** a filter (or an
import, or a peer's insert) would silently make rows selected that the user never selected, and a
subsequent bulk delete would destroy them.

`reconcileToMatchingRows` now applies a true intersection — a row is selected afterwards exactly
when it was selected before **and** it still matches — by adding newly-matching rows to the
exception set under an `all-matching` baseline. Widening stays cheap: two new rows cost two
exceptions, not 50,000 ids (asserted).

This is a genuine correctness fix, not a refinement, and it is flagged here because it is the kind
of thing that would otherwise reach review unnoticed.

## Blindness check — verified against the pre-fix tree, not assumed

| Injected defect                                                                                                               | Result                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selectAll` materialises only the first 50 matching ids                                                                       | **4 hook-level failures**: "selects rows that are neither rendered nor paged in", "does not materialise an id per matching row", "clears that same set", "goes indeterminate as soon as one matching row is deselected" |
| Page narrows selection to `displayedTransactions` before both the count and the bulk handlers (the true pre-fix architecture) | **all 5 page-level tests fail**                                                                                                                                                                                         |
| `reconcileToMatchingRows` made a no-op                                                                                        | **1 failure**: "drops rows that no longer match"                                                                                                                                                                        |
| Newly-matching-rows branch removed (my own first-cut defect)                                                                  | **2 unit + 1 page-level failure**                                                                                                                                                                                       |

**A weak mutation is recorded here deliberately.** My first attempt at the page-level mutation only
changed the `matchingRowIds` prop and **all five tests still passed**. That mutation did not
reproduce the pre-fix architecture, because the page also narrowed the selection downstream. I redid
it faithfully and all five then failed. A mutation that fails to fail is evidence about the
mutation, not about the tests — but it is exactly the moment at which a blind test would be mistaken
for a sound one, so it is on the record.

## Property-based invariant coverage

`tests/unit/transactions/selection-invariants.test.ts` (fast-check) guards what the representation
buys its speed with. `selectedRowCount` subtracts `exceptions.size` rather than counting anything,
so it is only correct while every exception is itself a matching row — and the failure mode of a
broken invariant is a silently wrong count, which a table-driven test only catches in the cases
someone thought of. Three properties, over arbitrary gesture sequences and arbitrary changes to the
matching set:

1. the constant-time count always equals a full enumeration, and no exception ever names a
   non-matching row;
2. the header's tri-state always agrees with the rows it summarises;
3. reconciliation is a true intersection — selected afterwards implies selected before **and** still
   matching.

## Test design against blindness

- The page-level file `tests/unit/transactions/select-all-beyond-page.test.tsx` mounts the **real
  page** over a fake vault of **400 rows** with a virtualizer that mounts **8**, clicks the **real**
  header checkbox and applies a **real** bulk status change through the **real** toolbar. Assertions
  name `tx-0499`-class rows that had no element when the action ran, and assert set membership of
  the recorded mutations. "The visible rows were updated" would pass either way and is never
  asserted alone.
- Fixture sizes are deliberately past `PAGE_SIZE = 50` (400 unit, 500 E2E). A fixture of five rows
  would pass with the defect present.
- The counts asserted (`Edit 500`, `500 selected`) are the ones that read 50 under the defect.

## Risks

- **R-3 (low).** `reconcileToMatchingRows` runs during render whenever `filteredTransactionIds`
  changes identity. `filteredTransactions` is memoised on `[transactions, filters, aliasLookup]`, so
  this is once per real change, not per render — but a future change that breaks that memo would
  move an O(matching) intersection onto the render path.
- **R-4 (low).** `LARGE_SELECTION_THRESHOLD = 500` now trips on filter-wide select-all in any vault
  with more than 500 matching rows, where before it was capped by the page size. The toast is
  advisory and its wording ("Large selections may be slow") remains accurate, so it is left as is;
  see the proposed question below.

## Proposed questions

### Q-PROPOSAL-P32-01-01 — Should the large-selection warning threshold change now that select-all is filter-wide?

- **Raised by/package/revision:** `p31-implementer-01` / P32 / 01
- **Context and evidence:** `src/app/(app)/transactions/page.tsx:52` defines
  `LARGE_SELECTION_THRESHOLD = 500` and warns "Selected N transactions. Large selections may be
  slow." Before UR-011 the selected count was bounded by the loaded page, so on a large vault the
  toast fired only after the user paged far enough in. Now a single header click on a 100,000-row
  vault selects 100,000 and fires the toast immediately.
- **Why existing authority does not decide it:** `spec.md:31-55` governs what the header selects and
  how efficiently, and says nothing about warning copy or thresholds. UR-011 is satisfied either
  way.
- **Options considered:** (a) leave the threshold and copy as they are; (b) raise the threshold now
  that a large selection is cheap to hold; (c) reword to describe the bulk action rather than the
  selection, since it is the action that is slow, not the selection.
- **Reversible default selected to continue:** (a) — unchanged. The toast is advisory, fires once
  per count change, and its claim stays true: the _action_ on a large selection is genuinely slower.
- **Decision-hierarchy basis:** 4 — smallest reversible implementation with the narrowest future
  migration. Changing copy or thresholds is a product judgement outside the frozen text, and any of
  the three options remains a one-line change later.
- **Impact and risk:** Low. A user selecting all on a very large vault sees an advisory toast
  immediately rather than after paging. No data or correctness impact.
- **Reversal or migration path:** Edit the constant and/or the message string; no state, storage or
  API implications.
- **Human review still useful after completion:** Yes — whether the toast reads well at
  hundred-thousand scale is a copy judgement the principal may have a view on.
