/**
 * Rule reach through the real vault document (`specs/017-rule-reach`): creating a one-row rule from
 * an edit, widening and narrowing, extending to one row, folding into a wider rule, governing
 * imports only within reach, and keeping explicit sets in step with transaction deletes.
 *
 * Shared facts follow the spec's worked examples: `COFFEE SHOP 123` rows A (2 Jul), B (25 Jul) and
 * C (3 Aug, another account and amount). B was tagged `work` by hand before each test that needs it.
 * Every refusal is checked to leave the whole document untouched.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { asTransactionId } from "@/components/features/transactions/table-model/ids";
import {
    deleteDescriptionAliasedTransaction,
    deleteDescriptionAliasedTransactionsByImport
} from "@/lib/crdt/description-aliases";
import {
    createFieldRule,
    createFieldRuleFromEdit,
    extendFieldRuleReachToTransaction,
    foldFieldRuleIntoHost,
    type RuleReachChange,
    setFieldRuleOutput,
    setFieldRuleReach
} from "@/lib/crdt/field-rule-mutations";
import { applyFieldRulesToAllTransactions, readActiveFieldRules } from "@/lib/crdt/field-rules";
import { commitImportBatch, type ImportBatchTransactionInput } from "@/lib/crdt/import-commit";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import { insertTransaction, updateTransaction } from "@/lib/crdt/mutations";
import { findTransactionById } from "@/lib/crdt/queries";
import { type TransactionInput, type VaultState } from "@/lib/crdt/schema";
import { type FieldRule, type RuleReach } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

const TEXT = "COFFEE SHOP 123";
const ACCOUNT_A = "account-a";
const ACCOUNT_B = "account-b";
const CREATION = Temporal.Instant.from("2026-08-10T00:00:00Z");
const JUN_1 = Temporal.PlainDate.from("2026-06-01");
const JUL_2 = Temporal.PlainDate.from("2026-07-02");
const JUL_25 = Temporal.PlainDate.from("2026-07-25");
const AUG_3 = Temporal.PlainDate.from("2026-08-03");
const AUG_10 = Temporal.PlainDate.from("2026-08-10");

type Vault = ReturnType<typeof createVaultMirror>;

function row(
    overrides: Partial<TransactionInput> & {
        readonly id: string;
        readonly date: Temporal.PlainDate;
    }
): TransactionInput {
    return {
        description: TEXT,
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-450),
        originalAmount: undefined,
        accountId: ACCOUNT_A,
        tagIds: [],
        statusId: "status-1",
        importId: "import-0",
        allocations: {},
        creationInstant: CREATION,
        importRowIndex: undefined,
        suspectedDuplicates: [],
        deletedAt: undefined,
        ...overrides
    };
}

/** Rows A, B and C, with B already tagged `work` by the edit the tests record as a rule. */
function vaultWithRows(extra: readonly TransactionInput[] = []): Vault {
    const vault = createVaultMirror();
    vault.mirror.setState((state: VaultState) => {
        for (const transaction of [
            row({ id: "A", date: JUL_2 }),
            row({ id: "B", date: JUL_25, tagIds: ["work"] }),
            row({
                id: "C",
                date: AUG_3,
                accountId: ACCOUNT_B,
                amount: asMinorUnits(-600)
            }),
            ...extra
        ]) {
            insertTransaction(state.transactions, { transaction });
        }
    });
    return vault;
}

function tagsOf(vault: Vault, id: string): readonly string[] | undefined {
    const found = findTransactionById(vault.mirror.getState().transactions, id);
    return found == null ? undefined : [...found.transaction.tagIds];
}

function activeRule(vault: Vault, id: string): FieldRule | undefined {
    return readActiveFieldRules(vault.mirror.getState()).find((rule) => rule.id === id);
}

function only(...ids: readonly string[]): RuleReach {
    return { kind: "transactions", ids: new Set(ids.map(asTransactionId)) };
}

/** Run a step that must succeed, inside one vault action. */
function act(vault: Vault, step: (state: VaultState) => { readonly ok: boolean }): void {
    vault.mirror.setState((state: VaultState) => {
        const result = step(state);
        if (!result.ok) throw new Error(`step failed: ${JSON.stringify(result)}`);
    });
}

/** Run a refused mutation and prove the document, rules and transactions alike, is untouched. */
function expectNoVaultWrite(vault: Vault, refuse: (state: VaultState) => void): void {
    const version = JSON.stringify(vault.doc.frontiers());
    const before = JSON.stringify(vault.mirror.getState());
    vault.mirror.setState(refuse);
    expect(JSON.stringify(vault.mirror.getState())).toBe(before);
    expect(JSON.stringify(vault.doc.frontiers())).toBe(version);
}

/** E1: tag B with `work`, recorded as rule R1 whose reach is { B }. */
function tagBAsR1(vault: Vault): void {
    act(vault, (state) =>
        createFieldRuleFromEdit(state, {
            id: "R1",
            transactionId: "B",
            descriptionText: TEXT,
            field: "tags",
            output: { mode: "add", tagIds: ["work"] },
            createdAtEpochMs: 1000
        })
    );
}

/** E2: tag A with `home`, recorded as rule R2 whose reach is { A }. */
function tagAAsR2(vault: Vault): void {
    vault.mirror.setState((state: VaultState) => {
        updateTransaction(state.transactions, {
            location: { accountId: ACCOUNT_A, date: JUL_2, transactionId: "A" },
            updates: { tagIds: ["home"] }
        });
        const created = createFieldRuleFromEdit(state, {
            id: "R2",
            transactionId: "A",
            descriptionText: TEXT,
            field: "tags",
            output: { mode: "add", tagIds: ["home"] },
            createdAtEpochMs: 2000
        });
        if (!created.ok) throw new Error("R2 was refused");
    });
}

function widen(vault: Vault, reach: RuleReachChange, id = "R1"): number {
    let applied = -1;
    vault.mirror.setState((state: VaultState) => {
        const result = setFieldRuleReach(state, { id, reach });
        if (!result.ok) throw new Error(`widen refused: ${result.error.type}`);
        applied = result.value.appliedCount;
    });
    return applied;
}

function importRow(id: string, date: Temporal.PlainDate): ImportBatchTransactionInput {
    return {
        id,
        date,
        description: TEXT,
        amount: asMinorUnits(-450),
        accountId: ACCOUNT_A,
        statusId: "status-1",
        importRowIndex: 0,
        duplicateOf: null
    };
}

describe("createFieldRuleFromEdit", () => {
    it("records an edit as a one-row rule and writes no transaction (E1)", () => {
        const vault = vaultWithRows();
        const transactionsBefore = JSON.stringify(vault.mirror.getState().transactions);
        let kind: string | null = null;
        vault.mirror.setState((state: VaultState) => {
            const result = createFieldRuleFromEdit(state, {
                id: "R1",
                transactionId: "B",
                descriptionText: TEXT,
                field: "tags",
                output: { mode: "add", tagIds: ["work"] },
                createdAtEpochMs: 1000
            });
            kind = result.ok ? result.value.kind : null;
        });
        expect(kind).toBe("created");
        expect(activeRule(vault, "R1")).toMatchObject({
            descriptionText: TEXT,
            outputs: { tags: { mode: "add", tagIds: ["work"] } },
            reach: only("B")
        });
        expect(JSON.stringify(vault.mirror.getState().transactions)).toBe(transactionsBefore);
        expect(tagsOf(vault, "A")).toEqual([]);
        expect(tagsOf(vault, "C")).toEqual([]);
    });

    it("lets one-row rules with different values coexist on one slot (E2)", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        tagAAsR2(vault);
        expect(activeRule(vault, "R1")?.reach).toEqual(only("B"));
        expect(activeRule(vault, "R2")?.reach).toEqual(only("A"));
    });

    it("updates the row's own one-row rule in place when the value changes again (E8)", () => {
        const vault = vaultWithRows();
        tagAAsR2(vault);
        let result: ReturnType<typeof createFieldRuleFromEdit> | null = null;
        vault.mirror.setState((state: VaultState) => {
            result = createFieldRuleFromEdit(state, {
                id: "R-unused",
                transactionId: "A",
                descriptionText: TEXT,
                field: "tags",
                output: { mode: "add", tagIds: ["food"] },
                createdAtEpochMs: 3000
            });
        });
        expect(result).toMatchObject({ ok: true, value: { kind: "updated" } });
        expect(activeRule(vault, "R2")).toMatchObject({
            outputs: { tags: { mode: "add", tagIds: ["food"] } },
            reach: only("A")
        });
        expect(vault.mirror.getState().fieldRules["R-unused"]).toBeUndefined();
    });

    it("creates an exception rather than touching a wider rule that governs the row", () => {
        const vault = vaultWithRows();
        act(vault, (state) =>
            createFieldRule(state, {
                id: "R-all",
                descriptionText: TEXT,
                outputs: { tags: { mode: "add", tagIds: ["coffee"] } },
                createdAtEpochMs: 500
            })
        );
        tagBAsR1(vault);
        expect(activeRule(vault, "R-all")?.outputs).toEqual({
            tags: { mode: "add", tagIds: ["coffee"] }
        });
        expect(activeRule(vault, "R1")?.reach).toEqual(only("B"));
    });

    it("keeps a one-row rule per field, so a second field on the row is a second rule", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        act(vault, (state) =>
            createFieldRuleFromEdit(state, {
                id: "R-alloc",
                transactionId: "B",
                descriptionText: TEXT,
                field: "allocation",
                output: { allocations: { "person-1": 100 } },
                createdAtEpochMs: 4000
            })
        );
        expect(activeRule(vault, "R1")?.outputs).toEqual({
            tags: { mode: "add", tagIds: ["work"] }
        });
        expect(activeRule(vault, "R-alloc")?.reach).toEqual(only("B"));
    });

    it.each([
        {
            name: "an invalid output",
            id: "R-new",
            field: "descriptionAlias" as const,
            output: { aliasId: "" },
            type: "invalid-rule"
        },
        {
            name: "an id already in use",
            id: "R1",
            field: "descriptionAlias" as const,
            output: { aliasId: "alias-coffee" },
            type: "invalid-rule"
        }
    ])("refuses $name with zero mutation", ({ id, field, output, type }) => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        expectNoVaultWrite(vault, (state) => {
            const result = createFieldRuleFromEdit(state, {
                id,
                transactionId: "C",
                descriptionText: TEXT,
                field,
                output,
                createdAtEpochMs: 5000
            });
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.error.type).toBe(type);
        });
    });
});

describe("setFieldRuleReach", () => {
    it("widens to from a date, applying to newly governed rows only (E3)", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        tagAAsR2(vault);
        const applied = widen(vault, { kind: "from", date: JUL_25 });
        expect(applied).toBe(1);
        expect(activeRule(vault, "R1")?.reach).toEqual({ kind: "from", date: JUL_25 });
        expect(tagsOf(vault, "C")).toEqual(["work"]);
        expect(tagsOf(vault, "A")).toEqual(["home"]);
    });

    it("widens to all, leaving a row another one-row rule outranks it on untouched (E6)", () => {
        const vault = vaultWithRows([row({ id: "I1", date: JUN_1, importId: "import-1" })]);
        tagBAsR1(vault);
        tagAAsR2(vault);
        widen(vault, { kind: "from", date: JUL_25 });
        const applied = widen(vault, { kind: "all" });
        expect(applied).toBe(1);
        expect(tagsOf(vault, "I1")).toEqual(["work"]);
        expect(tagsOf(vault, "A")).toEqual(["home"]);
        expect(activeRule(vault, "R2")?.reach).toEqual(only("A"));
    });

    it("narrows to the rows governed now and changes no row", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        tagAAsR2(vault);
        widen(vault, { kind: "from", date: JUL_25 });
        const transactionsBefore = JSON.stringify(vault.mirror.getState().transactions);
        const applied = widen(vault, { kind: "transactions" });
        expect(applied).toBe(0);
        expect(activeRule(vault, "R1")?.reach).toEqual(only("B", "C"));
        expect(JSON.stringify(vault.mirror.getState().transactions)).toBe(transactionsBefore);
    });

    it("keeps an explicit set when asked for an explicit set again", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        expect(widen(vault, { kind: "transactions" })).toBe(0);
        expect(activeRule(vault, "R1")?.reach).toEqual(only("B"));
    });

    it("refuses to widen into a slot an all rule holds, naming it, with zero mutation", () => {
        const vault = vaultWithRows();
        act(vault, (state) =>
            createFieldRule(state, {
                id: "R-all",
                descriptionText: TEXT,
                outputs: { tags: { mode: "add", tagIds: ["coffee"] } },
                createdAtEpochMs: 500
            })
        );
        tagBAsR1(vault);
        expectNoVaultWrite(vault, (state) => {
            expect(setFieldRuleReach(state, { id: "R1", reach: { kind: "all" } })).toEqual({
                ok: false,
                error: { type: "duplicate-key", existingRuleId: "R-all" }
            });
        });
    });

    it("refuses a missing rule with zero mutation", () => {
        const vault = vaultWithRows();
        expectNoVaultWrite(vault, (state) => {
            expect(setFieldRuleReach(state, { id: "nope", reach: { kind: "all" } })).toEqual({
                ok: false,
                error: { type: "not-found", ruleId: "nope" }
            });
        });
    });
});

describe("precedence through the vault", () => {
    it("keeps a one-row exception against a newer, more specific all rule on bulk apply", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        // Newer and account-scoped, so recency and conditions both favour it: only reach can
        // keep B's exception.
        act(vault, (state) =>
            createFieldRule(state, {
                id: "R-account",
                descriptionText: TEXT,
                accountId: ACCOUNT_A,
                outputs: { tags: { mode: "set", tagIds: ["coffee"] } },
                createdAtEpochMs: 50_000
            })
        );
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });
        expect(tagsOf(vault, "B")).toEqual(["work"]);
        expect(tagsOf(vault, "A")).toEqual(["coffee"]);
        expect(tagsOf(vault, "C")).toEqual([]);
    });
});

describe("imports are governed only within reach", () => {
    function importOne(vault: Vault, id: string, date: Temporal.PlainDate): void {
        vault.mirror.setState((state: VaultState) => {
            commitImportBatch(state, {
                importId: `import-${id}`,
                fileName: `${id}.csv`,
                creationInstant: CREATION,
                transactions: [importRow(id, date)]
            });
        });
    }

    it("leaves a row dated before a from reach untagged (E4) and tags one after it (E5)", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        tagAAsR2(vault);
        widen(vault, { kind: "from", date: JUL_25 });
        importOne(vault, "I1", JUN_1);
        importOne(vault, "I2", AUG_10);
        expect(tagsOf(vault, "I1")).toEqual([]);
        expect(tagsOf(vault, "I2")).toEqual(["work"]);
    });

    it("never governs a new row with an explicit-set rule", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        importOne(vault, "I2", AUG_10);
        expect(tagsOf(vault, "I2")).toEqual([]);
    });
});

describe("extendFieldRuleReachToTransaction", () => {
    it("adds the row to the set and applies the rule to it", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        let applied = -1;
        vault.mirror.setState((state: VaultState) => {
            const result = extendFieldRuleReachToTransaction(state, {
                id: "R1",
                transactionId: "C"
            });
            applied = result.ok ? result.value.appliedCount : -1;
        });
        expect(applied).toBe(1);
        expect(activeRule(vault, "R1")?.reach).toEqual(only("B", "C"));
        expect(tagsOf(vault, "C")).toEqual(["work"]);
        expect(tagsOf(vault, "A")).toEqual([]);
    });

    it("changes nothing when the row is already in the set", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        expectNoVaultWrite(vault, (state) => {
            expect(
                extendFieldRuleReachToTransaction(state, { id: "R1", transactionId: "B" })
            ).toMatchObject({ ok: true, value: { appliedCount: 0 } });
        });
    });

    it.each<{
        readonly name: string;
        readonly id: string;
        readonly transactionId: string;
        readonly error: object;
    }>([
        {
            name: "a rule that is not explicit-set",
            id: "R-all",
            transactionId: "C",
            error: { type: "not-explicit-reach", ruleId: "R-all" }
        },
        {
            name: "a missing transaction",
            id: "R1",
            transactionId: "missing",
            error: { type: "transaction-not-found", transactionId: "missing" }
        },
        {
            name: "a transaction the conditions do not match",
            id: "R1",
            transactionId: "L",
            error: { type: "transaction-not-matched", ruleId: "R1", transactionId: "L" }
        },
        {
            name: "a row another one-row rule for the slot already holds",
            id: "R1",
            transactionId: "A",
            error: { type: "duplicate-key", existingRuleId: "R2" }
        },
        {
            name: "a missing rule",
            id: "nope",
            transactionId: "C",
            error: { type: "not-found", ruleId: "nope" }
        }
    ])("refuses $name with zero mutation", ({ id, transactionId, error }) => {
        const vault = vaultWithRows([row({ id: "L", date: AUG_3, description: "BOOKSTORE 99" })]);
        act(vault, (state) =>
            createFieldRule(state, {
                id: "R-all",
                descriptionText: TEXT,
                outputs: { descriptionAlias: { aliasId: "alias-coffee" } },
                createdAtEpochMs: 500
            })
        );
        tagBAsR1(vault);
        tagAAsR2(vault);
        expectNoVaultWrite(vault, (state) => {
            expect(extendFieldRuleReachToTransaction(state, { id, transactionId })).toEqual({
                ok: false,
                error
            });
        });
    });

    it("merges concurrent extensions on two devices as a union", () => {
        const base = vaultWithRows([row({ id: "D", date: AUG_10 })]);
        tagBAsR1(base);
        const snapshot = base.doc.export({ mode: "snapshot" });
        const left = createVaultMirrorFromSnapshot(snapshot);
        const right = createVaultMirrorFromSnapshot(snapshot);
        const leftBase = left.doc.version();
        const rightBase = right.doc.version();

        act(left, (state) =>
            extendFieldRuleReachToTransaction(state, { id: "R1", transactionId: "C" })
        );
        // The other device rewrites the whole rule while extending, which must not drop C either.
        act(right, (state) =>
            extendFieldRuleReachToTransaction(state, { id: "R1", transactionId: "D" })
        );
        act(right, (state) =>
            setFieldRuleOutput(state, {
                id: "R1",
                field: "tags",
                output: { mode: "add", tagIds: ["work", "coffee"] }
            })
        );
        const leftUpdate = left.doc.export({ mode: "update", from: leftBase });
        const rightUpdate = right.doc.export({ mode: "update", from: rightBase });
        left.doc.import(rightUpdate);
        right.doc.import(leftUpdate);

        for (const merged of [left, right]) {
            expect(activeRule(merged, "R1")?.reach).toEqual(only("B", "C", "D"));
        }
        for (const vault of [base, left, right]) vault.mirror.dispose();
    });
});

describe("foldFieldRuleIntoHost", () => {
    /** An all rule tagging `coffee`, and a one-row exception on B tagging `work`. */
    function vaultWithException(): Vault {
        const vault = vaultWithRows();
        act(vault, (state) =>
            createFieldRule(state, {
                id: "R-all",
                descriptionText: TEXT,
                outputs: { tags: { mode: "set", tagIds: ["coffee"] } },
                createdAtEpochMs: 500
            })
        );
        tagBAsR1(vault);
        return vault;
    }

    it("updates the owner across its reach where it wins and deletes the one-row rule", () => {
        const vault = vaultWithException();
        tagAAsR2(vault);
        let applied = -1;
        vault.mirror.setState((state: VaultState) => {
            const result = foldFieldRuleIntoHost(state, {
                oneRowRuleId: "R1",
                hostId: "R-all",
                deletedAtEpochMs: 9000
            });
            applied = result.ok ? result.value.appliedCount : -1;
        });
        expect(activeRule(vault, "R-all")?.outputs).toEqual({
            tags: { mode: "add", tagIds: ["work"] }
        });
        expect(activeRule(vault, "R1")).toBeUndefined();
        expect(vault.mirror.getState().fieldRules.R1?.deletedAtEpochMs).toBe(9000);
        // B and C are now governed by the host; A stays with its own one-row rule R2.
        expect(applied).toBe(2);
        expect(tagsOf(vault, "B")).toEqual(["work"]);
        expect(tagsOf(vault, "C")).toEqual(["work"]);
        expect(tagsOf(vault, "A")).toEqual(["home"]);
    });

    it("adds the field to a host that lacks it, applying only that field", () => {
        const vault = vaultWithRows();
        act(vault, (state) =>
            createFieldRule(state, {
                id: "R-alloc",
                descriptionText: TEXT,
                outputs: { allocation: { allocations: { "person-1": 100 } } },
                createdAtEpochMs: 500
            })
        );
        tagBAsR1(vault);
        act(vault, (state) =>
            foldFieldRuleIntoHost(state, {
                oneRowRuleId: "R1",
                hostId: "R-alloc",
                deletedAtEpochMs: 9000
            })
        );
        expect(activeRule(vault, "R-alloc")?.outputs).toMatchObject({
            tags: { mode: "add", tagIds: ["work"] },
            allocation: { allocations: { "person-1": 100 } }
        });
        expect(tagsOf(vault, "A")).toEqual(["work"]);
        const allocationsOfA = findTransactionById(vault.mirror.getState().transactions, "A")
            ?.transaction.allocations;
        // The host's allocation was never applied, and the fold applies only the folded field.
        expect(allocationsOfA?.["person-1"]).toBeUndefined();
    });

    it.each<{
        readonly name: string;
        readonly setUp: (vault: Vault) => void;
        readonly oneRowRuleId: string;
        readonly hostId: string;
        readonly error: object;
    }>([
        {
            name: "a host with other conditions",
            setUp: (vault) =>
                act(vault, (state) =>
                    createFieldRule(state, {
                        id: "R-host",
                        descriptionText: TEXT,
                        accountId: ACCOUNT_A,
                        outputs: { tags: { mode: "add", tagIds: ["x"] } },
                        createdAtEpochMs: 600
                    })
                ),
            oneRowRuleId: "R1",
            hostId: "R-host",
            error: { type: "predicate-mismatch", sourceId: "R1", hostId: "R-host" }
        },
        {
            name: "a host that does not reach the one-row rule's row",
            setUp: (vault) =>
                act(vault, (state) =>
                    createFieldRule(state, {
                        id: "R-host",
                        descriptionText: TEXT,
                        outputs: { descriptionAlias: { aliasId: "alias-coffee" } },
                        reach: { kind: "from", date: AUG_3 },
                        createdAtEpochMs: 600
                    })
                ),
            oneRowRuleId: "R1",
            hostId: "R-host",
            error: { type: "reach-mismatch", sourceId: "R1", hostId: "R-host" }
        },
        {
            name: "a source that is not a one-row rule",
            setUp: () => undefined,
            oneRowRuleId: "R-all",
            hostId: "R1",
            error: { type: "not-explicit-reach", ruleId: "R-all" }
        },
        {
            name: "a missing host",
            setUp: () => undefined,
            oneRowRuleId: "R1",
            hostId: "nope",
            error: { type: "not-found", ruleId: "nope" }
        }
    ])("refuses $name with zero mutation", ({ setUp, oneRowRuleId, hostId, error }) => {
        const vault = vaultWithException();
        setUp(vault);
        expectNoVaultWrite(vault, (state) => {
            expect(
                foldFieldRuleIntoHost(state, { oneRowRuleId, hostId, deletedAtEpochMs: 9000 })
            ).toEqual({ ok: false, error });
        });
    });
});

describe("explicit sets follow transaction deletes", () => {
    it("removes a deleted row from its set and keeps the emptied rule (E10)", () => {
        const vault = vaultWithRows([row({ id: "I1", date: JUN_1, importId: "import-1" })]);
        act(vault, (state) =>
            createFieldRuleFromEdit(state, {
                id: "R3",
                transactionId: "I1",
                descriptionText: TEXT,
                field: "tags",
                output: { mode: "add", tagIds: ["food"] },
                createdAtEpochMs: 1000
            })
        );
        act(vault, (state) =>
            deleteDescriptionAliasedTransaction(state, {
                location: { accountId: ACCOUNT_A, date: JUN_1, transactionId: "I1" }
            })
        );
        expect(activeRule(vault, "R3")?.reach).toEqual(only());
    });

    it("removes only the deleted row from a larger set", () => {
        const vault = vaultWithRows();
        tagBAsR1(vault);
        act(vault, (state) =>
            extendFieldRuleReachToTransaction(state, { id: "R1", transactionId: "A" })
        );
        act(vault, (state) =>
            deleteDescriptionAliasedTransaction(state, {
                location: { accountId: ACCOUNT_A, date: JUL_25, transactionId: "B" }
            })
        );
        expect(activeRule(vault, "R1")?.reach).toEqual(only("A"));
    });

    it("removes every row of a deleted import from every set", () => {
        const vault = vaultWithRows([
            row({ id: "I1", date: JUN_1, importId: "import-1" }),
            row({ id: "I2", date: AUG_10, importId: "import-1" })
        ]);
        tagBAsR1(vault);
        act(vault, (state) =>
            extendFieldRuleReachToTransaction(state, { id: "R1", transactionId: "I1" })
        );
        act(vault, (state) =>
            createFieldRuleFromEdit(state, {
                id: "R3",
                transactionId: "I2",
                descriptionText: TEXT,
                field: "allocation",
                output: { allocations: { "person-1": 100 } },
                createdAtEpochMs: 3000
            })
        );
        act(vault, (state) => deleteDescriptionAliasedTransactionsByImport(state, "import-1"));
        expect(activeRule(vault, "R1")?.reach).toEqual(only("B"));
        expect(activeRule(vault, "R3")?.reach).toEqual(only());
    });
});
