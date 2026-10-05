"use client";

/**
 * AccountTab
 *
 * Tab content for selecting target account for import.
 * Uses AccountCombobox for selection with inline account creation.
 * Shows contextual messages based on OFX account action.
 */

import { AlertCircle, CheckCircle2, Info, Landmark, PlusCircle } from "lucide-react";
import { useMemo } from "react";

import { AccountCombobox } from "@/components/features/accounts/AccountCombobox";
import { Label } from "@/components/ui/label";
import type { Account } from "@/lib/crdt/schema";
import type { OFXAccountAction } from "@/lib/import/types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface AccountActionMessageProps {
    /** Account action to display */
    accountAction: OFXAccountAction;
    /** File type (csv or ofx) */
    fileType?: "csv" | "ofx";
    /** Detected account number from OFX file (for matched message) */
    detectedAccountNumber?: string | null;
    /** Target account name (for apply-id message) */
    targetAccountName?: string | null;
    /** Additional CSS classes */
    className?: string;
}

export type AccountTabAccount = Pick<
    Account,
    "accountNumber" | "currency" | "deletedAt" | "id" | "name"
>;

export interface AccountTabProps {
    /** Available accounts (not deleted) */
    accounts: readonly AccountTabAccount[];
    /** Currently selected account ID */
    selectedAccountId: string | null;
    /** Callback when account is selected */
    onSelectAccount: (accountId: string) => void;
    /** Whether account selection is required (CSV files require it) */
    isRequired?: boolean;
    /** Auto-detected account number from OFX file */
    detectedAccountNumber?: string | null;
    /** Account action to take on import (OFX only) */
    accountAction?: OFXAccountAction;
    /** Additional CSS classes */
    className?: string;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Display account action message based on OFX detection.
 * Can be used standalone or within AccountTab.
 */
export function AccountActionMessage({
    accountAction,
    fileType = "ofx",
    detectedAccountNumber,
    targetAccountName,
    className
}: AccountActionMessageProps) {
    if (!accountAction) return null;

    switch (accountAction.type) {
        case "matched":
            if (!detectedAccountNumber) return null;
            return (
                <div
                    className={cn(
                        "flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200",
                        className
                    )}
                >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                        Auto-matched account <strong>{targetAccountName ?? "Unknown"}</strong> from
                        OFX file (account ending in{" "}
                        <code className="rounded bg-green-100 px-1 dark:bg-green-900/50">
                            {detectedAccountNumber.slice(-4)}
                        </code>
                        )
                    </span>
                </div>
            );

        case "apply-id":
            return (
                <div
                    className={cn(
                        "flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
                        className
                    )}
                >
                    <Info className="h-4 w-4 shrink-0" />
                    <span>
                        Will link account <strong>{targetAccountName ?? "Unknown"}</strong> to OFX
                        account ID{" "}
                        <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/50">
                            ...{accountAction.accountNumber.slice(-4)}
                        </code>{" "}
                        on import
                    </span>
                </div>
            );

        case "create-new":
            return (
                <div
                    className={cn(
                        "flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-200",
                        className
                    )}
                >
                    <PlusCircle className="h-4 w-4 shrink-0" />
                    <span>
                        Will create new account &ldquo;{accountAction.accountName}&rdquo; linked to
                        OFX account ID{" "}
                        <code className="rounded bg-purple-100 px-1 dark:bg-purple-900/50">
                            ...{accountAction.accountNumber.slice(-4)}
                        </code>
                    </span>
                </div>
            );

        case "default-selected":
            return (
                <div
                    className={cn(
                        "flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
                        className
                    )}
                >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                        No account ID found in {fileType.toUpperCase()} file — defaulting to{" "}
                        <strong>{targetAccountName ?? "first account"}</strong>
                    </span>
                </div>
            );

        default:
            return null;
    }
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
    accountAction,
    className
}: AccountTabProps) {
    // Filter to active accounts only
    const activeAccounts = useMemo(() => accounts.filter((a) => !a.deletedAt), [accounts]);

    // Find selected account
    const selectedAccount = activeAccounts.find((a) => a.id === selectedAccountId);

    // Convert to AccountCombobox format
    const accountOptions = useMemo(
        () => activeAccounts.map((a) => ({ id: a.id, name: a.name })),
        [activeAccounts]
    );

    const hasSelection = selectedAccountId !== null;

    return (
        <div className={cn("space-y-4", className)}>
            <div className="space-y-2">
                <Label htmlFor="account-select">
                    Target Account
                    {isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                <p className="text-muted-foreground text-sm">
                    Select the account to import transactions into
                </p>
            </div>

            {/* Account action message based on OFX detection */}
            {accountAction && (
                <AccountActionMessage
                    accountAction={accountAction}
                    detectedAccountNumber={detectedAccountNumber}
                />
            )}

            {/* Required but not selected warning (for create-new case or CSV) */}
            {isRequired && !hasSelection && accountAction?.type !== "create-new" && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>An account must be selected to import transactions</span>
                </div>
            )}

            {/* Account selector using AccountCombobox */}
            <div id="account-select">
                <AccountCombobox
                    commitMode="immediate"
                    value={selectedAccountId ?? ""}
                    onChange={onSelectAccount}
                    accounts={accountOptions}
                    placeholder="Select an account..."
                    disabled={accountAction?.type === "create-new"}
                />
            </div>

            {/* Hint when create-new is active */}
            {accountAction?.type === "create-new" && (
                <p className="text-muted-foreground text-xs">
                    Select an existing account above to use it instead of creating a new one.
                </p>
            )}

            {/* Selected account info */}
            {selectedAccount && (
                <div className="bg-muted/30 space-y-1 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                        <Landmark className="text-muted-foreground h-4 w-4" />
                        <span className="font-medium">{selectedAccount.name}</span>
                    </div>
                    {selectedAccount.accountNumber && (
                        <p className="text-muted-foreground pl-6 text-xs">
                            Account: •••• {selectedAccount.accountNumber.slice(-4)}
                        </p>
                    )}
                    {selectedAccount.currency && (
                        <p className="text-muted-foreground pl-6 text-xs">
                            Currency: {selectedAccount.currency}
                        </p>
                    )}
                </div>
            )}

            {/* No accounts warning */}
            {activeAccounts.length === 0 && accountAction?.type !== "create-new" && (
                <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
                    No accounts available. Create an account first before importing transactions.
                </div>
            )}
        </div>
    );
}
