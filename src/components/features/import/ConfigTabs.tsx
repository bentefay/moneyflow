"use client";

/**
 * ConfigTabs
 *
 * Tabbed configuration panel for import settings using animate-ui tabs.
 * Tabs can be accessed in any order - no sequential workflow required.
 *
 * Tabs:
 * - Template: Select or save import template
 * - Mapping: Column assignments (date, description, amount)
 * - Formatting: Date format, separators, headers
 * - Duplicates: Duplicate detection settings + old transaction filter
 * - Account: Select target account
 */

import { Columns, Copy, FileText, Landmark, Settings } from "lucide-react";
import { useCallback, useState } from "react";
import {
	Tabs,
	TabsContent,
	TabsContents,
	TabsList,
	TabsTrigger,
} from "@/components/animate-ui/components/radix/tabs";
import type { Account, ImportTemplate } from "@/lib/crdt/schema";
import type { ImportConfig } from "@/lib/import/types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ConfigTabId = "template" | "mapping" | "formatting" | "duplicates" | "account";

export interface ConfigTabsProps {
	/** Current import configuration */
	config: ImportConfig;
	/** Callback when config changes */
	onConfigChange: (updates: Partial<ImportConfig>) => void;
	/** Available column headers from raw file */
	availableHeaders: string[];
	/** Available import templates */
	templates: ImportTemplate[];
	/** Currently selected template ID */
	selectedTemplateId: string | null;
	/** Callback when template is selected */
	onSelectTemplate: (templateId: string | null) => void;
	/** Callback to save current config as template */
	onSaveTemplate?: (name: string) => void;
	/** Available accounts */
	accounts: Account[];
	/** Currently selected account ID */
	selectedAccountId: string | null;
	/** Callback when account is selected */
	onSelectAccount: (accountId: string) => void;
	/** File type (affects which tabs are shown/relevant) */
	fileType: "csv" | "ofx";
	/** Additional CSS classes */
	className?: string;
	/** Tab content slot - render your own tab content */
	children?: React.ReactNode;
}

// ============================================================================
// Tab Configuration
// ============================================================================

interface TabConfig {
	id: ConfigTabId;
	label: string;
	icon: typeof FileText;
	/** Whether this tab is visible for the current file type */
	showFor: ("csv" | "ofx")[];
}

const TABS: TabConfig[] = [
	{ id: "template", label: "Template", icon: FileText, showFor: ["csv", "ofx"] },
	{ id: "mapping", label: "Columns", icon: Columns, showFor: ["csv"] },
	{ id: "formatting", label: "Format", icon: Settings, showFor: ["csv"] },
	{ id: "duplicates", label: "Duplicates", icon: Copy, showFor: ["csv", "ofx"] },
	{ id: "account", label: "Account", icon: Landmark, showFor: ["csv", "ofx"] },
];

// ============================================================================
// Main Component
// ============================================================================

/**
 * ConfigTabs component.
 *
 * Note: Most props are for the parent component (ImportPanel) to pass through
 * to individual tab components. ConfigTabs itself only uses fileType, className,
 * and children. The other props are deliberately excluded from destructuring
 * to prevent accidental DOM prop spreading.
 */
export function ConfigTabs({
	fileType,
	className,
	children,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props passed to children
	config: _config,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props passed to children
	onConfigChange: _onConfigChange,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props passed to children
	availableHeaders: _availableHeaders,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props passed to children
	templates: _templates,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props passed to children
	selectedTemplateId: _selectedTemplateId,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props passed to children
	onSelectTemplate: _onSelectTemplate,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props passed to children
	onSaveTemplate: _onSaveTemplate,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props passed to children
	accounts: _accounts,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props passed to children
	selectedAccountId: _selectedAccountId,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props passed to children
	onSelectAccount: _onSelectAccount,
}: ConfigTabsProps) {
	const [activeTab, setActiveTab] = useState<ConfigTabId>("template");

	// Filter tabs based on file type
	const visibleTabs = TABS.filter((tab) => tab.showFor.includes(fileType));

	// Handle tab change
	const handleTabChange = useCallback((value: string) => {
		setActiveTab(value as ConfigTabId);
	}, []);

	return (
		<div className={cn("flex flex-col", className)}>
			<Tabs value={activeTab} onValueChange={handleTabChange}>
				<TabsList className="w-full flex-wrap justify-start">
					{visibleTabs.map((tab) => (
						<TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
							<tab.icon className="h-4 w-4" />
							<span className="hidden sm:inline">{tab.label}</span>
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContents className="mt-4 min-h-[200px]">{children}</TabsContents>
			</Tabs>
		</div>
	);
}

// ============================================================================
// Exports
// ============================================================================

export { TabsContent };
