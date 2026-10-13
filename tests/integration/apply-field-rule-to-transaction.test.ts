import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    applyFieldRulesToSingleTransaction,
    type ApplyFieldRulesToTransactionInput,
    type ApplyFieldRulesToTransactionResult
} from "@/lib/crdt/apply-field-rule-to-transaction";
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
        // Legacy wire shape: no output list, so the rule has exactly the one output `field` names.
        outputFields: [],
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
                    // NaN is not a percentage; the rule must be rejected, never normalised.
                    allocations: { "person-a": asPercentage(Number.NaN) }
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

describe("applyFieldRulesToSingleTransaction with a known location", () => {
    const NEXT_DAY = DATE.add({ days: 1 });

    /** A vault with a target row, a neighbour and a nested duplicate, and one rule per field. */
    function seededVault(): ReturnType<typeof createVaultMirror> {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, { transaction: txInput({ id: "t-1" }) });
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-2", date: NEXT_DAY })
            });
            // Nested under t-1's day bucket while carrying its own, later date.
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-dup", date: NEXT_DAY }),
                suspectedDuplicateOf: locationOf("t-1")
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
            putFieldRule(
                state,
                ruleInput({
                    id: "r-tags",
                    field: "tags",
                    descriptionText: DESCRIPTION,
                    tagMode: "add",
                    tagIds: ["tag-coffee"]
                })
            );
            putFieldRule(
                state,
                ruleInput({
                    id: "r-alloc",
                    field: "allocation",
                    descriptionText: DESCRIPTION,
                    allocations: { "person-a": asPercentage(100) }
                })
            );
        });
        return vault;
    }

    /** The result and the resulting transaction store, without per-document container ids. */
    function applyOnFreshVault(input: ApplyFieldRulesToTransactionInput): {
        readonly result: ApplyFieldRulesToTransactionResult | null;
        readonly transactions: string;
    } {
        const vault = seededVault();
        let result: ApplyFieldRulesToTransactionResult | null = null;
        vault.mirror.setState((state: VaultState) => {
            result = applyFieldRulesToSingleTransaction(state, input);
        });
        const transactions = JSON.stringify(
            vault.mirror.getState().transactions,
            (key: string, value: unknown) => (key === "$cid" ? undefined : value)
        );
        return { result, transactions };
    }

    it.each([
        { name: "the row's own location", id: "t-1", accountId: ACCOUNT, date: DATE },
        { name: "a stale date, falling back", id: "t-1", accountId: ACCOUNT, date: NEXT_DAY },
        { name: "a stale account, falling back", id: "t-1", accountId: "account-9", date: DATE },
        { name: "a duplicate's bucket", id: "t-dup", accountId: ACCOUNT, date: DATE },
        { name: "a duplicate's own date", id: "t-dup", accountId: ACCOUNT, date: NEXT_DAY },
        { name: "an unknown id", id: "nope", accountId: ACCOUNT, date: DATE }
    ])("$name gives exactly the id-only outcome and writes", ({ id, accountId, date }) => {
        const byId = applyOnFreshVault({ transactionId: id });
        const located = applyOnFreshVault({ transactionId: id, location: { accountId, date } });

        expect(located).toEqual(byId);
    });

    it("applies every field on the located row and leaves its neighbours alone", () => {
        const { result, transactions } = applyOnFreshVault({
            transactionId: "t-1",
            location: { accountId: ACCOUNT, date: DATE }
        });
        const untouched = applyOnFreshVault({ transactionId: "nope" }).transactions;

        expect(result?.ok && result.outcomes.map((outcome) => outcome.field)).toEqual([
            "tags",
            "allocation",
            "descriptionAlias"
        ]);
        expect(transactions).not.toBe(untouched);
    });

    it("keeps transaction-not-found for a stale id at a real location", () => {
        const { result } = applyOnFreshVault({
            transactionId: "nope",
            location: { accountId: ACCOUNT, date: DATE }
        });

        expect(result).toEqual({ ok: false, reason: "transaction-not-found" });
    });
});
