/**
 * The transaction grid's columns, as TanStack Table v9 column definitions.
 *
 * Two contracts are preserved here rather than reproduced somewhere alongside:
 *
 * 1. **Identity and order.** Column ids are the same `data-cell` markers the row markup, the
 *    presence protocol and the E2E suite already address cells by. Definition order is render
 *    order — no column-ordering or column-pinning feature is registered, so v9's display order is
 *    exactly this list — and it matches the header: checkbox, date, description, account, tags,
 *    status, one column per person, amount, actions.
 *
 * 2. **Sizing.** The grid is one CSS grid whose header and every row share a single
 *    `grid-template-columns` string. Each column carries its own track in `meta.gridTemplate` and
 *    the string is joined from the columns themselves, so a column cannot be added without its
 *    width. `tests/unit/transactions/table-model/columns.test.ts` pins the joined result against
 *    the existing `buildTransactionGridTemplate`, which is what stops the two drifting apart while
 *    both exist.
 *
 * Cell *templates* and header labels are both deliberately absent: rendering lives in
 * `TransactionRow` and `TransactionTableHeader`, and this layer is the model. The integration pass
 * shipped without adding `cell` renderers, and the header labels these defs used to carry were
 * removed once it was clear nothing read them — the header row is hand-written JSX that never
 * consulted `columnDef.header`, so a test pinning those strings could not detect drift in either
 * direction. Adding either back is a deliberate step, not a gap to fill silently.
 */

import { getMinorUnitMultiplier } from "@/lib/domain/currency";

import { materializeAllocationRecord } from "../allocation-columns";
import {
    type TransactionColumnMeta,
    transactionColumnHelper,
    type TransactionTable,
    type TransactionTableRow
} from "./features";
import {
    allocationColumnId,
    type AllocationTransactionColumnId,
    asTransactionId,
    transactionColumnAutomationField,
    type TransactionColumnId,
    type TransactionId
} from "./ids";

// ============================================================================
// Sizing contract
// ============================================================================

/**
 * Each column's `grid-template-columns` track.
 *
 * These are the same tracks the grid renders today; they are named per column here rather than
 * living in one pre-joined prefix/suffix pair so that adding a column cannot silently leave the
 * template one track short.
 */
const CHECKBOX_TRACK = "32px";
const DATE_TRACK = "120px";
const DESCRIPTION_TRACK = "minmax(150px,2fr)";
const ACCOUNT_TRACK = "160px";
const TAGS_TRACK = "140px";
const STATUS_TRACK = "110px";
const ALLOCATION_TRACK = "minmax(112px,128px)";
const AMOUNT_TRACK = "112px";
const ACTIONS_TRACK = "120px";

// ============================================================================
// Clipboard value formatting
// ============================================================================

/**
 * How a value with no useful text renders in a copied cell.
 *
 * An empty string rather than a dash or a literal `null`: the copy target is a spreadsheet, where
 * an empty cell is what "no value" means and any placeholder becomes data.
 */
const EMPTY_COPY_VALUE = "";

function copyString(value: unknown): string {
    return typeof value === "string" ? value : EMPTY_COPY_VALUE;
}

/**
 * Amounts copy as a plain decimal in the account's own minor-unit precision — `12.34` for USD,
 * `1234` for JPY — with no symbol, grouping or sign styling.
 *
 * The rendered cell shows the same digits (`InlineEditableAmount` formats with `toFixed` at the
 * currency's precision); what is dropped is only presentation a spreadsheet would have to parse
 * back off again.
 */
function copyAmount(value: unknown, row: TransactionTableRow): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return EMPTY_COPY_VALUE;
    const multiplier = getMinorUnitMultiplier(row.currency ?? "USD");
    return (value / multiplier).toFixed(Math.log10(multiplier));
}

function copyTags(value: unknown): string {
    if (!Array.isArray(value)) return EMPTY_COPY_VALUE;
    return value
        .map((tag: unknown) =>
            typeof tag === "object" && tag != null && "name" in tag ? copyString(tag.name) : ""
        )
        .filter((name) => name.length > 0)
        .join(", ");
}

/**
 * Allocation percentages copy as a bare number, or as nothing when the row stores no explicit
 * value for that person — which is exactly the information the cell shows, where an unstored or
 * zero allocation renders as an em dash and only an explicit non-zero one renders as `N%`.
 */
function copyAllocationPercentage(value: unknown): string {
    return typeof value === "number" && Number.isFinite(value) && value !== 0
        ? String(value)
        : EMPTY_COPY_VALUE;
}

const CHECKBOX_INTERACTION = {
    activationKind: "checkbox",
    automationField: null,
    copyable: false,
    editKind: "none",
    focusable: true,
    popupOwner: "none",
    selectable: true
} as const satisfies TransactionColumnMeta["interaction"];

const DATE_INTERACTION = {
    activationKind: "none",
    automationField: null,
    copyable: true,
    editKind: "date",
    focusable: true,
    popupOwner: "grid-editor",
    selectable: true
} as const satisfies TransactionColumnMeta["interaction"];

const DESCRIPTION_INTERACTION = {
    activationKind: "none",
    automationField: transactionColumnAutomationField("description"),
    copyable: true,
    editKind: "description",
    focusable: true,
    popupOwner: "grid-editor",
    selectable: true
} as const satisfies TransactionColumnMeta["interaction"];

const ACCOUNT_INTERACTION = {
    activationKind: "none",
    automationField: null,
    copyable: true,
    editKind: "account",
    focusable: true,
    popupOwner: "grid-editor",
    selectable: true
} as const satisfies TransactionColumnMeta["interaction"];

const TAGS_INTERACTION = {
    activationKind: "none",
    automationField: transactionColumnAutomationField("tags"),
    copyable: true,
    editKind: "tags",
    focusable: true,
    popupOwner: "grid-editor",
    selectable: true
} as const satisfies TransactionColumnMeta["interaction"];

const STATUS_INTERACTION = {
    activationKind: "none",
    automationField: null,
    copyable: true,
    editKind: "status",
    focusable: true,
    popupOwner: "grid-editor",
    selectable: true
} as const satisfies TransactionColumnMeta["interaction"];

function allocationInteraction(
    columnId: AllocationTransactionColumnId
): TransactionColumnMeta["interaction"] {
    return {
        activationKind: "none",
        automationField: transactionColumnAutomationField(columnId),
        copyable: true,
        editKind: "allocation",
        focusable: true,
        popupOwner: "none",
        selectable: true
    };
}

const AMOUNT_INTERACTION = {
    activationKind: "none",
    automationField: null,
    copyable: true,
    editKind: "amount",
    focusable: true,
    popupOwner: "none",
    selectable: true
} as const satisfies TransactionColumnMeta["interaction"];

const ACTIONS_INTERACTION = {
    activationKind: "inspector",
    automationField: null,
    copyable: false,
    editKind: "none",
    focusable: true,
    popupOwner: "none",
    selectable: true
} as const satisfies TransactionColumnMeta["interaction"];

// ============================================================================
// Fixed columns
// ============================================================================

/**
 * The columns present on every transaction grid, in render order, with the allocation columns
 * still to be spliced in before `amount`.
 */
function fixedTransactionColumnsBefore() {
    return [
        transactionColumnHelper.display({
            id: "checkbox",
            meta: {
                align: "center",
                cellMarker: "checkbox",
                copyValue: () => EMPTY_COPY_VALUE,
                editable: false,
                gridTemplate: CHECKBOX_TRACK,
                interaction: CHECKBOX_INTERACTION
            } satisfies TransactionColumnMeta
        }),
        transactionColumnHelper.accessor("date", {
            id: "date",
            meta: {
                align: "left",
                cellMarker: "date",
                // ISO, not the locale-abbreviated text the cell displays. The stored value is
                // unambiguous and every spreadsheet parses it; `15/1` does not survive a reader in
                // another locale, and this grid's host locale and time zone already disagree.
                copyValue: copyString,
                editable: true,
                gridTemplate: DATE_TRACK,
                interaction: DATE_INTERACTION
            } satisfies TransactionColumnMeta
        }),
        transactionColumnHelper.accessor(
            // The alias is what the row renders when one is set, so it is what the column means.
            (row) => row.descriptionAliasName ?? row.description,
            {
                id: "description",
                meta: {
                    align: "left",
                    cellMarker: "description",
                    copyValue: copyString,
                    editable: true,
                    gridTemplate: DESCRIPTION_TRACK,
                    interaction: DESCRIPTION_INTERACTION
                } satisfies TransactionColumnMeta
            }
        ),
        transactionColumnHelper.accessor((row) => row.account ?? "", {
            id: "account",
            meta: {
                align: "left",
                cellMarker: "account",
                copyValue: copyString,
                editable: true,
                gridTemplate: ACCOUNT_TRACK,
                interaction: ACCOUNT_INTERACTION
            } satisfies TransactionColumnMeta
        }),
        transactionColumnHelper.accessor((row) => row.tags ?? [], {
            id: "tags",
            meta: {
                align: "center",
                cellMarker: "tags",
                copyValue: copyTags,
                editable: true,
                gridTemplate: TAGS_TRACK,
                interaction: TAGS_INTERACTION
            } satisfies TransactionColumnMeta
        }),
        transactionColumnHelper.accessor((row) => row.status ?? "", {
            id: "status",
            meta: {
                align: "center",
                cellMarker: "status",
                copyValue: copyString,
                editable: true,
                gridTemplate: STATUS_TRACK,
                interaction: STATUS_INTERACTION
            } satisfies TransactionColumnMeta
        })
    ];
}

function fixedTransactionColumnsAfter() {
    return [
        transactionColumnHelper.accessor("amount", {
            id: "amount",
            meta: {
                align: "right",
                cellMarker: "amount",
                copyValue: copyAmount,
                editable: true,
                gridTemplate: AMOUNT_TRACK,
                interaction: AMOUNT_INTERACTION
            } satisfies TransactionColumnMeta
        }),
        transactionColumnHelper.display({
            id: "actions",
            meta: {
                align: "center",
                cellMarker: "actions",
                copyValue: () => EMPTY_COPY_VALUE,
                editable: false,
                gridTemplate: ACTIONS_TRACK,
                interaction: ACTIONS_INTERACTION
            } satisfies TransactionColumnMeta
        })
    ];
}

// ============================================================================
// Allocation columns
// ============================================================================

/** One person's allocation column, as the grid already models it. */
export interface TransactionAllocationColumn {
    readonly personId: string;
    /** The header label, already carrying any "(deleted)" or "Unknown person" qualification. */
    readonly label: string;
}

/**
 * The explicit allocation this row stores for one person, or `undefined` when it stores none or
 * stores something that is not a percentage.
 *
 * Explicit rather than effective, because that is what the cell presents: `PersonAllocationCell`
 * renders the stored percentage and relegates the derived effective figure to its description.
 *
 * Deliberately *not* gated on `deriveEffectiveAllocations` succeeding. Derivation fails whenever
 * the transaction's account carries no ownership data at all — an ordinary, common state, not a
 * malformed one — and the cell still shows the stored percentage in that case. Gating on it would
 * have blanked the column for every such row.
 *
 * The `-0` exclusion matches the cell's own `displayPercentage`, which refuses it.
 */
function explicitAllocationValue(row: TransactionTableRow, personId: string): number | undefined {
    const allocations = materializeAllocationRecord(row.allocations);
    if (!Object.prototype.hasOwnProperty.call(allocations, personId)) return undefined;

    const explicit = allocations[personId];
    return typeof explicit === "number" && Number.isFinite(explicit) && !Object.is(explicit, -0)
        ? explicit
        : undefined;
}

function allocationColumn(person: TransactionAllocationColumn) {
    const columnId: AllocationTransactionColumnId = allocationColumnId(person.personId);
    return transactionColumnHelper.accessor(
        (row) => explicitAllocationValue(row, person.personId),
        {
            id: columnId,
            meta: {
                align: "right",
                cellMarker: columnId,
                copyValue: copyAllocationPercentage,
                editable: true,
                gridTemplate: ALLOCATION_TRACK,
                interaction: allocationInteraction(columnId)
            } satisfies TransactionColumnMeta
        }
    );
}

// ============================================================================
// Assembly
// ============================================================================

/**
 * The grid's columns for a given set of people.
 *
 * Not memoised here: v9 requires the `columns` array to be reference-stable across renders, and
 * the caller is the only place that knows when the people have actually changed. The integration
 * pass memoises on the allocation column list, exactly as the current grid memoises
 * `buildAllocationColumnModel`.
 */
export function buildTransactionTableColumns(
    allocationColumns: readonly TransactionAllocationColumn[]
) {
    return transactionColumnHelper.columns([
        ...fixedTransactionColumnsBefore(),
        ...allocationColumns.map(allocationColumn),
        ...fixedTransactionColumnsAfter()
    ]);
}

/** Every column id the grid presents, in render order. */
export function transactionColumnIds(
    allocationColumns: readonly TransactionAllocationColumn[]
): readonly TransactionColumnId[] {
    return [
        "checkbox",
        "date",
        "description",
        "account",
        "tags",
        "status",
        ...allocationColumns.map((person) => allocationColumnId(person.personId)),
        "amount",
        "actions"
    ];
}

/**
 * The `grid-template-columns` string the header and every row share.
 *
 * Joined from the columns the table is currently presenting rather than rebuilt from a count, so
 * the tracks and the cells cannot disagree about how many columns there are.
 */
export function transactionGridTemplateColumns(table: TransactionTable): string {
    return table
        .getVisibleLeafColumns()
        .map((column) => column.columnDef.meta?.gridTemplate ?? "auto")
        .join(" ");
}

/** The id v9 gives a row, which for this grid is the transaction's own id. */
export function transactionTableRowId(row: TransactionTableRow): TransactionId {
    return asTransactionId(row.id);
}
