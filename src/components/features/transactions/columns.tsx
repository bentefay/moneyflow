"use client";

/**
 * TanStack Table column definitions for transactions.
 *
 * Uses @tanstack/react-table for selection and state management,
 * combined with shadcn/ui Checkbox for consistent UI.
 */

import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import type { TransactionRowData } from "./TransactionRow";

/**
 * Creates column definitions for the transaction table.
 */
export function createColumns(): ColumnDef<TransactionRowData>[] {
	return [
		// Selection column - uses TanStack Table's built-in selection
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
					data-testid="header-checkbox"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label={`Select transaction ${row.original.merchant}`}
					data-testid="row-checkbox"
				/>
			),
			enableSorting: false,
			enableHiding: false,
			size: 40,
		},
		// Date column
		{
			accessorKey: "date",
			header: "Date",
			size: 96,
		},
		// Merchant column
		{
			accessorKey: "merchant",
			header: "Merchant",
			size: undefined, // flex
		},
		// Tags column
		{
			id: "tags",
			header: "Tags",
			size: 128,
			cell: ({ row }) => {
				const tags = row.original.tags || [];
				if (tags.length === 0) return <span className="text-muted-foreground">Add tags...</span>;
				return tags.map((t) => t.name).join(", ");
			},
		},
		// Status column
		{
			accessorKey: "status",
			header: "Status",
			size: 96,
		},
		// Amount column
		{
			accessorKey: "amount",
			header: () => <div className="text-right">Amount</div>,
			cell: ({ row }) => {
				const amount = row.original.amount;
				const formatted = new Intl.NumberFormat("en-US", {
					style: "currency",
					currency: "USD",
				}).format(amount / 100);
				return <div className="text-right font-medium">{formatted}</div>;
			},
			size: 112,
		},
		// Balance column
		{
			accessorKey: "balance",
			header: () => <div className="text-right">Balance</div>,
			cell: ({ row }) => {
				const balance = row.original.balance;
				if (balance === undefined) return null;
				const formatted = new Intl.NumberFormat("en-US", {
					style: "currency",
					currency: "USD",
				}).format(balance / 100);
				return <div className="text-right">{formatted}</div>;
			},
			size: 112,
		},
	];
}
