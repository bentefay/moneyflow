"use client";

/**
 * New Import Page
 *
 * Page for importing transactions from CSV/OFX files.
 * Uses the new ImportPanel with tabbed configuration.
 */

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Temporal } from "temporal-polyfill";

import {
    type ImportContext,
    ImportPanel,
    type ImportTransactionData,
} from "@/components/features/import/ImportPanel";
import {
    useActiveAccounts,
    useActiveStatuses,
    useActiveTransactions,
    useImportTemplates,
    useTransactionActions,
    useVaultAction,
    useVaultPreferences,
} from "@/lib/crdt/context";
import { DEFAULT_CURRENCY } from "@/lib/crdt/defaults";
import { type InsertTransactionInput, insertTransaction } from "@/lib/crdt/mutations";
import { findTransactionById } from "@/lib/crdt/queries";
import type {
    Account,
    ImportTemplate as ImportTemplateRecord,
    Status,
    Transaction,
} from "@/lib/crdt/schema";
import { asMinorUnits, type MoneyMinorUnits } from "@/lib/domain/currency";
import type { ImportConfig } from "@/lib/import/types";

/** Generate unique ID */
function generateId(): string {
    return crypto.randomUUID();
}

/**
 * New import page component.
 */
export default function NewImportPage() {
    const router = useRouter();

    // Lazy initialize initial file from sessionStorage (only runs once on mount)
    const [initialFile] = useState<File | null>(() => {
        // Check if we're on the client
        if (typeof window === "undefined") return null;

        const pending = sessionStorage.getItem("pendingImportFile");
        if (!pending) return null;

        sessionStorage.removeItem("pendingImportFile");
        try {
            const { name, content, type } = JSON.parse(pending);
            const blob = new Blob([content], { type: type || "text/plain" });
            return new File([blob], name, { type: type || "text/plain" });
        } catch {
            return null;
        }
    });

    // Get data from vault
    const transactions = useActiveTransactions();
    const accounts = useActiveAccounts();
    const statuses = useActiveStatuses();
    const importTemplates = useImportTemplates();
    const preferences = useVaultPreferences();

    // Default currency
    const defaultCurrency = preferences?.defaultCurrency ?? DEFAULT_CURRENCY;

    // Get default status ID (first status marked as default, or first status)
    const defaultStatusId = useMemo(() => {
        const defaultStatus = Object.values(statuses).find(
            (s): s is Status & { $cid: string } => typeof s === "object" && s.isDefault
        );
        return defaultStatus?.id ?? Object.keys(statuses)[0] ?? "";
    }, [statuses]);

    // Actions
    const addImportTemplate = useVaultAction((state, data: ImportTemplateRecord) => {
        state.importTemplates[data.id] = data as (typeof state.importTemplates)[string];
    });

    const updateImportTemplate = useVaultAction(
        (state, data: { id: string; config: ImportConfig; fileType: "csv" | "ofx" }) => {
            const template = state.importTemplates[data.id];
            if (template && typeof template === "object") {
                // Only update column mappings for CSV files (OFX has fixed mappings)
                if (data.fileType === "csv") {
                    template.columnMappings = data.config
                        .columnMappings as unknown as (typeof template)["columnMappings"];
                    // Update all formatting for CSV
                    template.formatting = data.config
                        .formatting as unknown as (typeof template)["formatting"];
                } else {
                    // For OFX, only update collapseWhitespace
                    template.formatting.collapseWhitespace =
                        data.config.formatting.collapseWhitespace;
                }
                template.duplicateDetection = data.config
                    .duplicateDetection as unknown as (typeof template)["duplicateDetection"];
                template.oldTransactionFilter = data.config
                    .oldTransactionFilter as unknown as (typeof template)["oldTransactionFilter"];
                template.lastUsedAt = Temporal.Now.instant();
            }
        }
    );

    const deleteImportTemplate = useVaultAction((state, id: string) => {
        const template = state.importTemplates[id];
        if (template && typeof template === "object") {
            template.deletedAt = Temporal.Now.instant();
        }
    });

    // Account actions for OFX import
    const createAccount = useVaultAction(
        (
            state,
            data: {
                id: string;
                name: string;
                accountNumber: string;
                currency: string;
            }
        ) => {
            state.accounts[data.id] = {
                id: data.id,
                name: data.name,
                accountNumber: data.accountNumber,
                currency: data.currency,
            } as unknown as (typeof state.accounts)[string];
        }
    );

    const updateAccountNumber = useVaultAction(
        (state, data: { accountId: string; accountNumber: string }) => {
            const account = state.accounts[data.accountId];
            if (account && typeof account === "object") {
                account.accountNumber = data.accountNumber;
            }
        }
    );

    // Create import batch and transactions in CRDT
    const createImportBatch = useVaultAction(
        (
            state,
            data: {
                importId: string;
                fileName: string;
                creationInstant: Temporal.Instant;
                transactions: Array<{
                    id: string;
                    date: Temporal.PlainDate;
                    description: string;
                    amount: MoneyMinorUnits;
                    accountId: string;
                    statusId: string;
                    importRowIndex: number;
                    duplicateOf: string | null;
                }>;
            }
        ) => {
            // Create import record
            state.imports[data.importId] = {
                id: data.importId,
                filename: data.fileName,
                transactionCount: data.transactions.length,
                createdAt: data.creationInstant,
            } as unknown as (typeof state.imports)[string];

            // Create transactions using hierarchical structure
            for (const tx of data.transactions) {
                // If this is a duplicate, find the parent transaction location to nest under
                let suspectedDuplicateOf = undefined;
                if (tx.duplicateOf) {
                    const parentResult = findTransactionById(state.transactions, tx.duplicateOf);
                    if (parentResult) {
                        suspectedDuplicateOf = {
                            accountId: parentResult.transaction.accountId,
                            date: parentResult.transaction.date,
                            transactionId: parentResult.transaction.id,
                        };
                    }
                }

                insertTransaction(state.transactions, {
                    transaction: {
                        id: tx.id,
                        date: tx.date,
                        description: tx.description,
                        notes: "",
                        amount: tx.amount,
                        accountId: tx.accountId,
                        tagIds: [],
                        statusId: tx.statusId,
                        importId: data.importId,
                        allocations: {},
                        creationInstant: data.creationInstant,
                        importRowIndex: tx.importRowIndex,
                    } as unknown as InsertTransactionInput["transaction"],
                    suspectedDuplicateOf,
                });
            }
        }
    );

    // Get existing transactions - already filtered for active only
    const existingTransactions = transactions;

    // Convert CRDT accounts to array
    const accountsList = useMemo(() => {
        return Object.values(accounts).filter(
            (a): a is Account => typeof a === "object" && a !== null && !a.deletedAt
        );
    }, [accounts]);

    // Convert CRDT templates to array
    const templatesList = useMemo(() => {
        return Object.values(importTemplates).filter(
            (t): t is ImportTemplateRecord => typeof t === "object" && t !== null && !t.deletedAt
        );
    }, [importTemplates]);

    // Handle creating transactions from import
    const handleCreateTransactions = useCallback(
        (
            transactionData: ImportTransactionData[],
            fileName: string,
            context: ImportContext
        ): string => {
            const importId = generateId();

            // Handle account action first (create or update account)
            let accountIdToUse = transactionData[0]?.accountId;

            if (context.accountAction?.type === "create-new") {
                // Create new account with detected ID
                const newAccountId = generateId();
                createAccount({
                    id: newAccountId,
                    name: context.accountAction.accountName,
                    accountNumber: context.accountAction.accountNumber,
                    currency: defaultCurrency,
                });
                accountIdToUse = newAccountId;
            } else if (context.accountAction?.type === "apply-id") {
                // Update existing account with detected ID
                updateAccountNumber({
                    accountId: context.accountAction.accountId,
                    accountNumber: context.accountAction.accountNumber,
                });
            }

            // Map import data to full transaction records with row indices
            const creationInstant = Temporal.Now.instant();
            const transactionsToCreate = transactionData.map((tx, index) => ({
                id: generateId(),
                date: Temporal.PlainDate.from(tx.date),
                description: tx.description,
                amount: asMinorUnits(tx.amount),
                accountId: accountIdToUse ?? tx.accountId,
                statusId: defaultStatusId,
                importRowIndex: index,
                duplicateOf: tx.duplicateOf,
            }));

            // Create import batch and all transactions in one action
            createImportBatch({
                importId,
                fileName,
                creationInstant,
                transactions: transactionsToCreate,
            });

            return importId;
        },
        [createImportBatch, createAccount, updateAccountNumber, defaultStatusId, defaultCurrency]
    );

    // Handle import complete - navigate to transactions
    const handleImportComplete = useCallback(() => {
        router.push("/transactions");
    }, [router]);

    // Handle cancel - navigate back to imports list
    const handleCancel = useCallback(() => {
        router.push("/imports");
    }, [router]);

    // Handle save template (with config from ImportPanel)
    // For OFX files, we don't save column mappings or CSV-specific formatting (they're fixed/irrelevant)
    const handleSaveTemplate = useCallback(
        (name: string, config: ImportConfig, fileType: "csv" | "ofx") => {
            addImportTemplate({
                id: generateId(),
                name,
                // Only save column mappings for CSV files
                columnMappings: fileType === "csv" ? config.columnMappings : {},
                // For OFX, only save collapseWhitespace; for CSV, save all formatting
                formatting:
                    fileType === "csv"
                        ? config.formatting
                        : {
                              hasHeaders: true, // default
                              thousandSeparator: ",", // default
                              decimalSeparator: ".", // default
                              dateFormat: "yyyy-MM-dd", // default
                              collapseWhitespace: config.formatting.collapseWhitespace,
                          },
                duplicateDetection: config.duplicateDetection,
                oldTransactionFilter: config.oldTransactionFilter,
                lastUsedAt: Temporal.Now.instant(),
            } as unknown as ImportTemplateRecord);
        },
        [addImportTemplate]
    );

    // Handle update template (for auto-update on import)
    // For OFX files, we don't update column mappings (they're fixed)
    const handleUpdateTemplate = useCallback(
        (templateId: string, config: ImportConfig, fileType: "csv" | "ofx") => {
            updateImportTemplate({ id: templateId, config, fileType });
        },
        [updateImportTemplate]
    );

    // Handle delete template
    const handleDeleteTemplate = useCallback(
        (templateId: string) => {
            deleteImportTemplate(templateId);
        },
        [deleteImportTemplate]
    );

    return (
        <div className="space-y-6 p-4">
            <div>
                <h1 className="text-2xl font-bold">Import Transactions</h1>
                <p className="text-muted-foreground">
                    Upload a CSV or OFX file from your bank or financial institution.
                </p>
            </div>

            <div className="rounded-lg border p-6">
                <ImportPanel
                    existingTransactions={existingTransactions}
                    accounts={accountsList}
                    templates={templatesList}
                    defaultCurrency={defaultCurrency}
                    initialFile={initialFile}
                    onCreateTransactions={handleCreateTransactions}
                    onImportComplete={handleImportComplete}
                    onCancel={handleCancel}
                    onSaveTemplate={handleSaveTemplate}
                    onUpdateTemplate={handleUpdateTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                />
            </div>
        </div>
    );
}
