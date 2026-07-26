import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { createDescriptionAlias } from "@/lib/crdt/description-aliases";
import {
    applyFieldRulesToAllTransactions,
    applyFieldRulesToImport,
    applyFieldRulesToNewerTransactions,
    AUTOMATION_RULES_MIGRATION_VERSION,
    migrateVaultAutomationsToFieldRules,
    readActiveFieldRules
} from "@/lib/crdt/field-rules";
import { createVaultMirror, createVaultMirrorFromSnapshot } from "@/lib/crdt/mirror";
import {
    findTransactionInStore,
    insertTransaction,
    type TransactionLocation
} from "@/lib/crdt/mutations";
import {
    type AutomationInput,
    type FieldRuleInput,
    type TransactionInput,
    type UserAutomationPreferenceInput,
    type VaultState
} from "@/lib/crdt/schema";
import { exportSnapshot } from "@/lib/crdt/sync";
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
        importId: undefined,
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

/**
 * Seed a legacy automation and reset the migration marker to 0, simulating a genuine pre-migration
 * vault (one whose automations predate the in-code field-rule migration).
 */
function seedLegacyVault(state: VaultState): void {
    const automations: Record<string, AutomationInput> = state.automations;
    automations["auto-1"] = {
        id: "auto-1",
        name: "Coffee",
        conditions: [
            {
                id: "c1",
                column: "description",
                operator: "contains",
                value: DESCRIPTION,
                caseSensitive: false
            }
        ],
        actions: [{ id: "a1", type: "setTags", value: ["coffee"] }],
        order: 0,
        excludedTransactionIds: [],
        deletedAt: undefined
    };
    if (state.preferences != null) state.preferences.automationRulesMigrationVersion = 0;
}

const MIGRATED_TAGS_RULE_ID = "fieldrule:migrated:auto-1:tags";

describe("field-rule root wiring and hydration", () => {
    it("hydrates a new vault with empty field-rule and preference collections", () => {
        const vault = createVaultMirror();
        const state = vault.mirror.getState();
        expect(state.fieldRules).toEqual({});
        expect(state.userAutomationPreferences).toEqual({});
    });

    it("preserves existing data and adds empty collections when hydrating from a snapshot", () => {
        const original = createVaultMirror();
        original.mirror.setState((state: VaultState) => {
            const result = insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-existing" })
            });
            if (!result.ok) throw new Error(`seed failed: ${result.error.type}`);
        });
        const snapshot = exportSnapshot(original.doc);

        const rehydrated = createVaultMirrorFromSnapshot(snapshot);
        const state = rehydrated.mirror.getState();
        expect(findTransactionInStore(state.transactions, locationOf("t-existing"))).toBeDefined();
        expect(state.fieldRules).toEqual({});
        expect(state.userAutomationPreferences).toEqual({});
    });

    it("persists per-user automation preferences", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            const prefs: Record<string, UserAutomationPreferenceInput> =
                state.userAutomationPreferences;
            prefs["pubkey-abc"] = {
                pubkeyHash: "pubkey-abc",
                lastRuleField: "tags",
                lastTagMode: "add",
                lastUseAccountScope: true,
                lastUseAmountScope: false
            };
        });
        const stored = vault.mirror.getState().userAutomationPreferences["pubkey-abc"];
        expect(stored?.lastRuleField).toBe("tags");
        expect(stored?.lastTagMode).toBe("add");
        expect(stored?.lastUseAccountScope).toBe(true);
    });
});

describe("legacy-automation migration at hydration", () => {
    it("derives a field rule from a convertible legacy automation exactly once", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => seedLegacyVault(state));

        let summary: ReturnType<typeof migrateVaultAutomationsToFieldRules> | undefined;
        vault.mirror.setState((state: VaultState) => {
            summary = migrateVaultAutomationsToFieldRules(state);
        });
        expect(summary).toMatchObject({ migrated: 1, ran: true });

        const rules = readActiveFieldRules(vault.mirror.getState());
        expect(rules).toHaveLength(1);
        const [rule] = rules;
        expect(rule?.id).toBe(MIGRATED_TAGS_RULE_ID);
        expect(rule?.descriptionText).toBe(DESCRIPTION);
        expect(rule?.action).toMatchObject({ field: "tags", mode: "set", tagIds: ["coffee"] });

        // Marker prevents re-running.
        let second: ReturnType<typeof migrateVaultAutomationsToFieldRules> | undefined;
        vault.mirror.setState((state: VaultState) => {
            second = migrateVaultAutomationsToFieldRules(state);
        });
        expect(second).toMatchObject({ migrated: 0, ran: false });
    });

    it("runs automatically at hydration and does not resurrect a user-deleted rule", () => {
        const legacy = createVaultMirror();
        legacy.mirror.setState((state: VaultState) => seedLegacyVault(state));
        const snapshot = exportSnapshot(legacy.doc);

        // Hydration migrates the legacy automation.
        const hydrated = createVaultMirrorFromSnapshot(snapshot);
        expect(hydrated.mirror.getState().fieldRules[MIGRATED_TAGS_RULE_ID]).toBeDefined();
        expect(hydrated.mirror.getState().preferences.automationRulesMigrationVersion).toBe(
            AUTOMATION_RULES_MIGRATION_VERSION
        );

        // User hard-deletes the migrated rule, then the vault is snapshotted and reopened.
        hydrated.mirror.setState((state: VaultState) => {
            delete state.fieldRules[MIGRATED_TAGS_RULE_ID];
        });
        const afterDelete = exportSnapshot(hydrated.doc);
        const reopened = createVaultMirrorFromSnapshot(afterDelete);
        expect(reopened.mirror.getState().fieldRules[MIGRATED_TAGS_RULE_ID]).toBeUndefined();
    });
});

describe("field-rule application at import and bulk operations", () => {
    it("applies the highest-precedence tag rule to imported transactions", () => {
        const vault = createVaultMirror();
        let entries: ReturnType<typeof applyFieldRulesToImport> = [];
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-imp", importId: "import-1" })
            });
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
            entries = applyFieldRulesToImport(state, { importId: "import-1" });
        });

        expect(entries).toHaveLength(1);
        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-imp")
        );
        expect([...(applied?.tagIds ?? [])]).toEqual(["specific"]);
    });

    it("routes allocation rules exclusively through P16C complete-set replacement", () => {
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
            applyFieldRulesToImport(state, { importId: "import-1" });
        });

        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-alloc")
        );
        const explicit: Record<string, number> = {};
        for (const [personId, value] of Object.entries(applied?.allocations ?? {})) {
            if (personId !== "$cid" && typeof value === "number") explicit[personId] = value;
        }
        // person-b removed (absent from the complete set), person-a replaced by P16C.
        expect(explicit).toEqual({ "person-a": 100 });
    });

    it("writes description-alias rules through the P11 alias boundary", () => {
        const vault = createVaultMirror();
        let outcomes: readonly string[] = [];
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-alias", importId: "import-1" })
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
            const entries = applyFieldRulesToImport(state, { importId: "import-1" });
            outcomes = entries.flatMap((entry) => entry.outcomes.map((outcome) => outcome.status));
        });

        expect(outcomes).toContain("applied");
        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-alias")
        );
        expect(applied?.descriptionAliasId).toBe("alias-coffee");
        const alias = vault.mirror.getState().descriptionAliases["alias-coffee"];
        expect(typeof alias === "object" ? alias?.transactionIds["t-alias"] : undefined).toBe(true);
    });

    it("excludes manual transactions from description-alias rules but not tag rules", () => {
        const vault = createVaultMirror();
        const manualLocation = locationOf("t-manual");
        let fields: readonly string[] = [];
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                // Manual: no importId; a non-empty description exercises the isManual gate precisely.
                transaction: txInput({ id: "t-manual", description: DESCRIPTION })
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
                    tagIds: ["coffee"]
                })
            );
            const entries = applyFieldRulesToAllTransactions(state);
            const manualEntry = entries.find(
                (entry) => entry.location.transactionId === "t-manual"
            );
            fields = manualEntry?.outcomes.map((outcome) => outcome.field) ?? [];
        });

        expect(fields).toContain("tags");
        expect(fields).not.toContain("descriptionAlias");
        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            manualLocation
        );
        expect([...(applied?.tagIds ?? [])]).toEqual(["coffee"]);
        // The alias rule never touched the manual row.
        expect(applied?.descriptionAliasId).toBeUndefined();
    });

    it("excludes rules with an invalid complete allocation set (rejected at decode, no mutation)", () => {
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
                    // 150 is out of range; the rule must be rejected, never clamped/normalised.
                    allocations: { "person-a": asPercentage(150) }
                })
            );
            expect(readActiveFieldRules(state)).toHaveLength(0);
            applyFieldRulesToImport(state, { importId: "import-1" });
        });

        const applied = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-invalid")
        );
        const explicit: Record<string, number> = {};
        for (const [personId, value] of Object.entries(applied?.allocations ?? {})) {
            if (personId !== "$cid" && typeof value === "number") explicit[personId] = value;
        }
        expect(explicit).toEqual({ "person-a": 100 });
    });

    it("applies to all transactions and, separately, only to strictly newer ones", () => {
        const older = DATE;
        const newer = DATE.add({ days: 1 });
        const vault = createVaultMirror();

        let newerEntries: ReturnType<typeof applyFieldRulesToNewerTransactions> = [];
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-older", date: older, importId: "import-1" })
            });
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-newer", date: newer, importId: "import-1" })
            });
            putFieldRule(
                state,
                ruleInput({
                    id: "r-tags",
                    field: "tags",
                    descriptionText: DESCRIPTION,
                    tagMode: "add",
                    tagIds: ["seen"]
                })
            );
            newerEntries = applyFieldRulesToNewerTransactions(state, { referenceDate: older });
        });

        // Only the strictly-newer transaction was included.
        expect(newerEntries).toHaveLength(1);
        expect([
            ...(findTransactionInStore(
                vault.mirror.getState().transactions,
                locationOf("t-newer", newer)
            )?.tagIds ?? [])
        ]).toEqual(["seen"]);
        expect([
            ...(findTransactionInStore(vault.mirror.getState().transactions, locationOf("t-older"))
                ?.tagIds ?? [])
        ]).toEqual([]);

        // Apply-to-all now reaches both.
        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });
        expect([
            ...(findTransactionInStore(vault.mirror.getState().transactions, locationOf("t-older"))
                ?.tagIds ?? [])
        ]).toEqual(["seen"]);
    });
});
