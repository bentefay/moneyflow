/**
 * MF-003 characterization of automation APPLICATION SCOPE and TIMING.
 *
 * This file deliberately measures the *population* an application call reaches and *when* that call
 * happens, which is a different question from the one the neighbouring suites answer:
 *
 * - `tests/integration/field-rules-crdt.test.ts` and `tests/integration/field-rule-mutations.test.ts`
 *   own MATCHING and ELIGIBILITY (precedence, scope narrowing, manual-row rules). Those matrices are
 *   cited by the contract report rather than rebuilt here.
 * - `tests/integration/import-commit-field-rules.test.ts` owns the import-commit write boundaries.
 *
 * What is recorded here, against the production APIs the UI actually calls:
 *
 * 1. `applyFieldRulesToAllTransactions` reaches every active matching row at any date, and the
 *    returned entries are NOT a proxy for mutation — an entry exists for every active row, including
 *    ones no rule matched. Assertions therefore read the stored values back.
 * 2. `applyFieldRulesToNewerTransactions` is STRICTLY newer today: rows sharing the reference date
 *    are excluded. The confirmed target is inclusive ("on or after"). The gap is measured, not
 *    fixed — MF-003 changes no comparator.
 * 3. Both bulk entry points evaluate EVERY active rule, not only the rule an editor happens to have
 *    open.
 * 4. Import arrival is independent of the UI apply mode and of the transaction's own date: a
 *    backdated row committed through `commitImportBatch` still receives its rule.
 * 5. Outside a transaction context the manager passes `Temporal.Now.plainDateISO()`, so "Apply new"
 *    rewrites EXISTING rows dated after today rather than only future imports.
 * 6. Deletion is a soft delete of the RULE: already-written field values survive, later arrivals no
 *    longer receive it, unrelated rules are untouched.
 * 7. Bulk apply reads SAVED rules; an unsaved editor draft has no effect.
 * 8. Per-user apply-mode preferences are keyed by `pubkeyHash`, default to `updateNew`, and are
 *    isolated between users.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { createDescriptionAlias } from "@/lib/crdt/description-aliases";
import {
    createFieldRule,
    deleteFieldRule,
    persistUserAutomationPreference,
    readUserAutomationChoice,
    updateFieldRule
} from "@/lib/crdt/field-rule-mutations";
import {
    applyFieldRulesToAllTransactions,
    applyFieldRulesToNewerTransactions,
    type BulkFieldRuleEntry,
    readActiveFieldRules
} from "@/lib/crdt/field-rules";
import { commitImportBatch, type ImportBatchTransactionInput } from "@/lib/crdt/import-commit";
import { createVaultMirror } from "@/lib/crdt/mirror";
import {
    findTransactionInStore,
    insertTransaction,
    type TransactionLocation
} from "@/lib/crdt/mutations";
import { type TransactionInput, type VaultState } from "@/lib/crdt/schema";
import { DEFAULT_APPLY_MODE } from "@/lib/domain/automation/apply-mode";
import { DEFAULT_REMEMBERED_CHOICE } from "@/lib/domain/automation/preferences";
import { asMinorUnits } from "@/lib/domain/currency";

// ============================================================================
// Fixture
// ============================================================================

const ACCOUNT = "account-1";
const OTHER_ACCOUNT = "account-2";
const DESCRIPTION = "COFFEE SHOP 123";
const OTHER_DESCRIPTION = "OTHER SHOP 999";
const AMOUNT = -450;
const OTHER_AMOUNT = -999;
const CREATION = Temporal.Instant.from("2026-04-01T00:00:00Z");
const TAG = "tag-coffee";

/** The row a transaction-context "Update new" would be invoked from. */
const SELECTED_DATE = Temporal.PlainDate.from("2026-04-10");
const BEFORE = Temporal.PlainDate.from("2026-04-09");
const AFTER = Temporal.PlainDate.from("2026-04-11");

interface SeedRow {
    readonly id: string;
    readonly date: Temporal.PlainDate;
    readonly description: string;
    readonly accountId: string;
    readonly amount: number;
    readonly deleted: boolean;
}

function row(overrides: Partial<SeedRow> & Pick<SeedRow, "id" | "date">): SeedRow {
    return {
        description: DESCRIPTION,
        accountId: ACCOUNT,
        amount: AMOUNT,
        deleted: false,
        ...overrides
    };
}

/**
 * The scope fixture. One matching row before the selected date, TWO on it, one after, plus a
 * non-matching control for each narrowing dimension and a soft-deleted matching row.
 */
const SCOPE_ROWS: readonly SeedRow[] = [
    row({ id: "m-before", date: BEFORE }),
    row({ id: "m-same-a", date: SELECTED_DATE }),
    row({ id: "m-same-b", date: SELECTED_DATE }),
    row({ id: "m-after", date: AFTER }),
    row({ id: "n-text", date: AFTER, description: OTHER_DESCRIPTION }),
    row({ id: "n-account", date: AFTER, accountId: OTHER_ACCOUNT }),
    row({ id: "n-amount", date: AFTER, amount: OTHER_AMOUNT }),
    row({ id: "d-deleted", date: AFTER, deleted: true })
];

/** Rows a strictly-newer application reaches today, given `SELECTED_DATE` as the reference. */
const BASELINE_NEWER_IDS = ["m-after"] as const;

/**
 * Rows the CONFIRMED TARGET population ("matching rows dated on or after the selected row") names.
 *
 * This is the downstream acceptance set for the approved inclusive-date intent. It is stated here as
 * documentation and compared against the measured baseline below; it is deliberately NOT asserted as
 * current behaviour, because MF-003 changes no comparator.
 */
const TARGET_NEWER_IDS = ["m-same-a", "m-same-b", "m-after"] as const;

function locationOf(seed: SeedRow): TransactionLocation {
    return { accountId: seed.accountId, date: seed.date, transactionId: seed.id };
}

function txInput(seed: SeedRow): TransactionInput {
    return {
        id: seed.id,
        date: seed.date,
        description: seed.description,
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(seed.amount),
        originalAmount: undefined,
        accountId: seed.accountId,
        tagIds: [],
        statusId: "status-1",
        // Imported rows: every rule field, including description aliases, is eligible.
        importId: "import-seed",
        allocations: {},
        creationInstant: CREATION,
        importRowIndex: undefined,
        suspectedDuplicates: [],
        deletedAt: seed.deleted ? CREATION : undefined
    };
}

function seedRows(state: VaultState, rows: readonly SeedRow[]): void {
    for (const seed of rows) {
        const inserted = insertTransaction(state.transactions, { transaction: txInput(seed) });
        if (!inserted.ok) throw new Error(`seed failed for ${seed.id}: ${inserted.error.type}`);
    }
}

/**
 * The tags rule under test. Account+amount scoped so `n-account` and `n-amount` are genuine
 * non-matching controls while every `m-*` row matches.
 */
function seedScopedTagRule(state: VaultState): void {
    const result = createFieldRule(state, {
        id: "rule-tags",
        descriptionText: DESCRIPTION,
        accountId: ACCOUNT,
        amount: AMOUNT,
        action: { field: "tags", mode: "add", tagIds: [TAG] },
        createdAtEpochMs: 1000
    });
    if (!result.ok) throw new Error(`rule seed failed: ${result.error.type}`);
}

/** A second, unrelated active rule, used to show bulk application is not scoped to one rule. */
function seedUnrelatedAliasRule(state: VaultState): void {
    const alias = createDescriptionAlias(state, { aliasId: "alias-other", name: "Other Shop" });
    if (!alias.ok) throw new Error("alias seed failed");
    const result = createFieldRule(state, {
        id: "rule-alias",
        descriptionText: OTHER_DESCRIPTION,
        action: { field: "descriptionAlias", aliasId: "alias-other" },
        createdAtEpochMs: 2000
    });
    if (!result.ok) throw new Error(`alias rule seed failed: ${result.error.type}`);
}

function tagsOf(state: VaultState, seed: SeedRow): readonly string[] {
    // A soft-deleted row may resolve or not depending on the lookup; either way "no TAG" is the
    // assertion we need, so an absent row reads as an empty tag set rather than throwing.
    return [...(findTransactionInStore(state.transactions, locationOf(seed))?.tagIds ?? [])];
}

function rowsTaggedBy(state: VaultState, rows: readonly SeedRow[]): readonly string[] {
    return rows.filter((seed) => tagsOf(state, seed).includes(TAG)).map((seed) => seed.id);
}

function entryIds(entries: readonly BulkFieldRuleEntry[]): readonly string[] {
    return entries.map((entry) => entry.location.transactionId);
}

// ============================================================================
// 1 + 2: target population of the two bulk scopes
// ============================================================================

describe("apply-all target population", () => {
    it("mutates every active matching row at any date, and no non-matching or deleted row", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seedRows(state, SCOPE_ROWS);
            seedScopedTagRule(state);
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        const state = vault.mirror.getState();
        expect(rowsTaggedBy(state, SCOPE_ROWS)).toEqual([
            "m-before",
            "m-same-a",
            "m-same-b",
            "m-after"
        ]);
    });

    it("returns an entry for every active row, so entries are not evidence of mutation", () => {
        const vault = createVaultMirror();
        let entries: readonly BulkFieldRuleEntry[] = [];
        vault.mirror.setState((state: VaultState) => {
            seedRows(state, SCOPE_ROWS);
            seedScopedTagRule(state);
        });
        vault.mirror.setState((state: VaultState) => {
            entries = applyFieldRulesToAllTransactions(state);
        });

        // Seven active rows: the soft-deleted one is filtered out of the population entirely.
        expect(entryIds(entries).toSorted()).toEqual(
            [
                "m-before",
                "m-same-a",
                "m-same-b",
                "m-after",
                "n-text",
                "n-account",
                "n-amount"
            ].toSorted()
        );
        expect(entryIds(entries)).not.toContain("d-deleted");

        // The non-matching rows are present as entries but carry no outcome at all.
        const nonMatching = entries.filter((entry) =>
            ["n-account", "n-amount"].includes(entry.location.transactionId)
        );
        expect(nonMatching).toHaveLength(2);
        for (const entry of nonMatching) expect(entry.outcomes).toEqual([]);
    });

    it("evaluates every active rule, not only the rule an editor has open", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seedRows(state, SCOPE_ROWS);
            seedScopedTagRule(state);
            seedUnrelatedAliasRule(state);
        });
        expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(2);

        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        const state = vault.mirror.getState();
        const nText = SCOPE_ROWS.find((seed) => seed.id === "n-text");
        if (nText == null) throw new Error("fixture missing n-text");
        // The unrelated alias rule fired during the same apply-all call.
        expect(
            findTransactionInStore(state.transactions, locationOf(nText))?.descriptionAliasId
        ).toBe("alias-other");
    });
});

describe("apply-new target population is strictly newer today", () => {
    it("excludes rows sharing the selected row's date", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seedRows(state, SCOPE_ROWS);
            seedScopedTagRule(state);
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToNewerTransactions(state, { referenceDate: SELECTED_DATE });
        });

        const state = vault.mirror.getState();
        expect(rowsTaggedBy(state, SCOPE_ROWS)).toEqual([...BASELINE_NEWER_IDS]);
    });

    it("differs from the confirmed inclusive-date target by exactly the same-date rows", () => {
        // Recorded, not fixed. The gap between measured baseline and downstream acceptance is the
        // whole point of this assertion: it fails the day the comparator changes, which is the day
        // the target row set must be re-stated as the baseline.
        const missing = TARGET_NEWER_IDS.filter((id) => !BASELINE_NEWER_IDS.includes(id as never));
        expect(missing).toEqual(["m-same-a", "m-same-b"]);
    });
});

// ============================================================================
// 4 + 5: import arrival vs transaction date, and the context-free reference date
// ============================================================================

describe("import arrival is independent of transaction date and UI apply mode", () => {
    it("applies an existing rule to a backdated newly-arriving row", () => {
        const vault = createVaultMirror();
        const backdated = Temporal.PlainDate.from("2026-01-01");
        vault.mirror.setState((state: VaultState) => {
            seedScopedTagRule(state);
        });

        const arriving: readonly ImportBatchTransactionInput[] = [
            {
                id: "i-backdated",
                date: backdated,
                description: DESCRIPTION,
                amount: asMinorUnits(AMOUNT),
                accountId: ACCOUNT,
                statusId: "status-1",
                importRowIndex: 0,
                duplicateOf: null
            },
            {
                id: "i-control",
                date: backdated,
                description: OTHER_DESCRIPTION,
                amount: asMinorUnits(AMOUNT),
                accountId: ACCOUNT,
                statusId: "status-1",
                importRowIndex: 1,
                duplicateOf: null
            }
        ];

        vault.mirror.setState((state: VaultState) => {
            commitImportBatch(state, {
                importId: "import-backdated",
                fileName: "backdated.csv",
                creationInstant: CREATION,
                transactions: arriving
            });
        });

        const state = vault.mirror.getState();
        // Arrival time, not transaction date, is what makes the row eligible at commit.
        expect(tagsOf(state, row({ id: "i-backdated", date: backdated }))).toContain(TAG);
        expect(
            tagsOf(state, row({ id: "i-control", date: backdated, description: OTHER_DESCRIPTION }))
        ).not.toContain(TAG);
    });
});

describe("context-free apply-new uses today as its reference date", () => {
    it("rewrites EXISTING rows dated after today and spares today and earlier", () => {
        // `FieldRulesManager.handleApplyNew` calls `applyNewerThan(Temporal.Now.plainDateISO())`
        // (src/components/features/automations/FieldRulesManager.tsx). The reference date is derived
        // the same way here so the fixture cannot drift from the wall clock.
        const today = Temporal.Now.plainDateISO();
        const yesterday = today.subtract({ days: 1 });
        const tomorrow = today.add({ days: 1 });

        const rows: readonly SeedRow[] = [
            row({ id: "c-yesterday", date: yesterday }),
            row({ id: "c-today", date: today }),
            row({ id: "c-tomorrow", date: tomorrow })
        ];

        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seedRows(state, rows);
            seedScopedTagRule(state);
        });
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToNewerTransactions(state, { referenceDate: today });
        });

        const state = vault.mirror.getState();
        // `c-tomorrow` is an EXISTING future-dated row, not a future import: outside a transaction
        // context the button still rewrites it. Today's implicit cutoff is recorded, not concealed.
        expect(rowsTaggedBy(state, rows)).toEqual(["c-tomorrow"]);
    });
});

// ============================================================================
// 6 + 7: rule deletion lifecycle and saved-vs-dirty application
// ============================================================================

describe("rule deletion is a soft delete of the rule, not a rollback of its writes", () => {
    it("keeps previously written values, stops future arrivals, and spares unrelated rules", () => {
        const vault = createVaultMirror();
        const earlier = Temporal.PlainDate.from("2026-02-01");

        vault.mirror.setState((state: VaultState) => {
            seedScopedTagRule(state);
            seedUnrelatedAliasRule(state);
            commitImportBatch(state, {
                importId: "import-first",
                fileName: "first.csv",
                creationInstant: CREATION,
                transactions: [
                    {
                        id: "first-row",
                        date: earlier,
                        description: DESCRIPTION,
                        amount: asMinorUnits(AMOUNT),
                        accountId: ACCOUNT,
                        statusId: "status-1",
                        importRowIndex: 0,
                        duplicateOf: null
                    }
                ]
            });
        });
        expect(tagsOf(vault.mirror.getState(), row({ id: "first-row", date: earlier }))).toContain(
            TAG
        );

        vault.mirror.setState((state: VaultState) => {
            const removed = deleteFieldRule(state, { id: "rule-tags", deletedAtEpochMs: 5000 });
            expect(removed.ok).toBe(true);
        });

        vault.mirror.setState((state: VaultState) => {
            commitImportBatch(state, {
                importId: "import-second",
                fileName: "second.csv",
                creationInstant: CREATION,
                transactions: [
                    {
                        id: "second-row",
                        date: earlier,
                        description: DESCRIPTION,
                        amount: asMinorUnits(AMOUNT),
                        accountId: ACCOUNT,
                        statusId: "status-1",
                        importRowIndex: 0,
                        duplicateOf: null
                    },
                    {
                        id: "second-other",
                        date: earlier,
                        description: OTHER_DESCRIPTION,
                        amount: asMinorUnits(AMOUNT),
                        accountId: ACCOUNT,
                        statusId: "status-1",
                        importRowIndex: 1,
                        duplicateOf: null
                    }
                ]
            });
        });

        const state = vault.mirror.getState();
        // The already-applied value survives the rule's deletion — nothing is rolled back.
        expect(tagsOf(state, row({ id: "first-row", date: earlier }))).toContain(TAG);
        // The newly arriving matching row no longer receives the deleted rule.
        expect(tagsOf(state, row({ id: "second-row", date: earlier }))).not.toContain(TAG);
        // The unrelated alias rule is untouched by the deletion.
        expect(
            findTransactionInStore(
                state.transactions,
                locationOf(row({ id: "second-other", date: earlier }))
            )?.descriptionAliasId
        ).toBe("alias-other");
        expect(readActiveFieldRules(state).map((rule) => rule.id)).toEqual(["rule-alias"]);
    });

    it("rejects updating or re-deleting a rule that is missing or already deleted", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seedScopedTagRule(state);
            const first = deleteFieldRule(state, { id: "rule-tags", deletedAtEpochMs: 5000 });
            expect(first.ok).toBe(true);

            const again = deleteFieldRule(state, { id: "rule-tags", deletedAtEpochMs: 6000 });
            expect(again.ok).toBe(false);
            if (!again.ok) expect(again.error.type).toBe("not-found");

            const update = updateFieldRule(state, {
                id: "rule-tags",
                action: { field: "tags", mode: "add", tagIds: ["tag-late"] }
            });
            expect(update.ok).toBe(false);
            if (!update.ok) expect(update.error.type).toBe("not-found");

            const unknown = updateFieldRule(state, {
                id: "rule-never-existed",
                action: { field: "tags", mode: "add", tagIds: ["tag-late"] }
            });
            expect(unknown.ok).toBe(false);
            if (!unknown.ok) expect(unknown.error.type).toBe("not-found");
        });
    });
});

describe("bulk apply uses SAVED rules, never an unsaved editor draft", () => {
    it("applies the persisted action when a draft change was never saved", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            seedRows(state, [row({ id: "m-after", date: AFTER })]);
            seedScopedTagRule(state);
        });

        // The editor's dirty draft: the user picked a different tag but never pressed Save, so no
        // `updateFieldRule` call was made. `applyAll` reads vault state, so the draft cannot reach it.
        const dirtyDraftTagIds = ["tag-unsaved"];

        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        const tags = tagsOf(vault.mirror.getState(), row({ id: "m-after", date: AFTER }));
        expect(tags).toContain(TAG);
        expect(tags).not.toContain(dirtyDraftTagIds[0]);
    });
});

// ============================================================================
// 8: per-user apply-mode preference persistence
// ============================================================================

describe("apply-mode preferences are per-user vault state", () => {
    it("defaults to update-new for an absent record and isolates two users", () => {
        const vault = createVaultMirror();
        expect(readUserAutomationChoice(vault.mirror.getState(), "pubkey-absent")).toEqual(
            DEFAULT_REMEMBERED_CHOICE
        );
        expect(DEFAULT_REMEMBERED_CHOICE.applyMode).toBe(DEFAULT_APPLY_MODE);
        expect(DEFAULT_APPLY_MODE).toBe("updateNew");

        vault.mirror.setState((state: VaultState) => {
            persistUserAutomationPreference(state, {
                pubkeyHash: "pubkey-a",
                choice: { ...DEFAULT_REMEMBERED_CHOICE, applyMode: "updatingAll" }
            });
        });

        const state = vault.mirror.getState();
        expect(readUserAutomationChoice(state, "pubkey-a").applyMode).toBe("updatingAll");
        // A second identity in the same vault keeps the conservative default.
        expect(readUserAutomationChoice(state, "pubkey-b").applyMode).toBe("updateNew");
    });

    it("remembers the most recent successful choice", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            persistUserAutomationPreference(state, {
                pubkeyHash: "pubkey-a",
                choice: { ...DEFAULT_REMEMBERED_CHOICE, applyMode: "updateAll" }
            });
            persistUserAutomationPreference(state, {
                pubkeyHash: "pubkey-a",
                choice: {
                    ...DEFAULT_REMEMBERED_CHOICE,
                    applyMode: "updatingNew",
                    useAccountScope: true
                }
            });
        });

        const choice = readUserAutomationChoice(vault.mirror.getState(), "pubkey-a");
        expect(choice.applyMode).toBe("updatingNew");
        expect(choice.useAccountScope).toBe(true);
    });
});
