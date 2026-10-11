/**
 * Executable BASELINE characterization for the MF-002 grouped-rule ownership contract
 * (`specs/automation-rule-ownership.md`).
 *
 * Everything here exercises PRODUCTION APIs against a real vault mirror — `computeFieldRuleProposal`,
 * `createFieldRule` / `updateFieldRule` / `deleteFieldRule`, `readActiveFieldRules`,
 * `applyFieldRulesToAllTransactions` and `applyFieldRulesToSingleTransaction`. There is no test-only
 * grouping selector and no simulated engine: every assertion below states what the shipped code does
 * TODAY, so the contract's "measured baseline" column has provenance and any future grouped-edit
 * implementation has a tripwire.
 *
 * Grouped rules are now shipped at the domain and CRDT layer: a rule carries one to three outputs,
 * `resolveRuleExtensionTarget` implements the §5.3 selection ladder, and `setFieldRuleOutput`
 * extends a rule without disturbing its other outputs. Where a test below pinned single-field
 * behaviour that grouping deliberately changes (EX-03, the wholesale-update case), it now asserts
 * the grouped behaviour. The inspector's per-field proposal (`computeFieldRuleProposal`) is not yet
 * routed through the ladder, so its assertions still describe the per-field owner it reports.
 *
 * Example ids (`EX-*`) and decision ids (`D-*`) in the test names are the spec's; keep them in sync.
 */

import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { computeFieldRuleProposal } from "@/components/features/transactions/field-rule-proposal-state";
import { type RobotCurrentValue } from "@/components/features/transactions/field-rule-robot-state";
import { applyFieldRulesToSingleTransaction } from "@/lib/crdt/apply-field-rule-to-transaction";
import {
    createDescriptionAlias,
    insertManualDescriptionAliasedTransaction
} from "@/lib/crdt/description-aliases";
import {
    createFieldRule,
    deleteFieldRule,
    setFieldRuleOutput,
    updateFieldRule
} from "@/lib/crdt/field-rule-mutations";
import { applyFieldRulesToAllTransactions, readActiveFieldRules } from "@/lib/crdt/field-rules";
import { createVaultMirror } from "@/lib/crdt/mirror";
import {
    findTransactionInStore,
    insertTransaction,
    type TransactionLocation
} from "@/lib/crdt/mutations";
import { type FieldRuleInput, type TransactionInput, type VaultState } from "@/lib/crdt/schema";
import { resolveRuleExtensionTarget } from "@/lib/domain/automation/extension";
import { type FieldRule, type RuleMatchSubject } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";
import { asPercentage } from "@/types";

// ============================================================================
// Fixture facts (identical to the spec's worked examples)
// ============================================================================

const ACCOUNT_A = "account-a";
const ACCOUNT_B = "account-b";
const DATE = Temporal.PlainDate.from("2026-07-25");
const CREATION = Temporal.Instant.from("2026-07-25T00:00:00Z");
const DESCRIPTION = "COFFEE SHOP 123";
const OTHER_DESCRIPTION = "BOOKSTORE 99";
const AMOUNT_450 = -450;
const AMOUNT_600 = -600;

function locationOf(
    transactionId: string,
    accountId: string = ACCOUNT_A,
    date: Temporal.PlainDate = DATE
): TransactionLocation {
    return { accountId, date, transactionId };
}

function txInput(overrides: Partial<TransactionInput> & { readonly id: string }): TransactionInput {
    return {
        date: DATE,
        description: DESCRIPTION,
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(AMOUNT_450),
        originalAmount: undefined,
        accountId: ACCOUNT_A,
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

/** The imported subject every example keys on unless it says otherwise. */
const IMPORTED_SUBJECT: RuleMatchSubject = {
    descriptionText: DESCRIPTION,
    accountId: ACCOUNT_A,
    amount: asMinorUnits(AMOUNT_450),
    isManual: false
};

const TAGS_EDIT: RobotCurrentValue = { field: "tags", currentTagIds: ["tag-coffee"] };
const ALIAS_EDIT: RobotCurrentValue = {
    field: "descriptionAlias",
    currentAliasId: "alias-coffee"
};
const ALLOCATION_EDIT: RobotCurrentValue = {
    field: "allocation",
    currentAllocations: { "person-1": 100 }
};

function ruleById(rules: readonly FieldRule[], id: string): FieldRule {
    const found = rules.find((rule) => rule.id === id);
    if (found == null) throw new Error(`rule ${id} is not active`);
    return found;
}

/**
 * Write a raw wire record straight into `state.fieldRules`, bypassing `createFieldRule`'s decode
 * gate. This is the only way to reach EX-17's stored-but-undecodable record: the mutation API
 * refuses to create one, yet a record written by an older schema version, a corrupted document or a
 * concurrent peer can still be present at read time. Same shape as the fixture helper in
 * `tests/integration/field-rules-crdt.test.ts`.
 */
function putRawFieldRule(state: VaultState, input: FieldRuleInput): void {
    const draft: Record<string, FieldRuleInput> = state.fieldRules;
    draft[input.id] = input;
}

// ============================================================================
// Step 1 — baseline: what a field edit proposes today
// ============================================================================

describe("MF-002 baseline: the extension target a field edit proposes", () => {
    // EX-01 — no matching rule. The edit proposes CREATION, and nothing in the vault is touched
    // until the user confirms.
    it("EX-01: an imported tag edit with no rules at all proposes a create", () => {
        const vault = createVaultMirror();
        const proposal = computeFieldRuleProposal(
            readActiveFieldRules(vault.mirror.getState()),
            IMPORTED_SUBJECT,
            TAGS_EDIT
        );
        expect(proposal.kind).toBe("create");
        if (proposal.kind === "create") {
            expect(proposal.field).toBe("tags");
            expect(proposal.descriptionText).toBe(DESCRIPTION);
        }
    });

    // EX-02 — exactly one constrained rule of the edited field. The proposal targets THAT rule id,
    // not a new one: the extension target is the winner of the edited field, never a rule chosen by
    // recency or listing order.
    it("EX-02: a matching account-scoped tags rule makes the edit an update of that id", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            const created = createFieldRule(state, {
                id: "r-tags-account",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_A,
                outputs: { tags: { mode: "add", tagIds: ["tag-old"] } },
                createdAtEpochMs: 1000
            });
            expect(created.ok).toBe(true);
        });

        const proposal = computeFieldRuleProposal(
            readActiveFieldRules(vault.mirror.getState()),
            IMPORTED_SUBJECT,
            TAGS_EDIT
        );
        expect(proposal.kind).toBe("update");
        if (proposal.kind === "update") {
            expect(proposal.rule.id).toBe("r-tags-account");
            expect(proposal.field).toBe("tags");
        }
    });

    // EX-03 — an alias rule already owns this description text, and the user edits TAGS. Under
    // grouped rules the alias rule IS the extension target when the edit's predicate is identical
    // (D-001 + D-004): the tags join it rather than creating a second rule. The per-field proposal
    // only reports that tags have no owner yet; which rule the write lands on is the ladder's call.
    it("EX-03: an alias-only rule plus an unscoped tag edit extends the alias rule", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "alias-coffee", name: "Coffee" });
            const created = createFieldRule(state, {
                id: "r-alias",
                descriptionText: DESCRIPTION,
                outputs: { descriptionAlias: { aliasId: "alias-coffee" } },
                createdAtEpochMs: 1000
            });
            expect(created.ok).toBe(true);
        });

        const rules = readActiveFieldRules(vault.mirror.getState());
        const proposal = computeFieldRuleProposal(rules, IMPORTED_SUBJECT, TAGS_EDIT);
        expect(proposal.kind).toBe("create");

        const unscoped = resolveRuleExtensionTarget({
            rules,
            subject: IMPORTED_SUBJECT,
            field: "tags",
            predicate: { descriptionText: DESCRIPTION }
        });
        expect(unscoped.kind).toBe("extend");
        if (unscoped.kind === "extend") expect(unscoped.rule.id).toBe("r-alias");

        // A narrower draft would change the tag's population by folding, so it creates instead.
        const narrowed = resolveRuleExtensionTarget({
            rules,
            subject: IMPORTED_SUBJECT,
            field: "tags",
            predicate: {
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_A,
                amount: asMinorUnits(AMOUNT_450)
            }
        });
        expect(narrowed).toEqual({ kind: "create" });

        // Extending it keeps the alias output and adds the tags beside it.
        vault.mirror.setState((state: VaultState) => {
            const extended = setFieldRuleOutput(state, {
                id: "r-alias",
                field: "tags",
                output: { mode: "add", tagIds: ["tag-coffee"] }
            });
            expect(extended.ok).toBe(true);
        });
        expect(ruleById(readActiveFieldRules(vault.mirror.getState()), "r-alias").outputs).toEqual({
            descriptionAlias: { aliasId: "alias-coffee" },
            tags: { mode: "add", tagIds: ["tag-coffee"] }
        });
    });

    // EX-04 — multiple applicable rules of the SAME field. The scope lattice decides, so the more
    // specific account+amount rule is the extension target even though the unscoped rule is newer.
    it("EX-04: with several applicable tags rules the most specific scope is the target", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createFieldRule(state, {
                id: "r-tags-unscoped",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-broad"] } },
                createdAtEpochMs: 9000
            });
            createFieldRule(state, {
                id: "r-tags-amount",
                descriptionText: DESCRIPTION,
                amount: AMOUNT_450,
                outputs: { tags: { mode: "add", tagIds: ["tag-amount"] } },
                createdAtEpochMs: 2000
            });
            createFieldRule(state, {
                id: "r-tags-both",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_A,
                amount: AMOUNT_450,
                outputs: { tags: { mode: "add", tagIds: ["tag-both"] } },
                createdAtEpochMs: 1000
            });
        });

        const proposal = computeFieldRuleProposal(
            readActiveFieldRules(vault.mirror.getState()),
            IMPORTED_SUBJECT,
            TAGS_EDIT
        );
        expect(proposal.kind).toBe("update");
        if (proposal.kind === "update") expect(proposal.rule.id).toBe("r-tags-both");
    });

    // EX-05 — a zero amount is a real constraint, not an absent one. `amount: 0` is falsy, so this
    // guards the `== null` checks in `ruleMatchesSubject` / `ruleScopeRank`.
    it("EX-05: a zero-amount scoped rule is a genuine constraint and still wins on rank", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createFieldRule(state, {
                id: "r-tags-unscoped",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-broad"] } },
                createdAtEpochMs: 9000
            });
            createFieldRule(state, {
                id: "r-tags-zero",
                descriptionText: DESCRIPTION,
                amount: 0,
                outputs: { tags: { mode: "add", tagIds: ["tag-zero"] } },
                createdAtEpochMs: 1000
            });
        });
        const rules = readActiveFieldRules(vault.mirror.getState());

        const zeroSubject: RuleMatchSubject = { ...IMPORTED_SUBJECT, amount: asMinorUnits(0) };
        const zeroProposal = computeFieldRuleProposal(rules, zeroSubject, TAGS_EDIT);
        expect(zeroProposal.kind === "update" && zeroProposal.rule.id).toBe("r-tags-zero");

        // A different amount falls back to the unscoped rule rather than the zero-amount one.
        const otherProposal = computeFieldRuleProposal(rules, IMPORTED_SUBJECT, TAGS_EDIT);
        expect(otherProposal.kind === "update" && otherProposal.rule.id).toBe("r-tags-unscoped");
    });

    // EX-06 — controls. A rule for a different description text is not a candidate at all, so the
    // edit proposes a create; "visible similarity" never authorizes reuse.
    it("EX-06: a rule for another description text is not an extension candidate", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createFieldRule(state, {
                id: "r-other-text",
                descriptionText: OTHER_DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-books"] } },
                createdAtEpochMs: 1000
            });
        });

        const proposal = computeFieldRuleProposal(
            readActiveFieldRules(vault.mirror.getState()),
            IMPORTED_SUBJECT,
            TAGS_EDIT
        );
        expect(proposal.kind).toBe("create");
    });

    // EX-07 — cleared values produce no proposal at all, on every field.
    it.each([
        { label: "tags", current: { field: "tags", currentTagIds: [] } as RobotCurrentValue },
        {
            label: "descriptionAlias",
            current: { field: "descriptionAlias", currentAliasId: null } as RobotCurrentValue
        },
        {
            label: "allocation",
            current: { field: "allocation", currentAllocations: {} } as RobotCurrentValue
        }
    ])("EX-07: clearing $label proposes nothing", ({ current }) => {
        expect(computeFieldRuleProposal([], IMPORTED_SUBJECT, current).kind).toBe("none");
    });

    // EX-08 — manual eligibility. A manual row is eligible for tags/allocation and never for the
    // description alias; a manual row with no alias exposes no matchable text at all.
    it("EX-08: manual rows are tag/allocation eligible and alias ineligible", () => {
        const manual: RuleMatchSubject = { ...IMPORTED_SUBJECT, isManual: true };
        expect(computeFieldRuleProposal([], manual, TAGS_EDIT).kind).toBe("create");
        expect(computeFieldRuleProposal([], manual, ALLOCATION_EDIT).kind).toBe("create");
        expect(computeFieldRuleProposal([], manual, ALIAS_EDIT).kind).toBe("none");

        const textless: RuleMatchSubject = { ...manual, descriptionText: null };
        expect(computeFieldRuleProposal([], textless, TAGS_EDIT).kind).toBe("none");
    });
});

// ============================================================================
// Step 1 — baseline: explicit update inputs and what they leave alone
// ============================================================================

describe("MF-002 baseline: an explicit update writes exactly what it was given", () => {
    // The UI seeds its draft from the transaction and the remembered preference, NOT necessarily
    // from the target rule's existing scope (`use-field-rule-proposal.ts` → `draftFromProposal`).
    // The MUTATION, in contrast, is faithful: whatever scope/action it is handed is what lands. This
    // test pins the mutation contract; the seeding difference is documented, not asserted here.
    it("preserves id, description text and creation time while writing the requested scope", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createFieldRule(state, {
                id: "r-tags",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-old"] } },
                createdAtEpochMs: 1000
            });
        });

        vault.mirror.setState((state: VaultState) => {
            const updated = updateFieldRule(state, {
                id: "r-tags",
                accountId: ACCOUNT_A,
                amount: AMOUNT_450,
                outputs: { tags: { mode: "set", tagIds: ["tag-new"] } }
            });
            expect(updated.ok).toBe(true);
        });

        const rule = ruleById(readActiveFieldRules(vault.mirror.getState()), "r-tags");
        expect(rule.descriptionText).toBe(DESCRIPTION);
        expect(rule.createdAt.epochMilliseconds).toBe(1000);
        expect(rule.accountId).toBe(ACCOUNT_A);
        expect(rule.amount).toBe(AMOUNT_450);
        expect(rule.outputs).toEqual({ tags: { mode: "set", tagIds: ["tag-new"] } });
    });

    // No unrelated silent merge: updating one owner leaves every other rule's id, scope and outputs
    // byte-identical, including rules of a different field on the SAME description text.
    it("leaves every unrelated rule's id, scope and outputs intact", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "alias-coffee", name: "Coffee" });
            createFieldRule(state, {
                id: "r-tags",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-old"] } },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "r-alias",
                descriptionText: DESCRIPTION,
                outputs: { descriptionAlias: { aliasId: "alias-coffee" } },
                createdAtEpochMs: 1100
            });
            createFieldRule(state, {
                id: "r-alloc",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_B,
                outputs: { allocation: { allocations: { "person-2": 100 } } },
                createdAtEpochMs: 1200
            });
            createFieldRule(state, {
                id: "r-other-text",
                descriptionText: OTHER_DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-books"] } },
                createdAtEpochMs: 1300
            });
        });

        vault.mirror.setState((state: VaultState) => {
            updateFieldRule(state, {
                id: "r-tags",
                outputs: { tags: { mode: "add", tagIds: ["tag-coffee"] } }
            });
        });

        const rules = readActiveFieldRules(vault.mirror.getState());
        expect(rules.map((rule) => rule.id).sort()).toEqual([
            "r-alias",
            "r-alloc",
            "r-other-text",
            "r-tags"
        ]);
        expect(ruleById(rules, "r-alias").outputs).toEqual({
            descriptionAlias: { aliasId: "alias-coffee" }
        });
        expect(ruleById(rules, "r-alloc").accountId).toBe(ACCOUNT_B);
        expect(ruleById(rules, "r-alloc").outputs).toEqual({
            allocation: { allocations: { "person-2": 100 } }
        });
        expect(ruleById(rules, "r-other-text").outputs).toEqual({
            tags: { mode: "add", tagIds: ["tag-books"] }
        });
    });

    // D-002's new capacity: `updateFieldRule` still writes exactly the outputs it is given, so an
    // output it does not list is removed. Adding or changing ONE output while keeping the others is
    // `setFieldRuleOutput`, the grouped write path.
    it("updateFieldRule replaces outputs wholesale while setFieldRuleOutput preserves the others", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "alias-coffee", name: "Coffee" });
            createFieldRule(state, {
                id: "r-tags",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-old"] } },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "r-grouped",
                descriptionText: OTHER_DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-books"] } },
                createdAtEpochMs: 1100
            });
        });

        vault.mirror.setState((state: VaultState) => {
            const updated = updateFieldRule(state, {
                id: "r-tags",
                outputs: { descriptionAlias: { aliasId: "alias-coffee" } }
            });
            expect(updated.ok).toBe(true);
            const extended = setFieldRuleOutput(state, {
                id: "r-grouped",
                field: "descriptionAlias",
                output: { aliasId: "alias-coffee" }
            });
            expect(extended.ok).toBe(true);
        });

        const rules = readActiveFieldRules(vault.mirror.getState());
        // The former tag output is GONE — a wholesale update is a replacement, never an
        // accumulation.
        expect(ruleById(rules, "r-tags").outputs).toEqual({
            descriptionAlias: { aliasId: "alias-coffee" }
        });
        expect(JSON.stringify(ruleById(rules, "r-tags").outputs)).not.toContain("tag-old");
        // The grouped write keeps the tags and adds the alias beside them.
        expect(ruleById(rules, "r-grouped").outputs).toEqual({
            descriptionAlias: { aliasId: "alias-coffee" },
            tags: { mode: "add", tagIds: ["tag-books"] }
        });
    });
});

// ============================================================================
// Step 1 — baseline: reads, soft deletion and invalid definitions
// ============================================================================

describe("MF-002 baseline: which rules a reader exposes as candidates", () => {
    it("excludes soft-deleted rules, so deletion frees the uniqueness slot", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createFieldRule(state, {
                id: "r-tags",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-old"] } },
                createdAtEpochMs: 1000
            });
        });
        vault.mirror.setState((state: VaultState) => {
            const deleted = deleteFieldRule(state, { id: "r-tags", deletedAtEpochMs: 2000 });
            expect(deleted.ok).toBe(true);
        });

        const rules = readActiveFieldRules(vault.mirror.getState());
        expect(rules).toHaveLength(0);
        // With no active candidate the very same edit now proposes a CREATE rather than an update.
        expect(computeFieldRuleProposal(rules, IMPORTED_SUBJECT, TAGS_EDIT).kind).toBe("create");
    });

    it("rejects an invalid allocation set at the write boundary with zero mutation", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            const created = createFieldRule(state, {
                id: "r-bad-alloc",
                descriptionText: DESCRIPTION,
                outputs: { allocation: { allocations: { "person-1": 900 } } },
                createdAtEpochMs: 1000
            });
            expect(created.ok).toBe(false);
            if (!created.ok) expect(created.error.type).toBe("invalid-allocations");
        });
        expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(0);
    });

    // EX-17 — the one measured exception to "a failed mutation writes nothing". `deleteFieldRule`
    // stamps `deletedAtEpochMs` BEFORE it inspects the decode result, so deleting a stored record
    // that no longer decodes mutates the vault and still reports `not-found`. The no-write property
    // measured for `createFieldRule` and `updateFieldRule` must not be generalised to every failed
    // mutation. See `deleteFieldRule` in `src/lib/crdt/field-rule-mutations.ts`.
    it("EX-17: deleting an undecodable record stamps the deletion and still reports not-found", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            putRawFieldRule(state, {
                id: "r-undecodable",
                field: "allocation",
                descriptionText: DESCRIPTION,
                accountId: undefined,
                amount: undefined,
                aliasId: undefined,
                tagMode: undefined,
                tagIds: [],
                // Out of range, so `decodeFieldRule` refuses this record at read time.
                allocations: { "person-1": asPercentage(150) },
                createdAtEpochMs: 1000,
                deletedAtEpochMs: undefined,
                outputFields: []
            });
        });
        // The reader already ignores it — it is stored, but it is not a candidate.
        expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(0);

        vault.mirror.setState((state: VaultState) => {
            const deleted = deleteFieldRule(state, {
                id: "r-undecodable",
                deletedAtEpochMs: 2000
            });
            expect(deleted.ok).toBe(false);
            if (!deleted.ok) expect(deleted.error.type).toBe("not-found");
        });

        // ...and yet the record WAS mutated: the failed delete stamped the tombstone.
        const stored = vault.mirror.getState().fieldRules["r-undecodable"];
        expect(stored).toBeDefined();
        expect(stored?.deletedAtEpochMs).toBe(2000);
    });
});

// ============================================================================
// Step 1 — baseline: application follows per-field winners, not an edit target
// ============================================================================

describe("MF-002 baseline: application selects a winner per field independently", () => {
    // EX-09 — previously SPLIT fields. Three rules of three fields, three different scopes, all
    // matching one row. Application resolves each field on its own lattice; there is no single
    // "owner" of the transaction.
    it("EX-09: split alias/tags/allocation owners all apply to the same row", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, { transaction: txInput({ id: "t-1" }) });
            createDescriptionAlias(state, { aliasId: "alias-coffee", name: "Coffee" });
            createFieldRule(state, {
                id: "r-alias-unscoped",
                descriptionText: DESCRIPTION,
                outputs: { descriptionAlias: { aliasId: "alias-coffee" } },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "r-tags-account",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_A,
                outputs: { tags: { mode: "add", tagIds: ["tag-coffee"] } },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "r-alloc-amount",
                descriptionText: DESCRIPTION,
                amount: AMOUNT_450,
                outputs: { allocation: { allocations: { "person-1": 100 } } },
                createdAtEpochMs: 1000
            });
        });

        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        const transaction = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-1")
        );
        expect(transaction?.descriptionAliasId).toBe("alias-coffee");
        expect(transaction?.tagIds).toContain("tag-coffee");
        expect(
            Object.entries(transaction?.allocations ?? {}).filter(([id]) => id !== "$cid")
        ).toEqual([["person-1", 100]]);
    });

    // EX-10 — the edit target is NOT the applier. A user editing tags on account A targets the
    // account-A tags rule, while a row on account B keeps taking its tags from the unscoped rule.
    // Grouping an edit onto one rule must not be read as "this rule now drives these rows".
    it("EX-10: the row a user edited and a sibling row can take different winners", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, { transaction: txInput({ id: "t-a" }) });
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-b", accountId: ACCOUNT_B })
            });
            createFieldRule(state, {
                id: "r-tags-unscoped",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-broad"] } },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "r-tags-account-a",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_A,
                outputs: { tags: { mode: "add", tagIds: ["tag-account-a"] } },
                createdAtEpochMs: 1000
            });
        });

        // The edit on the account-A row targets the account-A rule.
        const proposal = computeFieldRuleProposal(
            readActiveFieldRules(vault.mirror.getState()),
            IMPORTED_SUBJECT,
            TAGS_EDIT
        );
        expect(proposal.kind === "update" && proposal.rule.id).toBe("r-tags-account-a");

        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        const store = vault.mirror.getState().transactions;
        expect(findTransactionInStore(store, locationOf("t-a"))?.tagIds).toEqual(["tag-account-a"]);
        expect(findTransactionInStore(store, locationOf("t-b", ACCOUNT_B))?.tagIds).toEqual([
            "tag-broad"
        ]);
    });

    // EX-11 — "set" clears, "add" unions. Tag COMPATIBILITY is a question about the rule's mode and
    // tag set, never about the set one row happens to end up with.
    it("EX-11: tag mode decides the result, so equal row outcomes need not mean equal rules", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-add", tagIds: ["tag-manual"] })
            });
            insertTransaction(state.transactions, {
                transaction: txInput({
                    id: "t-set",
                    accountId: ACCOUNT_B,
                    tagIds: ["tag-manual"]
                })
            });
            createFieldRule(state, {
                id: "r-add",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_A,
                outputs: { tags: { mode: "add", tagIds: ["tag-coffee"] } },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "r-set",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_B,
                outputs: { tags: { mode: "set", tagIds: ["tag-coffee"] } },
                createdAtEpochMs: 1000
            });
        });

        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        const store = vault.mirror.getState().transactions;
        expect(findTransactionInStore(store, locationOf("t-add"))?.tagIds).toEqual([
            "tag-manual",
            "tag-coffee"
        ]);
        expect(findTransactionInStore(store, locationOf("t-set", ACCOUNT_B))?.tagIds).toEqual([
            "tag-coffee"
        ]);
    });

    // EX-12 — a manual row with a resolved alias name matches tag rules; the raw description is
    // never rewritten, and the alias id it carries is transaction data, not a rule link.
    it("EX-12: a manual row matches on its resolved alias name without gaining a rule link", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            const seeded = insertManualDescriptionAliasedTransaction(state, {
                transaction: {
                    id: "m-1",
                    date: DATE,
                    notes: "",
                    amount: asMinorUnits(AMOUNT_600),
                    accountId: ACCOUNT_A,
                    tagIds: [],
                    statusId: "status-1",
                    allocations: {},
                    creationInstant: CREATION,
                    importRowIndex: undefined,
                    suspectedDuplicates: [],
                    deletedAt: undefined
                },
                newAliasId: "alias-manual",
                name: DESCRIPTION
            });
            if (!seeded.ok) throw new Error(`manual seed failed: ${seeded.error.code}`);
            createFieldRule(state, {
                id: "r-tags-unscoped",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-coffee"] } },
                createdAtEpochMs: 1000
            });
        });

        vault.mirror.setState((state: VaultState) => {
            const applied = applyFieldRulesToSingleTransaction(state, { transactionId: "m-1" });
            expect(applied.ok).toBe(true);
        });

        const manual = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("m-1")
        );
        expect(manual?.tagIds).toContain("tag-coffee");
        expect(manual?.description ?? "").toBe("");
        // The row records the alias it uses and nothing about the rule that tagged it.
        expect(manual?.descriptionAliasId).toBe("alias-manual");
        expect(JSON.stringify(manual)).not.toContain("r-tags-unscoped");
    });
});

// ============================================================================
// Step 2 — baseline: a rejected write leaves BOTH rules exactly as they were
// ============================================================================

describe("MF-002 baseline: a colliding update is refused with nothing mutated", () => {
    // EX-13 — the destination uniqueness slot is already occupied. The update is refused with
    // `duplicate-key` naming the occupant, and NEITHER rule changes. A grouped design that moves an
    // output into an occupied slot inherits exactly this rejection; it does not get a merge.
    it("EX-13: widening a scope onto an occupied slot returns duplicate-key and writes nothing", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createFieldRule(state, {
                id: "r-unscoped",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-broad"] } },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "r-account",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_A,
                outputs: { tags: { mode: "add", tagIds: ["tag-account"] } },
                createdAtEpochMs: 2000
            });
        });

        vault.mirror.setState((state: VaultState) => {
            // Dropping the account narrowing would land `r-account` on `r-unscoped`'s slot.
            const collided = updateFieldRule(state, {
                id: "r-account",
                outputs: { tags: { mode: "set", tagIds: ["tag-moved"] } }
            });
            expect(collided.ok).toBe(false);
            if (!collided.ok) {
                expect(collided.error.type).toBe("duplicate-key");
                if (collided.error.type === "duplicate-key") {
                    expect(collided.error.existingRuleId).toBe("r-unscoped");
                }
            }
        });

        const rules = readActiveFieldRules(vault.mirror.getState());
        expect(rules).toHaveLength(2);
        expect(ruleById(rules, "r-account").accountId).toBe(ACCOUNT_A);
        expect(ruleById(rules, "r-account").outputs).toEqual({
            tags: { mode: "add", tagIds: ["tag-account"] }
        });
        expect(ruleById(rules, "r-unscoped").outputs).toEqual({
            tags: { mode: "add", tagIds: ["tag-broad"] }
        });
    });

    // The same refusal seen through the field the user was editing: application still follows the
    // unchanged winners, so a refused write can never be reported as an applied one.
    it("EX-13b: after the refusal the rows still take the pre-refusal winners", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, { transaction: txInput({ id: "t-a" }) });
            insertTransaction(state.transactions, {
                transaction: txInput({ id: "t-b", accountId: ACCOUNT_B })
            });
            createFieldRule(state, {
                id: "r-unscoped",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-broad"] } },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "r-account",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_A,
                outputs: { tags: { mode: "add", tagIds: ["tag-account"] } },
                createdAtEpochMs: 2000
            });
        });

        vault.mirror.setState((state: VaultState) => {
            const collided = updateFieldRule(state, {
                id: "r-account",
                outputs: { tags: { mode: "add", tagIds: ["tag-moved"] } }
            });
            expect(collided.ok).toBe(false);
        });

        vault.mirror.setState((state: VaultState) => {
            applyFieldRulesToAllTransactions(state);
        });

        const store = vault.mirror.getState().transactions;
        expect(findTransactionInStore(store, locationOf("t-a"))?.tagIds).toEqual(["tag-account"]);
        expect(findTransactionInStore(store, locationOf("t-b", ACCOUNT_B))?.tagIds).toEqual([
            "tag-broad"
        ]);
    });
});

// ============================================================================
// Step 3 — baseline: stale work against a target that moved underneath it
// ============================================================================

describe("MF-002 baseline: a proposal captured before the target changed", () => {
    // EX-14 — open edit, then the target is deleted, then the confirm lands. The update reports
    // `not-found` and does NOT resurrect the rule. There is no compare-and-swap here: the guard is
    // existence, not a version, so a target that was EDITED rather than deleted would be
    // overwritten wholesale (recorded as D-008, not asserted as a guarantee).
    it("EX-14: a stale update against a soft-deleted target is not-found and resurrects nothing", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createFieldRule(state, {
                id: "r-tags",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-old"] } },
                createdAtEpochMs: 1000
            });
        });

        // The surface captures its target here, while the rule is still live.
        const captured = computeFieldRuleProposal(
            readActiveFieldRules(vault.mirror.getState()),
            IMPORTED_SUBJECT,
            TAGS_EDIT
        );
        expect(captured.kind === "update" && captured.rule.id).toBe("r-tags");

        vault.mirror.setState((state: VaultState) => {
            expect(deleteFieldRule(state, { id: "r-tags", deletedAtEpochMs: 2000 }).ok).toBe(true);
        });

        vault.mirror.setState((state: VaultState) => {
            const stale = updateFieldRule(state, {
                id: "r-tags",
                outputs: { tags: { mode: "add", tagIds: ["tag-new"] } }
            });
            expect(stale.ok).toBe(false);
            if (!stale.ok) expect(stale.error.type).toBe("not-found");
        });

        expect(readActiveFieldRules(vault.mirror.getState())).toHaveLength(0);
    });

    // EX-15 — the destination slot was FREE when the surface opened and occupied before the save.
    // The refusal is the EX-13 duplicate-key one; what this pins is the ordering, and that a local
    // rejection is the only fencing that exists (a concurrent creation on another device is merged
    // by the CRDT after the fact — D-007).
    it("EX-15: a destination occupied after the surface opened rejects the later write", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            createFieldRule(state, {
                id: "r-account",
                descriptionText: DESCRIPTION,
                accountId: ACCOUNT_A,
                outputs: { tags: { mode: "add", tagIds: ["tag-account"] } },
                createdAtEpochMs: 1000
            });
        });

        // At this instant the unscoped slot for (tags, COFFEE SHOP 123) is free.
        expect(
            readActiveFieldRules(vault.mirror.getState()).some(
                (rule) => rule.outputs.tags != null && rule.accountId == null
            )
        ).toBe(false);

        // Someone else takes it before the save.
        vault.mirror.setState((state: VaultState) => {
            expect(
                createFieldRule(state, {
                    id: "r-unscoped",
                    descriptionText: DESCRIPTION,
                    outputs: { tags: { mode: "add", tagIds: ["tag-broad"] } },
                    createdAtEpochMs: 1500
                }).ok
            ).toBe(true);
        });

        vault.mirror.setState((state: VaultState) => {
            const late = updateFieldRule(state, {
                id: "r-account",
                outputs: { tags: { mode: "add", tagIds: ["tag-account"] } }
            });
            expect(late.ok).toBe(false);
            if (!late.ok) expect(late.error.type).toBe("duplicate-key");
        });

        const rules = readActiveFieldRules(vault.mirror.getState());
        expect(rules.map((rule) => rule.id).sort()).toEqual(["r-account", "r-unscoped"]);
        expect(ruleById(rules, "r-account").accountId).toBe(ACCOUNT_A);
    });

    // Bulk application evaluates EVERY active rule, not just the one the editor was pointed at. Any
    // grouped surface that says "this applies your edit" must not imply the others were skipped.
    it("EX-16: applying after one rule's edit still evaluates every other active rule", () => {
        const vault = createVaultMirror();
        vault.mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, { transaction: txInput({ id: "t-1" }) });
            createDescriptionAlias(state, { aliasId: "alias-coffee", name: "Coffee" });
            createFieldRule(state, {
                id: "r-tags",
                descriptionText: DESCRIPTION,
                outputs: { tags: { mode: "add", tagIds: ["tag-old"] } },
                createdAtEpochMs: 1000
            });
            createFieldRule(state, {
                id: "r-alias",
                descriptionText: DESCRIPTION,
                outputs: { descriptionAlias: { aliasId: "alias-coffee" } },
                createdAtEpochMs: 1100
            });
        });

        vault.mirror.setState((state: VaultState) => {
            expect(
                updateFieldRule(state, {
                    id: "r-tags",
                    outputs: { tags: { mode: "add", tagIds: ["tag-new"] } }
                }).ok
            ).toBe(true);
            applyFieldRulesToAllTransactions(state);
        });

        const transaction = findTransactionInStore(
            vault.mirror.getState().transactions,
            locationOf("t-1")
        );
        expect(transaction?.tagIds).toEqual(["tag-new"]);
        // The untouched alias rule applied in the same pass.
        expect(transaction?.descriptionAliasId).toBe("alias-coffee");
    });
});
