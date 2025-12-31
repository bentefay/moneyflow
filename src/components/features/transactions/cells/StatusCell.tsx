"use client";

/**
 * Status Cell
 *
 * Displays and allows editing of a transaction's status.
 * Shows dropdown for status selection with color-coded pills.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface StatusData {
	id: string;
	name: string;
	behavior?: "treatAsPaid" | null;
}

export interface StatusCellProps {
	/** The selected status */
	status: StatusData | null;
	/** All available statuses for selection */
	availableStatuses?: StatusData[];
	/** Whether the cell is in edit mode */
	isEditing?: boolean;
	/** Callback when the status changes */
	onChange?: (statusId: string) => void;
	/** Callback when editing starts */
	onEditStart?: () => void;
	/** Callback when editing ends */
	onEditEnd?: () => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Get pill styling based on status name or behavior.
 */
function getStatusStyle(status: StatusData | null): string {
	if (!status) {
		return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
	}

	const name = status.name.toLowerCase();

	// Check for specific behaviors
	if (status.behavior === "treatAsPaid") {
		return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
	}

	// Check for common status names
	if (name.includes("paid") || name.includes("complete")) {
		return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
	}
	if (name.includes("pending") || name.includes("review")) {
		return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
	}
	if (name.includes("cancel") || name.includes("void")) {
		return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
	}

	return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
}

/**
 * Status cell component with dropdown editing.
 */
export function StatusCell({
	status,
	availableStatuses = [],
	isEditing = false,
	onChange,
	onEditStart,
	onEditEnd,
	className,
}: StatusCellProps) {
	const [selectedId, setSelectedId] = useState(status?.id ?? "");
	const selectRef = useRef<HTMLSelectElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Sync selected ID with prop when status changes from parent
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- Sync controlled value with prop
		setSelectedId(status?.id ?? "");
	}, [status]);

	// Focus select when editing starts
	useEffect(() => {
		if (isEditing && selectRef.current) {
			selectRef.current.focus();
		}
	}, [isEditing]);

	const handleDoubleClick = () => {
		onEditStart?.();
	};

	const handleSave = useCallback(() => {
		if (selectedId !== status?.id) {
			onChange?.(selectedId);
		}
		onEditEnd?.();
	}, [selectedId, status?.id, onChange, onEditEnd]);

	// Handle click outside to close
	useEffect(() => {
		if (!isEditing) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				handleSave();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isEditing, handleSave]);

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedId(e.target.value);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSave();
		} else if (e.key === "Escape") {
			setSelectedId(status?.id ?? "");
			onEditEnd?.();
		}
	};

	if (isEditing) {
		return (
			<div ref={containerRef} className={cn("w-32", className)}>
				<select
					ref={selectRef}
					value={selectedId}
					onChange={handleChange}
					onBlur={handleSave}
					onKeyDown={handleKeyDown}
					className={cn(
						"w-full rounded border px-2 py-1 text-sm",
						"focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
					)}
				>
					<option value="">Select status...</option>
					{availableStatuses.map((s) => (
						<option key={s.id} value={s.id}>
							{s.name}
						</option>
					))}
				</select>
			</div>
		);
	}

	return (
		<div
			onDoubleClick={handleDoubleClick}
			className={cn(
				"w-24 shrink-0 cursor-pointer",
				"transition-opacity hover:opacity-80",
				className
			)}
		>
			{status ? (
				<span className={cn("rounded-full px-2 py-0.5 text-xs", getStatusStyle(status))}>
					{status.name}
				</span>
			) : (
				<span className="text-muted-foreground text-xs italic">No status</span>
			)}
		</div>
	);
}
