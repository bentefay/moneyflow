"use client";

/**
 * New Import Page
 *
 * Page for importing transactions from CSV/OFX files.
 */

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { ColumnMapping } from "@/components/features/import/ColumnMappingStep";
import type { ImportFormatting } from "@/components/features/import/FormattingStep";
import { ImportWizard, type ParsedTransaction } from "@/components/features/import/ImportWizard";
import {
	type ImportTemplate,
	mappingsToTemplateFormat,
} from "@/components/features/import/TemplateSelector";
import {
	useActiveTransactions,
	useAutomations,
	useImportTemplates,
	useVaultAction,
} from "@/lib/crdt/context";
import { DEFAULT_STATUS_IDS } from "@/lib/crdt/defaults";
import type {
	Automation,
	AutomationApplication,
	Import as ImportRecord,
	ImportTemplate as ImportTemplateRecord,
	Transaction,
} from "@/lib/crdt/schema";
import { applyAutomationsWithTracking, type TransactionChanges } from "@/lib/domain/automation";

/** Generate unique ID */
function generateId(): string {
	return crypto.randomUUID();
}

/**
 * New import page component.
 */
export default function NewImportPage() {
	const router = useRouter();

	// Get existing transactions for duplicate detection
	const transactions = useActiveTransactions();
	const importTemplates = useImportTemplates();
	const automations = useAutomations();

	// Actions
	const addTransaction = useVaultAction((state, data: Transaction) => {
		state.transactions[data.id] = data as (typeof state.transactions)[string];
	});

	const addImport = useVaultAction((state, data: ImportRecord) => {
		state.imports[data.id] = data as (typeof state.imports)[string];
	});

	const addImportTemplate = useVaultAction((state, data: ImportTemplateRecord) => {
		state.importTemplates[data.id] = data as (typeof state.importTemplates)[string];
	});

	const deleteImportTemplate = useVaultAction((state, id: string) => {
		const template = state.importTemplates[id];
		if (template && typeof template === "object") {
			template.deletedAt = Date.now();
		}
	});

	const addAutomationApplication = useVaultAction((state, data: AutomationApplication) => {
		state.automationApplications[data.id] = data as (typeof state.automationApplications)[string];
	});

	// Convert CRDT templates to component format
	const templates = useMemo((): ImportTemplate[] => {
		return Object.values(importTemplates)
			.filter(
				(t): t is ImportTemplateRecord & { $cid: string } =>
					typeof t === "object" && t !== null && !t.deletedAt
			)
			.map((t) => ({
				id: t.id,
				name: t.name,
				columnMappings: Object.fromEntries(
					Object.entries(t.columnMappings ?? {}).filter(
						([key, v]) => typeof v === "string" && key !== "$cid"
					)
				) as Record<string, string>,
				formatting: {
					thousandSeparator: t.formatting?.thousandSeparator ?? ",",
					decimalSeparator: t.formatting?.decimalSeparator ?? ".",
					dateFormat: t.formatting?.dateFormat ?? "yyyy-MM-dd",
					amountInCents: false, // Not in schema yet
					negateAmounts: false, // Not in schema yet
				},
				createdAt: 0,
			}));
	}, [importTemplates]);

	// Existing transactions for duplicate detection
	const existingTransactions = useMemo(() => {
		return Object.values(transactions)
			.filter((t): t is Transaction & { $cid: string } => typeof t === "object" && t !== null)
			.map((t) => ({
				date: t.date,
				amount: t.amount,
				description: t.description || t.notes || "",
			}));
	}, [transactions]);

	/**
	 * Apply automation changes to a transaction.
	 */
	function applyChangesToTransaction(
		transaction: Transaction,
		changes: TransactionChanges
	): Transaction {
		const result = { ...transaction } as Transaction;

		if (changes.tagIds !== undefined) {
			(result as { tagIds: string[] }).tagIds = changes.tagIds;
		}
		if (changes.statusId !== undefined) {
			(result as { statusId: string }).statusId = changes.statusId;
		}
		if (changes.allocations !== undefined) {
			(result as { allocations: Record<string, number> }).allocations = changes.allocations;
		}

		return result;
	}

	// Handle import complete
	const handleImportComplete = useCallback(
		(parsedTransactions: ParsedTransaction[], importId: string) => {
			// Create the import record
			addImport({
				id: importId,
				filename: "imported_file", // TODO: Pass filename through
				transactionCount: parsedTransactions.length,
				createdAt: Date.now(),
				deletedAt: 0,
			} as ImportRecord);

			// Use "For Review" status for all imported transactions
			const defaultStatusId = DEFAULT_STATUS_IDS.FOR_REVIEW;

			// Convert automations to array for processing
			const automationList = Object.values(automations).filter(
				(a): a is NonNullable<typeof a> => typeof a === "object" && a !== null && !a.deletedAt
			) as Automation[];

			// Create base transactions first (we need them for automation evaluation)
			const newTransactions = parsedTransactions.map((tx) => ({
				id: generateId(),
				date: tx.date,
				description: tx.description,
				notes: tx.memo || "",
				amount: tx.amount,
				accountId: "", // TODO: Allow account selection in wizard
				tagIds: [] as string[],
				statusId: defaultStatusId,
				importId,
				allocations: {} as Record<string, number>,
				duplicateOf: tx.isDuplicate ? "suspected" : "",
				deletedAt: 0,
			})) as unknown as Transaction[];

			// Apply automations and track changes for undo
			const { appliedChanges, applications } = applyAutomationsWithTracking(
				automationList,
				newTransactions
			);

			// Create transactions with automation changes applied
			for (const tx of newTransactions) {
				const changes = appliedChanges.get(tx.id);
				const finalTransaction = changes ? applyChangesToTransaction(tx, changes) : tx;
				addTransaction(finalTransaction);
			}

			// Store automation applications for undo capability
			for (const application of applications) {
				addAutomationApplication(application as AutomationApplication);
			}

			// Navigate to transactions page
			router.push("/transactions");
		},
		[addImport, addTransaction, addAutomationApplication, router, automations]
	);

	// Handle save template
	const handleSaveTemplate = useCallback(
		(name: string, mappings: ColumnMapping[], formatting: ImportFormatting) => {
			addImportTemplate({
				id: generateId(),
				name,
				columnMappings: mappingsToTemplateFormat(mappings) as Record<string, string>,
				formatting: {
					hasHeaders: true,
					thousandSeparator: formatting.thousandSeparator,
					decimalSeparator: formatting.decimalSeparator,
					dateFormat: formatting.dateFormat,
				},
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
		<div className="mx-auto max-w-3xl space-y-6">
			<div>
				<h1 className="font-bold text-2xl">Import Transactions</h1>
				<p className="text-muted-foreground">
					Upload a CSV or OFX file from your bank or financial institution.
				</p>
			</div>

			<div className="rounded-lg border p-6">
				<ImportWizard
					templates={templates}
					onImportComplete={handleImportComplete}
					onSaveTemplate={handleSaveTemplate}
					onDeleteTemplate={handleDeleteTemplate}
					existingTransactions={existingTransactions}
				/>
			</div>
		</div>
	);
}
