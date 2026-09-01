"use client";

/**
 * DescriptionAliasChangeModal
 *
 * Modal shown when editing a description alias that is shared across multiple transactions.
 * Offers "just this one" vs "all" options for both change and remove flows.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RefCallback } from "react";

import type { TransactionId } from "@/components/features/transactions/table-model";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

export type DescriptionAliasModalDecision = "one" | "all";

export interface DescriptionAliasModalGridOwner {
    readonly portalRef: RefCallback<HTMLDivElement>;
    readonly transactionId: TransactionId;
}

export interface DescriptionAliasChangeModalProps {
    open: boolean;
    onClose: () => void;
    mode: "change" | "remove";
    onDecision: (decision: DescriptionAliasModalDecision) => void;
    /** Restore focus and caret after every modal exit. */
    onRestoreFocus: () => void;
    /** Atomic ownership for the page-level content and overlay portals. */
    gridOwner?: DescriptionAliasModalGridOwner;
}

export function DescriptionAliasChangeModal({
    open,
    onClose,
    mode,
    onDecision,
    onRestoreFocus,
    gridOwner
}: DescriptionAliasChangeModalProps) {
    const isChange = mode === "change";
    const firstActionRef = useRef<HTMLButtonElement>(null);
    const handledRef = useRef(false);
    const overlayProps = useMemo(
        () =>
            gridOwner == null
                ? undefined
                : {
                      ref: gridOwner.portalRef,
                      "data-owned-by-field": "description",
                      "data-owned-by-row": gridOwner.transactionId
                  },
        [gridOwner]
    );

    useEffect(() => {
        if (open) handledRef.current = false;
    }, [open]);

    const runOnce = useCallback((action: () => void) => {
        if (handledRef.current) return;
        handledRef.current = true;
        action();
    }, []);

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen && !handledRef.current) onClose();
            }}
        >
            <DialogContent
                ref={gridOwner?.portalRef}
                overlayProps={overlayProps}
                showCloseButton={false}
                data-owned-by-row={gridOwner?.transactionId}
                data-owned-by-field={gridOwner == null ? undefined : "description"}
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    firstActionRef.current?.focus();
                }}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    onRestoreFocus();
                }}
            >
                <DialogHeader>
                    <DialogTitle>
                        {isChange ? "Change Description" : "Remove Description"}
                    </DialogTitle>
                    <DialogDescription>
                        {isChange
                            ? "This description is shared with other transactions. How would you like to apply the change?"
                            : "This description is shared with other transactions. How would you like to remove it?"}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    <Button
                        ref={firstActionRef}
                        type="button"
                        variant="default"
                        onClick={() => runOnce(() => onDecision("one"))}
                    >
                        {isChange ? "Change just this one" : "Remove from just this one"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => runOnce(() => onDecision("all"))}
                    >
                        {isChange ? "Change all" : "Remove from all"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => runOnce(onClose)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
