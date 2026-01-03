/**
 * Column configuration for the transaction table.
 * Order matches FR-033a: Checkbox → Date → Description → Account → Tags → Status → Amount → Balance → Actions
 */

/** Valid column identifiers for focus navigation */
export type ColumnId =
	| "checkbox"
	| "date"
	| "description"
	| "account"
	| "tags"
	| "status"
	| "amount"
	| "balance"
	| "actions";

/** Column definition for the transaction table */
export interface ColumnDef {
	/** Unique column identifier */
	id: ColumnId;
	/** Header text (empty for checkbox/actions) */
	header: string;
	/** Tailwind width class */
	width: string;
	/** Text alignment */
	align: "left" | "center" | "right";
	/** Whether cells in this column are editable */
	editable: boolean;
	/** Whether column supports sorting */
	sortable: boolean;
}

/**
 * Column configuration array.
 * Order is significant - determines render order in table.
 */
export const COLUMN_CONFIG: ColumnDef[] = [
	{
		id: "checkbox",
		header: "",
		width: "w-10",
		align: "center",
		editable: false,
		sortable: false,
	},
	{
		id: "date",
		header: "Date",
		width: "w-28",
		align: "left",
		editable: true,
		sortable: true,
	},
	{
		id: "description",
		header: "Description",
		width: "flex-1",
		align: "left",
		editable: true,
		sortable: true,
	},
	{
		id: "account",
		header: "Account",
		width: "w-32",
		align: "left",
		editable: true,
		sortable: true,
	},
	{
		id: "tags",
		header: "Tags",
		width: "w-40",
		align: "center",
		editable: true,
		sortable: false,
	},
	{
		id: "status",
		header: "Status",
		width: "w-28",
		align: "center",
		editable: true,
		sortable: true,
	},
	{
		id: "amount",
		header: "Amount",
		width: "w-28",
		align: "right",
		editable: true,
		sortable: true,
	},
	{
		id: "balance",
		header: "Balance",
		width: "w-28",
		align: "right",
		editable: false,
		sortable: false,
	},
	{
		id: "actions",
		header: "",
		width: "w-20",
		align: "center",
		editable: false,
		sortable: false,
	},
];

/** Column IDs that can receive keyboard focus for navigation */
export const FOCUSABLE_COLUMNS: ColumnId[] = COLUMN_CONFIG.filter((col) => col.editable).map(
	(col) => col.id
);

/** Column IDs in display order */
export const COLUMN_IDS: ColumnId[] = COLUMN_CONFIG.map((col) => col.id);

/**
 * Get column definition by ID.
 * @param id - Column identifier
 * @returns Column definition or undefined if not found
 */
export function getColumnDef(id: ColumnId): ColumnDef | undefined {
	return COLUMN_CONFIG.find((col) => col.id === id);
}

/**
 * Get alignment class for a column.
 * @param id - Column identifier
 * @returns Tailwind text alignment class
 */
export function getAlignmentClass(id: ColumnId): string {
	const col = getColumnDef(id);
	if (!col) return "text-left";

	switch (col.align) {
		case "center":
			return "text-center";
		case "right":
			return "text-right";
		default:
			return "text-left";
	}
}

/**
 * Get the next focusable column in the specified direction.
 * @param currentColumn - Current column ID
 * @param direction - Navigation direction
 * @returns Next focusable column ID or null if at boundary
 */
export function getNextFocusableColumn(
	currentColumn: ColumnId,
	direction: "left" | "right"
): ColumnId | null {
	const currentIndex = FOCUSABLE_COLUMNS.indexOf(currentColumn);
	if (currentIndex === -1) return FOCUSABLE_COLUMNS[0] ?? null;

	const nextIndex = direction === "right" ? currentIndex + 1 : currentIndex - 1;

	if (nextIndex < 0 || nextIndex >= FOCUSABLE_COLUMNS.length) {
		return null;
	}

	return FOCUSABLE_COLUMNS[nextIndex] ?? null;
}
