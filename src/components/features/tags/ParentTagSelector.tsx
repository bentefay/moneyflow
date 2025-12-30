"use client";

/**
 * ParentTagSelector Component
 *
 * Dropdown for selecting a parent tag with hierarchy display.
 * Shows indented tag names to represent the hierarchy.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tag } from "@/lib/crdt/schema";

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

interface TagWithDepth {
  tag: Tag;
  depth: number;
}

/**
 * Build hierarchical list with depths for display.
 */
function buildHierarchicalList(tags: Tag[]): TagWithDepth[] {
  const result: TagWithDepth[] = [];
  const tagMap = new Map<string, Tag>();
  const childrenMap = new Map<string, Tag[]>();

  // Build maps
  for (const tag of tags) {
    tagMap.set(tag.id, tag);
    const parentId = tag.parentTagId ?? "";
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(tag);
  }

  // Sort children alphabetically
  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.name.localeCompare(b.name));
  }

  // DFS traversal
  function traverse(parentId: string, depth: number) {
    const children = childrenMap.get(parentId) ?? [];
    for (const child of children) {
      result.push({ tag: child, depth });
      traverse(child.id, depth + 1);
    }
  }

  traverse("", 0);

  return result;
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
  className,
}: ParentTagSelectorProps) {
  // Build hierarchical list
  const hierarchicalTags = useMemo(() => buildHierarchicalList(availableTags), [availableTags]);

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
