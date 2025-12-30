"use client";

/**
 * StatusesTable Component
 *
 * Displays all transaction statuses with inline editing and management.
 * Allows creating new statuses, setting defaults, and configuring behaviors.
 */

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import type { Status, StatusInput } from "@/lib/crdt/schema";
import { useVaultAction, useVaultSelector } from "@/lib/crdt/context";
import { StatusRow } from "./StatusRow";
import { BehaviorSelector } from "./BehaviorSelector";

export interface StatusesTableProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Filter out loro-mirror's $cid from object entries.
 */
function filterCid<T>(record: Record<string, T>): Array<[string, T]> {
  return Object.entries(record).filter(([key]) => key !== "$cid");
}

/**
 * Statuses table component with creation and management.
 */
export function StatusesTable({ className }: StatusesTableProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBehavior, setNewBehavior] = useState("");

  // Get statuses and transactions from CRDT state
  const statuses = useVaultSelector((state) => state.statuses);
  const transactions = useVaultSelector((state) => state.transactions);

  // Create CRDT mutation action
  const updateVault = useVaultAction(
    (
      draft,
      action: {
        type: "add" | "update" | "delete" | "setDefault";
        id: string;
        data?: Partial<StatusInput>;
      }
    ) => {
      switch (action.type) {
        case "add":
          if (action.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (draft.statuses as any)[action.id] = action.data as StatusInput;
          }
          break;
        case "update":
          if (draft.statuses[action.id] && action.data) {
            Object.assign(draft.statuses[action.id], action.data);
          }
          break;
        case "delete":
          if (draft.statuses[action.id]) {
            draft.statuses[action.id].deletedAt = Date.now();
          }
          break;
        case "setDefault":
          // Clear isDefault from all other statuses
          for (const [key, status] of filterCid(draft.statuses as Record<string, Status>)) {
            if (status && key !== action.id && status.isDefault) {
              status.isDefault = false;
            }
          }
          // Set the new default
          if (draft.statuses[action.id]) {
            draft.statuses[action.id].isDefault = true;
          }
          break;
      }
    },
    []
  );

  // Get list of active statuses (not deleted)
  const activeStatuses = useMemo(() => {
    return filterCid(statuses as unknown as Record<string, Status>)
      .filter(([, status]) => status && !status.deletedAt)
      .map(([id, status]) => ({ ...status, id }));
  }, [statuses]);

  // Sort statuses: default first, then alphabetically
  const sortedStatuses = useMemo(() => {
    return [...activeStatuses].sort((a, b) => {
      // Default status first
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [activeStatuses]);

  // Compute which statuses have transactions
  const statusesWithTransactions = useMemo(() => {
    const statusIds = new Set<string>();
    for (const [, tx] of filterCid(
      transactions as unknown as Record<string, { statusId?: string; deletedAt?: number }>
    )) {
      if (tx && !tx.deletedAt && tx.statusId) {
        statusIds.add(tx.statusId);
      }
    }
    return statusIds;
  }, [transactions]);

  // Handle creating a new status
  const handleCreate = useCallback(() => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const id = crypto.randomUUID();
    // Use record with explicit properties - loro-mirror will handle defaults
    const statusData: Record<string, unknown> = {
      id,
      name: trimmedName,
      isDefault: false,
    };

    if (newBehavior && newBehavior !== "none") {
      statusData.behavior = newBehavior;
    }

    updateVault({ type: "add", id, data: statusData as Partial<StatusInput> });

    setNewName("");
    setNewBehavior("");
    setIsCreating(false);
  }, [newName, newBehavior, updateVault]);

  // Handle canceling creation
  const handleCancelCreate = useCallback(() => {
    setNewName("");
    setNewBehavior("");
    setIsCreating(false);
  }, []);

  // Handle keyboard shortcuts in creation mode
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleCreate();
      } else if (e.key === "Escape") {
        handleCancelCreate();
      }
    },
    [handleCreate, handleCancelCreate]
  );

  // Handle updating a status
  const handleUpdate = useCallback(
    (id: string, data: Partial<Status>) => {
      updateVault({ type: "update", id, data });
    },
    [updateVault]
  );

  // Handle deleting a status
  const handleDelete = useCallback(
    (id: string) => {
      updateVault({ type: "delete", id });
    },
    [updateVault]
  );

  // Handle setting a status as default
  const handleSetDefault = useCallback(
    (id: string) => {
      updateVault({ type: "setDefault", id });
    },
    [updateVault]
  );

  // Check if a status can be deleted
  const canDeleteStatus = useCallback(
    (status: Status) => {
      // Cannot delete default status
      if (status.isDefault) return false;
      // Cannot delete if has transactions
      if (statusesWithTransactions.has(status.id)) return false;
      return true;
    },
    [statusesWithTransactions]
  );

  return (
    <div className={className}>
      {/* Status list */}
      <div className="space-y-1">
        {sortedStatuses.map((status) => (
          <StatusRow
            key={status.id}
            status={status}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
            canDelete={canDeleteStatus(status)}
          />
        ))}

        {sortedStatuses.length === 0 && !isCreating && (
          <div className="text-muted-foreground py-8 text-center">
            <p>No statuses yet.</p>
            <p className="mt-1 text-sm">Create a status to categorize your transactions.</p>
          </div>
        )}
      </div>

      {/* Create new status form */}
      {isCreating ? (
        <div className="bg-muted/50 mt-2 flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="Status name"
              className="h-8"
              data-testid="new-status-name-input"
            />
          </div>
          <div className="w-40">
            <BehaviorSelector value={newBehavior} onChange={setNewBehavior} className="h-8" />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={handleCreate}
              disabled={!newName.trim()}
              data-testid="create-status-btn"
            >
              Create
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelCreate}
              data-testid="cancel-create-status-btn"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsCreating(true)}
          className="mt-4 w-full"
          data-testid="add-status-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Status
        </Button>
      )}
    </div>
  );
}
