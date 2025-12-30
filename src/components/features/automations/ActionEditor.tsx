"use client";

/**
 * ActionEditor Component
 *
 * Editor for creating/editing automation actions.
 * Supports setting tags, allocations, and statuses.
 */

import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Tag, Status, Person } from "@/lib/crdt/schema";

export interface ActionData {
  id: string;
  type: string;
  value: unknown;
}

export interface ActionEditorProps {
  /** Action data */
  action: ActionData;
  /** Callback when action changes */
  onChange: (action: ActionData) => void;
  /** Callback when action is removed */
  onRemove: () => void;
  /** Available tags for tag actions */
  tags: Tag[];
  /** Available statuses for status actions */
  statuses: Status[];
  /** Available people for allocation actions */
  people: Person[];
  /** Whether the action can be removed (at least one required) */
  canRemove?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/** Available action types */
export const ACTION_TYPES = [
  { value: "setTags", label: "Set Tags" },
  { value: "setStatus", label: "Set Status" },
  { value: "setAllocation", label: "Set Allocation" },
] as const;

/**
 * Single automation action editor.
 */
export function ActionEditor({
  action,
  onChange,
  onRemove,
  tags,
  statuses,
  people,
  canRemove = true,
  className,
}: ActionEditorProps) {
  const handleTypeChange = useCallback(
    (type: string) => {
      // Reset value when type changes
      let defaultValue: unknown = null;
      if (type === "setTags") defaultValue = [];
      if (type === "setStatus") defaultValue = "";
      if (type === "setAllocation") defaultValue = {};

      onChange({ ...action, type, value: defaultValue });
    },
    [action, onChange]
  );

  const handleTagsChange = useCallback(
    (tagId: string) => {
      const currentTags = Array.isArray(action.value) ? action.value : [];
      const newTags = currentTags.includes(tagId)
        ? currentTags.filter((id: string) => id !== tagId)
        : [...currentTags, tagId];
      onChange({ ...action, value: newTags });
    },
    [action, onChange]
  );

  const handleStatusChange = useCallback(
    (statusId: string) => {
      onChange({ ...action, value: statusId });
    },
    [action, onChange]
  );

  const handleAllocationChange = useCallback(
    (personId: string, percentage: number) => {
      const currentAlloc =
        typeof action.value === "object" && action.value !== null
          ? (action.value as Record<string, number>)
          : {};
      const newAlloc = { ...currentAlloc, [personId]: percentage };

      // Remove person if percentage is 0
      if (percentage === 0) {
        delete newAlloc[personId];
      }

      onChange({ ...action, value: newAlloc });
    },
    [action, onChange]
  );

  const renderValueEditor = () => {
    switch (action.type) {
      case "setTags":
        const selectedTags = Array.isArray(action.value) ? action.value : [];
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Button
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                size="sm"
                onClick={() => handleTagsChange(tag.id)}
                data-testid={`tag-option-${tag.id}`}
              >
                {tag.name}
              </Button>
            ))}
            {tags.length === 0 && (
              <span className="text-muted-foreground text-sm">No tags available</span>
            )}
          </div>
        );

      case "setStatus":
        return (
          <Select value={(action.value as string) || ""} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48" data-testid="action-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "setAllocation":
        const currentAlloc =
          typeof action.value === "object" && action.value !== null
            ? (action.value as Record<string, number>)
            : {};
        return (
          <div className="space-y-2">
            {people.map((person) => (
              <div key={person.id} className="flex items-center gap-2">
                <span className="w-24 truncate text-sm">{person.name}</span>
                <Select
                  value={String(currentAlloc[person.id] ?? 0)}
                  onValueChange={(v) => handleAllocationChange(person.id, parseInt(v, 10))}
                >
                  <SelectTrigger className="w-24" data-testid={`alloc-${person.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 25, 50, 75, 100].map((pct) => (
                      <SelectItem key={pct} value={String(pct)}>
                        {pct}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {people.length === 0 && (
              <span className="text-muted-foreground text-sm">No people available</span>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-2 rounded-md border p-3 ${className}`}>
      <div className="flex items-center gap-2">
        {/* Action type selector */}
        <Select value={action.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-40" data-testid="action-type">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Remove button */}
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="ml-auto h-9 w-9"
            data-testid="remove-action"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Value editor */}
      {action.type && <div className="pt-2">{renderValueEditor()}</div>}
    </div>
  );
}
