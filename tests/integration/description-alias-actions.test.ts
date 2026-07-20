import { act, render, waitFor } from "@testing-library/react";
import { createElement, useEffect } from "react";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    useDescriptionAliasActions,
    useTransactionActions,
    VaultProvider as VaultStateProvider
} from "@/lib/crdt/context";
import {
    updateDescriptionAliasedTransaction,
    type DescriptionAliasMutationResult
} from "@/lib/crdt/description-aliases";
import { createVaultMirror } from "@/lib/crdt/mirror";
import { insertTransaction, type TransactionLocation } from "@/lib/crdt/mutations";
import type { VaultState } from "@/lib/crdt/schema";
import { VaultUndoCoordinator, VaultUndoProvider } from "@/lib/crdt/undo";
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

function seedNested(state: VaultState): void {
    insertTransaction(state.transactions, {
        transaction: {
            id: "parent",
            date: DATE,
            description: "Raw parent",
            descriptionAliasId: undefined,
            notes: "",
            amount: asMinorUnits(100),
            accountId: "account",
            tagIds: [],
            statusId: "status",
            importId: undefined,
            allocations: {},
            creationInstant: Temporal.Instant.fromEpochMilliseconds(2),
            importRowIndex: 0,
            deletedAt: undefined,
            suspectedDuplicates: [
                {
                    id: "nested",
                    date: DATE,
                    description: "Raw nested",
                    descriptionAliasId: undefined,
                    notes: "",
                    amount: asMinorUnits(100),
                    accountId: "account",
                    tagIds: [],
                    statusId: "status",
                    importId: undefined,
                    allocations: {},
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(3),
                    importRowIndex: 1,
                    deletedAt: undefined
                }
            ]
        }
    });
}

describe("production description alias actions", () => {
    it("creates manual transactions with alias-only provenance in one undo step", async () => {
        const { doc, mirror } = createVaultMirror();
        const coordinator = new VaultUndoCoordinator(doc);
        const localUpdates: Uint8Array[] = [];
        const unsubscribe = doc.subscribeLocalUpdates((update) => localUpdates.push(update));
        let captured: ReturnType<typeof useDescriptionAliasActions> | undefined;

        function CaptureActions() {
            const aliases = useDescriptionAliasActions();
            useEffect(() => {
                captured = aliases;
            }, [aliases]);
            return null;
        }

        const view = render(
            createElement(
                VaultStateProvider,
                { doc },
                // createElement's required-children type needs the child in the typed props object.
                // eslint-disable-next-line react/no-children-prop
                createElement(VaultUndoProvider, {
                    coordinator,
                    children: createElement(CaptureActions)
                })
            )
        );
        await waitFor(() => expect(captured).toBeDefined());
        if (!captured) throw new Error("Actions were not captured");
        const aliases = captured;
        coordinator.clear();
        localUpdates.length = 0;

        let result: DescriptionAliasMutationResult<string> | undefined;
        act(() => {
            result = aliases.insertManualDescriptionAliasedTransaction({
                transaction: {
                    id: "manual",
                    date: DATE,
                    notes: "",
                    amount: asMinorUnits(100),
                    accountId: "account",
                    tagIds: [],
                    statusId: "status",
                    allocations: {},
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
                    importRowIndex: 0,
                    deletedAt: undefined
                },
                newAliasId: "manual-alias",
                name: "Manual alias only"
            });
        });

        expect(result).toEqual({ ok: true, value: "manual-alias" });
        expect(localUpdates).toHaveLength(1);
        const transaction =
            mirror.getState().transactions.account.years[0].months[0].days[0].transactions[0];
        expect(transaction).toMatchObject({
            id: "manual",
            description: "",
            descriptionAliasId: "manual-alias"
        });
        expect(transaction.importId).toBeUndefined();
        expect(mirror.getState().descriptionAliases["manual-alias"]).toMatchObject({
            kind: "real",
            name: "Manual alias only",
            transactionIds: { manual: true }
        });
        expect(coordinator.undo()).toBe(true);
        expect(mirror.getState().transactions.account).toBeUndefined();
        expect(mirror.getState().descriptionAliases["manual-alias"]).toBeUndefined();
        expect(coordinator.undo()).toBe(false);
        expect(coordinator.redo()).toBe(true);
        expect(
            mirror.getState().transactions.account.years[0].months[0].days[0].transactions[0]
                .description
        ).toBe("");

        coordinator.clear();
        localUpdates.length = 0;
        const beforeFailure = snapshot(mirror.getState());
        let failure: DescriptionAliasMutationResult<string> | undefined;
        act(() => {
            failure = aliases.insertManualDescriptionAliasedTransaction({
                transaction: {
                    id: "invalid-manual",
                    date: DATE,
                    notes: "",
                    amount: asMinorUnits(100),
                    accountId: "account",
                    tagIds: [],
                    statusId: "status",
                    allocations: {},
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(2),
                    importRowIndex: 0,
                    deletedAt: undefined
                },
                newAliasId: "invalid-alias",
                name: "   "
            });
        });
        expect(failure).toMatchObject({ ok: false, error: { code: "empty-name" } });
        expect(snapshot(mirror.getState())).toEqual(beforeFailure);
        expect(localUpdates).toHaveLength(0);
        expect(coordinator.undo()).toBe(false);

        coordinator.clear();
        localUpdates.length = 0;
        act(() => {
            result = aliases.insertManualDescriptionAliasedTransaction({
                transaction: {
                    id: "manual-exact",
                    date: DATE,
                    notes: "",
                    amount: asMinorUnits(200),
                    accountId: "account",
                    tagIds: [],
                    statusId: "status",
                    allocations: {},
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(3),
                    importRowIndex: 1,
                    deletedAt: undefined
                },
                newAliasId: "unused-new-alias",
                name: " Manual alias only "
            });
        });
        expect(result).toEqual({ ok: true, value: "manual-alias" });
        expect(localUpdates).toHaveLength(1);
        expect(mirror.getState().descriptionAliases["unused-new-alias"]).toBeUndefined();
        const manualTransactions =
            mirror.getState().transactions.account.years[0].months[0].days[0].transactions;
        expect(manualTransactions.find((item) => item.id === "manual-exact")).toMatchObject({
            description: "",
            descriptionAliasId: "manual-alias"
        });
        expect(coordinator.undo()).toBe(true);
        expect(
            mirror
                .getState()
                .transactions.account.years[0].months[0].days[0].transactions.some(
                    (item) => item.id === "manual-exact"
                )
        ).toBe(false);
        expect(mirror.getState().descriptionAliases["manual-alias"]).toBeDefined();

        view.unmount();
        unsubscribe();
        coordinator.dispose();
    });

    it("returns typed results without replacement recipes and gives every operation one undo/redo step", async () => {
        const { doc, mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            for (const id of ["one", "two", "three", "delete", "imported"]) {
                seed(state, id, id === "imported" ? "batch" : undefined);
            }
            seedNested(state);
        });
        const coordinator = new VaultUndoCoordinator(doc);
        coordinator.clear();
        let captured:
            | {
                  aliases: ReturnType<typeof useDescriptionAliasActions>;
                  transactions: ReturnType<typeof useTransactionActions>;
              }
            | undefined;

        function CaptureActions() {
            const aliases = useDescriptionAliasActions();
            const transactions = useTransactionActions();
            useEffect(() => {
                captured = { aliases, transactions };
            }, [aliases, transactions]);
            return null;
        }

        const view = render(
            createElement(
                VaultStateProvider,
                { doc },
                // createElement's required-children type needs the child in the typed props object.
                // eslint-disable-next-line react/no-children-prop
                createElement(VaultUndoProvider, {
                    coordinator,
                    children: createElement(CaptureActions)
                })
            )
        );
        await waitFor(() => expect(captured).toBeDefined());
        if (!captured) throw new Error("Actions were not captured");
        const { aliases, transactions } = captured;

        const operations: Array<() => DescriptionAliasMutationResult<string | undefined>> = [
            () =>
                aliases.createDescriptionAlias({
                    aliasId: "a",
                    name: "A"
                }),
            () =>
                aliases.renameDescriptionAlias({
                    aliasId: "a",
                    name: " A renamed "
                }),
            () =>
                aliases.assignDescriptionAlias({
                    location: location("one"),
                    aliasId: "a"
                }),
            () =>
                aliases.createAndAssignDescriptionAlias({
                    location: location("two"),
                    aliasId: "b",
                    name: "B"
                }),
            () =>
                aliases.assignDescriptionAliasByExactName({
                    location: location("three"),
                    newAliasId: "c",
                    name: "C"
                }),
            () =>
                aliases.changeOneDescriptionAlias({
                    location: location("three"),
                    expectedAliasId: "c",
                    target: { kind: "existing", aliasId: "a" }
                }),
            () =>
                aliases.changeAllDescriptionAliases({
                    sourceAliasId: "b",
                    target: { kind: "existing", aliasId: "a" }
                }),
            () =>
                aliases.assignDescriptionAlias({
                    location: location("nested"),
                    aliasId: "a"
                }),
            () =>
                aliases.removeOneDescriptionAlias({
                    location: location("one"),
                    expectedAliasId: "a"
                }),
            () => aliases.removeAllDescriptionAliases("a"),
            () =>
                aliases.assignDescriptionAlias({
                    location: location("nested"),
                    aliasId: "c"
                }),
            () => transactions.deleteTransaction({ location: location("nested") }),
            () =>
                aliases.assignDescriptionAlias({
                    location: location("delete"),
                    aliasId: "c"
                }),
            () => transactions.deleteTransaction({ location: location("delete") }),
            () =>
                aliases.assignDescriptionAlias({
                    location: location("imported"),
                    aliasId: "c"
                }),
            () => transactions.deleteTransactionsByImport("batch")
        ];

        for (const [operationIndex, operation] of operations.entries()) {
            coordinator.clear();
            const before = snapshot(mirror.getState());
            let result: DescriptionAliasMutationResult<string | undefined> | undefined;
            act(() => {
                result = operation();
            });
            if (!result) throw new Error("Action did not return a Result");
            expect(result.ok).toBe(true);
            const after = snapshot(mirror.getState());
            expect(after).not.toEqual(before);
            if (operationIndex === 9) {
                const currentTransactions =
                    mirror.getState().transactions.account.years[0].months[0].days[0].transactions;
                expect(
                    currentTransactions
                        .filter((transaction) => ["two", "three"].includes(transaction.id))
                        .map((transaction) => transaction.descriptionAliasId)
                ).toEqual([undefined, undefined]);
                expect(
                    currentTransactions
                        .flatMap((transaction) => transaction.suspectedDuplicates)
                        .find((duplicate) => duplicate.id === "nested")?.descriptionAliasId
                ).toBeUndefined();
            }
            expect(coordinator.undo()).toBe(true);
            expect(snapshot(mirror.getState())).toEqual(before);
            expect(coordinator.undo()).toBe(false);
            expect(coordinator.redo()).toBe(true);
            expect(snapshot(mirror.getState())).toEqual(after);
        }
        view.unmount();
        coordinator.dispose();
    });

    it("returns an invalid-alias error with no partial write or undo entry", () => {
        const { doc, mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => seed(state, "one"));
        const coordinator = new VaultUndoCoordinator(doc);
        coordinator.clear();
        const before = snapshot(mirror.getState());

        let result: ReturnType<typeof updateDescriptionAliasedTransaction> | undefined;
        coordinator.runUserAction("edit", (origin) => {
            mirror.setState(
                (state: VaultState) => {
                    result = updateDescriptionAliasedTransaction(state, {
                        location: location("one"),
                        updates: { descriptionAliasId: "missing", notes: "partial" }
                    });
                },
                { origin }
            );
        });

        expect(result).toMatchObject({ ok: false, error: { code: "alias-not-found" } });
        expect(snapshot(mirror.getState())).toEqual(before);
        expect(coordinator.undo()).toBe(false);
        coordinator.dispose();
    });
});
