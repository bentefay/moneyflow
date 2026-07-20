"use client";

/**
 * DescriptionAliasChangeModal
 *
 * Modal shown when editing a description alias that is shared across multiple transactions.
 * Offers "just this one" vs "all" options for both change and remove flows.
 */

import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

export interface DescriptionAliasChangeModalProps {
    open: boolean;
    onClose: () => void;
    mode: "change" | "remove";
    onJustThis: () => void;
    onAll: () => void;
    /** Restore focus and caret after every modal exit. */
    onRestoreFocus: () => void;
}

export function DescriptionAliasChangeModal({
    open,
    onClose,
    mode,
    onJustThis,
    onAll,
    onRestoreFocus
}: DescriptionAliasChangeModalProps) {
    const isChange = mode === "change";
    const firstActionRef = useRef<HTMLButtonElement>(null);
    const handledRef = useRef(false);

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
                showCloseButton={false}
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
                        onClick={() => runOnce(onJustThis)}
                    >
                        {isChange ? "Change just this one" : "Remove from just this one"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => runOnce(onAll)}>
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
