"use client";

/**
 * Transaction Table Toolbar
 *
 * Info bar above the transaction table showing counts and an "Add transaction" button.
 */

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TransactionTableToolbarProps {
    /** Callback when "Add transaction" is clicked */
    onAddClick: () => void;
    /** Number of selected transactions */
    selectedCount?: number;
    /** Total number of transactions (after filtering) */
    totalCount?: number;
    /** Whether filters are currently active */
    isFiltered?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Toolbar above the transaction table with add button and counts.
 */
export function TransactionTableToolbar({
    onAddClick,
    selectedCount = 0,
    totalCount = 0,
    isFiltered = false,
    className
}: TransactionTableToolbarProps) {
    return (
        <div
            className={cn(
                "flex min-w-fit items-center gap-4 border-b px-4 py-2",
                "bg-muted/30",
                className
            )}
            data-testid="transaction-table-toolbar"
        >
            {/* Add transaction button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onAddClick}
                className="text-muted-foreground hover:text-foreground gap-2"
                data-testid="add-transaction-button"
            >
                <Plus className="h-4 w-4" />
                <span>Add transaction</span>
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Transaction counts */}
            <span className="text-muted-foreground text-sm">
                {totalCount} transaction{totalCount !== 1 ? "s" : ""}
                {isFiltered && " (filtered)"}
                {selectedCount > 0 && (
                    <span className="text-foreground ml-2 font-medium">
                        · {selectedCount} selected
                    </span>
                )}
            </span>
        </div>
    );
}
