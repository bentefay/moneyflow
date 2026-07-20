import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    assignDescriptionAlias,
    assignDescriptionAliasByExactName,
    changeAllDescriptionAliases,
    changeOneDescriptionAlias,
    createDescriptionAlias,
    deleteDescriptionAliasedTransaction,
    deleteDescriptionAliasedTransactionsByImport,
    normalizeDescriptionAliasName,
    removeAllDescriptionAliases,
    removeOneDescriptionAlias,
    renameDescriptionAlias,
    updateDescriptionAliasedTransaction
} from "@/lib/crdt/description-aliases";
import { repairDescriptionAliases } from "@/lib/crdt/migration";
import { createVaultMirror, type VaultMirror } from "@/lib/crdt/mirror";
import {
    findTransactionInStore,
    insertTransaction,
    updateTransaction,
    type TransactionLocation
} from "@/lib/crdt/mutations";
import type { VaultState } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";

const DATE = Temporal.PlainDate.from("2026-07-20");

function location(transactionId: string): TransactionLocation {
    return { accountId: "account", date: DATE, transactionId };
}

function seedTransaction(
    mirror: VaultMirror,
    transactionId: string,
    importId?: string,
    description = `Raw ${transactionId}`
): void {
    mirror.setState((state: VaultState) => {
        insertTransaction(state.transactions, {
            transaction: {
                id: transactionId,
                date: DATE,
                description,
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
    });
}

function referenceIds(record: Record<string, boolean>): string[] {
    return Object.keys(record)
        .filter((id) => id !== "$cid")
        .sort();
}

function expectConserved(state: VaultState, transactionIds: readonly string[]): void {
    const seen = new Map<string, string>();
    for (const alias of Object.values(state.descriptionAliases)) {
        if (typeof alias !== "object" || alias == null) continue;
        for (const transactionId of referenceIds(alias.transactionIds)) {
            expect(seen.has(transactionId)).toBe(false);
            seen.set(transactionId, alias.id);
        }
    }
    for (const transactionId of transactionIds) {
        const transaction = state.transactions.account.years[0].months[0].days[0].transactions.find(
            (candidate) => candidate.id === transactionId
        );
        expect(seen.get(transactionId)).toBe(transaction?.descriptionAliasId);
    }
}

function activeAliasIds(state: VaultState, kind?: "real" | "symlink"): string[] {
    return Object.values(state.descriptionAliases)
        .filter(
            (alias) =>
                typeof alias === "object" &&
                alias != null &&
                !alias.deletedAt &&
                (kind == null || alias.kind === kind)
        )
        .map((alias) => (typeof alias === "object" ? alias.id : ""))
        .sort();
}

function expectLegalGraph(state: VaultState): void {
    const activeIds = activeAliasIds(state);
    for (const aliasId of activeIds) {
        const alias = state.descriptionAliases[aliasId];
        if (typeof alias !== "object") continue;
        if (alias.kind === "symlink") {
            const target = alias.targetAliasId
                ? state.descriptionAliases[alias.targetAliasId]
                : undefined;
            expect(target && typeof target === "object" ? target.kind : undefined).toBe("real");
            expect(
                target && typeof target === "object" ? target.deletedAt : undefined
            ).toBeUndefined();
        } else {
            const expectedInbound = activeIds.filter((candidateId) => {
                const candidate = state.descriptionAliases[candidateId];
                return (
                    typeof candidate === "object" &&
                    candidate.kind === "symlink" &&
                    candidate.targetAliasId === alias.id
                );
            });
            expect(referenceIds(alias.symlinkIds)).toEqual(expectedInbound);
        }
    }
}

function expectExactTransactionReferences(state: VaultState): void {
    const expectedByAlias = new Map<string, string[]>();
    for (const tree of Object.values(state.transactions)) {
        if (typeof tree !== "object" || tree == null) continue;
        for (const year of tree.years) {
            for (const month of year.months) {
                for (const day of month.days) {
                    for (const transaction of day.transactions) {
                        const applicable = [
                            ...(transaction.deletedAt ? [] : [transaction]),
                            ...(transaction.deletedAt
                                ? []
                                : transaction.suspectedDuplicates.filter(
                                      (duplicate) => !duplicate.deletedAt
                                  ))
                        ];
                        for (const candidate of applicable) {
                            if (!candidate.descriptionAliasId) continue;
                            const referenced =
                                state.descriptionAliases[candidate.descriptionAliasId];
                            expect(typeof referenced === "object" && !referenced.deletedAt).toBe(
                                true
                            );
                            const existing =
                                expectedByAlias.get(candidate.descriptionAliasId) ?? [];
                            expectedByAlias.set(candidate.descriptionAliasId, [
                                ...existing,
                                candidate.id
                            ]);
                        }
                    }
                }
            }
        }
    }
    for (const alias of Object.values(state.descriptionAliases)) {
        if (typeof alias !== "object" || alias == null) continue;
        expect(referenceIds(alias.transactionIds)).toEqual(
            [...(expectedByAlias.get(alias.id) ?? [])].sort()
        );
    }
}

describe("atomic description alias mutations", () => {
    it("assigns through a symlink to the final real alias and preserves raw text", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "tx");
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "source", name: "Source" });
            createDescriptionAlias(state, { aliasId: "target", name: "Target" });
            changeAllDescriptionAliases(state, {
                sourceAliasId: "source",
                target: { kind: "existing", aliasId: "target" }
            });
            assignDescriptionAlias(state, { location: location("tx"), aliasId: "source" });
        });

        const state = mirror.getState();
        const transaction = state.transactions.account.years[0].months[0].days[0].transactions[0];
        expect(transaction.descriptionAliasId).toBe("target");
        expect(transaction.description).toBe("Raw tx");
        expect(referenceIds(state.descriptionAliases.target.transactionIds)).toEqual(["tx"]);
        expect(referenceIds(state.descriptionAliases.source.transactionIds)).toEqual([]);
    });

    it("flattens inbound symlinks without moving direct transaction pointers", () => {
        const { mirror } = createVaultMirror();
        for (const id of ["old", "middle", "new"]) seedTransaction(mirror, id);
        mirror.setState((state: VaultState) => {
            for (const id of ["old", "middle", "new"]) {
                createDescriptionAlias(state, { aliasId: id, name: id });
                assignDescriptionAlias(state, { location: location(id), aliasId: id });
            }
            changeAllDescriptionAliases(state, {
                sourceAliasId: "old",
                target: { kind: "existing", aliasId: "middle" }
            });
            changeAllDescriptionAliases(state, {
                sourceAliasId: "middle",
                target: { kind: "existing", aliasId: "new" }
            });
        });

        const aliases = mirror.getState().descriptionAliases;
        expect(aliases.old.targetAliasId).toBe("new");
        expect(aliases.middle.targetAliasId).toBe("new");
        expect(referenceIds(aliases.new.symlinkIds)).toEqual(["middle", "old"]);
        expect(referenceIds(aliases.old.transactionIds)).toEqual(["old"]);
        expect(referenceIds(aliases.middle.transactionIds)).toEqual(["middle"]);
    });

    it("returns a typed stale error without partial writes", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "tx");
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "a", name: "A" });
            createDescriptionAlias(state, { aliasId: "b", name: "B" });
            assignDescriptionAlias(state, { location: location("tx"), aliasId: "a" });
        });

        let errorCode: string | undefined;
        mirror.setState((state: VaultState) => {
            const result = changeOneDescriptionAlias(state, {
                location: location("tx"),
                expectedAliasId: "stale",
                target: { kind: "existing", aliasId: "b" }
            });
            errorCode = result.ok ? undefined : result.error.code;
        });

        const state = mirror.getState();
        expect(errorCode).toBe("stale-alias");
        expect(
            state.transactions.account.years[0].months[0].days[0].transactions[0].descriptionAliasId
        ).toBe("a");
        expect(referenceIds(state.descriptionAliases.a.transactionIds)).toEqual(["tx"]);
        expect(referenceIds(state.descriptionAliases.b.transactionIds)).toEqual([]);
    });

    it("uses deterministic trim + NFC, case-sensitive exact matching", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "exact");
        seedTransaction(mirror, "case");
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "existing", name: "Café" });
            assignDescriptionAliasByExactName(state, {
                location: location("exact"),
                newAliasId: "unused",
                name: "  Cafe\u0301  "
            });
            assignDescriptionAliasByExactName(state, {
                location: location("case"),
                newAliasId: "created",
                name: "CAFÉ"
            });
        });

        expect(normalizeDescriptionAliasName(" Cafe\u0301 ")).toBe("Café");
        const state = mirror.getState();
        const transactions = state.transactions.account.years[0].months[0].days[0].transactions;
        expect(transactions.find((tx) => tx.id === "exact")?.descriptionAliasId).toBe("existing");
        expect(transactions.find((tx) => tx.id === "case")?.descriptionAliasId).toBe("created");
    });

    it("rejects NFC-equivalent create and rename duplicates without partial writes", () => {
        const { mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            expect(createDescriptionAlias(state, { aliasId: "cafe", name: "Cafe\u0301" }).ok).toBe(
                true
            );
            expect(createDescriptionAlias(state, { aliasId: "other", name: "Other" }).ok).toBe(
                true
            );
        });
        const before = mirror.getState().descriptionAliases.other.name;
        mirror.setState((state: VaultState) => {
            const createResult = createDescriptionAlias(state, {
                aliasId: "duplicate",
                name: "Café"
            });
            const renameResult = renameDescriptionAlias(state, {
                aliasId: "other",
                name: " Café "
            });
            expect(createResult).toMatchObject({ ok: false, error: { code: "duplicate-name" } });
            expect(renameResult).toMatchObject({ ok: false, error: { code: "duplicate-name" } });
        });
        expect(mirror.getState().descriptionAliases.duplicate).toBeUndefined();
        expect(mirror.getState().descriptionAliases.other.name).toBe(before);
    });

    it("preflights alias-aware generic updates before ordinary field writes", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "tx");
        let result: ReturnType<typeof updateDescriptionAliasedTransaction> | undefined;
        mirror.setState((state: VaultState) => {
            result = updateDescriptionAliasedTransaction(state, {
                location: location("tx"),
                updates: { descriptionAliasId: "missing", notes: "must not be written" }
            });
        });
        expect(result).toMatchObject({ ok: false, error: { code: "alias-not-found" } });
        const transaction =
            mirror.getState().transactions.account.years[0].months[0].days[0].transactions[0];
        expect(transaction.notes).toBe("");
        expect(transaction.descriptionAliasId).toBeUndefined();
    });

    it.each(["real", "symlink"] as const)(
        "tombstones the complete group for %s remove-all input and remains repair-stable",
        (inputKind) => {
            const { doc, mirror } = createVaultMirror();
            seedTransaction(mirror, "direct");
            seedTransaction(mirror, "inbound");
            mirror.setState((state: VaultState) => {
                insertTransaction(state.transactions, {
                    transaction: {
                        id: "parent",
                        date: DATE,
                        description: "Parent raw",
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
                                description: "Nested raw",
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
                createDescriptionAlias(state, { aliasId: "root", name: "Root" });
                createDescriptionAlias(state, { aliasId: "link", name: "Link" });
                assignDescriptionAlias(state, { location: location("direct"), aliasId: "root" });
                assignDescriptionAlias(state, { location: location("inbound"), aliasId: "link" });
                assignDescriptionAlias(state, { location: location("nested"), aliasId: "link" });
                changeAllDescriptionAliases(state, {
                    sourceAliasId: "link",
                    target: { kind: "existing", aliasId: "root" }
                });
                const result = removeAllDescriptionAliases(
                    state,
                    inputKind === "real" ? "root" : "link"
                );
                expect(result.ok).toBe(true);
                expectExactTransactionReferences(state);
            });
            const state = mirror.getState();
            for (const id of ["root", "link"]) {
                expect(state.descriptionAliases[id].kind).toBe("real");
                expect(state.descriptionAliases[id].targetAliasId).toBeUndefined();
                expect(state.descriptionAliases[id].deletedAt).toBeDefined();
                expect(referenceIds(state.descriptionAliases[id].transactionIds)).toEqual([]);
            }
            const transactions = state.transactions.account.years[0].months[0].days[0].transactions;
            expect(
                transactions.flatMap((transaction) => [
                    transaction.descriptionAliasId,
                    ...transaction.suspectedDuplicates.map(
                        (duplicate) => duplicate.descriptionAliasId
                    )
                ])
            ).toEqual([undefined, undefined, undefined, undefined]);

            const immediateVersion = doc.version().encode();
            mirror.setState((draft: VaultState) => repairDescriptionAliases(draft), {
                origin: "system:migration"
            });
            expect(doc.version().encode()).toEqual(immediateVersion);
        }
    );

    it("unlinks top-level and imported transactions when deleting", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "one", "batch");
        seedTransaction(mirror, "two", "batch");
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "alias", name: "Alias" });
            assignDescriptionAlias(state, { location: location("one"), aliasId: "alias" });
            assignDescriptionAlias(state, { location: location("two"), aliasId: "alias" });
            deleteDescriptionAliasedTransaction(state, { location: location("one") });
            deleteDescriptionAliasedTransactionsByImport(state, "batch");
        });
        expect(referenceIds(mirror.getState().descriptionAliases.alias.transactionIds)).toEqual([]);
        expect(mirror.getState().transactions.account).toBeUndefined();
    });

    it("preserves nested-duplicate alias provenance and unlinks it on import deletion", () => {
        const { mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: {
                    id: "parent",
                    date: DATE,
                    description: "Parent raw",
                    descriptionAliasId: undefined,
                    notes: "",
                    amount: asMinorUnits(100),
                    accountId: "account",
                    tagIds: [],
                    statusId: "status",
                    importId: undefined,
                    allocations: {},
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
                    importRowIndex: undefined,
                    deletedAt: undefined,
                    suspectedDuplicates: [
                        {
                            id: "duplicate",
                            date: DATE,
                            description: "Duplicate raw",
                            descriptionAliasId: undefined,
                            notes: "",
                            amount: asMinorUnits(100),
                            accountId: "account",
                            tagIds: [],
                            statusId: "status",
                            importId: "batch",
                            allocations: {},
                            creationInstant: Temporal.Instant.fromEpochMilliseconds(2),
                            importRowIndex: 0,
                            deletedAt: undefined
                        }
                    ]
                }
            });
            createDescriptionAlias(state, { aliasId: "alias", name: "Alias" });
            assignDescriptionAlias(state, {
                location: location("duplicate"),
                aliasId: "alias"
            });
        });
        expect(referenceIds(mirror.getState().descriptionAliases.alias.transactionIds)).toEqual([
            "duplicate"
        ]);

        mirror.setState((state: VaultState) => {
            deleteDescriptionAliasedTransactionsByImport(state, "batch");
        });
        expect(referenceIds(mirror.getState().descriptionAliases.alias.transactionIds)).toEqual([]);
        expect(
            mirror.getState().transactions.account.years[0].months[0].days[0].transactions[0]
                .suspectedDuplicates
        ).toHaveLength(0);
    });

    it.each([
        { label: "hard parent", transactionId: "parent", cascade: true },
        { label: "soft parent", transactionId: "parent", cascade: false },
        { label: "nested duplicate", transactionId: "duplicate", cascade: true }
    ])(
        "unlinks the complete applicable deletion set for $label deletion",
        ({ transactionId, cascade }) => {
            const { mirror } = createVaultMirror();
            mirror.setState((state: VaultState) => {
                insertTransaction(state.transactions, {
                    transaction: {
                        id: "parent",
                        date: DATE,
                        description: "Parent raw",
                        descriptionAliasId: undefined,
                        notes: "",
                        amount: asMinorUnits(100),
                        accountId: "account",
                        tagIds: [],
                        statusId: "status",
                        importId: undefined,
                        allocations: {},
                        creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
                        importRowIndex: undefined,
                        deletedAt: undefined,
                        suspectedDuplicates: [
                            {
                                id: "duplicate",
                                date: DATE,
                                description: "Duplicate raw",
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
                                deletedAt: undefined
                            }
                        ]
                    }
                });
                createDescriptionAlias(state, { aliasId: "alias", name: "Alias" });
                assignDescriptionAlias(state, { location: location("parent"), aliasId: "alias" });
                assignDescriptionAlias(state, {
                    location: location("duplicate"),
                    aliasId: "alias"
                });
                deleteDescriptionAliasedTransaction(state, {
                    location: location(transactionId),
                    cascade
                });
            });

            const remaining = referenceIds(
                mirror.getState().descriptionAliases.alias.transactionIds
            );
            expect(remaining).toEqual(transactionId === "duplicate" ? ["parent"] : []);
        }
    );

    it("blocks raw-description and pointer writes through the generic updater", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "tx", undefined, "Immutable raw");
        mirror.setState((state: VaultState) => {
            updateTransaction(state.transactions, {
                location: location("tx"),
                updates: { description: "Changed", descriptionAliasId: "untracked", notes: "kept" }
            });
        });
        const transaction =
            mirror.getState().transactions.account.years[0].months[0].days[0].transactions[0];
        expect(transaction.description).toBe("Immutable raw");
        expect(transaction.descriptionAliasId).toBeUndefined();
        expect(transaction.notes).toBe("kept");
    });

    it("repairs stale reverse references from authoritative transaction pointers", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "tx");
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "alias", name: "Alias" });
            assignDescriptionAlias(state, { location: location("tx"), aliasId: "alias" });
            state.descriptionAliases.alias.transactionIds.ghost = true;
            const transaction =
                state.transactions.account.years[0].months[0].days[0].transactions[0];
            transaction.descriptionAliasId = "missing";
            repairDescriptionAliases(state);
        });
        const state = mirror.getState();
        expect(
            state.transactions.account.years[0].months[0].days[0].transactions[0].descriptionAliasId
        ).toBeUndefined();
        expect(referenceIds(state.descriptionAliases.alias.transactionIds)).toEqual([]);
    });

    it("conserves forward and reverse references across randomized reassignment/removal", () => {
        fc.assert(
            fc.property(
                fc.array(fc.tuple(fc.integer({ min: 0, max: 5 }), fc.integer({ min: 0, max: 2 })), {
                    minLength: 1,
                    maxLength: 80
                }),
                (steps) => {
                    const { mirror } = createVaultMirror();
                    const transactionIds = Array.from({ length: 6 }, (_, index) => `tx-${index}`);
                    for (const id of transactionIds) seedTransaction(mirror, id);
                    mirror.setState((state: VaultState) => {
                        for (const aliasId of ["a", "b", "c"]) {
                            createDescriptionAlias(state, { aliasId, name: aliasId });
                        }
                        for (const [transactionIndex, operation] of steps) {
                            const transactionId = transactionIds[transactionIndex];
                            const transaction =
                                state.transactions.account.years[0].months[0].days[0].transactions.find(
                                    (candidate) => candidate.id === transactionId
                                );
                            if (!transaction) continue;
                            if (operation === 2 && transaction.descriptionAliasId) {
                                removeOneDescriptionAlias(state, {
                                    location: location(transactionId),
                                    expectedAliasId: transaction.descriptionAliasId
                                });
                            } else {
                                assignDescriptionAlias(state, {
                                    location: location(transactionId),
                                    aliasId: ["a", "b", "c"][operation]
                                });
                            }
                        }
                    });
                    expectConserved(mirror.getState(), transactionIds);
                }
            ),
            { seed: 11_042_026, numRuns: 40 }
        );
    });

    it("preserves legal graphs through fixed-seed full-operation and malformed-repair sequences", () => {
        fc.assert(
            fc.property(
                fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 20, maxLength: 100 }),
                (operations) => {
                    const { mirror } = createVaultMirror();
                    const transactionIds = Array.from({ length: 6 }, (_, index) => `full-${index}`);
                    for (const id of transactionIds) seedTransaction(mirror, id);
                    mirror.setState((state: VaultState) => {
                        for (const aliasId of ["base-a", "base-b", "base-c"]) {
                            createDescriptionAlias(state, { aliasId, name: aliasId });
                        }
                        operations.forEach((operation, step) => {
                            const realIds = activeAliasIds(state, "real");
                            const allIds = activeAliasIds(state);
                            const transactionId = transactionIds[step % transactionIds.length];
                            const transaction = findTransactionInStore(
                                state.transactions,
                                location(transactionId)
                            );
                            if (operation === 0) {
                                createDescriptionAlias(state, {
                                    aliasId: `created-${step}`,
                                    name: `Created ${step}`
                                });
                            } else if (operation === 1 && realIds[0]) {
                                renameDescriptionAlias(state, {
                                    aliasId: realIds[0],
                                    name: `Renamed ${step}`
                                });
                            } else if (operation === 2 && transaction && realIds[0]) {
                                assignDescriptionAlias(state, {
                                    location: location(transactionId),
                                    aliasId: realIds[step % realIds.length]
                                });
                            } else if (
                                operation === 3 &&
                                transaction?.descriptionAliasId &&
                                realIds[0]
                            ) {
                                changeOneDescriptionAlias(state, {
                                    location: location(transactionId),
                                    expectedAliasId: transaction.descriptionAliasId,
                                    target: {
                                        kind: "existing",
                                        aliasId: realIds[step % realIds.length]
                                    }
                                });
                            } else if (operation === 4 && realIds.length > 1) {
                                changeAllDescriptionAliases(state, {
                                    sourceAliasId: realIds[0],
                                    target: { kind: "existing", aliasId: realIds[1] }
                                });
                            } else if (operation === 5 && transaction?.descriptionAliasId) {
                                removeOneDescriptionAlias(state, {
                                    location: location(transactionId),
                                    expectedAliasId: transaction.descriptionAliasId
                                });
                            } else if (operation === 6 && allIds[0]) {
                                removeAllDescriptionAliases(state, allIds[step % allIds.length]);
                            } else if (operation === 7 && transaction) {
                                deleteDescriptionAliasedTransaction(state, {
                                    location: location(transactionId)
                                });
                            } else if (operation === 8 && allIds[0]) {
                                state.descriptionAliases[allIds[0]].kind = "symlink";
                                state.descriptionAliases[allIds[0]].targetAliasId = "missing";
                            }
                            if (operation !== 8) expectExactTransactionReferences(state);
                            repairDescriptionAliases(state);
                            expectLegalGraph(state);
                            expectExactTransactionReferences(state);
                        });
                    });
                    expectLegalGraph(mirror.getState());
                }
            ),
            { seed: 20_260_720, numRuns: 50 }
        );
    });
});
