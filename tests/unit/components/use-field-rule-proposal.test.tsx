import { act, renderHook } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type RuleEditorDraft } from "@/components/features/automations/rule-editor-model";
import { type FieldRuleProposalState } from "@/components/features/transactions/field-rule-proposal-state";
import { type RobotCurrentValue } from "@/components/features/transactions/field-rule-robot-state";
import { asTransactionId } from "@/components/features/transactions/table-model";
import { useFieldRuleProposal } from "@/components/features/transactions/use-field-rule-proposal";
import {
    type FieldRule,
    FieldRuleIdSchema,
    type RuleMatchSubject
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
        persistPreference: vi.fn(),
        proposalOverride: (): FieldRuleProposalState | null => null,
        rules: Array<FieldRule>(),
        update: vi.fn(() => ({ ok: true })),
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
    useActivePeople: () => ({}),
    useActiveTags: () => ({}),
    useApplyFieldRules: () => ({
        applyAll: workflowMocks.applyAll,
        applyNewerThan: workflowMocks.applyNewerThan
    }),
    useFieldRuleActions: () => ({
        create: workflowMocks.create,
        update: workflowMocks.update
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

vi.mock("@/components/features/transactions/FieldRuleProposal", () => ({
    FieldRuleProposal: ({
        draft,
        onDraftChange
    }: {
        readonly draft: RuleEditorDraft;
        readonly onDraftChange: (next: RuleEditorDraft) => void;
    }) => (
        <button
            type="button"
            onClick={() =>
                onDraftChange({
                    ...draft,
                    accountId: "stale-account",
                    tagIds: ["stale-tag"],
                    useAccountScope: true
                })
            }
        >
            Customize stale proposal
        </button>
    )
}));

const DESCRIPTION_TEXT = "COFFEE SHOP 123";
const SUBJECT: RuleMatchSubject = {
    accountId: "account-1",
    amount: asMinorUnits(-450),
    descriptionText: DESCRIPTION_TEXT,
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
    readonly initialProposalKind: "create" | "update";
    readonly nextProposalKind: "create" | "update";
    readonly nextRuleId?: string;
}

function tagRule(id: string): FieldRule {
    return {
        action: { field: "tags", mode: "add", tagIds: ["tag-a"] },
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
        initialProposalKind: "create",
        initialRules: [],
        name: "proposal kind",
        next: BASE_HOOK_INPUT,
        nextProposalKind: "update",
        nextRuleId: "rule-a",
        nextRules: [RULE_A]
    },
    {
        initial: BASE_HOOK_INPUT,
        initialProposalKind: "update",
        initialRules: [RULE_A],
        name: "update-rule owner",
        next: BASE_HOOK_INPUT,
        nextProposalKind: "update",
        nextRuleId: "rule-b",
        nextRules: [RULE_B]
    },
    {
        initial: BASE_HOOK_INPUT,
        initialProposalKind: "create",
        initialRules: [],
        name: "rule field",
        next: {
            ...BASE_HOOK_INPUT,
            current: { currentAliasId: "alias-a", field: "descriptionAlias" }
        },
        nextProposalKind: "create",
        nextRules: []
    },
    {
        initial: BASE_HOOK_INPUT,
        initialProposalKind: "create",
        initialRules: [],
        name: "description",
        next: {
            ...BASE_HOOK_INPUT,
            subject: { ...SUBJECT, descriptionText: "TEA SHOP 456" }
        },
        nextProposalKind: "create",
        nextRules: []
    },
    {
        initial: BASE_HOOK_INPUT,
        initialProposalKind: "create",
        initialRules: [],
        name: "account",
        next: { ...BASE_HOOK_INPUT, subject: { ...SUBJECT, accountId: "account-2" } },
        nextProposalKind: "create",
        nextRules: []
    },
    {
        initial: BASE_HOOK_INPUT,
        initialProposalKind: "create",
        initialRules: [],
        name: "amount",
        next: { ...BASE_HOOK_INPUT, subject: { ...SUBJECT, amount: asMinorUnits(-900) } },
        nextProposalKind: "create",
        nextRules: []
    },
    {
        initial: BASE_HOOK_INPUT,
        initialProposalKind: "create",
        initialRules: [],
        name: "transaction owner",
        next: { ...BASE_HOOK_INPUT, transactionId: "tx-2" },
        nextProposalKind: "create",
        nextRules: []
    },
    {
        initial: BASE_HOOK_INPUT,
        initialProposalKind: "create",
        initialRules: [],
        name: "tag current action",
        next: {
            ...BASE_HOOK_INPUT,
            current: { currentTagIds: ["tag-b"], field: "tags" }
        },
        nextProposalKind: "create",
        nextRules: []
    },
    {
        initial: {
            ...BASE_HOOK_INPUT,
            current: { currentAliasId: "alias-a", field: "descriptionAlias" }
        },
        initialProposalKind: "create",
        initialRules: [],
        name: "alias current action",
        next: {
            ...BASE_HOOK_INPUT,
            current: { currentAliasId: "alias-b", field: "descriptionAlias" }
        },
        nextProposalKind: "create",
        nextRules: []
    },
    {
        initial: {
            ...BASE_HOOK_INPUT,
            current: { currentAllocations: { "person-1": 40 }, field: "allocation" }
        },
        initialProposalKind: "create",
        initialRules: [],
        name: "allocation current action",
        next: {
            ...BASE_HOOK_INPUT,
            current: { currentAllocations: { "person-1": 60 }, field: "allocation" }
        },
        nextProposalKind: "create",
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
        workflowMocks.update.mockImplementation(() => ({ ok: true }));
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
            expect(hook.result.current.proposal.kind).toBe(transition.initialProposalKind);
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

            expect(hook.result.current.proposal.kind).toBe(transition.nextProposalKind);
            if (transition.nextRuleId != null) {
                const proposal = hook.result.current.proposal;
                if (proposal.kind !== "update") throw new Error("Expected an update proposal");
                expect(proposal.rule.id).toBe(transition.nextRuleId);
            }
            expect(hook.result.current.draft).toMatchObject({
                accountId: transition.next.subject.accountId,
                descriptionText: transition.next.subject.descriptionText,
                field: transition.next.current.field,
                useAccountScope: false
            });
            expect(hook.result.current.draft).not.toEqual(customizedDraft);
        }
    );

    it("retires a create override across a kind-only create to none to create transition", () => {
        workflowMocks.proposalOverride = () => ({
            descriptionText: DESCRIPTION_TEXT,
            field: "tags",
            kind: "create"
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
            kind: "create"
        });
        hook.rerender({ ...BASE_HOOK_INPUT, current: { ...TAG_CURRENT } });
        expect(hook.result.current.draft).toMatchObject({
            accountId: "account-1",
            tagIds: ["tag-a"],
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
        const customizedDraft = {
            ...initialDraft,
            accountId: "stale-account",
            tagIds: ["stale-tag"],
            useAccountScope: true
        };

        act(() => hook.result.current.setDraft(customizedDraft));
        hook.rerender({ currentTagIds: ["tag-a", "tag-b"], transactionId: "tx-1" });
        expect(hook.result.current.draft).toEqual(customizedDraft);

        hook.rerender({ currentTagIds: ["transition-tag"], transactionId: "tx-1" });
        expect(hook.result.current.draft).toMatchObject({
            accountId: "account-1",
            tagIds: ["transition-tag"],
            useAccountScope: false
        });
        hook.rerender({ currentTagIds: ["tag-a", "tag-b"], transactionId: "tx-1" });
        expect(hook.result.current.draft).toMatchObject({
            accountId: "account-1",
            tagIds: ["tag-a", "tag-b"],
            useAccountScope: false
        });
        expect(hook.result.current.draft).not.toEqual(customizedDraft);

        hook.rerender({ currentTagIds: ["tag-a", "tag-b"], transactionId: "tx-2" });
        expect(hook.result.current.draft).toMatchObject({
            accountId: "account-1",
            tagIds: ["tag-a", "tag-b"],
            useAccountScope: false
        });
        act(() => hook.result.current.setDraft(customizedDraft));

        hook.rerender({ currentTagIds: ["fresh-tag"], transactionId: "tx-2" });
        expect(hook.result.current.draft).toMatchObject({
            accountId: "account-1",
            tagIds: ["fresh-tag"],
            useAccountScope: false
        });

        act(() => {
            expect(hook.result.current.apply()).toBe(true);
        });
        expect(workflowMocks.create).toHaveBeenCalledTimes(1);
        expect(workflowMocks.create).toHaveBeenCalledWith(
            expect.objectContaining({
                accountId: undefined,
                action: {
                    field: "tags",
                    mode: "add",
                    tagIds: ["fresh-tag"]
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
        expect(hook.result.current.errors.descriptionText).toContain("already exists");

        hook.rerender({ currentTagIds: ["tag-c"] });
        expect(hook.result.current.errors).toEqual({});
        hook.rerender({ currentTagIds: ["tag-a", "tag-b"] });
        expect(hook.result.current.errors).toEqual({});
    });
});
