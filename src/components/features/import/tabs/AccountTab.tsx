"use client";

/**
 * AccountTab
 *
 * Tab content for selecting target account for import.
 * Required for CSV imports, auto-selected for OFX when account number matches.
 */

import { AlertCircle, CheckCircle2, Landmark } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/lib/crdt/schema";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface AccountTabProps {
	/** Available accounts (not deleted) */
	accounts: Account[];
	/** Currently selected account ID */
	selectedAccountId: string | null;
	/** Callback when account is selected */
	onSelectAccount: (accountId: string) => void;
	/** Whether account selection is required (CSV files require it) */
	isRequired?: boolean;
	/** Auto-detected account number from OFX file */
	detectedAccountNumber?: string | null;
	/** Additional CSS classes */
	className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AccountTab component.
 */
export function AccountTab({
	accounts,
	selectedAccountId,
	onSelectAccount,
	isRequired = false,
	detectedAccountNumber,
	className,
}: AccountTabProps) {
	// Filter to active accounts only
	const activeAccounts = useMemo(() => accounts.filter((a) => !a.deletedAt), [accounts]);

	// Find selected account
	const selectedAccount = activeAccounts.find((a) => a.id === selectedAccountId);

	// Check if we have an auto-match situation
	const autoMatchedAccount = useMemo(() => {
		if (!detectedAccountNumber) return null;
		return activeAccounts.find((a) => a.accountNumber === detectedAccountNumber);
	}, [detectedAccountNumber, activeAccounts]);

	const hasSelection = selectedAccountId !== null;

	return (
		<div className={cn("space-y-4", className)}>
			<div className="space-y-2">
				<Label htmlFor="account-select">
					Target Account
					{isRequired && <span className="text-destructive ml-1">*</span>}
				</Label>
				<p className="text-sm text-muted-foreground">
					Select the account to import transactions into
				</p>
			</div>

			{/* Auto-matched notice */}
			{autoMatchedAccount && selectedAccountId === autoMatchedAccount.id && (
				<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 px-3 py-2 text-sm text-green-800 dark:text-green-200">
					<CheckCircle2 className="h-4 w-4 shrink-0" />
					<span>
						Auto-matched from OFX file (account ending in{" "}
						<code className="bg-green-100 dark:bg-green-900/50 px-1 rounded">
							{detectedAccountNumber?.slice(-4)}
						</code>
						)
					</span>
				</div>
			)}

			{/* Required but not selected warning */}
			{isRequired && !hasSelection && (
				<div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
					<AlertCircle className="h-4 w-4 shrink-0" />
					<span>An account must be selected to import transactions</span>
				</div>
			)}

			{/* Account selector */}
			<Select
				value={selectedAccountId ?? "__none__"}
				onValueChange={(v) => {
					if (v !== "__none__") {
						onSelectAccount(v);
					}
				}}
			>
				<SelectTrigger id="account-select" className="w-full">
					<SelectValue placeholder="Select an account..." />
				</SelectTrigger>
				<SelectContent>
					{!isRequired && (
						<SelectItem value="__none__" disabled>
							<span className="text-muted-foreground">Select an account...</span>
						</SelectItem>
					)}
					{activeAccounts.map((account) => (
						<SelectItem key={account.id} value={account.id}>
							<div className="flex items-center gap-2">
								<Landmark className="h-4 w-4 text-muted-foreground" />
								<span>{account.name}</span>
								{account.accountNumber && (
									<Badge variant="secondary" className="ml-1 text-xs">
										...{account.accountNumber.slice(-4)}
									</Badge>
								)}
								{autoMatchedAccount?.id === account.id && detectedAccountNumber && (
									<Badge
										variant="outline"
										className="ml-1 text-xs text-green-600 border-green-300 dark:text-green-400 dark:border-green-700"
									>
										Matched
									</Badge>
								)}
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Selected account info */}
			{selectedAccount && (
				<div className="rounded-lg border bg-muted/30 p-3 space-y-1">
					<div className="flex items-center gap-2">
						<Landmark className="h-4 w-4 text-muted-foreground" />
						<span className="font-medium">{selectedAccount.name}</span>
					</div>
					{selectedAccount.accountNumber && (
						<p className="text-xs text-muted-foreground pl-6">
							Account: •••• {selectedAccount.accountNumber.slice(-4)}
						</p>
					)}
					{selectedAccount.currency && (
						<p className="text-xs text-muted-foreground pl-6">
							Currency: {selectedAccount.currency}
						</p>
					)}
				</div>
			)}

			{/* No accounts warning */}
			{activeAccounts.length === 0 && (
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
					No accounts available. Create an account first before importing transactions.
				</div>
			)}
		</div>
	);
}
