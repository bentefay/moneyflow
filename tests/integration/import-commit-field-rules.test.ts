/**
 * Proves that the PRODUCTION import commit (`commitImportBatch`, invoked by the new-import page via
 * `useCommitImportBatch`) applies HS-007/P17A field rules end-to-end to a real imported batch.
 *
 * Before this package's wiring the import commit inserted transactions and applied nothing; these
 * tests exercise the exact updater the page runs and assert each field's rule is applied through its
 * mandated boundary (tags via `updateTransaction`, allocations EXCLUSIVELY via P16C, description
 * aliases EXCLUSIVELY via the P11 back-map).
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { createDescriptionAlias } from "@/lib/crdt/description-aliases";
import { applyFieldRulesToImport, readActiveFieldRules } from "@/lib/crdt/field-rules";
import { commitImportBatch, type ImportBatchTransactionInput } from "@/lib/crdt/import-commit";
import { createVaultMirror } from "@/lib/crdt/mirror";
import {
    findTransactionInStore,
    insertTransaction,
    type TransactionLocation
} from "@/lib/crdt/mutations";
import { type FieldRuleInput, type TransactionInput, type VaultState } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";
import { asPercentage } from "@/types";

const ACCOUNT = "account-1";
const DATE = Temporal.PlainDate.from("2026-07-25");
const CREATION = Temporal.Instant.from("2026-07-25T00:00:00Z");
const DESCRIPTION = "COFFEE SHOP 123";
const IMPORT_ID = "import-1";

function locationOf(transactionId: string, date: Temporal.PlainDate = DATE): TransactionLocation {
    return { accountId: ACCOUNT, date, transactionId };
}

function importRow(
    overrides: Partial<ImportBatchTransactionInput> & { readonly id: string }
): ImportBatchTransactionInput {
    return {
        date: DATE,
        description: DESCRIPTION,
        amount: asMinorUnits(-450),
        accountId: ACCOUNT,
        statusId: "status-1",
        importRowIndex: 0,
        duplicateOf: null,
        ...overrides
    };
}

function putFieldRule(state: VaultState, input: FieldRuleInput): void {
    const draft: Record<string, FieldRuleInput> = state.fieldRules;
    draft[input.id] = input;
}

function ruleInput(
    overrides: Partial<FieldRuleInput> & Pick<FieldRuleInput, "id" | "field" | "descriptionText">
): FieldRuleInput {
    return {
        accountId: undefined,
        amount: undefined,
        aliasId: undefined,
        tagMode: undefined,
        tagIds: [],
        allocations: {},
        createdAtEpochMs: 0,
        deletedAtEpochMs: undefined,
        ...overrides
    };
}

function manualTxInput(id: string): TransactionInput {
    return {
        id,
        date: DATE,
        description: DESCRIPTION,
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-450),
        originalAmount: undefined,
        accountId: ACCOUNT,
        tagIds: [],
        statusId: "status-1",
        importId: undefined,
        allocations: {},
        creationInstant: CREATION,
        importRowIndex: undefined,
        suspectedDuplicates: [],
        deletedAt: undefined
    };
}

function explicitAllocations(
    allocations: Readonly<Record<string, unknown>> | undefined
): Record<string, number> {
    const explicit: Record<string, number> = {};
    for (const [personId, value] of Object.entries(allocations ?? {})) {
        if (personId !== "$cid" && typeof value === "number") explicit[personId] = value;
    }
    return explicit;
}

describe("production import commit applies field rules", () => {
    it("applies the highest-precedence tag rule to every imported transaction", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            putFieldRule(
                state,
                ruleInput({
                    id: "r-generic",
                    field: "tags",
                    descriptionText: DESCRIPTION,
                    tagMode: "set",
                    tagIds: ["generic"]
                })
            );
            putFieldRule(
                state,
                ruleInput({
                    id: "r-account",
                    field: "tags",
                    descriptionText: DESCRIPTION,
                    accountId: ACCOUNT,
                    tagMode: "set",
                    tagIds: ["specific"]
                })
            );
            commitImportBatch(state, {
                importId: IMPORT_ID,
                fileName: "coffee.csv",
                creationInstant: CREATION,
                transactions: [importRow({ id: "t-imp" })]
            });
        });

        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-imp")
        );
        expect([...(applied?.tagIds ?? [])]).toEqual(["specific"]);
        // The import record was created by the same commit.
        expect(vault.mirror.getState().imports[IMPORT_ID]).toBeDefined();
    });

    it("sets a description alias through the P11 back-map on import", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            const created = createDescriptionAlias(state, {
                aliasId: "alias-coffee",
                name: "Coffee"
            });
            if (!created.ok) throw new Error("alias seed failed");
            putFieldRule(
                state,
                ruleInput({
                    id: "r-alias",
                    field: "descriptionAlias",
                    descriptionText: DESCRIPTION,
                    aliasId: "alias-coffee"
                })
            );
            commitImportBatch(state, {
                importId: IMPORT_ID,
                fileName: "coffee.csv",
                creationInstant: CREATION,
                transactions: [importRow({ id: "t-alias" })]
            });
        });

        const state = vault.mirror.getState();
        const applied = findTransactionInStore(state.transactions, locationOf("t-alias"));
        expect(applied?.descriptionAliasId).toBe("alias-coffee");
        // Proves the P11 reverse map (alias -> transaction) was updated, not just the forward field.
        const alias = state.descriptionAliases["alias-coffee"];
        expect(typeof alias === "object" ? alias?.transactionIds["t-alias"] : undefined).toBe(true);
    });

    it("replaces allocations exclusively through the P16C complete set on import", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            putFieldRule(
                state,
                ruleInput({
                    id: "r-alloc",
                    field: "allocation",
                    descriptionText: DESCRIPTION,
                    allocations: { "person-a": asPercentage(60), "person-b": asPercentage(40) }
                })
            );
            commitImportBatch(state, {
                importId: IMPORT_ID,
                fileName: "coffee.csv",
                creationInstant: CREATION,
                transactions: [importRow({ id: "t-alloc" })]
            });
        });

        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-alloc")
        );
        expect(explicitAllocations(applied?.allocations)).toEqual({
            "person-a": 60,
            "person-b": 40
        });
    });

    it("rejects an invalid complete allocation set with zero mutation", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            putFieldRule(
                state,
                ruleInput({
                    id: "r-invalid",
                    field: "allocation",
                    descriptionText: DESCRIPTION,
                    // Out of range: must be rejected at decode, never clamped or normalised.
                    allocations: { "person-a": asPercentage(150) }
                })
            );
            // The malformed rule never becomes active.
            expect(readActiveFieldRules(state)).toHaveLength(0);
            commitImportBatch(state, {
                importId: IMPORT_ID,
                fileName: "coffee.csv",
                creationInstant: CREATION,
                transactions: [importRow({ id: "t-invalid" })]
            });
        });

        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-invalid")
        );
        // The imported transaction keeps its inserted (empty) allocation set — no bypass, no clamp.
        expect(explicitAllocations(applied?.allocations)).toEqual({});
    });

    it("re-running rule application over the same import converges (idempotent)", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            putFieldRule(
                state,
                ruleInput({
                    id: "r-tags",
                    field: "tags",
                    descriptionText: DESCRIPTION,
                    tagMode: "set",
                    tagIds: ["coffee"]
                })
            );
            commitImportBatch(state, {
                importId: IMPORT_ID,
                fileName: "coffee.csv",
                creationInstant: CREATION,
                transactions: [importRow({ id: "t-imp" })]
            });
        });
        // Apply again over the committed batch: state must not drift.
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToImport(state, { importId: IMPORT_ID });
        });

        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-imp")
        );
        expect([...(applied?.tagIds ?? [])]).toEqual(["coffee"]);
    });

    it("does not apply an import-scoped commit to a pre-existing manual transaction", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            // Manual row (importId == null) matching the same description, present before the import.
            insertTransaction(state.transactions, { transaction: manualTxInput("t-manual") });
            const created = createDescriptionAlias(state, {
                aliasId: "alias-coffee",
                name: "Coffee"
            });
            if (!created.ok) throw new Error("alias seed failed");
            putFieldRule(
                state,
                ruleInput({
                    id: "r-alias",
                    field: "descriptionAlias",
                    descriptionText: DESCRIPTION,
                    aliasId: "alias-coffee"
                })
            );
            commitImportBatch(state, {
                importId: IMPORT_ID,
                fileName: "coffee.csv",
                creationInstant: CREATION,
                transactions: [importRow({ id: "t-imp" })]
            });
        });

        const state = vault.mirror.getState();
        // The imported row received the alias; the manual row was outside the committed batch.
        expect(
            findTransactionInStore(state.transactions, locationOf("t-imp"))?.descriptionAliasId
        ).toBe("alias-coffee");
        expect(
            findTransactionInStore(state.transactions, locationOf("t-manual"))?.descriptionAliasId
        ).toBeUndefined();
    });
});
