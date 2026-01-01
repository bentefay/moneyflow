"use client";

/**
 * Inline Editable Account
 *
 * Spreadsheet-style always-editable account dropdown.
 * Uses shadcn Select for consistent styling.
 */

import { useCallback, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AccountOption {
	id: string;
	name: string;
}

export interface InlineEditableAccountProps {
	/** Current account ID */
	value: string | undefined;
	/** Current account name for display */
	accountName?: string;
	/** All available accounts for selection */
	availableAccounts: AccountOption[];
	/** Callback when value is saved */
	onSave: (newAccountId: string) => void;
	/** Additional class names for the container */
	className?: string;
	/** Whether editing is disabled */
	disabled?: boolean;
	/** Test ID for testing */
	"data-testid"?: string;
}

/**
 * Spreadsheet-style always-editable account dropdown.
 *
 * - Click to open dropdown
 * - Change selection to save immediately
 * - Tab to move to next cell
 */
export function InlineEditableAccount({
	value,
	availableAccounts,
	onSave,
	className,
	disabled = false,
	"data-testid": testId,
}: InlineEditableAccountProps) {
	const [open, setOpen] = useState(false);

	const handleValueChange = useCallback(
		(newValue: string) => {
			if (newValue && newValue !== value) {
				onSave(newValue);
			}
		},
		[value, onSave]
	);

	const handleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent row selection
	}, []);

	return (
		<div onClick={handleClick} className={cn("w-full", className)}>
			<Select
				value={value ?? ""}
				onValueChange={handleValueChange}
				disabled={disabled}
				open={open}
				onOpenChange={setOpen}
			>
				<SelectTrigger
					data-testid={testId}
					size="sm"
					className={cn(
						"h-7 w-full border-transparent bg-transparent px-1 text-muted-foreground shadow-none",
						"hover:bg-accent/30",
						"focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary",
						disabled && "cursor-not-allowed opacity-50"
					)}
				>
					<SelectValue placeholder="Select account..." />
				</SelectTrigger>
				<SelectContent align="start">
					{availableAccounts.map((account) => (
						<SelectItem key={account.id} value={account.id}>
							{account.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
