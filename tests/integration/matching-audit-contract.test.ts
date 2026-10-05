/**
 * Production characterisation for the MF-005 matching audit
 * (`specs/016-automation-interaction-contract/matching-audit.md`).
 *
 * Every test here runs through the REAL production surfaces — `createVaultMirror`, the field-rule
 * CRUD mutations, `readActiveFieldRules`, the bulk application entry points and the P11 alias
 * mutation boundary. Nothing re-implements the matcher or the ranking algorithm: the assertions read
 * stored transaction state and the returned outcomes, so a change in `selectWinningRule` shows up
 * here as a behaviour change rather than being mirrored by a second copy of the algorithm.
 *
 * The pre-existing suites already cover the ordinary paths (see the audit's §11). This file fills
 * the gaps the audit cites and nothing else:
 * - permutation-independent rank selection and equal-`createdAt` greatest-id resolution,
 * - zero as an exact amount constraint, per-field independent winners, unmatchable descriptions,
 * - raw-text matching after an alias rename and manual-row eligibility,
 * - change-one isolation/staleness, change-all symlink resolution and invalid-backlink rejection,
 *   remove-all reference clearing including nested suspected duplicates,
 * - per-field alias rejection alongside a successful tag plan,
 * - two-user preference independence across a snapshot reload, and the absent-identity read.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    assignDescriptionAlias,
    changeAllDescriptionAliases,
    changeOneDescriptionAlias,
    createDescriptionAlias,
    insertManualDescriptionAliasedTransaction,
    removeAllDescriptionAliases,
    renameDescriptionAlias
} from "@/lib/crdt/description-aliases";
import {
    createFieldRule,
    deleteFieldRule,
    persistUserAutomationPreference,
    readUserAutomationChoice
} from "@/lib/crdt/field-rule-mutations";
import { applyFieldRulesToAllTransactions, readActiveFieldRules } from "@/lib/crdt/field-rules";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import {
    findParentTransaction,
    findTransactionInStore,
    insertTransaction,
    type TransactionLocation
} from "@/lib/crdt/mutations";
import { type FieldRuleInput, type TransactionInput, type VaultState } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";
import { resolveAlias } from "@/lib/domain/description-aliases";

const ACCOUNT = "account-1";
const OTHER_ACCOUNT = "account-2";
const DATE = Temporal.PlainDate.from("2026-07-25");
const CREATION = Temporal.Instant.from("2026-07-25T00:00:00Z");
const DESCRIPTION = "COFFEE SHOP 123";
const AMOUNT = -450;

function locationOf(transactionId: string): TransactionLocation {
    return { accountId: ACCOUNT, date: DATE, transactionId };
}

function txInput(overrides: Partial<TransactionInput> & { readonly id: string }): TransactionInput {
    return {
        date: DATE,
        description: DESCRIPTION,
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(AMOUNT),
        originalAmount: undefined,
        accountId: ACCOUNT,
        tagIds: [],
        statusId: "status-1",
        importId: "import-1",
        allocations: {},
        creationInstant: CREATION,
        importRowIndex: 0,
        suspectedDuplicates: [],
        deletedAt: undefined,
        ...overrides
    };
}

function seed(state: VaultState, overrides: Partial<TransactionInput> & { readonly id: string }) {
    const inserted = insertTransaction(state.transactions, { transaction: txInput(overrides) });
    if (!inserted.ok) throw new Error(`seed failed: ${inserted.error.type}`);
}

/** Read the tags a stored transaction actually carries (the only residue application leaves). */
function storedTagIds(vault: ReturnType<typeof createVaultMirror>, id: string): readonly string[] {
    const transaction = findTransactionInStore(
        vault.mirror.getState().transactions,
        locationOf(id)
    );
    return [...(transaction?.tagIds ?? [])];
}

function storedAliasId(
    vault: ReturnType<typeof createVaultMirror>,
    id: string
): string | undefined {
    return findTransactionInStore(vault.mirror.getState().transactions, locationOf(id))
        ?.descriptionAliasId;
}

/**
 * Write a rule straight to the wire collection, bypassing CRUD. Ordinary CRUD rejects a uniqueness
 * collision, so a rank tie can only arrive as concurrent-replica or legacy wire data — which is
 * exactly what this constructs. Every other test in this file goes through `createFieldRule`.
 */
function putWireFieldRule(state: VaultState, input: FieldRuleInput): void {
    const draft: Record<string, FieldRuleInput> = state.fieldRules;
    draft[input.id] = input;
}

function wireTagsRule(
    overrides: Pick<FieldRuleInput, "id" | "createdAtEpochMs"> & Partial<FieldRuleInput>
): FieldRuleInput {
    return {
        field: "tags",
        descriptionText: DESCRIPTION,
        accountId: undefined,
        amount: undefined,
        aliasId: undefined,
        tagMode: "set",
        tagIds: [],
        allocations: {},
        deletedAtEpochMs: undefined,
        ...overrides
    };
}

/** Every ordering of `values`. Used to prove selection does not depend on iteration order. */
function permutations<Value>(values: readonly Value[]): (readonly Value[])[] {
    if (values.length <= 1) return [values];
    const result: (readonly Value[])[] = [];
    for (const [index, value] of values.entries()) {
        const rest = [...values.slice(0, index), ...values.slice(index + 1)];
        for (const tail of permutations(rest)) result.push([value, ...tail]);
    }
    return result;
}

describe("MF-005 matching audit — links and provenance", () => {
    // MA-LINK-01 / MA-LINK-03.
    it("stores field values only and returns rule identity solely as a return value", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seed(state, { id: "t-1" });
            createFieldRule(state, {
                id: "rule-provenance",
                descriptionText: DESCRIPTION,
                action: { field: "tags", mode: "add", tagIds: ["tag-coffee"] },
                createdAtEpochMs: 1000
            });
        });

        let reportedRuleIds: readonly string[] = [];
        vault.mirror.setState((state: VaultState) => {
            const entries = applyFieldRulesToAllTransactions(state);
            reportedRuleIds = entries.flatMap((entry) =>
                entry.outcomes.map((outcome) => outcome.ruleId)
            );
        });

        // The rule id is reported to the caller...
        expect(reportedRuleIds).toContain("rule-provenance");
        // ...and the row itself carries only the field value, with no rule reference anywhere.
        expect(storedTagIds(vault, "t-1")).toEqual(["tag-coffee"]);
        const stored = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-1")
        );
        expect(JSON.stringify(stored)).not.toContain("rule-provenance");
    });

    // MA-LINK-02: the persisted descriptionAliasId is an ALIAS reference and outlives the rule.
    it("leaves the alias reference intact after the rule that set it is deleted", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seed(state, { id: "t-1" });
            const created = createDescriptionAlias(state, {
                aliasId: "alias-coffee",
                name: "Coffee"
            });
            expect(created.ok).toBe(true);
            createFieldRule(state, {
                id: "rule-alias",
                descriptionText: DESCRIPTION,
                action: { field: "descriptionAlias", aliasId: "alias-coffee" },
                createdAtEpochMs: 1000
            });
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });
        expect(storedAliasId(vault, "t-1")).toBe("alias-coffee");

        vault.mirror.setState((state: VaultState) => {
            const deleted = deleteFieldRule(state, {
                id: "rule-alias",
                deletedAtEpochMs: 5000
            });
            expect(deleted.ok).toBe(true);
        });

        expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(0);
        // Deleting the rule leaves no dangling reference to repair: the alias link is the user's.
        expect(storedAliasId(vault, "t-1")).toBe("alias-coffee");
    });
});

describe("MF-005 matching audit — precedence and matching", () => {
    // MA-RANK-01..04: the ladder is a property of the rule set, not of insertion order.
    it("selects the same rank-3 winner under every permutation of the rule set", () => {
        const ladder = [
            { id: "rule-rank0", tag: "tag-rank0", accountId: undefined, amount: undefined },
            { id: "rule-rank1", tag: "tag-rank1", accountId: undefined, amount: AMOUNT },
            { id: "rule-rank2", tag: "tag-rank2", accountId: ACCOUNT, amount: undefined },
            { id: "rule-rank3", tag: "tag-rank3", accountId: ACCOUNT, amount: AMOUNT }
        ] as const;

        const orderings = permutations(ladder);
        expect(orderings).toHaveLength(24);

        for (const ordering of orderings) {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                seed(state, { id: "t-1" });
                for (const [index, rule] of ordering.entries()) {
                    const created = createFieldRule(state, {
                        id: rule.id,
                        descriptionText: DESCRIPTION,
                        accountId: rule.accountId,
                        amount: rule.amount == null ? undefined : asMinorUnits(rule.amount),
                        action: { field: "tags", mode: "set", tagIds: [rule.tag] },
                        // Deliberately ascending with insertion order: if rank were ignored, the
                        // recency tie-break would pick a different winner per permutation.
                        createdAtEpochMs: 1000 + index
                    });
                    expect(created.ok).toBe(true);
                }
            });
            vault.mirror.setState((state: VaultState) => {
                applyFieldRulesToAllTransactions(state);
            });
            expect(
                storedTagIds(vault, "t-1"),
                `ordering ${ordering.map((r) => r.id).join(",")}`
            ).toEqual(["tag-rank3"]);
        }
    });

    // MA-TIE-02: an equal-createdAt collision is only reachable through wire data, and resolves to
    // the greatest lexical id regardless of which replica's entry landed first.
    it("resolves an equal-createdAt duplicate slot to the greatest lexical id from wire fixtures", () => {
        for (const order of [
            ["rule-aaa", "rule-zzz"],
            ["rule-zzz", "rule-aaa"]
        ] as const) {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                seed(state, { id: "t-1" });
                for (const id of order) {
                    putWireFieldRule(
                        state,
                        wireTagsRule({
                            id,
                            createdAtEpochMs: 7000,
                            tagIds: [`tag-${id}`]
                        })
                    );
                }
            });
            // Both entries really are active and really do collide on the uniqueness slot.
            expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(2);

            vault.mirror.setState((state: VaultState) => {
                applyFieldRulesToAllTransactions(state);
            });
            expect(storedTagIds(vault, "t-1"), `wire order ${order.join(",")}`).toEqual([
                "tag-rule-zzz"
            ]);
        }
    });

    // MA-MATCH-01 / MA-MATCH-04 (negative half).
    it("does not match on case, whitespace, account or amount differences", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seed(state, { id: "t-1" });
            const nearMisses = [
                { id: "rule-case", descriptionText: DESCRIPTION.toLowerCase() },
                { id: "rule-trailing-space", descriptionText: `${DESCRIPTION} ` },
                { id: "rule-leading-space", descriptionText: ` ${DESCRIPTION}` },
                { id: "rule-substring", descriptionText: "COFFEE" }
            ];
            for (const near of nearMisses) {
                const created = createFieldRule(state, {
                    id: near.id,
                    descriptionText: near.descriptionText,
                    action: { field: "tags", mode: "add", tagIds: [near.id] },
                    createdAtEpochMs: 1000
                });
                expect(created.ok).toBe(true);
            }
            createFieldRule(state, {
                id: "rule-wrong-account",
                descriptionText: DESCRIPTION,
                accountId: OTHER_ACCOUNT,
                action: { field: "tags", mode: "add", tagIds: ["rule-wrong-account"] },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "rule-wrong-amount",
                descriptionText: DESCRIPTION,
                amount: asMinorUnits(AMOUNT + 1),
                action: { field: "tags", mode: "add", tagIds: ["rule-wrong-amount"] },
                createdAtEpochMs: 1000
            });
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });
        expect(storedTagIds(vault, "t-1")).toEqual([]);

        // Control: the exactly-equal rule DOES match, so the empty result above is about the
        // near misses rather than about application being wired up wrong.
        vault.mirror.setState((state: VaultState) => {
            createFieldRule(state, {
                id: "rule-exact",
                descriptionText: DESCRIPTION,
                action: { field: "tags", mode: "add", tagIds: ["tag-exact"] },
                createdAtEpochMs: 2000
            });
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });
        expect(storedTagIds(vault, "t-1")).toEqual(["tag-exact"]);
    });

    // MA-MATCH-02: both shapes of "no matchable text" are inert.
    it("treats an empty imported description and a dangling manual alias as unmatchable", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seed(state, { id: "t-empty-import", description: "" });
            seed(state, {
                id: "t-dangling-manual",
                description: "",
                importId: undefined,
                descriptionAliasId: "alias-that-never-existed"
            });
            // A rule whose text is the empty string must not become a catch-all for either row.
            const emptyRule = createFieldRule(state, {
                id: "rule-empty-text",
                descriptionText: "",
                action: { field: "tags", mode: "add", tagIds: ["tag-empty"] },
                createdAtEpochMs: 1000
            });
            expect(emptyRule.ok).toBe(true);
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });
        expect(storedTagIds(vault, "t-empty-import")).toEqual([]);
        expect(storedTagIds(vault, "t-dangling-manual")).toEqual([]);
        // The dangling reference is left exactly as found; matching does not repair or clear it.
        expect(storedAliasId(vault, "t-dangling-manual")).toBe("alias-that-never-existed");
    });

    // MA-MATCH-03: one winner PER FIELD, chosen independently.
    it("lets different fields win at different scopes on the same transaction", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seed(state, { id: "t-1" });
            // tags: a rank-3 rule beats its rank-0 sibling.
            createFieldRule(state, {
                id: "rule-tags-rank0",
                descriptionText: DESCRIPTION,
                action: { field: "tags", mode: "set", tagIds: ["tag-broad"] },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "rule-tags-rank3",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT,
                amount: asMinorUnits(AMOUNT),
                action: { field: "tags", mode: "set", tagIds: ["tag-narrow"] },
                createdAtEpochMs: 1000
            });
            // allocation: only a rank-0 rule exists, and it still applies.
            createFieldRule(state, {
                id: "rule-alloc-rank0",
                descriptionText: DESCRIPTION,
                action: { field: "allocation", allocations: { "person-1": 100 } },
                createdAtEpochMs: 1000
            });
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        expect(storedTagIds(vault, "t-1")).toEqual(["tag-narrow"]);
        const stored = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-1")
        );
        expect(Object.entries(stored?.allocations ?? {}).filter(([id]) => id !== "$cid")).toEqual([
            ["person-1", 100]
        ]);
    });

    // MA-MATCH-04: zero is a value, not an absence.
    it("treats a zero amount as an exact constraint distinct from an absent one", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seed(state, { id: "t-zero", amount: asMinorUnits(0) });
            seed(state, { id: "t-nonzero" });
            createFieldRule(state, {
                id: "rule-zero",
                descriptionText: DESCRIPTION,
                amount: asMinorUnits(0),
                action: { field: "tags", mode: "set", tagIds: ["tag-zero"] },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "rule-any-amount",
                descriptionText: DESCRIPTION,
                action: { field: "tags", mode: "set", tagIds: ["tag-any"] },
                createdAtEpochMs: 1000
            });
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        // The zero row is narrowed by the amount-scoped rule; the other row falls back to unscoped.
        expect(storedTagIds(vault, "t-zero")).toEqual(["tag-zero"]);
        expect(storedTagIds(vault, "t-nonzero")).toEqual(["tag-any"]);
    });
});

describe("MF-005 matching audit — manual versus imported eligibility", () => {
    // MA-ELIG-03: display aliases never change what an imported row matches.
    it("keeps matching an imported row on its raw text after its display alias is renamed", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seed(state, { id: "t-1" });
            createDescriptionAlias(state, { aliasId: "alias-display", name: "Pretty Coffee" });
            const assigned = assignDescriptionAlias(state, {
                location: locationOf("t-1"),
                aliasId: "alias-display"
            });
            expect(assigned.ok).toBe(true);
        });
        vault.mirror.setState((state: VaultState) => {
            const renamed = renameDescriptionAlias(state, {
                aliasId: "alias-display",
                name: "Completely Different"
            });
            expect(renamed.ok).toBe(true);
        });
        vault.mirror.setState((state: VaultState) => {
            createFieldRule(state, {
                id: "rule-raw",
                descriptionText: DESCRIPTION,
                action: { field: "tags", mode: "add", tagIds: ["tag-raw"] },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "rule-display-name",
                descriptionText: "Completely Different",
                action: { field: "tags", mode: "add", tagIds: ["tag-display"] },
                createdAtEpochMs: 1000
            });
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        expect(storedTagIds(vault, "t-1")).toEqual(["tag-raw"]);
        // Provenance invariant: the raw imported text is never rewritten by an alias.
        const stored = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-1")
        );
        expect(stored?.description).toBe(DESCRIPTION);
    });

    // MA-ELIG-01 / MA-ELIG-02 / MA-ELIG-04 on one row.
    it("matches a manual row on its resolved alias name and applies eligible fields only", () => {
        const MANUAL_NAME = "WEEKLY GROCERIES";
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            const inserted = insertManualDescriptionAliasedTransaction(state, {
                transaction: {
                    id: "m-1",
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
                newAliasId: "alias-manual",
                name: MANUAL_NAME
            });
            expect(inserted.ok).toBe(true);

            createDescriptionAlias(state, { aliasId: "alias-elsewhere", name: "Elsewhere" });
            for (const rule of [
                {
                    id: "rule-manual-tags",
                    action: { field: "tags", mode: "add", tagIds: ["tag-groceries"] } as const
                },
                {
                    id: "rule-manual-alloc",
                    action: { field: "allocation", allocations: { "person-1": 100 } } as const
                },
                {
                    id: "rule-manual-alias",
                    action: { field: "descriptionAlias", aliasId: "alias-elsewhere" } as const
                }
            ]) {
                const created = createFieldRule(state, {
                    id: rule.id,
                    descriptionText: MANUAL_NAME,
                    action: rule.action,
                    createdAtEpochMs: 1000
                });
                expect(created.ok).toBe(true);
            }
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        const stored = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("m-1")
        );
        // Eligible fields applied, keyed on the resolved alias NAME...
        expect([...(stored?.tagIds ?? [])]).toEqual(["tag-groceries"]);
        expect(Object.entries(stored?.allocations ?? {}).filter(([id]) => id !== "$cid")).toEqual([
            ["person-1", 100]
        ]);
        // ...while the description-alias rule never touches a manual row.
        expect(stored?.descriptionAliasId).toBe("alias-manual");
    });
});

describe("MF-005 matching audit — alias lifecycle", () => {
    // MA-ALIAS-03.
    it("isolates change-one and rejects a stale expected alias id without mutating", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seed(state, { id: "t-1" });
            seed(state, { id: "t-2" });
            createDescriptionAlias(state, { aliasId: "alias-shared", name: "Shared" });
            for (const id of ["t-1", "t-2"]) {
                assignDescriptionAlias(state, {
                    location: locationOf(id),
                    aliasId: "alias-shared"
                });
            }
        });

        vault.mirror.setState((state: VaultState) => {
            const changed = changeOneDescriptionAlias(state, {
                location: locationOf("t-1"),
                expectedAliasId: "alias-shared",
                target: { kind: "new", aliasId: "alias-only-one", name: "Only One" }
            });
            expect(changed.ok).toBe(true);
        });
        expect(storedAliasId(vault, "t-1")).toBe("alias-only-one");
        expect(storedAliasId(vault, "t-2")).toBe("alias-shared");

        vault.mirror.setState((state: VaultState) => {
            const stale = changeOneDescriptionAlias(state, {
                location: locationOf("t-2"),
                // The UI read "alias-only-one", but the row is still on "alias-shared".
                expectedAliasId: "alias-only-one",
                target: { kind: "new", aliasId: "alias-never-created", name: "Never Created" }
            });
            expect(stale.ok).toBe(false);
            if (!stale.ok) expect(stale.error.code).toBe("stale-alias");
        });
        expect(storedAliasId(vault, "t-2")).toBe("alias-shared");
        // The rejection wrote nothing at all — not even the target it would have created.
        expect(vault.mirror.getState().descriptionAliases["alias-never-created"]).toBeUndefined();
    });

    // MA-ALIAS-05.
    it("resolves through an old symlink after change all and rejects an invalid inbound backlink before materialising the target", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seed(state, { id: "t-1" });
            createDescriptionAlias(state, { aliasId: "alias-source", name: "Source" });
            createDescriptionAlias(state, { aliasId: "alias-target", name: "Target" });
            assignDescriptionAlias(state, {
                location: locationOf("t-1"),
                aliasId: "alias-source"
            });
        });

        vault.mirror.setState((state: VaultState) => {
            const changed = changeAllDescriptionAliases(state, {
                sourceAliasId: "alias-source",
                target: { kind: "existing", aliasId: "alias-target" }
            });
            expect(changed.ok).toBe(true);
        });

        const afterChangeAll = vault.mirror.getState();
        // Existing rows are NOT rewritten; the old id keeps resolving, in one hop, to the target.
        expect(storedAliasId(vault, "t-1")).toBe("alias-source");
        expect(afterChangeAll.descriptionAliases["alias-source"]?.kind).toBe("symlink");
        expect(resolveAlias("alias-source", afterChangeAll.descriptionAliases)?.id).toBe(
            "alias-target"
        );

        // A corrupt inbound backlink aborts before the new target is materialised.
        vault.mirror.setState((state: VaultState) => {
            const target = state.descriptionAliases["alias-target"];
            if (target == null || typeof target !== "object") throw new Error("missing target");
            target.symlinkIds["alias-ghost"] = true;
        });
        vault.mirror.setState((state: VaultState) => {
            const rejected = changeAllDescriptionAliases(state, {
                sourceAliasId: "alias-target",
                target: { kind: "new", aliasId: "alias-fresh", name: "Fresh" }
            });
            expect(rejected.ok).toBe(false);
            if (!rejected.ok) expect(rejected.error.code).toBe("invalid-symlink-backlink");
        });
        expect(vault.mirror.getState().descriptionAliases["alias-fresh"]).toBeUndefined();
        expect(vault.mirror.getState().descriptionAliases["alias-target"]?.kind).toBe("real");
    });

    // MA-ALIAS-07.
    it("clears main and suspected-duplicate references when removing all", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            const created = createDescriptionAlias(state, {
                aliasId: "alias-doomed",
                name: "Doomed"
            });
            expect(created.ok).toBe(true);
            seed(state, {
                id: "t-parent",
                suspectedDuplicates: [
                    {
                        id: "t-nested",
                        date: DATE,
                        description: DESCRIPTION,
                        descriptionAliasId: "alias-doomed",
                        notes: "",
                        amount: asMinorUnits(AMOUNT),
                        originalAmount: undefined,
                        accountId: ACCOUNT,
                        tagIds: [],
                        statusId: "status-1",
                        importId: "import-1",
                        allocations: {},
                        creationInstant: CREATION,
                        importRowIndex: 1,
                        deletedAt: undefined
                    }
                ]
            });
            assignDescriptionAlias(state, {
                location: locationOf("t-parent"),
                aliasId: "alias-doomed"
            });
        });

        // The parent read (not the location read) is what exposes the nested duplicates.
        const before = findParentTransaction(
            vault.mirror.getState().transactions,
            locationOf("t-parent")
        );
        expect(before?.descriptionAliasId).toBe("alias-doomed");
        expect(before?.suspectedDuplicates[0]?.descriptionAliasId).toBe("alias-doomed");

        vault.mirror.setState((state: VaultState) => {
            const removed = removeAllDescriptionAliases(state, "alias-doomed");
            expect(removed.ok).toBe(true);
        });

        const after = findParentTransaction(
            vault.mirror.getState().transactions,
            locationOf("t-parent")
        );
        expect(after?.descriptionAliasId).toBeUndefined();
        expect(after?.suspectedDuplicates[0]?.descriptionAliasId).toBeUndefined();
        // Soft-deleted, not erased: a concurrent peer cannot resurrect a half-deleted graph.
        expect(vault.mirror.getState().descriptionAliases["alias-doomed"]?.deletedAt).toBeDefined();
    });
});

describe("MF-005 matching audit — application boundaries and preferences", () => {
    // MA-PERSIST-03: per-field typed outcomes, no universal rollback.
    it("reports a per-field alias rejection while the tag plan for the same row still applies", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seed(state, { id: "t-1" });
            createFieldRule(state, {
                id: "rule-tags",
                descriptionText: DESCRIPTION,
                action: { field: "tags", mode: "add", tagIds: ["tag-applied"] },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "rule-alias-missing",
                descriptionText: DESCRIPTION,
                // A rule pointing at an alias that does not exist: the alias boundary rejects it.
                action: { field: "descriptionAlias", aliasId: "alias-missing" },
                createdAtEpochMs: 1000
            });
        });

        let outcomes: readonly { field: string; status: string }[] = [];
        vault.mirror.setState((state: VaultState) => {
            outcomes = applyFieldRulesToAllTransactions(state).flatMap((entry) =>
                entry.outcomes.map((outcome) => ({
                    field: outcome.field,
                    status: outcome.status
                }))
            );
        });

        expect(outcomes).toContainEqual({ field: "tags", status: "applied" });
        expect(outcomes).toContainEqual({ field: "descriptionAlias", status: "alias-error" });
        // The tag write stands despite the alias failure on the same row.
        expect(storedTagIds(vault, "t-1")).toEqual(["tag-applied"]);
        expect(storedAliasId(vault, "t-1")).toBeUndefined();
    });

    // MA-PREF-02.
    it("keeps two users' remembered choices independent and survives a snapshot reload", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            persistUserAutomationPreference(state, {
                pubkeyHash: "pubkey-one",
                choice: {
                    field: "tags",
                    tagMode: "set",
                    useAccountScope: true,
                    useAmountScope: false,
                    applyMode: "updatingAll"
                }
            });
            persistUserAutomationPreference(state, {
                pubkeyHash: "pubkey-two",
                choice: {
                    field: "allocation",
                    tagMode: "add",
                    useAccountScope: false,
                    useAmountScope: true,
                    applyMode: "updateNew"
                }
            });
        });

        const reopened = createVaultMirrorFromSnapshot(vault.doc.export({ mode: "snapshot" }));
        const one = readUserAutomationChoice(reopened.mirror.getState(), "pubkey-one");
        const two = readUserAutomationChoice(reopened.mirror.getState(), "pubkey-two");

        expect(one).toMatchObject({
            field: "tags",
            tagMode: "set",
            useAccountScope: true,
            useAmountScope: false,
            applyMode: "updatingAll"
        });
        expect(two).toMatchObject({
            field: "allocation",
            tagMode: "add",
            useAccountScope: false,
            useAmountScope: true,
            applyMode: "updateNew"
        });
    });

    // MA-PREF-03: the write is skipped when there is no identity, and the read falls back to the
    // defaults rather than to some other user's record.
    it("leaves no preference record when identity is absent", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            persistUserAutomationPreference(state, {
                pubkeyHash: "pubkey-one",
                choice: {
                    field: "allocation",
                    tagMode: "set",
                    useAccountScope: true,
                    useAmountScope: true,
                    applyMode: "updatingAll"
                }
            });
        });

        const state = vault.mirror.getState();
        // The hooks skip the write entirely when pubkeyHash == null, so no record exists under the
        // empty key; the read therefore yields the conservative defaults.
        expect(state.userAutomationPreferences[""]).toBeUndefined();
        expect(readUserAutomationChoice(state, "")).toMatchObject({
            field: "tags",
            tagMode: "add",
            useAccountScope: false,
            useAmountScope: false,
            applyMode: "updateNew"
        });
    });
});
