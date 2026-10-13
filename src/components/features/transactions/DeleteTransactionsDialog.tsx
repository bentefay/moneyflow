"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";

export interface DeleteTransactionsDialogProps {
    /** How many transactions would be deleted; the dialog is open while this is set. */
    count: number | null;
    onCancel: () => void;
    onConfirm: () => void;
}

/** Confirms the "Delete selected transactions" command before anything is written. */
export function DeleteTransactionsDialog({
    count,
    onCancel,
    onConfirm
}: DeleteTransactionsDialogProps) {
    const noun = count === 1 ? "transaction" : "transactions";
    return (
        <AlertDialog
            open={count != null}
            onOpenChange={(open) => {
                if (!open) onCancel();
            }}
        >
            <AlertDialogContent data-testid="delete-transactions-dialog">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Delete {count} {noun}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        The selected {noun} will be removed. You can undo this as one action.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={onConfirm}
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
