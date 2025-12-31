"use client";

import { Trash2 } from "lucide-react";
import { Temporal } from "temporal-polyfill";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

export interface ImportData {
	id: string;
	filename: string;
	transactionCount: number;
	createdAt: number;
	deletedAt?: number;
}

interface ImportRowProps {
	import_: ImportData;
	onDelete: (id: string) => void;
}

/**
 * Format a timestamp as a relative date string.
 * Uses Temporal API for date handling.
 */
function formatRelativeDate(timestamp: number): string {
	const now = Temporal.Now.instant();
	const then = Temporal.Instant.fromEpochMilliseconds(timestamp);
	const nowDate = now.toZonedDateTimeISO(Temporal.Now.timeZoneId()).toPlainDate();
	const thenDate = then.toZonedDateTimeISO(Temporal.Now.timeZoneId()).toPlainDate();

	const daysDiff = nowDate.since(thenDate).days;

	if (daysDiff === 0) {
		return "today";
	} else if (daysDiff === 1) {
		return "yesterday";
	} else if (daysDiff < 7) {
		return `${daysDiff} days ago`;
	} else if (daysDiff < 30) {
		const weeks = Math.floor(daysDiff / 7);
		return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
	} else if (daysDiff < 365) {
		const months = Math.floor(daysDiff / 30);
		return `${months} month${months > 1 ? "s" : ""} ago`;
	} else {
		// Just show the date for older imports
		return thenDate.toString();
	}
}

/**
 * Renders a single import record row with metadata and delete action.
 *
 * Displays:
 * - Filename
 * - Transaction count
 * - Import date (relative format)
 * - Delete button
 */
export function ImportRow({ import_, onDelete }: ImportRowProps) {
	const formattedDate = formatRelativeDate(import_.createdAt);

	return (
		<TableRow data-testid={`import-row-${import_.id}`}>
			<TableCell className="font-medium">{import_.filename}</TableCell>
			<TableCell className="text-right tabular-nums">{import_.transactionCount}</TableCell>
			<TableCell className="text-muted-foreground">{formattedDate}</TableCell>
			<TableCell className="text-right">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => onDelete(import_.id)}
					aria-label={`Delete import ${import_.filename}`}
					data-testid={`delete-import-${import_.id}`}
				>
					<Trash2 className="h-4 w-4 text-destructive" />
				</Button>
			</TableCell>
		</TableRow>
	);
}
