"use client";

/**
 * DescriptionAliasChangeModal
 *
 * Modal shown when editing a description alias that is shared across multiple transactions.
 * Offers "just this one" vs "all" options for both change and remove flows.
 */

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
}

export function DescriptionAliasChangeModal({
    open,
    onClose,
    mode,
    onJustThis,
    onAll
}: DescriptionAliasChangeModalProps) {
    const isChange = mode === "change";

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent showCloseButton={false}>
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
                    <Button variant="default" onClick={onJustThis} autoFocus>
                        {isChange ? "Change just this one" : "Remove from just this one"}
                    </Button>
                    <Button variant="outline" onClick={onAll}>
                        {isChange ? "Change all" : "Remove from all"}
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
