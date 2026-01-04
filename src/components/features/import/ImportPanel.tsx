"use client";

/**
 * ImportPanel
 *
 * Main import interface combining:
 * - File dropzone
 * - Side-by-side table (raw/preview)
 * - Tabbed configuration
 * - Summary statistics
 * - Import button
 *
 * Replaces the old step-by-step ImportWizard with a more flexible tabbed UI.
 */

import { Loader2, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
// Hooks and Types
import { useImportState } from "@/hooks/use-import-state";
import type { Account, ImportTemplate, Transaction } from "@/lib/crdt/schema";
import { cn } from "@/lib/utils";
import { ConfigTabs, TabsContent } from "./ConfigTabs";
// Components
import { FileDropzone } from "./FileDropzone";
import { ImportSummary } from "./ImportSummary";
import { ImportTable } from "./ImportTable";
import { AccountTab, DuplicatesTab, FormattingTab, MappingTab, TemplateTab } from "./tabs";

// ============================================================================
// Types
// ============================================================================

/**
 * Data for a transaction to be created during import.
 */
export interface ImportTransactionData {
	date: string;
	description: string;
	amount: number;
	accountId: string;
	duplicateOf: string | null;
}

export interface ImportPanelProps {
	/** Existing transactions in the vault for duplicate detection */
	existingTransactions: Transaction[];
	/** Available accounts for selection */
	accounts: Account[];
	/** Available import templates */
	templates: ImportTemplate[];
	/** Default currency code for amount parsing */
	defaultCurrency: string;
	/** Callback to create transactions - returns import batch ID */
	onCreateTransactions: (transactions: ImportTransactionData[], fileName: string) => string;
	/** Callback when import is complete */
	onImportComplete: () => void;
	/** Callback to save a new template */
	onSaveTemplate?: (name: string) => void;
	/** Callback to delete a template */
	onDeleteTemplate?: (templateId: string) => void;
	/** Additional CSS classes */
	className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ImportPanel component.
 */
export function ImportPanel({
	existingTransactions,
	accounts,
	templates,
	defaultCurrency,
	onCreateTransactions,
	onImportComplete,
	onSaveTemplate,
	onDeleteTemplate,
	className,
}: ImportPanelProps) {
	// State
	const [showFiltered, setShowFiltered] = useState(true);
	const [isImporting, setIsImporting] = useState(false);

	// Import state hook
	const {
		session,
		isLoading,
		error,
		loadFile,
		setConfig,
		selectAccount,
		selectTemplate,
		reset,
		previewTransactions,
		summaryStats,
		canImport,
	} = useImportState({
		existingTransactions,
		accounts,
		templates,
		defaultCurrency,
	});

	// Handlers
	const handleFileDrop = useCallback(
		async (files: File[]) => {
			if (files.length > 0) {
				await loadFile(files[0]);
			}
		},
		[loadFile]
	);

	const handleToggleFiltered = useCallback(() => {
		setShowFiltered((prev) => !prev);
	}, []);

	const handleImport = useCallback(async () => {
		if (!canImport || !session) return;

		setIsImporting(true);
		try {
			// Collect valid transactions to import
			const transactionsToImport: ImportTransactionData[] = previewTransactions
				.filter((tx) => tx.status === "valid")
				.map((tx) => ({
					date: tx.date,
					description: tx.description,
					amount: tx.amount,
					accountId: session.selectedAccountId!,
					duplicateOf: tx.duplicateOf,
				}));

			if (transactionsToImport.length === 0) {
				console.warn("No valid transactions to import");
				return;
			}

			// Create transactions in CRDT
			onCreateTransactions(transactionsToImport, session.fileName);

			// Signal completion and reset
			onImportComplete();
			reset();
		} catch (err) {
			console.error("Import failed:", err);
		} finally {
			setIsImporting(false);
		}
	}, [canImport, session, previewTransactions, onCreateTransactions, onImportComplete, reset]);

	// Extract sample data for formatting tab
	const sampleDates =
		session?.rawRows
			.slice(session.config.formatting.hasHeaders ? 1 : 0, 4)
			.map((row) => {
				const dateIdx = Object.entries(session.config.columnMappings).find(
					([, field]) => field === "date"
				)?.[0];
				return dateIdx !== undefined ? row[parseInt(dateIdx, 10)] : "";
			})
			.filter(Boolean) ?? [];

	const sampleAmounts =
		session?.rawRows
			.slice(session.config.formatting.hasHeaders ? 1 : 0, 4)
			.map((row) => {
				const amountIdx = Object.entries(session.config.columnMappings).find(
					([, field]) => field === "amount"
				)?.[0];
				return amountIdx !== undefined ? row[parseInt(amountIdx, 10)] : "";
			})
			.filter(Boolean) ?? [];

	// No file loaded - show dropzone
	if (!session) {
		return (
			<div className={cn("flex flex-col items-center justify-center p-8", className)}>
				<FileDropzone
					onFileSelect={(file) => handleFileDrop([file])}
					disabled={isLoading}
					className="w-full max-w-md"
				/>
				{error && <p className="mt-2 text-sm text-destructive">{error.message}</p>}
			</div>
		);
	}

	// File loaded - show full import UI
	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{/* Header with file info and actions */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Upload className="h-5 w-5 text-muted-foreground" />
					<div>
						<p className="font-medium">{session.fileName}</p>
						<p className="text-xs text-muted-foreground">
							{session.fileType.toUpperCase()} • {session.rawRows.length} rows
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button type="button" variant="ghost" size="sm" onClick={reset}>
						<X className="h-4 w-4 mr-1" />
						Cancel
					</Button>
					<Button type="button" onClick={handleImport} disabled={!canImport || isImporting}>
						{isImporting ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Importing...
							</>
						) : (
							<>
								<Upload className="h-4 w-4 mr-2" />
								Import{" "}
								{summaryStats.validCount - summaryStats.duplicateCount - summaryStats.filteredCount}{" "}
								Transactions
							</>
						)}
					</Button>
				</div>
			</div>

			{/* Summary statistics */}
			<ImportSummary stats={summaryStats} canImport={canImport} />

			{/* Main content: Table + Config */}
			<div className="grid gap-4 lg:grid-cols-[1fr_350px]">
				{/* Split table */}
				<ImportTable
					rawRows={session.rawRows}
					rawHeaders={session.headers}
					previewTransactions={previewTransactions}
					stats={summaryStats}
					hasHeaders={session.config.formatting.hasHeaders}
					columnMappings={Object.fromEntries(
						Object.entries(session.config.columnMappings).map(([idx, field]) => [
							field,
							parseInt(idx, 10),
						])
					)}
					showFiltered={showFiltered}
					onToggleFiltered={handleToggleFiltered}
					maxDisplayRows={100}
					className="min-h-[400px]"
				/>

				{/* Config tabs */}
				<ConfigTabs
					config={session.config}
					onConfigChange={setConfig}
					availableHeaders={session.headers}
					templates={templates}
					selectedTemplateId={session.templateId}
					onSelectTemplate={selectTemplate}
					onSaveTemplate={onSaveTemplate}
					accounts={accounts}
					selectedAccountId={session.selectedAccountId}
					onSelectAccount={selectAccount}
					fileType={session.fileType}
					className="h-fit"
				>
					{/* Template Tab */}
					<TabsContent value="template">
						<TemplateTab
							templates={templates}
							selectedTemplateId={session.templateId}
							onSelect={selectTemplate}
							onSave={onSaveTemplate}
							onDelete={onDeleteTemplate}
						/>
					</TabsContent>

					{/* Mapping Tab (CSV only) */}
					<TabsContent value="mapping">
						<MappingTab
							availableHeaders={session.headers}
							sampleRows={session.rawRows.slice(session.config.formatting.hasHeaders ? 1 : 0, 5)}
							columnMappings={session.config.columnMappings}
							onMappingsChange={(mappings) => setConfig({ columnMappings: mappings })}
						/>
					</TabsContent>

					{/* Formatting Tab (CSV only) */}
					<TabsContent value="formatting">
						<FormattingTab
							formatting={session.config.formatting}
							onFormattingChange={(updates) =>
								setConfig({
									formatting: { ...session.config.formatting, ...updates },
								})
							}
							sampleDates={sampleDates}
							sampleAmounts={sampleAmounts}
						/>
					</TabsContent>

					{/* Duplicates Tab */}
					<TabsContent value="duplicates">
						<DuplicatesTab
							duplicateDetection={session.config.duplicateDetection}
							onDuplicateDetectionChange={(updates) =>
								setConfig({
									duplicateDetection: {
										...session.config.duplicateDetection,
										...updates,
									},
								})
							}
							oldTransactionFilter={session.config.oldTransactionFilter}
							onFilterChange={(updates) =>
								setConfig({
									oldTransactionFilter: {
										...session.config.oldTransactionFilter,
										...updates,
									},
								})
							}
							duplicateCount={summaryStats.duplicateCount}
							filteredCount={summaryStats.filteredCount}
						/>
					</TabsContent>

					{/* Account Tab */}
					<TabsContent value="account">
						<AccountTab
							accounts={accounts}
							selectedAccountId={session.selectedAccountId}
							onSelectAccount={selectAccount}
							isRequired={session.fileType === "csv"}
							detectedAccountNumber={session.detectedAccountNumber}
						/>
					</TabsContent>
				</ConfigTabs>
			</div>
		</div>
	);
}
