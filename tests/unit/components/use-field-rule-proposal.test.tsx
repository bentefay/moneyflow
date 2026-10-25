import { act, renderHook } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    draftOutputFields,
    type RuleEditorDraft
} from "@/components/features/automations/rule-editor-model";
import {
    type FieldRuleProposalState,
    type RuleProposalDraftOverride
} from "@/components/features/transactions/field-rule-proposal-state";
import { type RobotCurrentValue } from "@/components/features/transactions/field-rule-robot-state";
import { asTransactionId } from "@/components/features/transactions/table-model";
import {
    type FieldRuleProposalPersistence,
    useFieldRuleProposal
} from "@/components/features/transactions/use-field-rule-proposal";
import { buildRuleIndex } from "@/lib/domain/automation/rule-index";
import {
    type FieldRule,
    FieldRuleIdSchema,
    type RuleMatchSubject,
    RULE_REACH_ALL
} from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

interface WorkflowAccount {
    readonly id: string;
    readonly name: string;
    currency?: string;
    readonly deletedAt?: string;
}

const workflowMocks = vi.hoisted(() => {
    const accounts: Record<string, WorkflowAccount> = {
        "account-1": { currency: "USD", id: "account-1", name: "Checking" },
        "account-2": { currency: "USD", id: "account-2", name: "Savings" }
    };
    const allAccounts: Record<string, WorkflowAccount> = { ...accounts };
    return {
        accounts,
        allAccounts,
        applyAll: vi.fn(),
        applyNewerThan: vi.fn(),
        create: vi.fn(() => ({ ok: true })),
        moveOutput: vi.fn(() => ({ ok: true })),
        persistPreference: vi.fn(),
        proposalOverride: (): FieldRuleProposalState | null => null,
        rules: Array<FieldRule>(),
        setOutput: vi.fn((): { ok: boolean; error?: unknown } => ({ ok: true })),
        vaultDefaultCurrency: "EUR"
    };
});

vi.mock("@/hooks/use-identity", () => ({
    usePubkeyHash: () => "viewer"
}));

vi.mock("@/components/features/transactions/field-rule-proposal-state", async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import("@/components/features/transactions/field-rule-proposal-state")
        >();
    return {
        ...actual,
        computeFieldRuleProposal: (...args: Parameters<typeof actual.computeFieldRuleProposal>) =>
            workflowMocks.proposalOverride() ?? actual.computeFieldRuleProposal(...args)
    };
});

vi.mock("@/lib/crdt", () => ({
    useActiveAccounts: () => workflowMocks.accounts,
    useAccounts: () => workflowMocks.allAccounts,
    useActiveDescriptionAliases: () => ({}),
    useActiveFieldRules: () => workflowMocks.rules,
    useActiveFieldRuleIndex: () => buildRuleIndex(workflowMocks.rules),
    useActivePeople: () => ({}),
    useActiveTags: () => ({}),
    useApplyFieldRules: () => ({
        applyAll: workflowMocks.applyAll,
        applyNewerThan: workflowMocks.applyNewerThan
    }),
    useFieldRuleActions: () => ({
        create: workflowMocks.create,
        moveOutput: workflowMocks.moveOutput,
        setOutput: workflowMocks.setOutput
    }),
    usePersistAutomationPreference: () => workflowMocks.persistPreference,
    useUserAutomationChoice: () => ({
        applyMode: "updatingAll",
        tagMode: "add",
        useAccountScope: false,
        useAmountScope: false
    }),
    useVaultPreferences: () => ({ defaultCurrency: workflowMocks.vaultDefaultCurrency })
}));

const DESCRIPTION_TEXT = "COFFEE SHOP 123";
const SUBJECT: RuleMatchSubject = {
    accountId: "account-1",
    amount: asMinorUnits(-450),
    descriptionText: DESCRIPTION_TEXT,
    transactionId: asTransactionId("tx-1"),
    date: Temporal.PlainDate.from("2026-07-25"),
    isManual: false
};
const REFERENCE_DATE = Temporal.PlainDate.from("2026-08-31");

interface ProposalHookInput {
    readonly current: RobotCurrentValue;
    readonly subject: RuleMatchSubject;
    readonly transactionId: string;
}

interface ProposalSemanticTransition {
    readonly name: string;
    readonly initial: ProposalHookInput;
    readonly next: ProposalHookInput;
    readonly initialRules: readonly FieldRule[];
    readonly nextRules: readonly FieldRule[];
    readonly initialTargetKind: "create" | "update-owner";
    readonly nextTargetKind: "create" | "update-owner";
    readonly nextRuleId?: string;
}

function tagRule(id: string): FieldRule {
    return {
        outputs: { tags: { mode: "add", tagIds: ["tag-a"] } },
        reach: RULE_REACH_ALL,
        createdAt: Temporal.Instant.from("2026-08-31T00:00:00Z"),
        descriptionText: DESCRIPTION_TEXT,
        id: FieldRuleIdSchema.parse(id)
    };
}

const TAG_CURRENT: RobotCurrentValue = { currentTagIds: ["tag-a"], field: "tags" };
const BASE_HOOK_INPUT: ProposalHookInput = {
    current: TAG_CURRENT,
    subject: SUBJECT,
    transactionId: "tx-1"
};
const RULE_A = tagRule("rule-a");
const RULE_B = tagRule("rule-b");
const SEMANTIC_TRANSITIONS: readonly ProposalSemanticTransition[] = [
    {
        initial: BASE_HOOK_INPUT,
        initialTargetKind: "create",
        initialRules: [],
        name: "candidate rule set",
        next: BASE_HOOK_INPUT,
        nextTargetKind: "update-owner",
        nextRuleId: "rule-a",
        nextRules: [RULE_A]
    },
    {
        initial: BASE_HOOK_INPUT,
        initialTargetKind: "update-owner",
        initialRules: [RULE_A],
        name: "update-rule owner",
        next: BASE_HOOK_INPUT,
        nextTargetKind: "update-owner",
        nextRuleId: "rule-b",
        nextRules: [RULE_B]
    },
    {
        initial: BASE_HOOK_INPUT,
        initialTargetKind: "create",
        initialRules: [],
        name: "rule field",
        next: {
            ...BASE_HOOK_INPUT,
            current: { currentAliasId: "alias-a", field: "descriptionAlias" }
        },
        nextTargetKind: "create",
        nextRules: []
    },
    {
        initial: BASE_HOOK_INPUT,
        initialTargetKind: "create",
        initialRules: [],
        name: "description",
        next: {
            ...BASE_HOOK_INPUT,
            subject: { ...SUBJECT, descriptionText: "TEA SHOP 456" }
        },
        nextTargetKind: "create",
        nextRules: []
    },
    {
        initial: BASE_HOOK_INPUT,
        initialTargetKind: "create",
        initialRules: [],
        name: "account",
        next: { ...BASE_HOOK_INPUT, subject: { ...SUBJECT, accountId: "account-2" } },
        nextTargetKind: "create",
        nextRules: []
    },
    {
        initial: BASE_HOOK_INPUT,
        initialTargetKind: "create",
        initialRules: [],
        name: "amount",
        next: { ...BASE_HOOK_INPUT, subject: { ...SUBJECT, amount: asMinorUnits(-900) } },
        nextTargetKind: "create",
        nextRules: []
    },
    {
        initial: BASE_HOOK_INPUT,
        initialTargetKind: "create",
        initialRules: [],
        name: "transaction owner",
        next: { ...BASE_HOOK_INPUT, transactionId: "tx-2" },
        nextTargetKind: "create",
        nextRules: []
    },
    {
        initial: BASE_HOOK_INPUT,
        initialTargetKind: "create",
        initialRules: [],
        name: "tag current action",
        next: {
            ...BASE_HOOK_INPUT,
            current: { currentTagIds: ["tag-b"], field: "tags" }
        },
        nextTargetKind: "create",
        nextRules: []
    },
    {
        initial: {
            ...BASE_HOOK_INPUT,
            current: { currentAliasId: "alias-a", field: "descriptionAlias" }
        },
        initialTargetKind: "create",
        initialRules: [],
        name: "alias current action",
        next: {
            ...BASE_HOOK_INPUT,
            current: { currentAliasId: "alias-b", field: "descriptionAlias" }
        },
        nextTargetKind: "create",
        nextRules: []
    },
    {
        initial: {
            ...BASE_HOOK_INPUT,
            current: { currentAllocations: { "person-1": 40 }, field: "allocation" }
        },
        initialTargetKind: "create",
        initialRules: [],
        name: "allocation current action",
        next: {
            ...BASE_HOOK_INPUT,
            current: { currentAllocations: { "person-1": 60 }, field: "allocation" }
        },
        nextTargetKind: "create",
        nextRules: []
    }
];

describe("useFieldRuleProposal draft ownership", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        workflowMocks.accounts = {
            "account-1": { currency: "USD", id: "account-1", name: "Checking" },
            "account-2": { currency: "USD", id: "account-2", name: "Savings" }
        };
        workflowMocks.allAccounts = {
            "account-1": { currency: "USD", id: "account-1", name: "Checking" },
            "account-2": { currency: "USD", id: "account-2", name: "Savings" }
        };
        workflowMocks.create.mockImplementation(() => ({ ok: true }));
        workflowMocks.proposalOverride = () => null;
        workflowMocks.rules = [];
        workflowMocks.setOutput.mockImplementation(() => ({ ok: true }));
        workflowMocks.vaultDefaultCurrency = "EUR";
    });

    it.each(SEMANTIC_TRANSITIONS)(
        "retires an override when the $name semantic axis changes",
        (transition) => {
            workflowMocks.rules = [...transition.initialRules];
            const hook = renderHook(
                (input: ProposalHookInput) =>
                    useFieldRuleProposal({
                        ...input,
                        referenceDate: REFERENCE_DATE,
                        transactionId: asTransactionId(input.transactionId)
                    }),
                { initialProps: transition.initial }
            );
            expect(hook.result.current.target?.kind).toBe(transition.initialTargetKind);
            const initialDraft = hook.result.current.draft;
            if (initialDraft == null) throw new Error("Expected an initial proposal draft");
            const customizedDraft = {
                ...initialDraft,
                accountId: "stale-account",
                useAccountScope: true
            };
            act(() => hook.result.current.setDraft(customizedDraft));
            expect(hook.result.current.draft).toEqual(customizedDraft);

            workflowMocks.rules = [...transition.nextRules];
            hook.rerender(transition.next);

            const target = hook.result.current.target;
            expect(target?.kind).toBe(transition.nextTargetKind);
            if (transition.nextRuleId != null) {
                if (target?.kind !== "update-owner") throw new Error("Expected an update target");
                expect(target.rule.id).toBe(transition.nextRuleId);
            }
            expect(hook.result.current.draft).toMatchObject({
                accountId: transition.next.subject.accountId,
                descriptionText: transition.next.subject.descriptionText,
                useAccountScope: false
            });
            const nextDraft = hook.result.current.draft;
            expect(nextDraft == null ? [] : draftOutputFields(nextDraft)).toEqual([
                transition.next.current.field
            ]);
            expect(hook.result.current.draft).not.toEqual(customizedDraft);
        }
    );

    it("retires an override across a kind-only proposal to none to proposal transition", () => {
        workflowMocks.proposalOverride = () => ({
            descriptionText: DESCRIPTION_TEXT,
            field: "tags",
            kind: "proposal"
        });
        const hook = renderHook(
            (input: ProposalHookInput) =>
                useFieldRuleProposal({
                    ...input,
                    referenceDate: REFERENCE_DATE,
                    transactionId: asTransactionId(input.transactionId)
                }),
            { initialProps: BASE_HOOK_INPUT }
        );
        const initialDraft = hook.result.current.draft;
        if (initialDraft == null) throw new Error("Expected an initial proposal draft");
        const customizedDraft = {
            ...initialDraft,
            accountId: "stale-account",
            useAccountScope: true
        };
        act(() => hook.result.current.setDraft(customizedDraft));

        workflowMocks.proposalOverride = () => ({ kind: "none" });
        hook.rerender({ ...BASE_HOOK_INPUT, current: { ...TAG_CURRENT } });
        expect(hook.result.current.proposal).toEqual({ kind: "none" });
        expect(hook.result.current.draft).toBeNull();

        workflowMocks.proposalOverride = () => ({
            descriptionText: DESCRIPTION_TEXT,
            field: "tags",
            kind: "proposal"
        });
        hook.rerender({ ...BASE_HOOK_INPUT, current: { ...TAG_CURRENT } });
        expect(hook.result.current.draft).toMatchObject({
            accountId: "account-1",
            outputs: { tags: { tagIds: ["tag-a"] } },
            useAccountScope: false
        });
        expect(hook.result.current.draft).not.toEqual(customizedDraft);
    });

    it("retains an equivalent override but retires it across A to B to A transitions", () => {
        const hook = renderHook(
            ({
                currentTagIds,
                transactionId
            }: {
                readonly currentTagIds: readonly string[];
                readonly transactionId: string;
            }) =>
                useFieldRuleProposal({
                    current: { currentTagIds, field: "tags" },
                    referenceDate: REFERENCE_DATE,
                    subject: SUBJECT,
                    transactionId: asTransactionId(transactionId)
                }),
            {
                initialProps: {
                    currentTagIds: ["tag-b", "tag-a"],
                    transactionId: "tx-1"
                }
            }
        );
        const initialDraft = hook.result.current.draft;
        if (initialDraft == null) throw new Error("Expected an initial proposal draft");
        const customizedDraft: RuleEditorDraft = {
            ...initialDraft,
            accountId: "stale-account",
            outputs: { tags: { mode: "add", tagIds: ["stale-tag"] } },
            useAccountScope: true
        };

        act(() => hook.result.current.setDraft(customizedDraft));
        hook.rerender({ currentTagIds: ["tag-a", "tag-b"], transactionId: "tx-1" });
        expect(hook.result.current.draft).toEqual(customizedDraft);

        hook.rerender({ currentTagIds: ["transition-tag"], transactionId: "tx-1" });
        expect(hook.result.current.draft).toMatchObject({
            accountId: "account-1",
            outputs: { tags: { tagIds: ["transition-tag"] } },
            useAccountScope: false
        });
        hook.rerender({ currentTagIds: ["tag-a", "tag-b"], transactionId: "tx-1" });
        expect(hook.result.current.draft).toMatchObject({
            accountId: "account-1",
            outputs: { tags: { tagIds: ["tag-a", "tag-b"] } },
            useAccountScope: false
        });
        expect(hook.result.current.draft).not.toEqual(customizedDraft);

        hook.rerender({ currentTagIds: ["tag-a", "tag-b"], transactionId: "tx-2" });
        expect(hook.result.current.draft).toMatchObject({
            accountId: "account-1",
            outputs: { tags: { tagIds: ["tag-a", "tag-b"] } },
            useAccountScope: false
        });
        act(() => hook.result.current.setDraft(customizedDraft));

        hook.rerender({ currentTagIds: ["fresh-tag"], transactionId: "tx-2" });
        expect(hook.result.current.draft).toMatchObject({
            accountId: "account-1",
            outputs: { tags: { tagIds: ["fresh-tag"] } },
            useAccountScope: false
        });

        act(() => {
            expect(hook.result.current.apply()).toBe(true);
        });
        expect(workflowMocks.create).toHaveBeenCalledTimes(1);
        expect(workflowMocks.create).toHaveBeenCalledWith(
            expect.objectContaining({
                accountId: undefined,
                outputs: {
                    tags: {
                        mode: "add",
                        tagIds: ["fresh-tag"]
                    }
                }
            })
        );
        expect(workflowMocks.applyAll).toHaveBeenCalledTimes(1);
        expect(workflowMocks.applyNewerThan).not.toHaveBeenCalled();
    });

    it("uses live effective account currency and retires a USD override when it becomes JPY", () => {
        const hook = renderHook(() =>
            useFieldRuleProposal({
                current: { currentTagIds: ["tag-a"], field: "tags" },
                referenceDate: REFERENCE_DATE,
                subject: SUBJECT,
                transactionId: asTransactionId("tx-1")
            })
        );
        const initialDraft = hook.result.current.draft;
        if (initialDraft == null) throw new Error("Expected an initial proposal draft");
        expect(hook.result.current.currencyCode).toBe("USD");
        expect(initialDraft.amountText).toBe("-4.5");

        act(() => {
            hook.result.current.setDraft({
                ...initialDraft,
                amountText: "4.50",
                useAmountScope: true
            });
        });
        expect(hook.result.current.draft).toMatchObject({
            amountText: "4.50",
            useAmountScope: true
        });

        workflowMocks.vaultDefaultCurrency = "GBP";
        hook.rerender();
        expect(hook.result.current.currencyCode).toBe("USD");
        expect(hook.result.current.draft).toMatchObject({
            amountText: "4.50",
            useAmountScope: true
        });

        workflowMocks.accounts["account-1"].currency = "JPY";
        workflowMocks.allAccounts["account-1"].currency = "JPY";
        hook.rerender();
        expect(hook.result.current.currencyCode).toBe("JPY");
        expect(hook.result.current.draft).toMatchObject({
            amountText: "-450",
            useAmountScope: false
        });

        act(() => {
            expect(hook.result.current.apply()).toBe(true);
        });
        expect(workflowMocks.create).toHaveBeenCalledWith(
            expect.objectContaining({ amount: undefined })
        );
    });

    it.each([
        {
            accountId: "account-1",
            name: "an inherited vault default",
            prepare: () => {
                workflowMocks.accounts = {
                    "account-1": { currency: "", id: "account-1", name: "Checking" }
                };
                workflowMocks.allAccounts = { ...workflowMocks.accounts };
                workflowMocks.vaultDefaultCurrency = "JPY";
            }
        },
        {
            accountId: "account-2",
            name: "another active account",
            prepare: () => {
                workflowMocks.accounts = {
                    "account-1": { currency: "USD", id: "account-1", name: "Checking" },
                    "account-2": { currency: "JPY", id: "account-2", name: "Savings" }
                };
                workflowMocks.allAccounts = { ...workflowMocks.accounts };
            }
        },
        {
            accountId: "account-deleted",
            name: "a soft-deleted referenced account",
            prepare: () => {
                workflowMocks.accounts = {
                    "account-1": { currency: "USD", id: "account-1", name: "Checking" }
                };
                workflowMocks.allAccounts = {
                    ...workflowMocks.accounts,
                    "account-deleted": {
                        currency: "JPY",
                        deletedAt: "2026-08-31T00:00:00Z",
                        id: "account-deleted",
                        name: "Archived"
                    }
                };
            }
        }
    ])("parses and applies amount scope in JPY for $name", ({ accountId, prepare }) => {
        prepare();
        const hook = renderHook(() =>
            useFieldRuleProposal({
                current: TAG_CURRENT,
                referenceDate: REFERENCE_DATE,
                subject: { ...SUBJECT, accountId },
                transactionId: asTransactionId("tx-jpy")
            })
        );
        const draft = hook.result.current.draft;
        if (draft == null) throw new Error("Expected a JPY proposal draft");

        expect(hook.result.current.currencyCode).toBe("JPY");
        expect(draft.amountText).toBe("-450");
        expect(hook.result.current.accounts.map((account) => account.id)).not.toContain(
            "account-deleted"
        );
        act(() => {
            hook.result.current.setDraft({
                ...draft,
                amountText: "-451",
                useAmountScope: true
            });
        });
        act(() => {
            expect(hook.result.current.apply()).toBe(true);
        });
        expect(workflowMocks.create).toHaveBeenCalledWith(
            expect.objectContaining({ amount: -451 })
        );
    });

    it("retires validation and mutation errors across A to B to A generations", () => {
        const hook = renderHook(
            ({ currentTagIds }: { readonly currentTagIds: readonly string[] }) =>
                useFieldRuleProposal({
                    current: { currentTagIds, field: "tags" },
                    referenceDate: REFERENCE_DATE,
                    subject: SUBJECT,
                    transactionId: asTransactionId("tx-1")
                }),
            { initialProps: { currentTagIds: ["tag-b", "tag-a"] } }
        );
        const initialDraft = hook.result.current.draft;
        if (initialDraft == null) throw new Error("Expected an initial proposal draft");
        act(() => {
            hook.result.current.setDraft({
                ...initialDraft,
                amountText: "not-an-amount",
                useAmountScope: true
            });
        });
        act(() => {
            expect(hook.result.current.apply()).toBe(false);
        });
        expect(hook.result.current.errors.amount).toBeDefined();

        hook.rerender({ currentTagIds: ["tag-a", "tag-b"] });
        expect(hook.result.current.errors.amount).toBeDefined();
        hook.rerender({ currentTagIds: ["tag-c"] });
        expect(hook.result.current.errors).toEqual({});
        hook.rerender({ currentTagIds: ["tag-a", "tag-b"] });
        expect(hook.result.current.errors).toEqual({});

        workflowMocks.create.mockImplementationOnce(() => ({
            error: { existingRuleId: "rule-existing", type: "duplicate-key" },
            ok: false
        }));
        act(() => {
            expect(hook.result.current.apply()).toBe(false);
        });
        expect(hook.result.current.errors.descriptionText).toContain("already sets");

        hook.rerender({ currentTagIds: ["tag-c"] });
        expect(hook.result.current.errors).toEqual({});
        hook.rerender({ currentTagIds: ["tag-a", "tag-b"] });
        expect(hook.result.current.errors).toEqual({});
    });
});

function aliasRule(id: string, accountId?: string): FieldRule {
    return {
        outputs: { descriptionAlias: { aliasId: "alias-coffee" } },
        reach: RULE_REACH_ALL,
        createdAt: Temporal.Instant.from("2026-08-31T00:00:00Z"),
        descriptionText: DESCRIPTION_TEXT,
        accountId,
        id: FieldRuleIdSchema.parse(id)
    };
}

/** Controller-shaped persistence whose overrides survive a remount, as the inspector's do. */
function controllerPersistence(): {
    readonly persistence: () => FieldRuleProposalPersistence;
} {
    const store: {
        draftOverride: RuleProposalDraftOverride | null;
        errorOverride: FieldRuleProposalPersistence["errorOverride"];
    } = { draftOverride: null, errorOverride: null };
    return {
        persistence: () => ({
            draftOverride: store.draftOverride,
            errorOverride: store.errorOverride,
            setDraftOverride: (override) => {
                store.draftOverride = override;
            },
            setErrorOverride: (override) => {
                store.errorOverride = override;
            }
        })
    };
}

function renderProposal(persistence?: () => FieldRuleProposalPersistence) {
    return renderHook(() =>
        useFieldRuleProposal({
            current: TAG_CURRENT,
            persistence: persistence?.(),
            referenceDate: REFERENCE_DATE,
            subject: SUBJECT,
            transactionId: asTransactionId("tx-1")
        })
    );
}

function tick(hook: ReturnType<typeof renderProposal>, change: Partial<RuleEditorDraft>): void {
    const draft = hook.result.current.draft;
    if (draft == null) throw new Error("Expected a proposal draft");
    act(() => hook.result.current.setDraft({ ...draft, ...change }));
}

describe("useFieldRuleProposal target resolution", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        workflowMocks.proposalOverride = () => null;
        workflowMocks.rules = [];
        workflowMocks.vaultDefaultCurrency = "EUR";
        workflowMocks.create.mockImplementation(() => ({ ok: true }));
        workflowMocks.setOutput.mockImplementation(() => ({ ok: true }));
        workflowMocks.moveOutput.mockImplementation(() => ({ ok: true }));
    });

    it("re-derives the target when Only this account is ticked", () => {
        workflowMocks.rules = [aliasRule("rule-alias-account", "account-1")];
        const hook = renderProposal();
        expect(hook.result.current.target).toEqual({ kind: "create" });

        tick(hook, { useAccountScope: true });
        expect(hook.result.current.target).toMatchObject({
            kind: "extend",
            rule: { id: "rule-alias-account" }
        });

        act(() => {
            expect(hook.result.current.apply()).toBe(true);
        });
        expect(workflowMocks.setOutput).toHaveBeenCalledWith({
            id: "rule-alias-account",
            field: "tags",
            output: { mode: "add", tagIds: ["tag-a"] }
        });
        expect(workflowMocks.create).not.toHaveBeenCalled();
        expect(workflowMocks.applyAll).toHaveBeenCalledTimes(1);
    });

    it("updates the conflict owner by default and moves with the new value when chosen", () => {
        workflowMocks.rules = [tagRule("rule-tags"), aliasRule("rule-alias")];
        const hook = renderProposal();
        expect(hook.result.current.target?.kind).toBe("conflict");
        expect(hook.result.current.resolution).toEqual({ kind: "conflict", choice: "keep" });

        act(() => {
            expect(hook.result.current.apply()).toBe(true);
        });
        expect(workflowMocks.setOutput).toHaveBeenCalledWith({
            id: "rule-tags",
            field: "tags",
            output: { mode: "add", tagIds: ["tag-a"] }
        });
        expect(workflowMocks.moveOutput).not.toHaveBeenCalled();

        vi.clearAllMocks();
        act(() => hook.result.current.setResolution({ kind: "conflict", choice: "move" }));
        expect(hook.result.current.resolution).toEqual({ kind: "conflict", choice: "move" });
        act(() => {
            expect(hook.result.current.apply()).toBe(true);
        });
        expect(workflowMocks.moveOutput).toHaveBeenCalledWith(
            expect.objectContaining({
                sourceId: "rule-tags",
                hostId: "rule-alias",
                field: "tags",
                output: { mode: "add", tagIds: ["tag-a"] }
            })
        );
        expect(workflowMocks.setOutput).not.toHaveBeenCalled();
    });

    it("writes nothing for an ambiguous target until a rule is chosen", () => {
        const allocationRule = (id: string): FieldRule => ({
            ...tagRule(id),
            outputs: { allocation: { allocations: {} } }
        });
        workflowMocks.rules = [allocationRule("rule-x"), allocationRule("rule-y")];
        const hook = renderProposal();
        expect(hook.result.current.target?.kind).toBe("ambiguous");
        expect(hook.result.current.canApply).toBe(false);

        act(() => {
            expect(hook.result.current.apply()).toBe(false);
        });
        expect(workflowMocks.setOutput).not.toHaveBeenCalled();
        expect(workflowMocks.create).not.toHaveBeenCalled();
        expect(workflowMocks.applyAll).not.toHaveBeenCalled();

        act(() => hook.result.current.setResolution({ kind: "ambiguous", ruleId: "rule-y" }));
        expect(hook.result.current.canApply).toBe(true);
        act(() => {
            expect(hook.result.current.apply()).toBe(true);
        });
        expect(workflowMocks.setOutput).toHaveBeenCalledWith(
            expect.objectContaining({ id: "rule-y", field: "tags" })
        );
    });

    it("leaves errors and neither applies nor remembers when the mutation is refused", () => {
        workflowMocks.rules = [tagRule("rule-tags")];
        workflowMocks.setOutput.mockImplementation(() => ({
            ok: false,
            error: { type: "not-found", ruleId: "rule-tags" }
        }));
        const hook = renderProposal();
        act(() => {
            expect(hook.result.current.apply()).toBe(false);
        });
        expect(hook.result.current.errors.descriptionText).toBe("This rule no longer exists.");
        expect(workflowMocks.applyAll).not.toHaveBeenCalled();
        expect(workflowMocks.applyNewerThan).not.toHaveBeenCalled();
        expect(workflowMocks.persistPreference).not.toHaveBeenCalled();
        expect(hook.result.current.draft).not.toBeNull();
    });

    it("keeps a resolution choice across a re-render and a remount under the same generation", () => {
        workflowMocks.rules = [tagRule("rule-tags"), aliasRule("rule-alias")];
        const { persistence } = controllerPersistence();
        const hook = renderProposal(persistence);
        act(() => hook.result.current.setResolution({ kind: "conflict", choice: "move" }));
        hook.rerender();
        expect(hook.result.current.resolution).toEqual({ kind: "conflict", choice: "move" });

        // A draft edit keeps the choice beside it.
        tick(hook, { scope: "new" });
        expect(hook.result.current.resolution).toEqual({ kind: "conflict", choice: "move" });

        hook.unmount();
        const reopened = renderProposal(persistence);
        expect(reopened.result.current.resolution).toEqual({ kind: "conflict", choice: "move" });
        expect(reopened.result.current.draft?.scope).toBe("new");
    });

    it("drops a stored choice that no longer answers the current target", () => {
        workflowMocks.rules = [tagRule("rule-tags"), aliasRule("rule-alias")];
        const hook = renderProposal();
        act(() => hook.result.current.setResolution({ kind: "conflict", choice: "move" }));
        // Narrowing to this account leaves no identical-condition candidate: a plain create.
        tick(hook, { useAccountScope: true });
        expect(hook.result.current.target).toEqual({ kind: "create" });
        expect(hook.result.current.resolution).toBeNull();
    });
});
