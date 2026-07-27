"use client";

/**
 * ParentTagSelector Component
 *
 * Dropdown for selecting a parent tag with hierarchy display.
 * Shows indented tag names to represent the hierarchy.
 */

import { useMemo } from "react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import type { Tag } from "@/lib/crdt/schema";
import { buildHierarchicalTagList } from "@/lib/domain";
import { cn } from "@/lib/utils";

export interface ParentTagSelectorProps {
    /** Currently selected parent tag ID */
    value: string;
    /** Callback when selection changes */
    onChange: (value: string) => void;
    /** Available tags to choose from (already filtered to exclude invalid options) */
    availableTags: Tag[];
    /** Additional CSS classes */
    className?: string;
}

// Sentinel value for "no parent" since SelectItem doesn't allow empty string
const NO_PARENT = "__none__";

/**
 * Parent tag selector with hierarchy display.
 */
export function ParentTagSelector({
    value,
    onChange,
    availableTags,
    className
}: ParentTagSelectorProps) {
    // Build hierarchical list
    const hierarchicalTags = useMemo(
        () => buildHierarchicalTagList(availableTags),
        [availableTags]
    );

    // Find selected tag name for display
    const selectedTag = availableTags.find((t) => t.id === value);

    // Convert between external value (empty string) and internal value (sentinel)
    const internalValue = value === "" ? NO_PARENT : value;
    const handleChange = (newValue: string) => {
        onChange(newValue === NO_PARENT ? "" : newValue);
    };

    return (
        <Select value={internalValue} onValueChange={handleChange}>
            <SelectTrigger className={cn("h-8", className)}>
                <SelectValue placeholder="None (top level)">
                    {selectedTag?.name ?? "None (top level)"}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={NO_PARENT}>None (top level)</SelectItem>
                {hierarchicalTags.map(({ tag, depth }) => (
                    <SelectItem key={tag.id} value={tag.id}>
                        <span style={{ paddingLeft: depth * 12 }}>{tag.name}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
