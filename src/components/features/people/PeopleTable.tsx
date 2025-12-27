"use client";

/**
 * PeopleTable Component
 *
 * Container component for managing people in the vault.
 * Includes list of people, add new person, and invite link generation.
 */

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonRow } from "./PersonRow";
import { InviteLinkGenerator } from "./InviteLinkGenerator";
import { BalanceSummary } from "./BalanceSummary";
import { Plus, Users } from "lucide-react";
import { useVaultAction, useVaultSelector } from "@/lib/crdt/context";
import type { Person, PersonInput } from "@/lib/crdt/schema";
import { getSessionPubkeyHash } from "@/lib/crypto/session";

export interface PeopleTableProps {
  /** Vault ID for invite generation */
  vaultId: string;
  /** Vault key (unwrapped) for invite key wrapping */
  vaultKey?: Uint8Array;
  /** User's X25519 secret key */
  encSecretKey?: Uint8Array;
  /** Whether current user is vault owner */
  isOwner?: boolean;
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
 * Main people management component.
 */
export function PeopleTable({
  vaultId,
  vaultKey,
  encSecretKey,
  isOwner = false,
  className,
}: PeopleTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");

  // Get current user's pubkeyHash
  const currentUserPubkeyHash = getSessionPubkeyHash();

  // Get people from CRDT state
  const people = useVaultSelector((state) => state.people);
  const transactions = useVaultSelector((state) => state.transactions);
  const statuses = useVaultSelector((state) => state.statuses);
  const accounts = useVaultSelector((state) => state.accounts);

  // Create CRDT mutation action
  const updateVault = useVaultAction(
    (
      draft,
      action: { type: "add" | "update" | "delete"; id: string; data?: Partial<PersonInput> }
    ) => {
      switch (action.type) {
        case "add":
          if (action.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (draft.people as any)[action.id] = action.data as PersonInput;
          }
          break;
        case "update":
          if (draft.people[action.id] && action.data) {
            Object.assign(draft.people[action.id], action.data);
          }
          break;
        case "delete":
          if (draft.people[action.id]) {
            draft.people[action.id].deletedAt = Date.now();
          }
          break;
      }
    },
    []
  );

  // Get list of active people (not deleted)
  const activePeople = useMemo(() => {
    return filterCid(people as unknown as Record<string, Person>)
      .filter(([, person]) => person && !person.deletedAt)
      .map(([id, person]) => ({ ...person, id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people]);

  // Get account currencies for settlement calculation
  const accountCurrencies = useMemo(() => {
    const currencies: Record<string, string> = {};
    for (const [id, account] of filterCid(
      accounts as unknown as Record<string, { currency?: string }>
    )) {
      if (account?.currency) {
        currencies[id] = account.currency;
      }
    }
    return currencies;
  }, [accounts]);

  // Check if a person has transactions (can't delete if so)
  const personHasTransactions = useCallback(
    (personId: string): boolean => {
      for (const [, tx] of filterCid(
        transactions as unknown as Record<
          string,
          { allocations?: Record<string, number>; deletedAt?: number }
        >
      )) {
        if (tx && !tx.deletedAt && tx.allocations) {
          if (personId in tx.allocations) {
            return true;
          }
        }
      }
      return false;
    },
    [transactions]
  );

  // Find current user's person ID
  const currentPersonId = useMemo(() => {
    for (const person of activePeople) {
      if (person.linkedUserId === currentUserPubkeyHash) {
        return person.id;
      }
    }
    return undefined;
  }, [activePeople, currentUserPubkeyHash]);

  // Handle adding a new person
  const handleAdd = useCallback(() => {
    if (!newPersonName.trim()) return;

    const id = crypto.randomUUID();
    updateVault({
      type: "add",
      id,
      data: {
        id,
        name: newPersonName.trim(),
      },
    });

    setNewPersonName("");
    setIsAdding(false);
  }, [newPersonName, updateVault]);

  // Handle updating a person
  const handleUpdate = useCallback(
    (id: string, data: Partial<Person>) => {
      updateVault({ type: "update", id, data });
    },
    [updateVault]
  );

  // Handle deleting a person
  const handleDelete = useCallback(
    (id: string) => {
      updateVault({ type: "delete", id });
    },
    [updateVault]
  );

  // Handle keyboard events for add input
  const handleAddKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsAdding(false);
        setNewPersonName("");
      }
    },
    [handleAdd]
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-lg font-semibold">People</h2>
          <span className="text-muted-foreground text-sm">({activePeople.length})</span>
        </div>

        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Person
          </Button>
        )}
      </div>

      {/* Add new person form */}
      {isAdding && (
        <div className="bg-card flex items-center gap-2 rounded-lg border p-4">
          <Input
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="Enter person's name"
            className="max-w-xs"
            autoFocus
          />
          <Button size="sm" onClick={handleAdd} disabled={!newPersonName.trim()}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewPersonName("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* People list */}
      <div className="space-y-2">
        {activePeople.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            No people added yet. Add a person to track expenses and allocations.
          </p>
        ) : (
          activePeople.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              currentUserPubkeyHash={currentUserPubkeyHash || undefined}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              canDelete={!personHasTransactions(person.id)}
            />
          ))
        )}
      </div>

      {/* Settlement summary */}
      {activePeople.length > 1 && (
        <BalanceSummary
          people={people as unknown as Record<string, Person>}
          transactions={
            transactions as unknown as Record<string, import("@/lib/crdt/schema").Transaction>
          }
          statuses={statuses as unknown as Record<string, import("@/lib/crdt/schema").Status>}
          accountCurrencies={accountCurrencies}
          currentPersonId={currentPersonId}
        />
      )}

      {/* Invite link generator */}
      {isOwner && vaultKey && encSecretKey && (
        <InviteLinkGenerator
          vaultId={vaultId}
          vaultKey={vaultKey}
          encSecretKey={encSecretKey}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
