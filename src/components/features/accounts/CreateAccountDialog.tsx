"use client";

/**
 * CreateAccountDialog Component
 *
 * A modal dialog for creating new accounts. This component is designed to be
 * reusable from anywhere in the app (e.g., transaction form, imports, etc.).
 */

import { useCallback, useMemo, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useActivePeople, useVaultAction } from "@/lib/crdt/context";
import type { AccountInput } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";
import { createEqualOwnerships } from "@/lib/domain/ownership";
import { ACCOUNT_TYPES, AccountTypeSchema, asPercentage, type AccountType } from "@/types";

export interface CreateAccountDialogGridOwner {
    readonly portalRef: RefCallback<HTMLDivElement>;
    readonly transactionId: TransactionId;
}

export interface CreateAccountDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
    /** Callback when account is created, receives the new account ID */
    onCreated?: (accountId: string) => void;
    /** Atomic transaction-grid ownership for the dialog and every nested portal. */
    gridOwner?: CreateAccountDialogGridOwner;
}

/** Account type options */
const ACCOUNT_TYPE_LABELS: Readonly<Record<AccountType, string>> = {
    checking: "Checking",
    savings: "Savings",
    credit: "Credit Card",
    cash: "Cash",
    loan: "Loan"
};
const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPES.map((value) => ({
    value,
    label: ACCOUNT_TYPE_LABELS[value]
}));

/**
 * Dialog for creating a new account.
 */
export function CreateAccountDialog({
    open,
    onOpenChange,
    onCreated,
    gridOwner
}: CreateAccountDialogProps) {
    const people = useActivePeople();
    const nameInputRef = useRef<HTMLInputElement>(null);
    const overlayProps = useMemo(
        () =>
            gridOwner == null
                ? undefined
                : {
                      ref: gridOwner.portalRef,
                      "data-owned-by-field": "account",
                      "data-owned-by-row": gridOwner.transactionId
                  },
        [gridOwner]
    );

    const [name, setName] = useState("");
    const [accountType, setAccountType] = useState<AccountType>("checking");
    const [currency, setCurrency] = useState("USD");

    const addAccount = useVaultAction((state, data: AccountInput) => {
        state.accounts[data.id] = data as (typeof state.accounts)[string];
    });

    const resetForm = useCallback(() => {
        setName("");
        setAccountType("checking");
        setCurrency("USD");
    }, []);
    const handleDialogOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen) resetForm();
            onOpenChange(nextOpen);
        },
        [onOpenChange, resetForm]
    );

    const handleCreate = useCallback(() => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        // Filter out $cid property from people keys (loro-mirror injects it)
        const personIds = Object.keys(people).filter((k) => k !== "$cid");
        const defaultOwnerships = personIds.length > 0 ? createEqualOwnerships(personIds) : {};

        const newAccountId = crypto.randomUUID();
        const ownershipsAsPercentage = Object.fromEntries(
            Object.entries(defaultOwnerships).map(([k, v]) => [k, asPercentage(v)])
        );
        const newAccount: AccountInput = {
            id: newAccountId,
            name: trimmedName,
            accountNumber: "",
            accountType,
            currency,
            balance: asMinorUnits(0),
            ownerships: ownershipsAsPercentage,
            deletedAt: undefined
        };

        addAccount(newAccount);
        handleDialogOpenChange(false);
        onCreated?.(newAccountId);
    }, [name, people, accountType, currency, addAccount, handleDialogOpenChange, onCreated]);

    const handleCancel = useCallback(() => handleDialogOpenChange(false), [handleDialogOpenChange]);
    const handleAccountTypeChange = useCallback((value: string) => {
        const accountTypeResult = AccountTypeSchema.safeParse(value);
        if (accountTypeResult.success) setAccountType(accountTypeResult.data);
    }, []);

    return (
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
            <DialogContent
                ref={gridOwner?.portalRef}
                overlayProps={overlayProps}
                className="sm:max-w-md"
                onEscapeKeyDown={(event) => event.stopPropagation()}
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    nameInputRef.current?.focus();
                }}
                data-owned-by-field={gridOwner == null ? undefined : "account"}
                data-owned-by-row={gridOwner?.transactionId}
            >
                <DialogHeader>
                    <DialogTitle>Create Account</DialogTitle>
                    <DialogDescription>
                        Add a new financial account to track transactions.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Account Name */}
                    <div className="grid gap-2">
                        <Label htmlFor="account-name">Name</Label>
                        <Input
                            ref={nameInputRef}
                            id="account-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Main Checking"
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
                        <Select value={accountType} onValueChange={handleAccountTypeChange}>
                            <SelectTrigger id="account-type">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent
                                ref={gridOwner?.portalRef}
                                onEscapeKeyDown={(event) => event.stopPropagation()}
                                data-owned-by-row={gridOwner?.transactionId}
                                data-owned-by-field={gridOwner == null ? undefined : "account"}
                                data-transaction-grid-nested-widget
                            >
                                {ACCOUNT_TYPE_OPTIONS.map((type) => (
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
                            <SelectContent
                                ref={gridOwner?.portalRef}
                                onEscapeKeyDown={(event) => event.stopPropagation()}
                                data-owned-by-row={gridOwner?.transactionId}
                                data-owned-by-field={gridOwner == null ? undefined : "account"}
                                data-transaction-grid-nested-widget
                            >
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
