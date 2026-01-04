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
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
// Hooks and Types
import { useImportState } from "@/hooks/use-import-state";
import type { Account, ImportTemplate, Transaction } from "@/lib/crdt/schema";
import type { ImportConfig, OFXAccountAction } from "@/lib/import/types";
import { cn } from "@/lib/utils";
import { ConfigTabs, TabsContent } from "./ConfigTabs";
// Components
import { FileDropzone } from "./FileDropzone";
import { ImportSummary } from "./ImportSummary";
import { ImportTable } from "./ImportTable";
import {
	AccountActionMessage,
	AccountTab,
	DuplicatesTab,
	FormattingTab,
	MappingTab,
	TemplateTab,
} from "./tabs";

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

/**
 * Additional context passed during import for account actions.
 */
export interface ImportContext {
	accountAction: OFXAccountAction;
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
	/** Initial file to load on mount (e.g., from file drop on imports page) */
	initialFile?: File | null;
	/** Callback to create transactions - returns import batch ID */
	onCreateTransactions: (
		transactions: ImportTransactionData[],
		fileName: string,
		context: ImportContext
	) => string;
	/** Callback when import is complete */
	onImportComplete: () => void;
	/** Callback when cancel is clicked (defaults to reset) */
	onCancel?: () => void;
	/** Callback to save a new template (name + config + fileType) */
	onSaveTemplate?: (name: string, config: ImportConfig, fileType: "csv" | "ofx") => void;
	/** Callback to update an existing template's config */
	onUpdateTemplate?: (templateId: string, config: ImportConfig, fileType: "csv" | "ofx") => void;
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
	initialFile,
	onCreateTransactions,
	onImportComplete,
	onCancel,
	onSaveTemplate,
	onUpdateTemplate,
	onDeleteTemplate,
	className,
}: ImportPanelProps) {
	// State
	const [showFiltered, setShowFiltered] = useState(true);
	const [isImporting, setIsImporting] = useState(false);
	const hasLoadedInitialFile = useRef(false);

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

	// Get selected account's currency for proper amount formatting
	const selectedAccount = session?.selectedAccountId
		? accounts.find((a) => a.id === session.selectedAccountId)
		: undefined;
	const accountCurrency = selectedAccount?.currency ?? defaultCurrency;

	// Load initial file if provided
	useEffect(() => {
		if (initialFile && !hasLoadedInitialFile.current) {
			hasLoadedInitialFile.current = true;
			void loadFile(initialFile);
		}
	}, [initialFile, loadFile]);

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

	// Wrap onSaveTemplate to include current config and fileType
	const handleSaveTemplate = useCallback(
		(name: string) => {
			if (onSaveTemplate && session) {
				onSaveTemplate(name, session.config, session.fileType);
			}
		},
		[onSaveTemplate, session]
	);

	const handleImport = useCallback(async () => {
		if (!canImport || !session) return;

		setIsImporting(true);
		try {
			// Collect valid transactions to import (valid + duplicate, not filtered/invalid)
			const transactionsToImport: ImportTransactionData[] = previewTransactions
				.filter((tx) => tx.status === "valid" || tx.status === "duplicate")
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
			onCreateTransactions(transactionsToImport, session.fileName, {
				accountAction: session.accountAction,
			});

			// Auto-save or auto-update template
			// Both CSV and OFX benefit from saved duplicate detection and filter settings
			if (session.templateId && onUpdateTemplate) {
				// Template was selected - update it with current config
				onUpdateTemplate(session.templateId, session.config, session.fileType);
			} else if (templates.length === 0 && onSaveTemplate) {
				// No templates exist - auto-save with filename as name
				const templateName = session.fileName.replace(/\.(csv|ofx)$/i, "");
				onSaveTemplate(templateName, session.config, session.fileType);
			}

			// Signal completion and reset
			onImportComplete();
			reset();
		} catch (err) {
			console.error("Import failed:", err);
		} finally {
			setIsImporting(false);
		}
	}, [
		canImport,
		session,
		previewTransactions,
		templates.length,
		onCreateTransactions,
		onImportComplete,
		onSaveTemplate,
		onUpdateTemplate,
		reset,
	]);

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

	// Loading state - show spinner when file is being loaded
	// This prevents the dropzone flicker when navigating with an initial file
	if (isLoading || (initialFile && !session)) {
		return (
			<div className={cn("flex flex-col items-center justify-center p-8", className)}>
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					<p className="text-sm text-muted-foreground">Loading file...</p>
				</div>
			</div>
		);
	}

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
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							reset();
							onCancel?.();
						}}
					>
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
								Import {summaryStats.validCount + summaryStats.duplicateCount} Transactions
							</>
						)}
					</Button>
				</div>
			</div>

			{/* Account action message (visible at top level for OFX files) */}
			{session.accountAction && (
				<AccountActionMessage
					accountAction={session.accountAction}
					fileType={session.fileType}
					detectedAccountNumber={session.detectedAccountNumber}
					targetAccountName={
						session.selectedAccountId
							? accounts.find((a) => a.id === session.selectedAccountId)?.name
							: null
					}
				/>
			)}

			{/* Summary statistics */}
			<ImportSummary
				stats={summaryStats}
				canImport={canImport}
				needsAccountSelection={!session.selectedAccountId && session.fileType === "csv"}
				selectedAccountName={
					session.selectedAccountId
						? accounts.find((a) => a.id === session.selectedAccountId)?.name
						: null
				}
			/>

			{/* Main content: Table + Config */}
			<div className="flex flex-wrap gap-4">
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
					currency={accountCurrency}
					className="min-h-[400px] flex-1 min-w-0 lg:min-w-[500px]"
				/>

				{/* Config tabs */}
				<ConfigTabs
					config={session.config}
					onConfigChange={setConfig}
					availableHeaders={session.headers}
					templates={templates}
					selectedTemplateId={session.templateId}
					onSelectTemplate={selectTemplate}
					onSaveTemplate={handleSaveTemplate}
					accounts={accounts}
					selectedAccountId={session.selectedAccountId}
					onSelectAccount={selectAccount}
					fileType={session.fileType}
					className="w-full lg:w-[350px] lg:shrink-0 h-fit"
				>
					{/* Template Tab */}
					<TabsContent value="template">
						<TemplateTab
							templates={templates}
							selectedTemplateId={session.templateId}
							onSelect={selectTemplate}
							onSave={handleSaveTemplate}
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

					{/* Formatting Tab */}
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
							fileType={session.fileType}
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
							existingTransactions={existingTransactions}
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
							accountAction={session.accountAction}
						/>
					</TabsContent>
				</ConfigTabs>
			</div>
		</div>
	);
}
