"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	filename: string;
	transactionCount: number;
	onConfirm: () => void;
}

/**
 * Confirmation dialog for deleting an import batch.
 *
 * Warns the user about the destructive action and shows how many
 * transactions will be deleted along with the import.
 */
export function DeleteImportDialog({
	open,
	onOpenChange,
	filename,
	transactionCount,
	onConfirm,
}: DeleteImportDialogProps) {
	const handleConfirm = () => {
		onConfirm();
		onOpenChange(false);
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Import</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete the import{" "}
						<span className="font-medium text-foreground">{filename}</span>?
						<br />
						<br />
						This will also delete{" "}
						<span className="font-medium text-foreground">
							{transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
						</span>{" "}
						that were imported with it.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						data-testid="confirm-delete-import"
					>
						Delete Import
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
