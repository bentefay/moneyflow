"use client";

/**
 * AccountCombobox Component
 *
 * A searchable combobox for selecting accounts with an option to create new accounts.
 * Uses shadcn's Command + Popover pattern for accessible autocomplete.
 */

import { CheckIcon, ChevronDownIcon, PlusCircleIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
    finishTransactionGridPopupEditing,
    TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS,
    type TransactionGridEditorLifecycle,
    useTransactionGridEditorLifecycle,
    useTransactionGridEditorPopupCancellation,
    useTransactionGridEditorPortalRef,
    useTransactionGridStartOpen
} from "@/components/features/transactions/cells/editor-lifecycle";
import type { TransactionId } from "@/components/features/transactions/table-model";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { CreateAccountDialog } from "./CreateAccountDialog";
import type { CreateAccountDialogGridOwner } from "./CreateAccountDialog";

export interface AccountOption {
    id: string;
    name: string;
    /** Currency code for the account (e.g., "USD", "EUR") */
    currency?: string;
}

interface AccountDraftState {
    readonly controlledValue: string;
    readonly draftValue: string;
}

export interface AccountComboboxProps {
    /** Whether selection publishes immediately or waits for the transaction editor lifecycle. */
    commitMode: "immediate" | "deferred";
    /** Currently selected account ID */
    value: string;
    /** Callback when selection changes */
    onChange: (accountId: string) => void;
    /** Completed printable quick-entry text used as the initial account query. */
    initialSearch?: string;
    /** Whether the picker opens immediately when its editor branch mounts. */
    startOpen?: boolean;
    /** Reports whether the account picker is actively open. */
    onEditingChange?: (editing: boolean) => void;
    /** Reports the controller-owned popup layer independently from edit focus. */
    onPopupOpenChange?: (popup: "combobox" | "modal", open: boolean) => void;
    /** Stable transaction row owning the portaled picker. */
    ownerTransactionId?: TransactionId;
    /** Available accounts */
    accounts: readonly AccountOption[];
    /** Placeholder text when no selection */
    placeholder?: string;
    /** Additional CSS classes */
    className?: string;
    /** Disable the combobox */
    disabled?: boolean;
}

/**
 * Searchable account selector with create option.
 */
export function AccountCombobox({
    commitMode,
    value,
    onChange,
    initialSearch = "",
    startOpen = false,
    onEditingChange,
    onPopupOpenChange,
    ownerTransactionId,
    accounts,
    placeholder = "Select account...",
    className,
    disabled = false
}: AccountComboboxProps) {
    const [open, setOpen] = useTransactionGridStartOpen(startOpen);
    const [search, setSearch] = useState(initialSearch);
    const [draftState, setDraftState] = useState<AccountDraftState>({
        controlledValue: value,
        draftValue: value
    });
    const currentDraftState =
        draftState.controlledValue === value
            ? draftState
            : {
                  controlledValue: value,
                  draftValue:
                      draftState.draftValue === draftState.controlledValue
                          ? value
                          : draftState.draftValue
              };
    if (currentDraftState !== draftState) setDraftState(currentDraftState);
    const draftAccountId = currentDraftState.draftValue;
    const setDraftAccountId = useCallback((draftValue: string) => {
        setDraftState((current) => ({ ...current, draftValue }));
    }, []);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const registerEditorPortal = useTransactionGridEditorPortalRef<HTMLDivElement>();
    const cancelGridPopupEditing = useTransactionGridEditorPopupCancellation();
    const createDialogGridOwner = useMemo<CreateAccountDialogGridOwner | undefined>(
        () =>
            ownerTransactionId == null
                ? undefined
                : { portalRef: registerEditorPortal, transactionId: ownerTransactionId },
        [ownerTransactionId, registerEditorPortal]
    );

    const cancelPicker = useCallback(() => {
        setOpen(false);
        setCreateDialogOpen(false);
        setSearch("");
        setDraftAccountId(value);
    }, [setDraftAccountId, setOpen, value]);
    const commitPicker = useCallback(() => {
        if (commitMode === "deferred" && draftAccountId !== value) onChange(draftAccountId);
        return TRANSACTION_GRID_EDITOR_COMMIT_SUCCESS;
    }, [commitMode, draftAccountId, onChange, value]);
    const editorLifecycle = useMemo<TransactionGridEditorLifecycle>(
        () => ({
            cancel: cancelPicker,
            commit: commitPicker,
            externalExitValidation: "controller"
        }),
        [cancelPicker, commitPicker]
    );
    useTransactionGridEditorLifecycle(editorLifecycle);

    const selectedAccount = accounts.find((account) => account.id === draftAccountId);

    useEffect(() => {
        if (!open) return;
        onEditingChange?.(true);
        onPopupOpenChange?.("combobox", true);
        return () => onPopupOpenChange?.("combobox", false);
    }, [onEditingChange, onPopupOpenChange, open]);

    // Filter accounts based on search
    const filteredAccounts = accounts.filter((account) =>
        account.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = useCallback(
        (accountId: string) => {
            setDraftAccountId(accountId);
            if (commitMode === "immediate") onChange(accountId);
            onPopupOpenChange?.("combobox", false);
            setOpen(false);
            setSearch("");
        },
        [commitMode, onChange, onPopupOpenChange, setDraftAccountId, setOpen]
    );

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            setOpen(nextOpen);
        },
        [setOpen]
    );

    const handleCreateNew = useCallback(() => {
        // Replace combobox ownership before either portal changes. The old popover's later cleanup is
        // kind-sensitive and cannot close the modal that now owns the same editor.
        onPopupOpenChange?.("modal", true);
        setCreateDialogOpen(true);
        setOpen(false);
    }, [onPopupOpenChange, setOpen]);

    const handleCreateDialogOpenChange = useCallback(
        (nextOpen: boolean) => {
            onPopupOpenChange?.("modal", nextOpen);
            setCreateDialogOpen(nextOpen);
        },
        [onPopupOpenChange]
    );

    const handleAccountCreated = useCallback(
        (accountId: string) => {
            setDraftAccountId(accountId);
            onChange(accountId);
            finishTransactionGridPopupEditing("modal", onPopupOpenChange, onEditingChange);
        },
        [onChange, onEditingChange, onPopupOpenChange, setDraftAccountId]
    );

    return (
        <>
            <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        data-legacy-edit-activation
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-label="Select account"
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between font-normal",
                            !value && "text-muted-foreground",
                            className
                        )}
                    >
                        <span className="truncate">{selectedAccount?.name ?? placeholder}</span>
                        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    ref={registerEditorPortal}
                    className="w-[200px] p-0"
                    align="start"
                    onEscapeKeyDown={(event) => {
                        if (cancelGridPopupEditing?.()) event.preventDefault();
                        event.stopPropagation();
                    }}
                    data-owned-by-row={ownerTransactionId}
                    data-owned-by-field="account"
                >
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search accounts..."
                            value={search}
                            onValueChange={setSearch}
                        />
                        <CommandList>
                            <CommandEmpty>No accounts found.</CommandEmpty>
                            {filteredAccounts.length > 0 && (
                                <CommandGroup>
                                    {filteredAccounts.map((account) => (
                                        <CommandItem
                                            key={account.id}
                                            value={account.id}
                                            onSelect={() => handleSelect(account.id)}
                                        >
                                            <CheckIcon
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    draftAccountId === account.id
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                            <span className="truncate">{account.name}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                            <CommandSeparator />
                            <CommandGroup>
                                <CommandItem onSelect={handleCreateNew}>
                                    <PlusCircleIcon className="mr-2 h-4 w-4" />
                                    Create new account
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <CreateAccountDialog
                open={createDialogOpen}
                onOpenChange={handleCreateDialogOpenChange}
                onCreated={handleAccountCreated}
                gridOwner={createDialogGridOwner}
            />
        </>
    );
}
