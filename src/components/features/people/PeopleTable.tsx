"use client";

/**
 * PeopleTable Component
 *
 * Container component for managing people in the vault.
 * Includes list of people, add new person, and invite link generation.
 */

import { Plus, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Temporal } from "temporal-polyfill";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultAction, useVaultSelector } from "@/lib/crdt/context";
import { getAllTransactions } from "@/lib/crdt/queries";
import type { Person, PersonInput } from "@/lib/crdt/schema";
import { getEntriesOfLoroMap } from "@/lib/crdt/utils";
import { getSessionPubkeyHash } from "@/lib/crypto/session";
import { cn } from "@/lib/utils";

import { BalanceSummary } from "./BalanceSummary";
import { InviteLinkGenerator } from "./InviteLinkGenerator";
import { PersonRow } from "./PersonRow";

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
 * Main people management component.
 */
export function PeopleTable({
    vaultId,
    vaultKey,
    encSecretKey,
    isOwner = false,
    className
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
    const preferences = useVaultSelector((state) => state.preferences);

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
                        draft.people[action.id].deletedAt = Temporal.Now.instant();
                    }
                    break;
            }
        },
        []
    );

    // Get list of active people (not deleted)
    const activePeople = useMemo(() => {
        return getEntriesOfLoroMap(people)
            .filter(([, person]) => person && !person.deletedAt)
            .map(([id, person]) => ({ ...person, id }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [people]);

    // Check if a person has transactions (can't delete if so)
    const personHasTransactions = useCallback(
        (personId: string): boolean => {
            for (const tx of getAllTransactions(transactions)) {
                if (!tx.deletedAt && tx.allocations && personId in tx.allocations) {
                    return true;
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
                name: newPersonName.trim()
            }
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
            <BalanceSummary
                accounts={accounts}
                people={people}
                transactions={transactions}
                statuses={statuses}
                currentPersonId={currentPersonId}
                vaultDefaultCurrency={preferences.defaultCurrency}
            />

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
