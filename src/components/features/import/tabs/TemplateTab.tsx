"use client";

/**
 * TemplateTab
 *
 * Tab content for selecting and managing import templates.
 * Allows users to quickly apply saved configurations.
 */

import { Clock, Copy, FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ImportTemplate } from "@/lib/crdt/schema";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface TemplateTabProps {
	/** Available templates (not deleted) */
	templates: ImportTemplate[];
	/** Currently selected template ID */
	selectedTemplateId: string | null;
	/** Callback when template is selected */
	onSelect: (templateId: string | null) => void;
	/** Callback to save current config as new template */
	onSave?: (name: string) => void;
	/** Callback to delete a template */
	onDelete?: (templateId: string) => void;
	/** Callback to duplicate a template */
	onDuplicate?: (templateId: string, newName: string) => void;
	/** Callback to reset to defaults (deselect template) */
	onReset?: () => void;
	/** Additional CSS classes */
	className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format relative time for "last used" display.
 */
function formatLastUsed(timestamp: number | undefined): string {
	if (!timestamp) return "Never used";
	const diff = Date.now() - timestamp;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;
	return new Date(timestamp).toLocaleDateString();
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TemplateTab component.
 */
export function TemplateTab({
	templates,
	selectedTemplateId,
	onSelect,
	onSave,
	onDelete,
	onDuplicate,
	onReset,
	className,
}: TemplateTabProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [isDuplicating, setIsDuplicating] = useState(false);
	const [newTemplateName, setNewTemplateName] = useState("");

	// Sort templates by last used (most recent first)
	const sortedTemplates = [...templates]
		.filter((t) => !t.deletedAt)
		.sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));

	const selectedTemplate = sortedTemplates.find((t) => t.id === selectedTemplateId);

	const handleSave = useCallback(() => {
		if (newTemplateName.trim() && onSave) {
			onSave(newTemplateName.trim());
			setNewTemplateName("");
			setIsCreating(false);
		}
	}, [newTemplateName, onSave]);

	const handleCancel = useCallback(() => {
		setNewTemplateName("");
		setIsCreating(false);
		setIsDuplicating(false);
	}, []);

	const handleDuplicate = useCallback(() => {
		if (newTemplateName.trim() && selectedTemplateId && onDuplicate) {
			onDuplicate(selectedTemplateId, newTemplateName.trim());
			setNewTemplateName("");
			setIsDuplicating(false);
		}
	}, [newTemplateName, selectedTemplateId, onDuplicate]);

	const handleStartDuplicate = useCallback(() => {
		const template = sortedTemplates.find((t) => t.id === selectedTemplateId);
		if (template) {
			setNewTemplateName(`${template.name} (copy)`);
			setIsDuplicating(true);
		}
	}, [sortedTemplates, selectedTemplateId]);

	const handleReset = useCallback(() => {
		onSelect(null);
		onReset?.();
	}, [onSelect, onReset]);

	const handleSelectChange = useCallback(
		(value: string) => {
			if (value === "__none__") {
				onSelect(null);
			} else {
				onSelect(value);
			}
		},
		[onSelect]
	);

	return (
		<div className={cn("space-y-4", className)}>
			<div className="space-y-2">
				<Label htmlFor="template-select">Import Template</Label>
				<p className="text-sm text-muted-foreground">
					Templates save your column mappings and formatting settings for quick reuse.
				</p>
			</div>

			{/* Template selector */}
			<Select value={selectedTemplateId ?? "__none__"} onValueChange={handleSelectChange}>
				<SelectTrigger id="template-select" className="w-full">
					<SelectValue placeholder="Select a template..." />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="__none__">
						<div className="flex items-center gap-2">
							<FileText className="h-4 w-4 text-muted-foreground" />
							<span>No template (auto-detect)</span>
						</div>
					</SelectItem>
					{sortedTemplates.map((template) => (
						<SelectItem key={template.id} value={template.id}>
							<div className="flex items-center justify-between gap-2 w-full">
								<div className="flex items-center gap-2">
									<FileText className="h-4 w-4" />
									<span>{template.name}</span>
								</div>
								{template.lastUsedAt && (
									<Badge variant="secondary" className="ml-2 text-xs">
										{formatLastUsed(template.lastUsedAt)}
									</Badge>
								)}
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Selected template info */}
			{selectedTemplate && (
				<div className="rounded-lg border bg-muted/30 p-3 space-y-2">
					<div className="flex items-center justify-between">
						<div className="font-medium">{selectedTemplate.name}</div>
						<div className="flex items-center gap-1">
							{onDuplicate && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 text-muted-foreground hover:text-foreground"
									onClick={handleStartDuplicate}
									title="Duplicate template"
								>
									<Copy className="h-3.5 w-3.5" />
								</Button>
							)}
							{onDelete && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 text-muted-foreground hover:text-destructive"
									onClick={() => onDelete(selectedTemplate.id)}
									title="Delete template"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							)}
						</div>
					</div>
					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						<Clock className="h-3 w-3" />
						<span>Last used: {formatLastUsed(selectedTemplate.lastUsedAt)}</span>
					</div>
					<div className="text-xs text-muted-foreground">
						{Object.keys(selectedTemplate.columnMappings).length} column mappings
					</div>
				</div>
			)}

			{/* Duplicate template form */}
			{isDuplicating && selectedTemplate && (
				<div className="space-y-2 rounded-lg border p-3 bg-muted/20">
					<Label htmlFor="duplicate-template-name">Duplicate Template</Label>
					<div className="flex gap-2">
						<Input
							id="duplicate-template-name"
							type="text"
							value={newTemplateName}
							onChange={(e) => setNewTemplateName(e.target.value)}
							placeholder="New template name"
							className="flex-1"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === "Enter") handleDuplicate();
								if (e.key === "Escape") handleCancel();
							}}
						/>
						<Button
							type="button"
							onClick={handleDuplicate}
							disabled={!newTemplateName.trim()}
							size="sm"
						>
							Create Copy
						</Button>
						<Button type="button" onClick={handleCancel} variant="ghost" size="sm">
							Cancel
						</Button>
					</div>
				</div>
			)}

			{/* Reset to defaults button */}
			{selectedTemplateId && (
				<Button type="button" variant="outline" className="w-full" onClick={handleReset}>
					<RotateCcw className="h-4 w-4 mr-2" />
					Reset to auto-detect
				</Button>
			)}

			{/* Save new template */}
			{onSave && (
				<div className="pt-2 border-t">
					{isCreating ? (
						<div className="space-y-2">
							<Label htmlFor="new-template-name">New Template Name</Label>
							<div className="flex gap-2">
								<Input
									id="new-template-name"
									type="text"
									value={newTemplateName}
									onChange={(e) => setNewTemplateName(e.target.value)}
									placeholder="e.g., Chase Checking"
									className="flex-1"
									autoFocus
									onKeyDown={(e) => {
										if (e.key === "Enter") handleSave();
										if (e.key === "Escape") handleCancel();
									}}
								/>
								<Button
									type="button"
									onClick={handleSave}
									disabled={!newTemplateName.trim()}
									size="sm"
								>
									Save
								</Button>
								<Button type="button" onClick={handleCancel} variant="ghost" size="sm">
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={() => setIsCreating(true)}
						>
							<Plus className="h-4 w-4 mr-2" />
							Save current settings as template
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
