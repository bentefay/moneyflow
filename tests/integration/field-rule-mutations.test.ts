import { LoroMap } from "loro-crdt";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { asTransactionId } from "@/components/features/transactions/table-model/ids";
import { insertManualDescriptionAliasedTransaction } from "@/lib/crdt/description-aliases";
import {
    persistUserDateFormat,
    persistUserTransactionInspectorOpen,
    readUserDateFormat,
    readUserTransactionInspectorOpen,
    toTransactionInspectorOpen
} from "@/lib/crdt/display-preferences";
import {
    createFieldRule,
    deleteFieldRule,
    type FieldRuleOutputsInput,
    moveFieldRuleOutput,
    persistUserAutomationPreference,
    readUserAutomationChoice,
    setFieldRuleOutput,
    splitFieldRuleOutput,
    updateFieldRule
} from "@/lib/crdt/field-rule-mutations";
import { readActiveFieldRules, toFieldRuleInput } from "@/lib/crdt/field-rules";
import {
    applyFieldRulesToAllTransactions,
    applyFieldRulesToNewerTransactions
} from "@/lib/crdt/field-rules";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import {
    findTransactionInStore,
    insertTransaction,
    type TransactionLocation
} from "@/lib/crdt/mutations";
import { type FieldRuleInput, type TransactionInput, type VaultState } from "@/lib/crdt/schema";
import { buildFieldRule, type RuleReach } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const ACCOUNT = "account-1";
const OTHER_ACCOUNT = "account-2";
const DATE = Temporal.PlainDate.from("2026-07-25");
const CREATION = Temporal.Instant.from("2026-07-25T00:00:00Z");
const DESCRIPTION = "COFFEE SHOP 123";

function rawViewerPreference(
    doc: ReturnType<typeof createVaultMirror>["doc"],
    pubkeyHash: string
): LoroMap {
    const preference = doc.getMap("userDisplayPreferences").get(pubkeyHash);
    if (!(preference instanceof LoroMap)) {
        throw new Error(`Expected raw display preference for ${pubkeyHash}`);
    }
    return preference;
}

function installRawViewerPreference(
    doc: ReturnType<typeof createVaultMirror>["doc"],
    pubkeyHash: string
): LoroMap {
    const preference = doc.getMap("userDisplayPreferences").setContainer(pubkeyHash, new LoroMap());
    preference.set("pubkeyHash", pubkeyHash);
    return preference;
}

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

type Vault = ReturnType<typeof createVaultMirror>;

interface RuleSeed {
    readonly id: string;
    readonly accountId?: string;
    readonly reach?: RuleReach;
    readonly outputs: FieldRuleOutputsInput;
}

/** A vault holding `rules`, created through the real CRUD path on the shared description. */
function seed(rules: readonly RuleSeed[]): Vault {
    const vault = createVaultMirror();
    vault.mirror.setState((state: VaultState) => {
        for (const [index, rule] of rules.entries()) {
            const created = createFieldRule(state, {
                descriptionText: DESCRIPTION,
                createdAtEpochMs: 1000 + index,
                ...rule
            });
            if (!created.ok) throw new Error(`seed ${rule.id} failed`);
        }
    });
    return vault;
}

/** Write a valid rule straight to the wire, bypassing the uniqueness check. */
function writeRaw(vault: Vault, rule: RuleSeed): void {
    const built = buildFieldRule({ descriptionText: DESCRIPTION, createdAtEpochMs: 500, ...rule });
    if (!built.ok) throw new Error(`raw rule ${rule.id} is invalid`);
    vault.mirror.setState((state: VaultState) => {
        const draft: Record<string, FieldRuleInput> = state.fieldRules;
        draft[rule.id] = toFieldRuleInput(built.value);
    });
}

function storedRules(vault: Vault): string {
    return JSON.stringify(vault.mirror.getState().fieldRules);
}

/** Run a refused mutation and prove the stored rules are byte-identical afterwards. */
function expectNoRuleWrite(vault: Vault, refuse: (state: VaultState) => void): void {
    const before = storedRules(vault);
    vault.mirror.setState(refuse);
    expect(storedRules(vault)).toBe(before);
}

describe("field-rule CRUD mutations", () => {
    describe("createFieldRule", () => {
        it("creates a tags rule and exposes it via readActiveFieldRules", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                const result = createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    outputs: { tags: { mode: "add", tagIds: ["tag-coffee"] } },
                    createdAtEpochMs: 1000
                });
                expect(result.ok).toBe(true);
            });
            const rules = readActiveFieldRules(vault.mirror.getState());
            expect(rules).toHaveLength(1);
            expect(rules[0]?.descriptionText).toBe(DESCRIPTION);
            expect(rules[0]?.outputs).toEqual({ tags: { mode: "add", tagIds: ["tag-coffee"] } });
        });

        it("rejects a second rule that collides on the uniqueness key (same field/text/scope)", () => {
            const vault = seed([
                { id: "rule-1", outputs: { tags: { mode: "add", tagIds: ["tag-a"] } } }
            ]);
            expectNoRuleWrite(vault, (state) => {
                const second = createFieldRule(state, {
                    id: "rule-2",
                    descriptionText: DESCRIPTION,
                    outputs: { tags: { mode: "set", tagIds: ["tag-b"] } },
                    createdAtEpochMs: 2000
                });
                expect(second).toEqual({
                    ok: false,
                    error: { type: "duplicate-key", existingRuleId: "rule-1" }
                });
            });
            expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(1);
        });

        it("permits a more specific scope alongside the unscoped rule", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                createFieldRule(state, {
                    id: "rule-unscoped",
                    descriptionText: DESCRIPTION,
                    outputs: { tags: { mode: "add", tagIds: ["tag-a"] } },
                    createdAtEpochMs: 1000
                });
                const scoped = createFieldRule(state, {
                    id: "rule-account",
                    descriptionText: DESCRIPTION,
                    accountId: ACCOUNT,
                    outputs: { tags: { mode: "add", tagIds: ["tag-b"] } },
                    createdAtEpochMs: 2000
                });
                expect(scoped.ok).toBe(true);
            });
            expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(2);
        });

        it.each([
            {
                name: "an invalid allocation set",
                outputs: { allocation: { allocations: { "person-1": Number.NaN } } },
                type: "invalid-allocations"
            },
            {
                name: "a descriptionAlias rule with an empty aliasId",
                outputs: { descriptionAlias: { aliasId: "" } },
                type: "invalid-rule"
            }
        ])("rejects $name with zero mutation", ({ outputs, type }) => {
            const vault = seed([
                { id: "rule-other", outputs: { tags: { mode: "add", tagIds: [] } } }
            ]);
            expectNoRuleWrite(vault, (state) => {
                const result = createFieldRule(state, {
                    id: "rule-new",
                    descriptionText: "OTHER TEXT",
                    outputs,
                    createdAtEpochMs: 1000
                });
                expect(result.ok).toBe(false);
                if (!result.ok) expect(result.error.type).toBe(type);
            });
            expect(readActiveFieldRules(vault.mirror.getState()).map((rule) => rule.id)).toEqual([
                "rule-other"
            ]);
        });
    });

    describe("uniqueness collisions", () => {
        const TAGS: FieldRuleOutputsInput = { tags: { mode: "add", tagIds: ["tag-a"] } };
        const ALIAS: FieldRuleOutputsInput = { descriptionAlias: { aliasId: "alias-a" } };

        it.each([
            { name: "alias holder first", first: "rule-alias", second: "rule-tags" },
            { name: "tags holder first", first: "rule-tags", second: "rule-alias" }
        ])("reports the earliest of several colliding rules: $name", ({ first, second }) => {
            const outputsOf = (id: string): FieldRuleOutputsInput =>
                id === "rule-alias" ? ALIAS : TAGS;
            const vault = seed([
                { id: first, outputs: outputsOf(first) },
                { id: second, outputs: outputsOf(second) }
            ]);
            expectNoRuleWrite(vault, (state) => {
                const result = createFieldRule(state, {
                    id: "rule-both",
                    descriptionText: DESCRIPTION,
                    outputs: { ...ALIAS, ...TAGS },
                    createdAtEpochMs: 3000
                });
                expect(result).toEqual({
                    ok: false,
                    error: { type: "duplicate-key", existingRuleId: first }
                });
            });
        });

        it("looks past the rule being rewritten to a second holder of the same slot", () => {
            const vault = seed([{ id: "rule-1", outputs: TAGS }]);
            // A duplicated slot, as only concurrent creation produces.
            writeRaw(vault, { id: "rule-2", outputs: TAGS });
            expectNoRuleWrite(vault, (state) => {
                const result = updateFieldRule(state, { id: "rule-1", outputs: TAGS });
                expect(result).toEqual({
                    ok: false,
                    error: { type: "duplicate-key", existingRuleId: "rule-2" }
                });
            });
        });
    });

    describe("updateFieldRule", () => {
        it("updates the outputs while preserving id, description and creation time", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    outputs: { tags: { mode: "add", tagIds: ["tag-a"] } },
                    createdAtEpochMs: 1000
                });
                const updated = updateFieldRule(state, {
                    id: "rule-1",
                    outputs: { tags: { mode: "set", tagIds: ["tag-b"] } }
                });
                expect(updated.ok).toBe(true);
                if (updated.ok) {
                    expect(updated.value.outputs).toEqual({
                        tags: { mode: "set", tagIds: ["tag-b"] }
                    });
                    expect(updated.value.createdAt.epochMilliseconds).toBe(1000);
                }
            });
            const rules = readActiveFieldRules(vault.mirror.getState());
            expect(rules).toHaveLength(1);
            expect(rules[0]?.outputs.tags?.mode).toBe("set");
        });

        it("rejects updating a scope so it collides with another active rule, with zero mutation", () => {
            const vault = seed([
                { id: "rule-unscoped", outputs: { tags: { mode: "add", tagIds: ["tag-a"] } } },
                {
                    id: "rule-account",
                    accountId: ACCOUNT,
                    outputs: { tags: { mode: "add", tagIds: ["tag-b"] } }
                }
            ]);
            expectNoRuleWrite(vault, (state) => {
                // Try to widen rule-account to unscoped, colliding with rule-unscoped.
                const collision = updateFieldRule(state, {
                    id: "rule-account",
                    outputs: { tags: { mode: "add", tagIds: ["tag-b"] } }
                });
                expect(collision).toEqual({
                    ok: false,
                    error: { type: "duplicate-key", existingRuleId: "rule-unscoped" }
                });
            });
        });

        it("returns not-found for a missing rule with zero mutation", () => {
            const vault = seed([
                { id: "rule-1", outputs: { tags: { mode: "add", tagIds: ["tag-a"] } } }
            ]);
            expectNoRuleWrite(vault, (state) => {
                const result = updateFieldRule(state, {
                    id: "nope",
                    outputs: { tags: { mode: "add", tagIds: [] } }
                });
                expect(result).toEqual({ ok: false, error: { type: "not-found", ruleId: "nope" } });
            });
        });

        it.each([
            { name: "no outputs", outputs: {}, type: "invalid-rule" },
            {
                name: "an empty alias id",
                outputs: { descriptionAlias: { aliasId: "" } },
                type: "invalid-rule"
            },
            {
                name: "an invalid allocation set",
                outputs: { allocation: { allocations: { "person-1": Number.NaN } } },
                type: "invalid-allocations"
            }
        ])("rejects an update to $name with zero mutation", ({ outputs, type }) => {
            const vault = seed([
                { id: "rule-1", outputs: { tags: { mode: "add", tagIds: ["tag-a"] } } }
            ]);
            expectNoRuleWrite(vault, (state) => {
                const result = updateFieldRule(state, { id: "rule-1", outputs });
                expect(result.ok).toBe(false);
                if (!result.ok) expect(result.error.type).toBe(type);
            });
            expect(readActiveFieldRules(vault.mirror.getState())[0]?.outputs).toEqual({
                tags: { mode: "add", tagIds: ["tag-a"] }
            });
        });
    });

    describe("grouped outputs", () => {
        const ALIAS_OUTPUT = { aliasId: "alias-coffee" };
        const TAGS_OUTPUT = { mode: "add", tagIds: ["tag-coffee"] } as const;
        const ALLOCATION_OUTPUT = { allocations: { "person-1": 50, "person-2": 50 } };

        function activeById(
            vault: ReturnType<typeof createVaultMirror>
        ): Readonly<Record<string, readonly string[]>> {
            return Object.fromEntries(
                readActiveFieldRules(vault.mirror.getState()).map((rule) => [
                    rule.id,
                    Object.keys(rule.outputs).sort()
                ])
            );
        }

        describe("createFieldRule with several outputs", () => {
            it("writes every output and both wire markers", () => {
                const vault = seed([
                    {
                        id: "rule-1",
                        outputs: {
                            descriptionAlias: ALIAS_OUTPUT,
                            tags: TAGS_OUTPUT,
                            allocation: ALLOCATION_OUTPUT
                        }
                    }
                ]);
                const wire = vault.mirror.getState().fieldRules["rule-1"];
                expect(wire?.field).toBe("descriptionAlias");
                expect(wire?.outputFields).toEqual(["descriptionAlias", "tags", "allocation"]);
                expect(activeById(vault)).toEqual({
                    "rule-1": ["allocation", "descriptionAlias", "tags"]
                });
            });

            it("rejects a rule with no outputs with zero mutation", () => {
                const vault = createVaultMirror();
                expectNoRuleWrite(vault, (state) => {
                    const result = createFieldRule(state, {
                        id: "rule-1",
                        descriptionText: DESCRIPTION,
                        outputs: {},
                        createdAtEpochMs: 1000
                    });
                    expect(result.ok).toBe(false);
                    if (!result.ok) expect(result.error.type).toBe("invalid-rule");
                });
                expect(vault.mirror.getState().fieldRules["rule-1"]).toBeUndefined();
            });

            it("lets identical conditions with disjoint outputs coexist", () => {
                const vault = seed([
                    { id: "rule-alias", outputs: { descriptionAlias: ALIAS_OUTPUT } },
                    { id: "rule-tags", outputs: { tags: TAGS_OUTPUT } }
                ]);
                expect(activeById(vault)).toEqual({
                    "rule-alias": ["descriptionAlias"],
                    "rule-tags": ["tags"]
                });
            });

            it("rejects a grouped rule when any one of its outputs collides, naming the holder", () => {
                const vault = seed([{ id: "rule-tags", outputs: { tags: TAGS_OUTPUT } }]);
                expectNoRuleWrite(vault, (state) => {
                    const result = createFieldRule(state, {
                        id: "rule-grouped",
                        descriptionText: DESCRIPTION,
                        outputs: { descriptionAlias: ALIAS_OUTPUT, tags: TAGS_OUTPUT },
                        createdAtEpochMs: 5000
                    });
                    expect(result).toEqual({
                        ok: false,
                        error: { type: "duplicate-key", existingRuleId: "rule-tags" }
                    });
                });
                expect(activeById(vault)).toEqual({ "rule-tags": ["tags"] });
            });
        });

        describe("updateFieldRule replaces outputs wholesale", () => {
            it("drops an output the update does not list", () => {
                const vault = seed([
                    { id: "rule-1", outputs: { descriptionAlias: ALIAS_OUTPUT, tags: TAGS_OUTPUT } }
                ]);
                vault.mirror.setState((state: VaultState) => {
                    const result = updateFieldRule(state, {
                        id: "rule-1",
                        outputs: { tags: { mode: "set", tagIds: ["tag-b"] } }
                    });
                    expect(result.ok).toBe(true);
                });
                expect(activeById(vault)).toEqual({ "rule-1": ["tags"] });
                expect(vault.mirror.getState().fieldRules["rule-1"]?.aliasId).toBeUndefined();
            });
        });

        describe("setFieldRuleOutput", () => {
            it("adds an output and keeps the rule's conditions and other outputs", () => {
                const vault = seed([
                    {
                        id: "rule-1",
                        accountId: ACCOUNT,
                        outputs: { descriptionAlias: ALIAS_OUTPUT }
                    }
                ]);
                vault.mirror.setState((state: VaultState) => {
                    const result = setFieldRuleOutput(state, {
                        id: "rule-1",
                        field: "tags",
                        output: TAGS_OUTPUT
                    });
                    expect(result.ok).toBe(true);
                });
                const [rule] = readActiveFieldRules(vault.mirror.getState());
                expect(rule?.accountId).toBe(ACCOUNT);
                expect(rule?.createdAt.epochMilliseconds).toBe(1000);
                expect(rule?.outputs).toEqual({
                    descriptionAlias: ALIAS_OUTPUT,
                    tags: TAGS_OUTPUT
                });
            });

            it("replaces an existing output in place", () => {
                const vault = seed([
                    { id: "rule-1", outputs: { descriptionAlias: ALIAS_OUTPUT, tags: TAGS_OUTPUT } }
                ]);
                vault.mirror.setState((state: VaultState) => {
                    const result = setFieldRuleOutput(state, {
                        id: "rule-1",
                        field: "tags",
                        output: { mode: "set", tagIds: ["tag-tea"] }
                    });
                    expect(result.ok).toBe(true);
                });
                const [rule] = readActiveFieldRules(vault.mirror.getState());
                expect(rule?.outputs).toEqual({
                    descriptionAlias: ALIAS_OUTPUT,
                    tags: { mode: "set", tagIds: ["tag-tea"] }
                });
            });

            it.each([
                {
                    name: "an unknown rule",
                    input: { id: "nope", field: "tags", output: TAGS_OUTPUT } as const,
                    error: { type: "not-found", ruleId: "nope" }
                },
                {
                    name: "a slot another rule holds",
                    input: { id: "rule-alias", field: "tags", output: TAGS_OUTPUT } as const,
                    error: { type: "duplicate-key", existingRuleId: "rule-tags" }
                },
                {
                    name: "an empty alias id",
                    input: {
                        id: "rule-tags",
                        field: "descriptionAlias",
                        output: { aliasId: "" }
                    } as const,
                    error: {
                        type: "invalid-rule",
                        issues: ["descriptionAlias output requires a non-empty aliasId"]
                    }
                }
            ])("refuses $name with zero mutation", ({ input, error }) => {
                const vault = seed([
                    { id: "rule-alias", outputs: { descriptionAlias: ALIAS_OUTPUT } },
                    { id: "rule-tags", outputs: { tags: TAGS_OUTPUT } }
                ]);
                const before = storedRules(vault);
                vault.mirror.setState((state: VaultState) => {
                    expect(setFieldRuleOutput(state, input)).toEqual({ ok: false, error });
                });
                expect(storedRules(vault)).toBe(before);
            });

            it("refuses an invalid allocation set with zero mutation", () => {
                const vault = seed([{ id: "rule-1", outputs: { tags: TAGS_OUTPUT } }]);
                const before = storedRules(vault);
                vault.mirror.setState((state: VaultState) => {
                    const result = setFieldRuleOutput(state, {
                        id: "rule-1",
                        field: "allocation",
                        output: { allocations: { "person-1": Number.NaN } }
                    });
                    expect(result.ok).toBe(false);
                    if (!result.ok) expect(result.error.type).toBe("invalid-allocations");
                });
                expect(storedRules(vault)).toBe(before);
            });

            it("refuses a soft-deleted rule", () => {
                const vault = seed([{ id: "rule-1", outputs: { tags: TAGS_OUTPUT } }]);
                vault.mirror.setState((state: VaultState) => {
                    deleteFieldRule(state, { id: "rule-1", deletedAtEpochMs: 2000 });
                });
                expectNoRuleWrite(vault, (state) => {
                    const result = setFieldRuleOutput(state, {
                        id: "rule-1",
                        field: "descriptionAlias",
                        output: ALIAS_OUTPUT
                    });
                    expect(result).toEqual({
                        ok: false,
                        error: { type: "not-found", ruleId: "rule-1" }
                    });
                });
            });
        });

        describe("splitFieldRuleOutput", () => {
            it("moves one output to a new identical-condition rule and leaves rows unchanged", () => {
                const vault = seed([
                    {
                        id: "rule-1",
                        accountId: ACCOUNT,
                        outputs: { tags: TAGS_OUTPUT, allocation: ALLOCATION_OUTPUT }
                    }
                ]);
                vault.mirror.setState((state: VaultState) => {
                    const inserted = insertTransaction(state.transactions, {
                        transaction: txInput({ id: "t-1" })
                    });
                    if (!inserted.ok) throw new Error("seed failed");
                    applyFieldRulesToAllTransactions(state);
                });
                const rowBefore = JSON.stringify(
                    findTransactionInStore(vault.mirror.getState().transactions, locationOf("t-1"))
                );

                vault.mirror.setState((state: VaultState) => {
                    const result = splitFieldRuleOutput(state, {
                        id: "rule-1",
                        field: "allocation",
                        newRuleId: "rule-2",
                        createdAtEpochMs: 9000
                    });
                    expect(result.ok).toBe(true);
                    if (result.ok) {
                        expect(result.value.source.outputs).toEqual({ tags: TAGS_OUTPUT });
                        expect(result.value.split.accountId).toBe(ACCOUNT);
                        expect(result.value.split.descriptionText).toBe(DESCRIPTION);
                        expect(result.value.split.createdAt.epochMilliseconds).toBe(9000);
                    }
                });
                expect(activeById(vault)).toEqual({
                    "rule-1": ["tags"],
                    "rule-2": ["allocation"]
                });

                // Every row resolves to the same values after the split.
                vault.mirror.setState((state: VaultState) => {
                    applyFieldRulesToAllTransactions(state);
                });
                expect(
                    JSON.stringify(
                        findTransactionInStore(
                            vault.mirror.getState().transactions,
                            locationOf("t-1")
                        )
                    )
                ).toBe(rowBefore);
            });

            it.each([
                {
                    name: "the only output",
                    input: { id: "rule-single", field: "tags" },
                    error: { type: "single-output", ruleId: "rule-single" }
                },
                {
                    name: "an output the rule does not have",
                    input: { id: "rule-grouped", field: "allocation" },
                    error: { type: "missing-output", ruleId: "rule-grouped", field: "allocation" }
                },
                {
                    name: "an unknown rule",
                    input: { id: "nope", field: "tags" },
                    error: { type: "not-found", ruleId: "nope" }
                },
                {
                    name: "an id already in use",
                    input: { id: "rule-grouped", field: "tags", newRuleId: "rule-single" },
                    error: { type: "invalid-rule", issues: ["rule id rule-single already exists"] }
                }
            ] as const)("refuses $name with zero mutation", ({ input, error }) => {
                const vault = seed([
                    { id: "rule-single", accountId: ACCOUNT, outputs: { tags: TAGS_OUTPUT } },
                    {
                        id: "rule-grouped",
                        outputs: { descriptionAlias: ALIAS_OUTPUT, tags: TAGS_OUTPUT }
                    }
                ]);
                const before = storedRules(vault);
                vault.mirror.setState((state: VaultState) => {
                    const result = splitFieldRuleOutput(state, {
                        newRuleId: "rule-new",
                        createdAtEpochMs: 9000,
                        ...input
                    });
                    expect(result).toEqual({ ok: false, error });
                });
                expect(storedRules(vault)).toBe(before);
            });

            it("refuses a split whose slot a third rule holds, naming the holder, with zero mutation", () => {
                // A duplicated slot is only reachable through concurrent creation, so write it raw.
                const vault = seed([
                    {
                        id: "rule-grouped",
                        outputs: { descriptionAlias: ALIAS_OUTPUT, tags: TAGS_OUTPUT }
                    }
                ]);
                writeRaw(vault, {
                    id: "rule-replica",
                    outputs: { tags: { mode: "set", tagIds: ["tag-x"] } }
                });
                const before = storedRules(vault);
                vault.mirror.setState((state: VaultState) => {
                    const result = splitFieldRuleOutput(state, {
                        id: "rule-grouped",
                        field: "tags",
                        newRuleId: "rule-new",
                        createdAtEpochMs: 9000
                    });
                    expect(result).toEqual({
                        ok: false,
                        error: { type: "duplicate-key", existingRuleId: "rule-replica" }
                    });
                });
                expect(storedRules(vault)).toBe(before);
            });
        });

        describe("moveFieldRuleOutput", () => {
            it("moves the only output into the host and soft-deletes the emptied source", () => {
                const vault = seed([
                    { id: "rule-alias", outputs: { descriptionAlias: ALIAS_OUTPUT } },
                    { id: "rule-tags", outputs: { tags: TAGS_OUTPUT } }
                ]);
                vault.mirror.setState((state: VaultState) => {
                    const result = moveFieldRuleOutput(state, {
                        sourceId: "rule-tags",
                        field: "tags",
                        hostId: "rule-alias",
                        deletedAtEpochMs: 7000
                    });
                    expect(result.ok).toBe(true);
                    if (result.ok) {
                        expect(result.value.source).toBeNull();
                        expect(result.value.host.outputs).toEqual({
                            descriptionAlias: ALIAS_OUTPUT,
                            tags: TAGS_OUTPUT
                        });
                    }
                });
                expect(activeById(vault)).toEqual({ "rule-alias": ["descriptionAlias", "tags"] });
                expect(vault.mirror.getState().fieldRules["rule-tags"]?.deletedAtEpochMs).toBe(
                    7000
                );
            });

            it("writes the caller's new value into the host in the same mutation", () => {
                const vault = seed([
                    { id: "rule-alias", outputs: { descriptionAlias: ALIAS_OUTPUT } },
                    { id: "rule-tags", outputs: { tags: TAGS_OUTPUT } }
                ]);
                const replacement = { mode: "set", tagIds: ["tag-new"] } as const;
                vault.mirror.setState((state: VaultState) => {
                    const result = moveFieldRuleOutput(state, {
                        sourceId: "rule-tags",
                        field: "tags",
                        output: replacement,
                        hostId: "rule-alias",
                        deletedAtEpochMs: 7000
                    });
                    expect(result.ok && result.value.host.outputs).toEqual({
                        descriptionAlias: ALIAS_OUTPUT,
                        tags: replacement
                    });
                    expect(result.ok && result.value.source).toBeNull();
                });
                const host = readActiveFieldRules(vault.mirror.getState()).find(
                    (rule) => rule.id === "rule-alias"
                );
                expect(host?.outputs.tags).toEqual(replacement);
                expect(vault.mirror.getState().fieldRules["rule-tags"]?.deletedAtEpochMs).toBe(
                    7000
                );
            });

            it("refuses an invalid new value with zero mutation", () => {
                const vault = seed([
                    { id: "rule-alias", outputs: { descriptionAlias: ALIAS_OUTPUT } },
                    { id: "rule-allocation", outputs: { allocation: ALLOCATION_OUTPUT } }
                ]);
                expectNoRuleWrite(vault, (state) => {
                    const result = moveFieldRuleOutput(state, {
                        sourceId: "rule-allocation",
                        field: "allocation",
                        output: { allocations: { "person-1": Number.POSITIVE_INFINITY } },
                        hostId: "rule-alias",
                        deletedAtEpochMs: 7000
                    });
                    expect(result.ok).toBe(false);
                    if (!result.ok) expect(result.error.type).toBe("invalid-allocations");
                });
            });

            it("keeps the source's remaining outputs when it is not emptied", () => {
                const vault = seed([
                    { id: "rule-alias", outputs: { descriptionAlias: ALIAS_OUTPUT } },
                    {
                        id: "rule-other",
                        outputs: { tags: TAGS_OUTPUT, allocation: ALLOCATION_OUTPUT }
                    }
                ]);
                vault.mirror.setState((state: VaultState) => {
                    const result = moveFieldRuleOutput(state, {
                        sourceId: "rule-other",
                        field: "tags",
                        hostId: "rule-alias",
                        deletedAtEpochMs: 7000
                    });
                    expect(result.ok && result.value.source?.outputs).toEqual({
                        allocation: {
                            allocations: { "person-1": 50, "person-2": 50 }
                        }
                    });
                });
                expect(activeById(vault)).toEqual({
                    "rule-alias": ["descriptionAlias", "tags"],
                    "rule-other": ["allocation"]
                });
            });

            it("refuses a move whose slot a third rule holds, naming the holder, with zero mutation", () => {
                const vault = seed([
                    { id: "rule-alias", outputs: { descriptionAlias: ALIAS_OUTPUT } },
                    { id: "rule-tags", outputs: { tags: TAGS_OUTPUT } }
                ]);
                // A third holder of the source's tags slot is only reachable through a replica.
                writeRaw(vault, {
                    id: "rule-replica",
                    outputs: { tags: { mode: "set", tagIds: ["tag-x"] } }
                });
                expectNoRuleWrite(vault, (state) => {
                    const result = moveFieldRuleOutput(state, {
                        sourceId: "rule-tags",
                        field: "tags",
                        hostId: "rule-alias",
                        deletedAtEpochMs: 7000
                    });
                    expect(result).toEqual({
                        ok: false,
                        error: { type: "duplicate-key", existingRuleId: "rule-replica" }
                    });
                });
            });

            it.each([
                {
                    name: "a host with different conditions",
                    input: { sourceId: "rule-tags", hostId: "rule-alias-account", field: "tags" },
                    error: {
                        type: "predicate-mismatch",
                        sourceId: "rule-tags",
                        hostId: "rule-alias-account"
                    }
                },
                {
                    name: "a host that already has the output",
                    input: { sourceId: "rule-tags", hostId: "rule-duplicate", field: "tags" },
                    error: { type: "duplicate-key", existingRuleId: "rule-duplicate" }
                },
                {
                    name: "a source without the output",
                    input: { sourceId: "rule-tags", hostId: "rule-host", field: "allocation" },
                    error: { type: "missing-output", ruleId: "rule-tags", field: "allocation" }
                },
                {
                    name: "an unknown host",
                    input: { sourceId: "rule-tags", hostId: "nope", field: "tags" },
                    error: { type: "not-found", ruleId: "nope" }
                },
                {
                    name: "an unknown source",
                    input: { sourceId: "nope", hostId: "rule-host", field: "tags" },
                    error: { type: "not-found", ruleId: "nope" }
                }
            ] as const)("refuses $name with zero mutation", ({ input, error }) => {
                const vault = seed([
                    {
                        id: "rule-alias-account",
                        accountId: ACCOUNT,
                        outputs: { descriptionAlias: ALIAS_OUTPUT }
                    },
                    { id: "rule-tags", accountId: OTHER_ACCOUNT, outputs: { tags: TAGS_OUTPUT } },
                    {
                        id: "rule-host",
                        accountId: OTHER_ACCOUNT,
                        outputs: { descriptionAlias: ALIAS_OUTPUT }
                    }
                ]);
                // A host that already owns the field shares the source's slot, which only a
                // concurrent replica can produce, so it is written raw.
                writeRaw(vault, {
                    id: "rule-duplicate",
                    accountId: OTHER_ACCOUNT,
                    outputs: { tags: { mode: "set", tagIds: ["tag-x"] } }
                });
                const before = storedRules(vault);
                vault.mirror.setState((state: VaultState) => {
                    const result = moveFieldRuleOutput(state, { deletedAtEpochMs: 7000, ...input });
                    expect(result).toEqual({ ok: false, error });
                });
                expect(storedRules(vault)).toBe(before);

                // A replacement value changes nothing about which moves are refused.
                vault.mirror.setState((state: VaultState) => {
                    const result =
                        input.field === "tags"
                            ? moveFieldRuleOutput(state, {
                                  deletedAtEpochMs: 7000,
                                  ...input,
                                  field: "tags",
                                  output: { mode: "set", tagIds: ["tag-new"] }
                              })
                            : moveFieldRuleOutput(state, {
                                  deletedAtEpochMs: 7000,
                                  ...input,
                                  field: "allocation",
                                  output: { allocations: { "person-1": 100 } }
                              });
                    expect(result).toEqual({ ok: false, error });
                });
                expect(storedRules(vault)).toBe(before);
            });
        });

        describe("reach on split and move", () => {
            const FROM_JULY: RuleReach = { kind: "from", date: DATE };

            it("copies the source's reach to the split rule, so both govern the same rows (E12)", () => {
                const vault = seed([
                    {
                        id: "rule-1",
                        reach: FROM_JULY,
                        outputs: { tags: TAGS_OUTPUT, allocation: ALLOCATION_OUTPUT }
                    }
                ]);
                vault.mirror.setState((state: VaultState) => {
                    const result = splitFieldRuleOutput(state, {
                        id: "rule-1",
                        field: "tags",
                        newRuleId: "rule-2",
                        createdAtEpochMs: 9000
                    });
                    expect(result.ok && result.value.split.reach).toEqual(FROM_JULY);
                    expect(result.ok && result.value.source.reach).toEqual(FROM_JULY);
                });
                const rules = readActiveFieldRules(vault.mirror.getState());
                expect(rules.map((rule) => rule.reach)).toEqual([FROM_JULY, FROM_JULY]);
            });

            it("refuses a host with a different reach, naming both, with zero mutation", () => {
                const vault = seed([
                    {
                        id: "rule-alias",
                        reach: FROM_JULY,
                        outputs: { descriptionAlias: ALIAS_OUTPUT }
                    },
                    { id: "rule-tags", outputs: { tags: TAGS_OUTPUT } }
                ]);
                expectNoRuleWrite(vault, (state) => {
                    const result = moveFieldRuleOutput(state, {
                        sourceId: "rule-tags",
                        field: "tags",
                        hostId: "rule-alias",
                        deletedAtEpochMs: 7000
                    });
                    expect(result).toEqual({
                        ok: false,
                        error: {
                            type: "reach-mismatch",
                            sourceId: "rule-tags",
                            hostId: "rule-alias"
                        }
                    });
                });
            });

            it("moves between explicit-set rules whose sets are equal in another order", () => {
                const vault = seed([
                    {
                        id: "rule-alias",
                        reach: {
                            kind: "transactions",
                            ids: new Set(["t-1", "t-2"].map(asTransactionId))
                        },
                        outputs: { descriptionAlias: ALIAS_OUTPUT }
                    },
                    {
                        id: "rule-tags",
                        reach: {
                            kind: "transactions",
                            ids: new Set(["t-2", "t-1"].map(asTransactionId))
                        },
                        outputs: { tags: TAGS_OUTPUT }
                    }
                ]);
                vault.mirror.setState((state: VaultState) => {
                    const result = moveFieldRuleOutput(state, {
                        sourceId: "rule-tags",
                        field: "tags",
                        hostId: "rule-alias",
                        deletedAtEpochMs: 7000
                    });
                    expect(result.ok).toBe(true);
                });
                expect(activeById(vault)).toEqual({ "rule-alias": ["descriptionAlias", "tags"] });
            });

            it("keeps the reach when an update rewrites the outputs", () => {
                const vault = seed([
                    { id: "rule-1", reach: FROM_JULY, outputs: { tags: TAGS_OUTPUT } }
                ]);
                vault.mirror.setState((state: VaultState) => {
                    const result = updateFieldRule(state, {
                        id: "rule-1",
                        outputs: { descriptionAlias: ALIAS_OUTPUT }
                    });
                    expect(result.ok && result.value.reach).toEqual(FROM_JULY);
                });
                expect(readActiveFieldRules(vault.mirror.getState())[0]?.reach).toEqual(FROM_JULY);
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
                    outputs: { tags: { mode: "add", tagIds: ["tag-a"] } },
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
                    outputs: { tags: { mode: "add", tagIds: ["tag-a"] } },
                    createdAtEpochMs: 1000
                });
                deleteFieldRule(state, { id: "rule-1", deletedAtEpochMs: 5000 });
                const recreated = createFieldRule(state, {
                    id: "rule-2",
                    descriptionText: DESCRIPTION,
                    outputs: { tags: { mode: "set", tagIds: ["tag-b"] } },
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
                        useAmountScope: false,
                        applyMode: "updatingAll"
                    }
                });
            });
            const choice = readUserAutomationChoice(vault.mirror.getState(), "pubkey-abc");
            expect(choice.field).toBe("tags");
            expect(choice.tagMode).toBe("set");
            expect(choice.useAccountScope).toBe(true);
            expect(choice.useAmountScope).toBe(false);
            expect(choice.applyMode).toBe("updatingAll");
        });

        it("returns defaults for an unknown user", () => {
            const vault = createVaultMirror();
            const choice = readUserAutomationChoice(vault.mirror.getState(), "unknown");
            expect(choice.field).toBe("tags");
            expect(choice.useAccountScope).toBe(false);
        });

        /**
         * The record is keyed by `pubkeyHash` because it is per-user UI state, not shared financial
         * state. Two users on one vault must never observe each other's editor defaults.
         */
        it("keeps one user's remembered choice from leaking into another user's", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                persistUserAutomationPreference(state, {
                    pubkeyHash: "pubkey-abc",
                    choice: {
                        field: "descriptionAlias",
                        tagMode: "set",
                        useAccountScope: true,
                        useAmountScope: true,
                        applyMode: "updatingAll"
                    }
                });
                persistUserAutomationPreference(state, {
                    pubkeyHash: "pubkey-xyz",
                    choice: {
                        field: "allocation",
                        tagMode: "add",
                        useAccountScope: false,
                        useAmountScope: true,
                        applyMode: "updateAll"
                    }
                });
            });

            const abc = readUserAutomationChoice(vault.mirror.getState(), "pubkey-abc");
            const xyz = readUserAutomationChoice(vault.mirror.getState(), "pubkey-xyz");
            expect(abc).toEqual({
                field: "descriptionAlias",
                tagMode: "set",
                useAccountScope: true,
                useAmountScope: true,
                applyMode: "updatingAll"
            });
            expect(xyz).toEqual({
                field: "allocation",
                tagMode: "add",
                useAccountScope: false,
                useAmountScope: true,
                applyMode: "updateAll"
            });

            // A third identity still reads pure defaults rather than either stored record.
            expect(readUserAutomationChoice(vault.mirror.getState(), "pubkey-third")).toEqual({
                field: "tags",
                tagMode: "add",
                useAccountScope: false,
                useAmountScope: false,
                applyMode: "updateNew"
            });
        });
    });

    describe("per-viewer display preferences", () => {
        it("reads unknown viewers and unvalidated inspector values as open", () => {
            const vault = createVaultMirror();

            expect(readUserTransactionInspectorOpen(vault.mirror.getState(), null)).toBe(true);
            expect(
                readUserTransactionInspectorOpen(vault.mirror.getState(), "unknown-viewer")
            ).toBe(true);
            expect(toTransactionInspectorOpen(undefined)).toBe(true);
            expect(toTransactionInspectorOpen("closed")).toBe(true);
            expect(toTransactionInspectorOpen(0)).toBe(true);
            expect(vault.mirror.getState().userDisplayPreferences).toEqual({});

            vault.mirror.dispose();
        });

        it.each([
            ["an absent inspector field", undefined],
            ["an invalid raw inspector field", "closed"]
        ])("hydrates %s as open without normalising the existing record", (_, rawValue) => {
            const source = createVaultMirror();
            source.mirror.setState((state: VaultState) => {
                persistUserDateFormat(state, {
                    pubkeyHash: "legacy-viewer",
                    dateFormat: "dayFirst"
                });
            });
            const sourcePreference = rawViewerPreference(source.doc, "legacy-viewer");
            if (rawValue !== undefined) {
                sourcePreference.set("transactionInspectorOpen", rawValue);
                source.doc.commit({ origin: "legacy:display-preference" });
            }
            const sourceVersion = source.doc.version().encode();
            const hydrated = createVaultMirrorFromSnapshot(source.doc.export({ mode: "snapshot" }));
            const hydratedPreference = rawViewerPreference(hydrated.doc, "legacy-viewer");
            const versionBeforeRead = hydrated.doc.version().encode();
            const updateBeforeRead = hydrated.doc.export({ mode: "update" });
            const keysBeforeRead = hydratedPreference.keys();

            expect(hydrated.doc.version().encode()).toEqual(sourceVersion);
            expect(
                readUserTransactionInspectorOpen(hydrated.mirror.getState(), "legacy-viewer")
            ).toBe(true);
            expect(hydrated.doc.version().encode()).toEqual(versionBeforeRead);
            expect(hydrated.doc.export({ mode: "update" })).toEqual(updateBeforeRead);
            expect(hydratedPreference.keys()).toEqual(keysBeforeRead);
            expect(hydratedPreference.get("transactionInspectorOpen")).toBe(rawValue);

            hydrated.mirror.dispose();
            source.mirror.dispose();
        });

        it("stores an explicit open value after closed and reloads that stored value", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                persistUserTransactionInspectorOpen(state, {
                    pubkeyHash: "viewer",
                    transactionInspectorOpen: false
                });
            });
            expect(rawViewerPreference(vault.doc, "viewer").get("transactionInspectorOpen")).toBe(
                false
            );

            vault.mirror.setState((state: VaultState) => {
                persistUserTransactionInspectorOpen(state, {
                    pubkeyHash: "viewer",
                    transactionInspectorOpen: true
                });
            });
            const rawPreference = rawViewerPreference(vault.doc, "viewer");
            expect(rawPreference.keys()).toContain("transactionInspectorOpen");
            expect(rawPreference.get("transactionInspectorOpen")).toBe(true);

            const reopened = createVaultMirrorFromSnapshot(vault.doc.export({ mode: "snapshot" }));
            expect(readUserTransactionInspectorOpen(reopened.mirror.getState(), "viewer")).toBe(
                true
            );
            expect(
                rawViewerPreference(reopened.doc, "viewer").get("transactionInspectorOpen")
            ).toBe(true);

            reopened.mirror.dispose();
            vault.mirror.dispose();
        });

        it("omits undefined sibling fields when creating a viewer record", () => {
            const dateVault = createVaultMirror();
            dateVault.mirror.setState((state: VaultState) => {
                persistUserDateFormat(state, {
                    pubkeyHash: "date-viewer",
                    dateFormat: "dayFirst"
                });
            });
            expect(rawViewerPreference(dateVault.doc, "date-viewer").keys().sort()).toEqual([
                "dateFormat",
                "pubkeyHash"
            ]);

            const inspectorVault = createVaultMirror();
            inspectorVault.mirror.setState((state: VaultState) => {
                persistUserTransactionInspectorOpen(state, {
                    pubkeyHash: "inspector-viewer",
                    transactionInspectorOpen: false
                });
            });
            expect(
                rawViewerPreference(inspectorVault.doc, "inspector-viewer").keys().sort()
            ).toEqual(["pubkeyHash", "transactionInspectorOpen"]);

            inspectorVault.mirror.dispose();
            dateVault.mirror.dispose();
        });

        it("mutates one viewer field at a time and isolates different viewers", () => {
            const vault = createVaultMirror();

            vault.mirror.setState((state: VaultState) => {
                persistUserTransactionInspectorOpen(state, {
                    pubkeyHash: "viewer-a",
                    transactionInspectorOpen: false
                });
                persistUserDateFormat(state, {
                    pubkeyHash: "viewer-a",
                    dateFormat: "dayFirst"
                });
                persistUserDateFormat(state, {
                    pubkeyHash: "viewer-b",
                    dateFormat: "monthFirst"
                });
                persistUserTransactionInspectorOpen(state, {
                    pubkeyHash: "viewer-b",
                    transactionInspectorOpen: true
                });
            });

            const state = vault.mirror.getState();
            expect(readUserTransactionInspectorOpen(state, "viewer-a")).toBe(false);
            expect(readUserDateFormat(state, "viewer-a")).toBe("dayFirst");
            expect(readUserTransactionInspectorOpen(state, "viewer-b")).toBe(true);
            expect(readUserDateFormat(state, "viewer-b")).toBe("monthFirst");

            vault.mirror.dispose();
        });

        it.each(["date then inspector", "inspector then date"])(
            "preserves unknown viewer fields when writing %s",
            (order) => {
                const source = createVaultMirror();
                const sourcePreference = installRawViewerPreference(source.doc, "future-viewer");
                sourcePreference.set("dateFormat", "automatic");
                sourcePreference.set("futureField", "future-value");
                source.doc.commit({ origin: "future:display-preference" });

                const vault = createVaultMirrorFromSnapshot(
                    source.doc.export({ mode: "snapshot" })
                );
                if (order === "date then inspector") {
                    vault.mirror.setState((state: VaultState) => {
                        persistUserDateFormat(state, {
                            pubkeyHash: "future-viewer",
                            dateFormat: "dayFirst"
                        });
                    });
                    vault.mirror.setState((state: VaultState) => {
                        persistUserTransactionInspectorOpen(state, {
                            pubkeyHash: "future-viewer",
                            transactionInspectorOpen: false
                        });
                    });
                } else {
                    vault.mirror.setState((state: VaultState) => {
                        persistUserTransactionInspectorOpen(state, {
                            pubkeyHash: "future-viewer",
                            transactionInspectorOpen: false
                        });
                    });
                    vault.mirror.setState((state: VaultState) => {
                        persistUserDateFormat(state, {
                            pubkeyHash: "future-viewer",
                            dateFormat: "dayFirst"
                        });
                    });
                }

                const rawPreference = rawViewerPreference(vault.doc, "future-viewer");
                expect(rawPreference.keys()).toEqual(
                    expect.arrayContaining([
                        "pubkeyHash",
                        "dateFormat",
                        "transactionInspectorOpen",
                        "futureField"
                    ])
                );
                expect(rawPreference.get("dateFormat")).toBe("dayFirst");
                expect(rawPreference.get("transactionInspectorOpen")).toBe(false);
                expect(rawPreference.get("futureField")).toBe("future-value");

                vault.mirror.dispose();
                source.mirror.dispose();
            }
        );

        it("preserves unknown viewer fields across concurrent date and inspector writes", () => {
            const base = createVaultMirror();
            base.mirror.setState((state: VaultState) => {
                persistUserDateFormat(state, {
                    pubkeyHash: "future-viewer",
                    dateFormat: "automatic"
                });
            });
            const basePreference = rawViewerPreference(base.doc, "future-viewer");
            basePreference.set("futureField", "future-value");
            base.doc.commit({ origin: "future:display-preference" });
            const snapshot = base.doc.export({ mode: "snapshot" });
            const datePeer = createVaultMirrorFromSnapshot(snapshot);
            const inspectorPeer = createVaultMirrorFromSnapshot(snapshot);
            const dateBase = datePeer.doc.version();
            const inspectorBase = inspectorPeer.doc.version();

            datePeer.mirror.setState((state: VaultState) => {
                persistUserDateFormat(state, {
                    pubkeyHash: "future-viewer",
                    dateFormat: "monthFirst"
                });
            });
            inspectorPeer.mirror.setState((state: VaultState) => {
                persistUserTransactionInspectorOpen(state, {
                    pubkeyHash: "future-viewer",
                    transactionInspectorOpen: false
                });
            });
            const dateUpdate = datePeer.doc.export({ mode: "update", from: dateBase });
            const inspectorUpdate = inspectorPeer.doc.export({
                mode: "update",
                from: inspectorBase
            });
            const dateThenInspector = createVaultMirrorFromSnapshot(snapshot);
            const inspectorThenDate = createVaultMirrorFromSnapshot(snapshot);
            dateThenInspector.doc.import(dateUpdate);
            dateThenInspector.doc.import(inspectorUpdate);
            inspectorThenDate.doc.import(inspectorUpdate);
            inspectorThenDate.doc.import(dateUpdate);

            for (const merged of [dateThenInspector, inspectorThenDate]) {
                const rawPreference = rawViewerPreference(merged.doc, "future-viewer");
                expect(rawPreference.get("futureField")).toBe("future-value");
                expect(rawPreference.keys()).toContain("futureField");
                expect(
                    merged.mirror.getState().userDisplayPreferences["future-viewer"]
                ).toMatchObject({
                    dateFormat: "monthFirst",
                    transactionInspectorOpen: false
                });
            }

            for (const vault of [
                base,
                datePeer,
                inspectorPeer,
                dateThenInspector,
                inspectorThenDate
            ]) {
                vault.mirror.dispose();
            }
        });

        it("merges concurrent first writes to different fields for the same viewer", () => {
            const base = createVaultMirror();
            const snapshot = base.doc.export({ mode: "snapshot" });
            const left = createVaultMirrorFromSnapshot(snapshot);
            const right = createVaultMirrorFromSnapshot(snapshot);
            const leftBase = left.doc.version();
            const rightBase = right.doc.version();

            left.mirror.setState((state: VaultState) => {
                persistUserDateFormat(state, {
                    pubkeyHash: "viewer",
                    dateFormat: "dayFirst"
                });
            });
            right.mirror.setState((state: VaultState) => {
                persistUserTransactionInspectorOpen(state, {
                    pubkeyHash: "viewer",
                    transactionInspectorOpen: false
                });
            });
            const leftUpdate = left.doc.export({ mode: "update", from: leftBase });
            const rightUpdate = right.doc.export({ mode: "update", from: rightBase });
            const leftThenRight = createVaultMirrorFromSnapshot(snapshot);
            const rightThenLeft = createVaultMirrorFromSnapshot(snapshot);
            leftThenRight.doc.import(leftUpdate);
            leftThenRight.doc.import(rightUpdate);
            rightThenLeft.doc.import(rightUpdate);
            rightThenLeft.doc.import(leftUpdate);

            for (const merged of [leftThenRight, rightThenLeft]) {
                const preferences = merged.mirror.getState().userDisplayPreferences;
                expect(Object.keys(preferences)).toEqual(["viewer"]);
                expect(preferences.viewer).toMatchObject({
                    pubkeyHash: "viewer",
                    dateFormat: "dayFirst",
                    transactionInspectorOpen: false
                });
            }

            for (const vault of [base, left, right, leftThenRight, rightThenLeft]) {
                vault.mirror.dispose();
            }
        });

        it("converges concurrent same-field writes with CRDT LWW semantics", () => {
            const sameFieldBase = createVaultMirror();
            sameFieldBase.mirror.setState((state: VaultState) => {
                persistUserDateFormat(state, {
                    pubkeyHash: "viewer",
                    dateFormat: "automatic"
                });
            });
            const sameFieldSnapshot = sameFieldBase.doc.export({ mode: "snapshot" });
            const closePeer = createVaultMirrorFromSnapshot(sameFieldSnapshot);
            const openPeer = createVaultMirrorFromSnapshot(sameFieldSnapshot);
            const closeBase = closePeer.doc.version();
            const openBase = openPeer.doc.version();
            closePeer.mirror.setState((state: VaultState) => {
                persistUserTransactionInspectorOpen(state, {
                    pubkeyHash: "viewer",
                    transactionInspectorOpen: false
                });
            });
            openPeer.mirror.setState((state: VaultState) => {
                persistUserTransactionInspectorOpen(state, {
                    pubkeyHash: "viewer",
                    transactionInspectorOpen: true
                });
            });
            const closePreference = rawViewerPreference(closePeer.doc, "viewer");
            const openPreference = rawViewerPreference(openPeer.doc, "viewer");
            expect(closePreference.keys()).toContain("transactionInspectorOpen");
            expect(closePreference.get("transactionInspectorOpen")).toBe(false);
            expect(openPreference.keys()).toContain("transactionInspectorOpen");
            expect(openPreference.get("transactionInspectorOpen")).toBe(true);
            expect(closePeer.doc.version().encode()).not.toEqual(closeBase.encode());
            expect(openPeer.doc.version().encode()).not.toEqual(openBase.encode());

            const closeUpdate = closePeer.doc.export({ mode: "update", from: closeBase });
            const openUpdate = openPeer.doc.export({ mode: "update", from: openBase });
            expect(closeUpdate.length).toBeGreaterThan(0);
            expect(openUpdate.length).toBeGreaterThan(0);

            const closeThenOpen = createVaultMirrorFromSnapshot(sameFieldSnapshot);
            const openThenClose = createVaultMirrorFromSnapshot(sameFieldSnapshot);
            closeThenOpen.doc.import(closeUpdate);
            closeThenOpen.doc.import(openUpdate);
            openThenClose.doc.import(openUpdate);
            openThenClose.doc.import(closeUpdate);

            const closeThenOpenPreference = rawViewerPreference(closeThenOpen.doc, "viewer");
            const openThenClosePreference = rawViewerPreference(openThenClose.doc, "viewer");
            expect(closeThenOpenPreference.keys()).toContain("transactionInspectorOpen");
            expect(openThenClosePreference.keys()).toContain("transactionInspectorOpen");
            const firstRawWinner = closeThenOpenPreference.get("transactionInspectorOpen");
            if (typeof firstRawWinner !== "boolean") {
                throw new Error("Expected the converged raw inspector preference to be boolean");
            }
            const secondRawWinner = openThenClosePreference.get("transactionInspectorOpen");
            expect(secondRawWinner).toBe(firstRawWinner);
            expect(
                readUserTransactionInspectorOpen(closeThenOpen.mirror.getState(), "viewer")
            ).toBe(firstRawWinner);
            expect(
                readUserTransactionInspectorOpen(openThenClose.mirror.getState(), "viewer")
            ).toBe(firstRawWinner);

            for (const vault of [
                sameFieldBase,
                closePeer,
                openPeer,
                closeThenOpen,
                openThenClose
            ]) {
                vault.mirror.dispose();
            }
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
                    outputs: { tags: { mode: "add", tagIds: ["tag-coffee"] } },
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
                    outputs: { tags: { mode: "add", tagIds: ["tag-coffee"] } },
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

    describe("apply-new is scoped to transactions on or after the reference date", () => {
        // Mirrors the P17C transaction-context "apply to new imports" affordance, where the
        // reference date is THAT row's date. The cutoff is inclusive: the row itself and same-day
        // siblings are updated along with later rows; earlier rows are left untouched.
        const EARLIER = DATE.subtract({ days: 1 });
        const LATER = DATE.add({ days: 1 });

        it("applies to the reference date, same-day siblings and later rows but not earlier", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                for (const seed of [
                    txInput({ id: "t-earlier", date: EARLIER }),
                    txInput({ id: "t-reference", date: DATE }),
                    txInput({ id: "t-same-day", date: DATE, amount: asMinorUnits(-600) }),
                    txInput({ id: "t-later", date: LATER })
                ]) {
                    const inserted = insertTransaction(state.transactions, { transaction: seed });
                    if (!inserted.ok) throw new Error("seed failed");
                }
                createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    outputs: { tags: { mode: "add", tagIds: ["tag-coffee"] } },
                    createdAtEpochMs: 1000
                });
            });
            vault.mirror.setState((state: VaultState) => {
                const entries = applyFieldRulesToNewerTransactions(state, { referenceDate: DATE });
                expect(entries.length).toBe(3);
            });

            const store = vault.mirror.getState().transactions;
            const later = findTransactionInStore(store, locationOf("t-later", LATER));
            const reference = findTransactionInStore(store, locationOf("t-reference", DATE));
            const sameDay = findTransactionInStore(store, locationOf("t-same-day", DATE));
            const earlier = findTransactionInStore(store, locationOf("t-earlier", EARLIER));
            expect(later?.tagIds).toContain("tag-coffee");
            expect(reference?.tagIds).toContain("tag-coffee");
            expect(sameDay?.tagIds).toContain("tag-coffee");
            expect(earlier?.tagIds ?? []).not.toContain("tag-coffee");
        });
    });

    // Q-P17D-01: a manual grid row stores the user's typed text as a description ALIAS and leaves the
    // raw `description` empty. The engine projects that alias's resolved NAME as the match text so
    // tag and whole-allocation rules apply to manual rows, while description-alias rules stay excluded
    // (frozen `human-scratch.md:288-295`). `isManual` remains keyed on `importId` alone.
    describe("manual-row matching keys on the resolved description-alias name", () => {
        const MANUAL_ALIAS_NAME = "WEEKLY GROCERIES";

        function seedManualRow(state: VaultState, id: string, name: string): void {
            const result = insertManualDescriptionAliasedTransaction(state, {
                transaction: {
                    id,
                    date: DATE,
                    notes: "",
                    amount: asMinorUnits(-1200),
                    accountId: ACCOUNT,
                    tagIds: [],
                    statusId: "status-1",
                    allocations: {},
                    creationInstant: CREATION,
                    importRowIndex: undefined,
                    suspectedDuplicates: [],
                    deletedAt: undefined
                },
                newAliasId: `alias-${id}`,
                name
            });
            if (!result.ok) throw new Error(`manual seed failed: ${result.error.code}`);
        }

        it("applies a tag rule keyed on the alias name to a manual row", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                seedManualRow(state, "m-1", MANUAL_ALIAS_NAME);
                createFieldRule(state, {
                    id: "rule-tag",
                    descriptionText: MANUAL_ALIAS_NAME,
                    outputs: { tags: { mode: "add", tagIds: ["tag-groceries"] } },
                    createdAtEpochMs: 1000
                });
            });
            vault.mirror.setState((state: VaultState) => {
                applyFieldRulesToAllTransactions(state);
            });
            const manual = findTransactionInStore(
                vault.mirror.getState().transactions,
                locationOf("m-1")
            );
            expect(manual?.tagIds).toContain("tag-groceries");
            // Provenance invariant: the raw description is never rewritten by the projection.
            expect(manual?.description ?? "").toBe("");
        });

        it("applies an allocation rule keyed on the alias name via the P16C boundary", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                seedManualRow(state, "m-2", MANUAL_ALIAS_NAME);
                createFieldRule(state, {
                    id: "rule-alloc",
                    descriptionText: MANUAL_ALIAS_NAME,
                    outputs: { allocation: { allocations: { "person-1": 100 } } },
                    createdAtEpochMs: 1000
                });
            });
            vault.mirror.setState((state: VaultState) => {
                applyFieldRulesToAllTransactions(state);
            });
            const manual = findTransactionInStore(
                vault.mirror.getState().transactions,
                locationOf("m-2")
            );
            const entries = Object.entries(manual?.allocations ?? {}).filter(
                ([id]) => id !== "$cid"
            );
            expect(entries).toEqual([["person-1", 100]]);
        });

        it("never applies a description-alias rule to a manual row", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                seedManualRow(state, "m-3", MANUAL_ALIAS_NAME);
                createFieldRule(state, {
                    id: "rule-alias",
                    descriptionText: MANUAL_ALIAS_NAME,
                    outputs: { descriptionAlias: { aliasId: "alias-other" } },
                    createdAtEpochMs: 1000
                });
            });
            vault.mirror.setState((state: VaultState) => {
                applyFieldRulesToAllTransactions(state);
            });
            const manual = findTransactionInStore(
                vault.mirror.getState().transactions,
                locationOf("m-3")
            );
            // The row keeps its own alias; the alias rule did not repoint it.
            expect(manual?.descriptionAliasId).toBe("alias-m-3");
        });

        it("matches nothing on a manual row whose alias name differs from the rule", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                seedManualRow(state, "m-4", "SOMETHING ELSE");
                createFieldRule(state, {
                    id: "rule-tag",
                    descriptionText: MANUAL_ALIAS_NAME,
                    outputs: { tags: { mode: "add", tagIds: ["tag-groceries"] } },
                    createdAtEpochMs: 1000
                });
            });
            vault.mirror.setState((state: VaultState) => {
                applyFieldRulesToAllTransactions(state);
            });
            const manual = findTransactionInStore(
                vault.mirror.getState().transactions,
                locationOf("m-4")
            );
            expect(manual?.tagIds ?? []).not.toContain("tag-groceries");
        });
    });
});
