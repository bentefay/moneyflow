import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    createFieldRule,
    deleteFieldRule,
    persistUserAutomationPreference,
    readUserAutomationChoice,
    updateFieldRule
} from "@/lib/crdt/field-rule-mutations";
import { readActiveFieldRules } from "@/lib/crdt/field-rules";
import { applyFieldRulesToAllTransactions } from "@/lib/crdt/field-rules";
import { createVaultMirror } from "@/lib/crdt/mirror";
import { insertTransaction, type TransactionLocation } from "@/lib/crdt/mutations";
import { type TransactionInput, type VaultState } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";

const ACCOUNT = "account-1";
const OTHER_ACCOUNT = "account-2";
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

describe("field-rule CRUD mutations", () => {
    describe("createFieldRule", () => {
        it("creates a tags rule and exposes it via readActiveFieldRules", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                const result = createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "add", tagIds: ["tag-coffee"] },
                    createdAtEpochMs: 1000
                });
                expect(result.ok).toBe(true);
            });
            const rules = readActiveFieldRules(vault.mirror.getState());
            expect(rules).toHaveLength(1);
            expect(rules[0]?.descriptionText).toBe(DESCRIPTION);
            expect(rules[0]?.action.field).toBe("tags");
        });

        it("rejects a second rule that collides on the uniqueness key (same field/text/scope)", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                const first = createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "add", tagIds: ["tag-a"] },
                    createdAtEpochMs: 1000
                });
                expect(first.ok).toBe(true);

                const second = createFieldRule(state, {
                    id: "rule-2",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "set", tagIds: ["tag-b"] },
                    createdAtEpochMs: 2000
                });
                expect(second.ok).toBe(false);
                if (!second.ok) {
                    expect(second.error.type).toBe("duplicate-key");
                    if (second.error.type === "duplicate-key") {
                        expect(second.error.existingRuleId).toBe("rule-1");
                    }
                }
            });
            expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(1);
        });

        it("permits a more specific scope alongside the unscoped rule", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                createFieldRule(state, {
                    id: "rule-unscoped",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "add", tagIds: ["tag-a"] },
                    createdAtEpochMs: 1000
                });
                const scoped = createFieldRule(state, {
                    id: "rule-account",
                    descriptionText: DESCRIPTION,
                    accountId: ACCOUNT,
                    action: { field: "tags", mode: "add", tagIds: ["tag-b"] },
                    createdAtEpochMs: 2000
                });
                expect(scoped.ok).toBe(true);
            });
            expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(2);
        });

        it("rejects an invalid allocation set with zero mutation", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                const result = createFieldRule(state, {
                    id: "rule-alloc",
                    descriptionText: DESCRIPTION,
                    action: { field: "allocation", allocations: { "person-1": 150 } },
                    createdAtEpochMs: 1000
                });
                expect(result.ok).toBe(false);
                if (!result.ok) expect(result.error.type).toBe("invalid-allocations");
            });
            expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(0);
        });

        it("rejects a descriptionAlias rule with an empty aliasId", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                const result = createFieldRule(state, {
                    id: "rule-alias",
                    descriptionText: DESCRIPTION,
                    action: { field: "descriptionAlias", aliasId: "" },
                    createdAtEpochMs: 1000
                });
                expect(result.ok).toBe(false);
                if (!result.ok) expect(result.error.type).toBe("invalid-rule");
            });
            expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(0);
        });
    });

    describe("updateFieldRule", () => {
        it("updates the action while preserving id, description and creation time", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "add", tagIds: ["tag-a"] },
                    createdAtEpochMs: 1000
                });
                const updated = updateFieldRule(state, {
                    id: "rule-1",
                    action: { field: "tags", mode: "set", tagIds: ["tag-b"] }
                });
                expect(updated.ok).toBe(true);
                if (updated.ok && updated.value.action.field === "tags") {
                    expect(updated.value.action.mode).toBe("set");
                    expect(updated.value.action.tagIds).toEqual(["tag-b"]);
                    expect(updated.value.createdAt.epochMilliseconds).toBe(1000);
                }
            });
            const rules = readActiveFieldRules(vault.mirror.getState());
            expect(rules).toHaveLength(1);
            const only = rules[0];
            expect(only?.action.field === "tags" && only.action.mode).toBe("set");
        });

        it("rejects updating a scope so it collides with another active rule", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                createFieldRule(state, {
                    id: "rule-unscoped",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "add", tagIds: ["tag-a"] },
                    createdAtEpochMs: 1000
                });
                createFieldRule(state, {
                    id: "rule-account",
                    descriptionText: DESCRIPTION,
                    accountId: ACCOUNT,
                    action: { field: "tags", mode: "add", tagIds: ["tag-b"] },
                    createdAtEpochMs: 2000
                });
                // Try to widen rule-account to unscoped, colliding with rule-unscoped.
                const collision = updateFieldRule(state, {
                    id: "rule-account",
                    action: { field: "tags", mode: "add", tagIds: ["tag-b"] }
                });
                expect(collision.ok).toBe(false);
                if (!collision.ok) expect(collision.error.type).toBe("duplicate-key");
            });
        });

        it("returns not-found for a missing rule", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                const result = updateFieldRule(state, {
                    id: "nope",
                    action: { field: "tags", mode: "add", tagIds: [] }
                });
                expect(result.ok).toBe(false);
                if (!result.ok) expect(result.error.type).toBe("not-found");
            });
        });
    });

    describe("deleteFieldRule", () => {
        it("soft-deletes a rule so it no longer applies", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "add", tagIds: ["tag-a"] },
                    createdAtEpochMs: 1000
                });
                const deleted = deleteFieldRule(state, { id: "rule-1", deletedAtEpochMs: 5000 });
                expect(deleted.ok).toBe(true);
            });
            expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(0);
        });

        it("frees the uniqueness slot for a new rule after deletion", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "add", tagIds: ["tag-a"] },
                    createdAtEpochMs: 1000
                });
                deleteFieldRule(state, { id: "rule-1", deletedAtEpochMs: 5000 });
                const recreated = createFieldRule(state, {
                    id: "rule-2",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "set", tagIds: ["tag-b"] },
                    createdAtEpochMs: 6000
                });
                expect(recreated.ok).toBe(true);
            });
            expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(1);
        });

        it("returns not-found when deleting an unknown rule", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                const result = deleteFieldRule(state, { id: "nope", deletedAtEpochMs: 1 });
                expect(result.ok).toBe(false);
                if (!result.ok) expect(result.error.type).toBe("not-found");
            });
        });
    });

    describe("remembered per-user preferences", () => {
        it("persists and reads back a user's remembered choice", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                persistUserAutomationPreference(state, {
                    pubkeyHash: "pubkey-abc",
                    choice: {
                        field: "tags",
                        tagMode: "set",
                        useAccountScope: true,
                        useAmountScope: false
                    }
                });
            });
            const choice = readUserAutomationChoice(vault.mirror.getState(), "pubkey-abc");
            expect(choice.field).toBe("tags");
            expect(choice.tagMode).toBe("set");
            expect(choice.useAccountScope).toBe(true);
            expect(choice.useAmountScope).toBe(false);
        });

        it("returns defaults for an unknown user", () => {
            const vault = createVaultMirror();
            const choice = readUserAutomationChoice(vault.mirror.getState(), "unknown");
            expect(choice.field).toBe("tags");
            expect(choice.useAccountScope).toBe(false);
        });
    });

    describe("apply-all routes created rules through the P17A engine", () => {
        it("applies a created tags rule to a matching imported transaction", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                const inserted = insertTransaction(state.transactions, {
                    transaction: txInput({ id: "t-1" })
                });
                if (!inserted.ok) throw new Error("seed failed");
                createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "add", tagIds: ["tag-coffee"] },
                    createdAtEpochMs: 1000
                });
            });
            vault.mirror.setState((state: VaultState) => {
                const entries = applyFieldRulesToAllTransactions(state);
                expect(entries.length).toBeGreaterThan(0);
            });
            const state = vault.mirror.getState();
            const tx = state.transactions[ACCOUNT];
            expect(JSON.stringify(tx)).toContain("tag-coffee");
        });

        it("does not apply a tags rule to a non-matching account when account-scoped", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                const inserted = insertTransaction(state.transactions, {
                    transaction: txInput({ id: "t-1", accountId: ACCOUNT })
                });
                if (!inserted.ok) throw new Error("seed failed");
                createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    accountId: OTHER_ACCOUNT,
                    action: { field: "tags", mode: "add", tagIds: ["tag-coffee"] },
                    createdAtEpochMs: 1000
                });
            });
            vault.mirror.setState((state: VaultState) => {
                applyFieldRulesToAllTransactions(state);
            });
            const state = vault.mirror.getState();
            const tx = state.transactions[ACCOUNT];
            expect(JSON.stringify(tx)).not.toContain("tag-coffee");
        });
    });
});
