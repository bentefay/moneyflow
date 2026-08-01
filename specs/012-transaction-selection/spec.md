# Transaction Table Selection

Frozen requirement source for two transaction-table selection behaviours reported by the human
principal on 2026-08-02, and admitted into goal `007-human-scratch-completion`'s committed scope at
the principal's explicit instruction.

This file is a frozen source. Once its SHA-256 is recorded in `SCOPE.json`, its text is immutable:
no edits, no checkbox markers. Completion is recorded only in the requirement/package ledgers after
implementation and independent review, exactly as `FS-001`.

## UR-010 — Shift-click extends selection and deselection symmetrically

Shift-clicking a row's checkbox must extend the change made to the anchor row across the whole
range, in whichever direction that change went.

Shift-clicking already selects every row between the last row acted on and the row clicked. The same
gesture must deselect symmetrically: when the last row acted on was deselected, shift-clicking
another row deselects every row between them rather than selecting them.

Required behaviour:

- The gesture applies the same outcome to the whole range as was applied to the anchor row: a range
  begun by selecting selects, a range begun by deselecting deselects.
- The range covers every row between the anchor and the clicked row in the order the table currently
  presents them, under the filters and sort in effect, inclusive of both ends.
- Rows outside the range keep whatever selection state they already had.
- The clicked row becomes the new anchor, so a further shift-click extends from it.
- Where no anchor exists, the click behaves as an ordinary single toggle.
- Keyboard range selection, where present, follows the same rule as the pointer gesture.

## UR-011 — The header checkbox selects every row matching the filters

The select-all checkbox in the column header must select every transaction matching the active
filters, not only those currently rendered.

The table is virtualized and paginated, so at any moment most matching rows have no rendered element
and some are not yet paged in. Selection is a property of the filtered result set, not of what
happens to be on screen, and a user who selects all and then acts in bulk must affect every matching
transaction.

Required behaviour:

- Selecting the header checkbox selects every transaction matching the active filters, including
  rows that are not rendered and rows beyond the currently loaded page.
- Clearing the header checkbox clears that same set.
- The header checkbox reflects the state of the whole filtered set: selected when all matching rows
  are selected, indeterminate when only some are, clear when none are.
- Changing the filters re-derives the set the header checkbox acts on and reports.
- Bulk actions taken after selecting all apply to every selected transaction, including rows never
  rendered.

Efficiency is a requirement, not an aspiration. Selecting all must not force every matching row to
render, must not load pages solely to enumerate them, and must remain responsive on a vault with a
hundred thousand transactions. Neither the selection nor the header's own state may be derived by a
scan whose cost grows with the number of rendered rows multiplied by the number matching.
