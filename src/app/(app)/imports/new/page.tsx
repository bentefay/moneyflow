"use client";

/**
 * New Import Page
 *
 * Page for importing transactions from CSV/OFX files.
 * Uses the new ImportPanel with tabbed configuration.
 */

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { ImportPanel, type ImportTransactionData } from "@/components/features/import/ImportPanel";
import {
	useActiveAccounts,
	useActiveStatuses,
	useActiveTransactions,
	useImportTemplates,
	useVaultAction,
	useVaultPreferences,
} from "@/lib/crdt/context";
import type {
	Account,
	ImportTemplate as ImportTemplateRecord,
	Status,
	Transaction,
} from "@/lib/crdt/schema";

/** Generate unique ID */
function generateId(): string {
	return crypto.randomUUID();
}

/**
 * New import page component.
 */
export default function NewImportPage() {
	const router = useRouter();

	// Get data from vault
	const transactions = useActiveTransactions();
	const accounts = useActiveAccounts();
	const statuses = useActiveStatuses();
	const importTemplates = useImportTemplates();
	const preferences = useVaultPreferences();

	// Default currency
	const defaultCurrency = preferences?.defaultCurrency ?? "USD";

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

	const deleteImportTemplate = useVaultAction((state, id: string) => {
		const template = state.importTemplates[id];
		if (template && typeof template === "object") {
			template.deletedAt = Date.now();
		}
	});

	// Create import batch and transactions in CRDT
	const createImportBatch = useVaultAction(
		(
			state,
			data: {
				importId: string;
				fileName: string;
				transactions: Array<{
					id: string;
					date: string;
					description: string;
					amount: number;
					accountId: string;
					statusId: string;
					duplicateOf: string | null;
				}>;
			}
		) => {
			// Create import record
			state.imports[data.importId] = {
				id: data.importId,
				filename: data.fileName,
				transactionCount: data.transactions.length,
				createdAt: Date.now(),
				deletedAt: 0,
			} as (typeof state.imports)[string];

			// Create transactions
			for (const tx of data.transactions) {
				state.transactions[tx.id] = {
					id: tx.id,
					date: tx.date,
					description: tx.description,
					notes: "",
					amount: tx.amount,
					accountId: tx.accountId,
					tagIds: [] as string[],
					statusId: tx.statusId,
					importId: data.importId,
					allocations: {} as Record<string, number>,
					duplicateOf: tx.duplicateOf ?? "",
					deletedAt: 0,
				} as (typeof state.transactions)[string];
			}
		}
	);

	// Convert CRDT transactions to array
	const existingTransactions = useMemo(() => {
		return Object.values(transactions).filter(
			(t): t is Transaction => typeof t === "object" && t !== null && !t.deletedAt
		);
	}, [transactions]);

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
		(transactionData: ImportTransactionData[], fileName: string): string => {
			const importId = generateId();

			// Map import data to full transaction records
			const transactionsToCreate = transactionData.map((tx) => ({
				id: generateId(),
				date: tx.date,
				description: tx.description,
				amount: tx.amount,
				accountId: tx.accountId,
				statusId: defaultStatusId,
				duplicateOf: tx.duplicateOf,
			}));

			// Create import batch and all transactions in one action
			createImportBatch({
				importId,
				fileName,
				transactions: transactionsToCreate,
			});

			return importId;
		},
		[createImportBatch, defaultStatusId]
	);

	// Handle import complete - navigate to transactions
	const handleImportComplete = useCallback(() => {
		router.push("/transactions");
	}, [router]);

	// Handle save template
	const handleSaveTemplate = useCallback(
		(name: string) => {
			addImportTemplate({
				id: generateId(),
				name,
				columnMappings: {},
				formatting: {
					hasHeaders: true,
					thousandSeparator: ",",
					decimalSeparator: ".",
					dateFormat: "yyyy-MM-dd",
					collapseWhitespace: false,
				},
				duplicateDetection: {
					dateMatchMode: "within",
					maxDateDiffDays: 3,
					descriptionMatchMode: "similar",
					minDescriptionSimilarity: 0.6,
				},
				oldTransactionFilter: {
					mode: "ignore-duplicates",
					cutoffDays: 10,
				},
				lastUsedAt: Date.now(),
				deletedAt: 0,
			} as ImportTemplateRecord);
		},
		[addImportTemplate]
	);

	// Handle delete template
	const handleDeleteTemplate = useCallback(
		(templateId: string) => {
			deleteImportTemplate(templateId);
		},
		[deleteImportTemplate]
	);

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-4">
			<div>
				<h1 className="font-bold text-2xl">Import Transactions</h1>
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
					onCreateTransactions={handleCreateTransactions}
					onImportComplete={handleImportComplete}
					onSaveTemplate={handleSaveTemplate}
					onDeleteTemplate={handleDeleteTemplate}
				/>
			</div>
		</div>
	);
}
