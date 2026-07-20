import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { runVaultAction } from "@/lib/crdt/context";
import {
    assignDescriptionAlias,
    assignDescriptionAliasByExactName,
    changeAllDescriptionAliases,
    changeOneDescriptionAlias,
    createAndAssignDescriptionAlias,
    createDescriptionAlias,
    deleteDescriptionAliasedTransaction,
    deleteDescriptionAliasedTransactionsByImport,
    removeAllDescriptionAliases,
    removeOneDescriptionAlias,
    renameDescriptionAlias,
    updateDescriptionAliasedTransaction
} from "@/lib/crdt/description-aliases";
import { createVaultMirror } from "@/lib/crdt/mirror";
import { insertTransaction, type TransactionLocation } from "@/lib/crdt/mutations";
import type { VaultState } from "@/lib/crdt/schema";
import { VaultUndoCoordinator } from "@/lib/crdt/undo";
import { asMinorUnits } from "@/lib/domain/currency";

const DATE = Temporal.PlainDate.from("2026-07-20");

function location(transactionId: string): TransactionLocation {
    return { accountId: "account", date: DATE, transactionId };
}

function snapshot(state: VaultState): object {
    return JSON.parse(JSON.stringify(state)) as object;
}

function seed(state: VaultState, id: string, importId?: string): void {
    insertTransaction(state.transactions, {
        transaction: {
            id,
            date: DATE,
            description: `Raw ${id}`,
            descriptionAliasId: undefined,
            notes: "",
            amount: asMinorUnits(100),
            accountId: "account",
            tagIds: [],
            statusId: "status",
            importId,
            allocations: {},
            creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
            importRowIndex: 0,
            deletedAt: undefined
        }
    });
}

describe("production description alias actions", () => {
    it("returns typed results without replacement recipes and gives every operation one undo/redo step", () => {
        const { doc, mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            for (const id of ["one", "two", "three", "delete", "imported"]) {
                seed(state, id, id === "imported" ? "batch" : undefined);
            }
        });
        const coordinator = new VaultUndoCoordinator(doc);
        coordinator.clear();

        const operations: Array<() => { readonly ok: boolean }> = [
            () =>
                runVaultAction(mirror, coordinator, "alias", createDescriptionAlias, {
                    aliasId: "a",
                    name: "A"
                }),
            () =>
                runVaultAction(mirror, coordinator, "alias", renameDescriptionAlias, {
                    aliasId: "a",
                    name: " A renamed "
                }),
            () =>
                runVaultAction(mirror, coordinator, "alias", assignDescriptionAlias, {
                    location: location("one"),
                    aliasId: "a"
                }),
            () =>
                runVaultAction(mirror, coordinator, "alias", createAndAssignDescriptionAlias, {
                    location: location("two"),
                    aliasId: "b",
                    name: "B"
                }),
            () =>
                runVaultAction(mirror, coordinator, "alias", assignDescriptionAliasByExactName, {
                    location: location("three"),
                    newAliasId: "c",
                    name: "C"
                }),
            () =>
                runVaultAction(mirror, coordinator, "alias", changeOneDescriptionAlias, {
                    location: location("three"),
                    expectedAliasId: "c",
                    target: { kind: "existing", aliasId: "a" }
                }),
            () =>
                runVaultAction(mirror, coordinator, "alias", changeAllDescriptionAliases, {
                    sourceAliasId: "b",
                    target: { kind: "existing", aliasId: "a" }
                }),
            () =>
                runVaultAction(mirror, coordinator, "alias", removeOneDescriptionAlias, {
                    location: location("one"),
                    expectedAliasId: "a"
                }),
            () => runVaultAction(mirror, coordinator, "alias", removeAllDescriptionAliases, "a"),
            () =>
                runVaultAction(mirror, coordinator, "delete", deleteDescriptionAliasedTransaction, {
                    location: location("delete")
                }),
            () =>
                runVaultAction(
                    mirror,
                    coordinator,
                    "delete",
                    deleteDescriptionAliasedTransactionsByImport,
                    "batch"
                )
        ];

        for (const operation of operations) {
            coordinator.clear();
            const before = snapshot(mirror.getState());
            const result = operation();
            expect(result.ok).toBe(true);
            const after = snapshot(mirror.getState());
            expect(after).not.toEqual(before);
            expect(coordinator.undo()).toBe(true);
            expect(snapshot(mirror.getState())).toEqual(before);
            expect(coordinator.undo()).toBe(false);
            expect(coordinator.redo()).toBe(true);
            expect(snapshot(mirror.getState())).toEqual(after);
        }
        coordinator.dispose();
    });

    it("returns an invalid-alias error with no partial write or undo entry", () => {
        const { doc, mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => seed(state, "one"));
        const coordinator = new VaultUndoCoordinator(doc);
        coordinator.clear();
        const before = snapshot(mirror.getState());

        const result = runVaultAction(
            mirror,
            coordinator,
            "edit",
            updateDescriptionAliasedTransaction,
            {
                location: location("one"),
                updates: { descriptionAliasId: "missing", notes: "partial" }
            }
        );

        expect(result).toMatchObject({ ok: false, error: { code: "alias-not-found" } });
        expect(snapshot(mirror.getState())).toEqual(before);
        expect(coordinator.undo()).toBe(false);
        coordinator.dispose();
    });
});
