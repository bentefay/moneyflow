import { LoroMap } from "loro-crdt";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

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
    persistUserAutomationPreference,
    readUserAutomationChoice,
    updateFieldRule
} from "@/lib/crdt/field-rule-mutations";
import { readActiveFieldRules } from "@/lib/crdt/field-rules";
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
import { type TransactionInput, type VaultState } from "@/lib/crdt/schema";
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

    describe("apply-new is scoped strictly to transactions after the reference date", () => {
        // Mirrors the P17C transaction-context "apply to new imports" affordance, where the
        // reference date is THAT row's date: only strictly-later transactions are updated, while the
        // row itself and same-day siblings are left untouched.
        const EARLIER = DATE.subtract({ days: 1 });
        const LATER = DATE.add({ days: 1 });

        it("applies to strictly-later transactions but not the reference date or earlier", () => {
            const vault = createVaultMirror();
            vault.mirror.setState((state: VaultState) => {
                for (const seed of [
                    txInput({ id: "t-earlier", date: EARLIER }),
                    txInput({ id: "t-reference", date: DATE }),
                    txInput({ id: "t-later", date: LATER })
                ]) {
                    const inserted = insertTransaction(state.transactions, { transaction: seed });
                    if (!inserted.ok) throw new Error("seed failed");
                }
                createFieldRule(state, {
                    id: "rule-1",
                    descriptionText: DESCRIPTION,
                    action: { field: "tags", mode: "add", tagIds: ["tag-coffee"] },
                    createdAtEpochMs: 1000
                });
            });
            vault.mirror.setState((state: VaultState) => {
                const entries = applyFieldRulesToNewerTransactions(state, { referenceDate: DATE });
                expect(entries.length).toBe(1);
            });

            const store = vault.mirror.getState().transactions;
            const later = findTransactionInStore(store, locationOf("t-later", LATER));
            const reference = findTransactionInStore(store, locationOf("t-reference", DATE));
            const earlier = findTransactionInStore(store, locationOf("t-earlier", EARLIER));
            expect(later?.tagIds).toContain("tag-coffee");
            expect(reference?.tagIds ?? []).not.toContain("tag-coffee");
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
                    action: { field: "tags", mode: "add", tagIds: ["tag-groceries"] },
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
                    action: { field: "allocation", allocations: { "person-1": 100 } },
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
                    action: { field: "descriptionAlias", aliasId: "alias-other" },
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
                    action: { field: "tags", mode: "add", tagIds: ["tag-groceries"] },
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
