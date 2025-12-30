"use client";

/**
 * Template Selector
 *
 * Dropdown for selecting and managing saved import templates.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ColumnMapping } from "./ColumnMappingStep";
import type { ImportFormatting } from "./FormattingStep";

/**
 * Saved import template.
 */
export interface ImportTemplate {
	id: string;
	name: string;
	columnMappings: Record<string, string>; // sourceColumn -> targetField
	formatting: ImportFormatting;
	createdAt: number;
	lastUsedAt?: number;
}

export interface TemplateSelectorProps {
	/** Available templates */
	templates: ImportTemplate[];
	/** Currently selected template ID */
	selectedTemplateId?: string;
	/** Callback when a template is selected */
	onSelect: (template: ImportTemplate | null) => void;
	/** Callback to save current settings as a new template */
	onSave?: (name: string) => void;
	/** Callback to delete a template */
	onDelete?: (templateId: string) => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Template selector component.
 */
export function TemplateSelector({
	templates,
	selectedTemplateId,
	onSelect,
	onSave,
	onDelete,
	className,
}: TemplateSelectorProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [newTemplateName, setNewTemplateName] = useState("");

	const handleSelectChange = (value: string) => {
		if (value === "") {
			onSelect(null);
		} else if (value === "__new__") {
			setIsCreating(true);
		} else {
			const template = templates.find((t) => t.id === value);
			if (template) {
				onSelect(template);
			}
		}
	};

	const handleSave = () => {
		if (newTemplateName.trim() && onSave) {
			onSave(newTemplateName.trim());
			setNewTemplateName("");
			setIsCreating(false);
		}
	};

	const handleCancel = () => {
		setNewTemplateName("");
		setIsCreating(false);
	};

	if (isCreating) {
		return (
			<div className={cn("flex gap-2", className)}>
				<input
					type="text"
					value={newTemplateName}
					onChange={(e) => setNewTemplateName(e.target.value)}
					placeholder="Template name..."
					className="flex-1 rounded border bg-transparent px-3 py-1.5 text-sm"
					autoFocus
					onKeyDown={(e) => {
						if (e.key === "Enter") handleSave();
						if (e.key === "Escape") handleCancel();
					}}
				/>
				<button
					type="button"
					onClick={handleSave}
					disabled={!newTemplateName.trim()}
					className="rounded bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm disabled:opacity-50"
				>
					Save
				</button>
				<button
					type="button"
					onClick={handleCancel}
					className="rounded px-3 py-1.5 text-sm hover:bg-accent"
				>
					Cancel
				</button>
			</div>
		);
	}

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<label className="font-medium text-sm">Template:</label>
			<select
				value={selectedTemplateId || ""}
				onChange={(e) => handleSelectChange(e.target.value)}
				className="flex-1 rounded border bg-transparent px-3 py-1.5 text-sm"
			>
				<option value="">No template</option>
				{templates.length > 0 && (
					<>
						<optgroup label="Saved Templates">
							{templates.map((template) => (
								<option key={template.id} value={template.id}>
									{template.name}
								</option>
							))}
						</optgroup>
					</>
				)}
				{onSave && <option value="__new__">+ Save current as template...</option>}
			</select>
			{selectedTemplateId && onDelete && (
				<button
					type="button"
					onClick={() => {
						if (confirm("Delete this template?")) {
							onDelete(selectedTemplateId);
						}
					}}
					className="rounded p-1.5 text-muted-foreground text-sm hover:text-destructive"
					title="Delete template"
				>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
				</button>
			)}
		</div>
	);
}

/**
 * Convert column mappings to template format.
 */
export function mappingsToTemplateFormat(mappings: ColumnMapping[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (const mapping of mappings) {
		if (mapping.targetField) {
			result[mapping.sourceColumn] = mapping.targetField;
		}
	}
	return result;
}

/**
 * Apply template mappings to column headers.
 */
export function applyTemplateToMappings(
	template: ImportTemplate,
	headers: string[],
	sampleRows: string[][]
): ColumnMapping[] {
	return headers.map((header, idx) => ({
		sourceColumn: header,
		targetField: (template.columnMappings[header] || "") as ColumnMapping["targetField"],
		samples: sampleRows.map((row) => row[idx] || "").slice(0, 3),
	}));
}
