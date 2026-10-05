"use client";

/**
 * Transaction Table Toolbar
 *
 * Info bar above the transaction table showing counts and an "Add transaction" button.
 */

import { PanelRight, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TransactionTableToolbarProps {
    /** Callback when "Add transaction" is clicked */
    onAddClick: () => void;
    /** Whether the persistent transaction inspector is open. */
    inspectorOpen: boolean;
    /** Opens or closes the persistent transaction inspector. */
    onInspectorOpenChange: (open: boolean) => void;
    /** Shows a closed-panel badge while an automation proposal is pending. */
    automationPending?: boolean;
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
    inspectorOpen,
    onInspectorOpenChange,
    automationPending = false,
    selectedCount = 0,
    totalCount = 0,
    isFiltered = false,
    className
}: TransactionTableToolbarProps) {
    const pendingWhileClosed = automationPending && !inspectorOpen;
    const previousPendingWhileClosed = useRef(pendingWhileClosed);
    const [pendingAnnouncement, setPendingAnnouncement] = useState("");
    useEffect(() => {
        if (!previousPendingWhileClosed.current && pendingWhileClosed) {
            setPendingAnnouncement("Automation proposal pending in Inspector.");
        } else if (previousPendingWhileClosed.current && !pendingWhileClosed) {
            setPendingAnnouncement("");
        }
        previousPendingWhileClosed.current = pendingWhileClosed;
    }, [pendingWhileClosed]);

    return (
        <div
            className={cn(
                "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2",
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

            <Button
                aria-controls="transaction-inspector"
                aria-expanded={inspectorOpen}
                aria-label={
                    pendingWhileClosed ? "Inspector, automation proposal pending" : "Inspector"
                }
                className="text-muted-foreground hover:text-foreground gap-2"
                data-testid="transaction-inspector-toggle"
                onClick={() => onInspectorOpenChange(!inspectorOpen)}
                size="sm"
                type="button"
                variant="ghost"
            >
                <PanelRight className="h-4 w-4" />
                <span>Inspector</span>
                {pendingWhileClosed ? (
                    <span
                        aria-hidden="true"
                        className="bg-primary size-2 rounded-full"
                        data-testid="transaction-inspector-automation-badge"
                        title="Automation proposal pending"
                    />
                ) : null}
            </Button>
            <span
                aria-atomic="true"
                className="sr-only"
                data-testid="transaction-inspector-automation-status"
                role="status"
            >
                {pendingAnnouncement}
            </span>

            {/* Transaction counts */}
            <span className="text-muted-foreground ml-auto min-w-0 text-right text-sm">
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
