/**
 * Transaction table selection model.
 *
 * The table is virtualized and paginated, so at any moment most rows matching the active filters
 * have no rendered element and some are not yet paged in. Selection is therefore a property of the
 * matching result set rather than of what is on screen, and is modelled as a baseline covering
 * every matching row plus the individual rows that diverge from it.
 *
 * That representation is what keeps selecting all cheap: "all matching rows" is a constant-size
 * value rather than a hundred thousand ids, the header's tri-state is a size comparison, and one
 * row's own state is a single set lookup. Nothing here grows with how much of the table happens to
 * be rendered.
 *
 * **Deliberately absent from the feature's `index.ts` barrel — import from this module directly.**
 * These are internal primitives with caller-side preconditions rather than a public API: several
 * are cheap only when called the way the table calls them, and they omit defensive bail-outs
 * precisely because their one caller already establishes the condition. `reconcileToMatchingRows`
 * is the measured case — a redundant call costs ~19.5ms at 100,000 matching rows — but the point
 * generalises to the whole module. Publishing them on the barrel would invite a caller that
 * breaches the efficiency clause these primitives exist to satisfy
 * (`specs/012-transaction-selection/spec.md:52-55`) with nothing in the types or tests objecting.
 * Keeping the module's surface local is what keeps those preconditions checkable.
 */

/** What every row matching the active filters is, unless it appears in `exceptions`. */
export type SelectionBaseline = "all-matching" | "no-rows";

export interface TransactionSelection {
    readonly baseline: SelectionBaseline;
    /**
     * Rows whose selection state is the opposite of {@link TransactionSelection.baseline}.
     *
     * Always a subset of the rows matching the active filters: writes only ever name a matching
     * row, and {@link reconcileToMatchingRows} re-derives the set when the matching rows change.
     * That invariant is what makes {@link selectedRowCount} exact without a scan.
     */
    readonly exceptions: ReadonlySet<string>;
}

/** Nothing selected. */
export const NO_ROWS_SELECTED: TransactionSelection = {
    baseline: "no-rows",
    exceptions: new Set()
};

/** Every row matching the active filters, including rows not rendered and rows not yet paged in. */
export const ALL_MATCHING_ROWS_SELECTED: TransactionSelection = {
    baseline: "all-matching",
    exceptions: new Set()
};

/** Whether one row is selected. */
export function isRowSelected(selection: TransactionSelection, rowId: string): boolean {
    return selection.baseline === "all-matching"
        ? !selection.exceptions.has(rowId)
        : selection.exceptions.has(rowId);
}

/** Exactly one row selected, if the selection names one; used for single-target keyboard actions. */
export function singleSelectedRowId(
    selection: TransactionSelection,
    matchingRowIds: readonly string[]
): string | null {
    if (selectedRowCount(selection, matchingRowIds.length) !== 1) return null;
    if (selection.baseline === "no-rows") {
        for (const rowId of selection.exceptions) return rowId;
        return null;
    }
    return matchingRowIds.find((rowId) => !selection.exceptions.has(rowId)) ?? null;
}

/** How many matching rows are selected. Constant time, whatever the size of the result set. */
export function selectedRowCount(
    selection: TransactionSelection,
    matchingRowCount: number
): number {
    return selection.baseline === "all-matching"
        ? matchingRowCount - selection.exceptions.size
        : selection.exceptions.size;
}

/** The header checkbox's tri-state over the whole filtered result set. */
export type SelectionHeaderState = "all" | "some" | "none";

/**
 * What the header checkbox reports: selected when every matching row is selected, indeterminate
 * when only some are, clear when none are. Derived from two sizes, never from a scan.
 */
export function selectionHeaderState(
    selection: TransactionSelection,
    matchingRowCount: number
): SelectionHeaderState {
    if (matchingRowCount <= 0) return "none";
    const selectedCount = selectedRowCount(selection, matchingRowCount);
    if (selectedCount <= 0) return "none";
    return selectedCount >= matchingRowCount ? "all" : "some";
}

/** Applies one outcome to a set of rows, leaving every other row's state untouched. */
export function setRowsSelected(
    selection: TransactionSelection,
    rowIds: Iterable<string>,
    selected: boolean
): TransactionSelection {
    const divergesFromBaseline = selection.baseline === "all-matching" ? !selected : selected;
    const exceptions = new Set(selection.exceptions);
    for (const rowId of rowIds) {
        if (divergesFromBaseline) {
            exceptions.add(rowId);
        } else {
            exceptions.delete(rowId);
        }
    }
    return { baseline: selection.baseline, exceptions };
}

/** Flips one row's selection state. */
export function toggleRowSelected(
    selection: TransactionSelection,
    rowId: string
): TransactionSelection {
    return setRowsSelected(selection, [rowId], !isRowSelected(selection, rowId));
}

/** Selects exactly one row and nothing else. */
export function selectOnlyRow(rowId: string): TransactionSelection {
    return { baseline: "no-rows", exceptions: new Set([rowId]) };
}

/**
 * Re-derives the selection when the matching result set changes, so the set the header acts on and
 * reports is the new matching one.
 *
 * The rule is intersection: a row is selected afterwards exactly when it was selected before *and*
 * it still matches. Both halves matter. Rows that no longer match drop out rather than being
 * carried invisibly into a later bulk action; and rows that have only just started matching — a
 * widened filter, an import, a peer's insert — stay unselected, because the user never selected
 * them. Without the second half a bare `all-matching` baseline would silently acquire every row a
 * relaxed filter let back in.
 *
 * Under an `all-matching` baseline that intersection is still expressible as a baseline plus
 * exceptions: the newly-matching rows simply join the exception set. So narrowing a filter costs
 * nothing extra, and a peer's insert adds exactly one exception rather than materialising an id per
 * matching row.
 *
 * **Precondition: call this only when the matching set has actually changed.** It carries no cheap
 * bail-out for being handed the same set twice, because its one caller checks first. Measured at
 * 100,000 matching rows, a call that could have been skipped costs ~19.5ms. See the module
 * docstring for why these primitives are not on the feature barrel.
 */
export function reconcileToMatchingRows(
    selection: TransactionSelection,
    previousMatchingRowIds: readonly string[],
    nextMatchingRowIds: readonly string[]
): TransactionSelection {
    const nextMatchingRowIdSet = new Set(nextMatchingRowIds);
    const exceptions = new Set<string>();
    for (const rowId of selection.exceptions) {
        if (nextMatchingRowIdSet.has(rowId)) exceptions.add(rowId);
    }

    if (selection.baseline === "all-matching") {
        // A row that did not match before was not selected before, so it must not be selected now.
        const previousMatchingRowIdSet = new Set(previousMatchingRowIds);
        for (const rowId of nextMatchingRowIds) {
            if (!previousMatchingRowIdSet.has(rowId)) exceptions.add(rowId);
        }
    }

    if (exceptions.size === selection.exceptions.size) {
        // Same membership, and the loops above only ever kept or added ids already accounted for,
        // so the selection is unchanged — return it by identity and let React skip the re-render.
        let unchanged = true;
        for (const rowId of exceptions) {
            if (!selection.exceptions.has(rowId)) {
                unchanged = false;
                break;
            }
        }
        if (unchanged) return selection;
    }
    return { baseline: selection.baseline, exceptions };
}

/**
 * Enumerates the selected rows in table order.
 *
 * This is the one operation whose cost is the size of the result set, and it is deliberately
 * confined to the moment a bulk action runs — acting on N rows costs N regardless. Rendering,
 * toggling and reporting never call it.
 */
export function selectedRowIdsWithin(
    selection: TransactionSelection,
    matchingRowIds: readonly string[]
): readonly string[] {
    return matchingRowIds.filter((rowId) => isRowSelected(selection, rowId));
}

/** An inclusive span of the table's current order. */
export interface SelectionRange {
    readonly fromIndex: number;
    readonly toIndex: number;
}

/**
 * The inclusive span between two rows in the order the table currently presents them, or `null`
 * when either row is not in that order — a filter change can retire an anchor, and the gesture then
 * has no range to extend.
 */
export function findRowRange(
    orderedRowIds: readonly string[],
    anchorRowId: string,
    clickedRowId: string
): SelectionRange | null {
    let anchorIndex = -1;
    let clickedIndex = -1;
    for (let index = 0; index < orderedRowIds.length; index++) {
        const rowId = orderedRowIds[index];
        if (rowId === anchorRowId) anchorIndex = index;
        if (rowId === clickedRowId) clickedIndex = index;
        if (anchorIndex >= 0 && clickedIndex >= 0) break;
    }
    if (anchorIndex < 0 || clickedIndex < 0) return null;
    return anchorIndex <= clickedIndex
        ? { fromIndex: anchorIndex, toIndex: clickedIndex }
        : { fromIndex: clickedIndex, toIndex: anchorIndex };
}

/** Every row id in an inclusive range, in table order. */
export function rowIdsInRange(
    orderedRowIds: readonly string[],
    range: SelectionRange
): readonly string[] {
    return orderedRowIds.slice(range.fromIndex, range.toIndex + 1);
}

/** What a selection gesture did to the row it acted on. */
export type SelectionOutcome = "selected" | "deselected";

/**
 * The row a range gesture extends from, and — crucially — what was done to it. Recording only which
 * row was last acted on cannot tell a later shift-click whether the range should select or
 * deselect, which is why the outcome travels with the id.
 */
export interface SelectionAnchor {
    readonly rowId: string;
    readonly outcome: SelectionOutcome;
}

/**
 * Whether an anchor still describes the selection. An anchor whose row no longer holds the outcome
 * the anchor recorded — because the selection was cleared or replaced from elsewhere — is stale,
 * and the gesture falls back to an ordinary single toggle rather than extending a fiction.
 */
export function anchorMatchesSelection(
    anchor: SelectionAnchor,
    selection: TransactionSelection
): boolean {
    return isRowSelected(selection, anchor.rowId) === (anchor.outcome === "selected");
}
