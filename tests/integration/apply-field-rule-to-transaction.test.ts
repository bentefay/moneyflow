import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { applyFieldRulesToSingleTransaction } from "@/lib/crdt/apply-field-rule-to-transaction";
import { createDescriptionAlias } from "@/lib/crdt/description-aliases";
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

function locationOf(transactionId: string, date: Temporal.PlainDate = DATE): TransactionLocation {
    return { accountId: ACCOUNT, date, transactionId };
}

function txInput(overrides: Partial<TransactionInput> & { readonly id: string }): TransactionInput {
    return {
        date: DATE,
        description: DESCRIPTION,
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-450),
        originalAmount: undefined,
        accountId: ACCOUNT,
        tagIds: [],
        statusId: "status-1",
        importId: "import-1",
        allocations: {},
        creationInstant: CREATION,
        importRowIndex: undefined,
        suspectedDuplicates: [],
        deletedAt: undefined,
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

describe("applyFieldRulesToSingleTransaction", () => {
    it("applies the winning description-alias rule to just that transaction via the P11 boundary", () => {
        const vault = createVaultMirror();
        let outcomeStatuses: readonly string[] = [];
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-1", importId: "import-1" })
            });
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
            const result = applyFieldRulesToSingleTransaction(state, { transactionId: "t-1" });
            expect(result.ok).toBe(true);
            if (result.ok) {
                outcomeStatuses = result.outcomes.map((outcome) => outcome.status);
            }
        });

        expect(outcomeStatuses).toContain("applied");
        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-1")
        );
        expect(applied?.descriptionAliasId).toBe("alias-coffee");
    });

    it("does not touch other transactions", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-1", importId: "import-1" })
            });
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-2", importId: "import-1" })
            });
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
            applyFieldRulesToSingleTransaction(state, { transactionId: "t-1" });
        });

        const state = vault.mirror.getState();
        expect(
            findTransactionInStore(state.transactions, locationOf("t-1"))?.descriptionAliasId
        ).toBe("alias-coffee");
        expect(
            findTransactionInStore(state.transactions, locationOf("t-2"))?.descriptionAliasId
        ).toBeUndefined();
    });

    it("routes allocation writes through P16C for the single transaction", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: txInput({
                    id: "t-alloc",
                    importId: "import-1",
                    allocations: { "person-a": asPercentage(50), "person-b": asPercentage(50) }
                })
            });
            putFieldRule(
                state,
                ruleInput({
                    id: "r-alloc",
                    field: "allocation",
                    descriptionText: DESCRIPTION,
                    allocations: { "person-a": asPercentage(100) }
                })
            );
            const result = applyFieldRulesToSingleTransaction(state, { transactionId: "t-alloc" });
            expect(result.ok).toBe(true);
        });

        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-alloc")
        );
        // Complete-set replacement removed the key absent from the valid replacement.
        const entries = Object.entries(applied?.allocations ?? {}).filter(([id]) => id !== "$cid");
        expect(entries.map(([id]) => id)).toEqual(["person-a"]);
        expect(entries[0]?.[1]).toBe(100);
    });

    it("rejects an invalid complete allocation set with zero mutation", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: txInput({
                    id: "t-invalid",
                    importId: "import-1",
                    allocations: { "person-a": asPercentage(100) }
                })
            });
            putFieldRule(
                state,
                ruleInput({
                    id: "r-invalid",
                    field: "allocation",
                    descriptionText: DESCRIPTION,
                    // 150 is out of range; must be rejected, never clamped/normalised.
                    allocations: { "person-a": asPercentage(150) }
                })
            );
            const result = applyFieldRulesToSingleTransaction(state, {
                transactionId: "t-invalid"
            });
            expect(result.ok).toBe(true);
        });

        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-invalid")
        );
        for (const [personId, value] of Object.entries(applied?.allocations ?? {})) {
            if (personId === "$cid") continue;
            expect(value).toBe(100);
        }
    });

    it("returns transaction-not-found for an unknown transaction id", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            const result = applyFieldRulesToSingleTransaction(state, { transactionId: "nope" });
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.reason).toBe("transaction-not-found");
        });
    });
});
