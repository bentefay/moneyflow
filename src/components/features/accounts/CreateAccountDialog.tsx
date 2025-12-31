"use client";

/**
 * CreateAccountDialog Component
 *
 * A modal dialog for creating new accounts. This component is designed to be
 * reusable from anywhere in the app (e.g., transaction form, imports, etc.).
 */

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useActivePeople, useVaultAction } from "@/lib/crdt/context";
import type { AccountInput } from "@/lib/crdt/schema";
import { createEqualOwnerships } from "@/lib/domain/ownership";

export interface CreateAccountDialogProps {
	/** Whether the dialog is open */
	open: boolean;
	/** Callback when dialog open state changes */
	onOpenChange: (open: boolean) => void;
	/** Callback when account is created, receives the new account ID */
	onCreated?: (accountId: string) => void;
}

/** Account type options */
const ACCOUNT_TYPES = [
	{ value: "checking", label: "Checking" },
	{ value: "savings", label: "Savings" },
	{ value: "credit", label: "Credit Card" },
	{ value: "cash", label: "Cash" },
	{ value: "loan", label: "Loan" },
	{ value: "investment", label: "Investment" },
] as const;

/**
 * Dialog for creating a new account.
 */
export function CreateAccountDialog({ open, onOpenChange, onCreated }: CreateAccountDialogProps) {
	const people = useActivePeople();

	const [name, setName] = useState("");
	const [accountType, setAccountType] = useState("checking");
	const [currency, setCurrency] = useState("USD");

	const addAccount = useVaultAction((state, data: AccountInput) => {
		state.accounts[data.id] = data as (typeof state.accounts)[string];
	});

	const handleCreate = useCallback(() => {
		const trimmedName = name.trim();
		if (!trimmedName) return;

		// Filter out $cid property from people keys (loro-mirror injects it)
		const personIds = Object.keys(people).filter((k) => k !== "$cid");
		const defaultOwnerships = personIds.length > 0 ? createEqualOwnerships(personIds) : {};

		const newAccountId = crypto.randomUUID();
		const newAccount: AccountInput = {
			id: newAccountId,
			name: trimmedName,
			accountNumber: "",
			accountType,
			currency,
			balance: 0,
			ownerships: defaultOwnerships,
			deletedAt: 0,
		};

		addAccount(newAccount);

		// Reset form
		setName("");
		setAccountType("checking");
		setCurrency("USD");

		// Close dialog and notify
		onOpenChange(false);
		onCreated?.(newAccountId);
	}, [name, accountType, currency, people, addAccount, onOpenChange, onCreated]);

	const handleCancel = useCallback(() => {
		setName("");
		setAccountType("checking");
		setCurrency("USD");
		onOpenChange(false);
	}, [onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create Account</DialogTitle>
					<DialogDescription>Add a new financial account to track transactions.</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					{/* Account Name */}
					<div className="grid gap-2">
						<Label htmlFor="account-name">Name</Label>
						<Input
							id="account-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Main Checking"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === "Enter" && name.trim()) {
									e.preventDefault();
									handleCreate();
								}
							}}
						/>
					</div>

					{/* Account Type */}
					<div className="grid gap-2">
						<Label htmlFor="account-type">Type</Label>
						<Select value={accountType} onValueChange={setAccountType}>
							<SelectTrigger id="account-type">
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								{ACCOUNT_TYPES.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Currency */}
					<div className="grid gap-2">
						<Label htmlFor="account-currency">Currency</Label>
						<Select value={currency} onValueChange={setCurrency}>
							<SelectTrigger id="account-currency">
								<SelectValue placeholder="Select currency" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="USD">USD - US Dollar</SelectItem>
								<SelectItem value="EUR">EUR - Euro</SelectItem>
								<SelectItem value="GBP">GBP - British Pound</SelectItem>
								<SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
								<SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
								<SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={!name.trim()}>
						Create Account
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
