import { fireEvent, render, screen } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftFromRule } from "@/components/features/automations/rule-editor-data";
import {
    emptyRuleDraft,
    type RuleEditorDraft
} from "@/components/features/automations/rule-editor-model";
import type { RuleEditorProps } from "@/components/features/automations/RuleEditor";
import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import { asTransactionId } from "@/components/features/transactions/table-model";
import { TransactionInspectorAutomation } from "@/components/features/transactions/TransactionInspectorAutomation";
import type { TransactionInput } from "@/lib/crdt/schema";
import { buildTransactionIndex, createTransactionCursor } from "@/lib/crdt/transaction-cursor";
import { AllocationPercentageSchema } from "@/lib/domain/allocation";
import type { RuleExtensionTarget } from "@/lib/domain/automation/extension";
import { DEFAULT_REMEMBERED_CHOICE } from "@/lib/domain/automation/preferences";
import { type FieldRule, FieldRuleIdSchema } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

import { populateStore } from "../crdt/transaction-cursor-fixtures";

const workflowMocks = vi.hoisted(() => ({
    applyProposal: vi.fn(() => true),
    applyThis: vi.fn(),
    saveRule: vi.fn(() => true),
    existingRuleVisible: { current: false },
    existingRuleDrifted: { current: false },
    existingRuleHasAllocation: { current: false },
    // The rule card's draft; `null` stands for the workflow's empty draft.
    ruleDraft: { current: null as RuleEditorDraft | null },
    // The proposal's extension target; `null` stands for a create.
    proposalTarget: { current: null as RuleExtensionTarget | null },
    removeRule: vi.fn(() => {
        workflowMocks.existingRuleVisible.current = false;
        return true;
    })
}));

function existingRule(): FieldRule {
    return {
        id: FieldRuleIdSchema.parse("rule-1"),
        descriptionText: "Coffee shop",
        outputs: {
            tags: {
                mode: "add",
                tagIds: workflowMocks.existingRuleDrifted.current ? ["tag-b"] : ["tag-a"]
            },
            ...(workflowMocks.existingRuleHasAllocation.current
                ? {
                      allocation: {
                          allocations: { "person-1": AllocationPercentageSchema.parse(100) }
                      }
                  }
                : {})
        },
        createdAt: Temporal.Instant.from("2026-08-31T00:00:00Z")
    };
}

vi.mock("@/lib/crdt", () => ({
    useActiveFieldRules: () => (workflowMocks.existingRuleVisible.current ? [existingRule()] : []),
    useRulePopulation: () => []
}));

vi.mock("@/components/features/transactions/use-field-rule-proposal", () => ({
    useFieldRuleProposal: () => ({
        accounts: [],
        aliases: [],
        apply: workflowMocks.applyProposal,
        canApply: true,
        currencyCode: "USD",
        draft: emptyRuleDraft(DEFAULT_REMEMBERED_CHOICE),
        errors: {},
        people: [],
        proposal: { descriptionText: "Coffee shop", field: "tags", kind: "proposal" },
        resolution: null,
        setDraft: vi.fn(),
        setResolution: vi.fn(),
        tags: [],
        target: workflowMocks.proposalTarget.current ?? { kind: "create" }
    })
}));

vi.mock("@/components/features/transactions/use-transaction-rule-workflow", () => ({
    useTransactionRuleWorkflow: () => ({
        addOutput: vi.fn(),
        applyThis: workflowMocks.applyThis,
        currencyCode: "USD",
        draft: workflowMocks.ruleDraft.current ?? emptyRuleDraft(DEFAULT_REMEMBERED_CHOICE),
        errors: {},
        options: { accounts: [], aliases: [], people: [], tags: [] },
        remembered: DEFAULT_REMEMBERED_CHOICE,
        populationCount: undefined,
        remove: workflowMocks.removeRule,
        resetDraft: vi.fn(),
        save: workflowMocks.saveRule,
        setDraft: vi.fn(),
        split: vi.fn()
    })
}));

// The editor is pinned by its own tests; here only its action callbacks matter.
vi.mock("@/components/features/automations/RuleEditor", () => ({
    RuleEditor: (props: RuleEditorProps) => (
        <div
            data-can-split={String(props.canSplit)}
            data-pending-field={props.pendingField ?? ""}
            data-title-kind={props.title.kind}
            data-testid="field-rule-editor"
        >
            <button data-testid="rule-save" onClick={props.onApply} type="button">
                Apply
            </button>
            <button data-testid="rule-cancel" onClick={props.onCancel} type="button">
                Cancel
            </button>
            {props.onDelete == null ? null : (
                <button data-testid="rule-delete" onClick={props.onDelete} type="button">
                    Delete rule
                </button>
            )}
            {props.divergence?.tags == null || props.onApplyThis == null ? null : (
                <button
                    data-testid="rule-apply-this-tags"
                    onClick={() => props.onApplyThis?.("tags")}
                    type="button"
                >
                    Apply to this transaction
                </button>
            )}
        </div>
    )
}));

const TRANSACTION_ID = asTransactionId("tx-1");
const COLUMNS = ["description", "tags", "amount", "actions"] as const;
const CURRENT = { currentTagIds: ["tag-a"], field: "tags" as const };
const CONTEXT = {
    accountLabel: "Cheque",
    currents: [CURRENT],
    referenceDate: Temporal.PlainDate.from("2026-08-31"),
    subject: {
        accountId: "account-1",
        amount: asMinorUnits(-450),
        descriptionText: "Coffee shop",
        isManual: false
    }
};

function transaction(): TransactionInput {
    return {
        accountId: "account-1",
        allocations: {},
        amount: asMinorUnits(-450),
        creationInstant: Temporal.Instant.from("2026-08-31T00:00:00Z"),
        date: CONTEXT.referenceDate,
        deletedAt: undefined,
        description: CONTEXT.subject.descriptionText,
        descriptionAliasId: undefined,
        id: TRANSACTION_ID,
        importId: "import-1",
        importRowIndex: 0,
        notes: "",
        originalAmount: undefined,
        statusId: "status-for-review",
        suspectedDuplicates: [],
        tagIds: CURRENT.currentTagIds
    };
}

function createController() {
    const controller = createTransactionGridWorkspaceController(
        createTransactionCellSelectionAtom()
    );
    controller.updateProjection(
        createTransactionCursor(buildTransactionIndex(populateStore([transaction()]))),
        COLUMNS
    );
    controller.setFocusedCell(TRANSACTION_ID, "tags");
    controller.setInspectorPanelOpen(true);
    return controller;
}

function renderAutomation(controller: ReturnType<typeof createController>) {
    return render(
        <TransactionInspectorAutomation
            context={CONTEXT}
            controller={controller}
            transactionId={TRANSACTION_ID}
        />
    );
}

function enterInspectorFrom(controller: ReturnType<typeof createController>, control: HTMLElement) {
    control.focus();
    expect(controller.enterInspector(control)).toBe(true);
    expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
}

const HEADING = "transaction-inspector-automation-title";

function publishTagsCommit(controller: ReturnType<typeof createController>): void {
    controller.publishAutomationEditorCommit(
        { columnId: "tags", transactionId: TRANSACTION_ID },
        { ok: true, status: "changed" }
    );
}

beforeEach(() => {
    workflowMocks.applyProposal.mockReset();
    workflowMocks.applyProposal.mockReturnValue(true);
    workflowMocks.applyThis.mockReset();
    workflowMocks.saveRule.mockReset();
    workflowMocks.saveRule.mockReturnValue(true);
    workflowMocks.existingRuleVisible.current = false;
    workflowMocks.existingRuleDrifted.current = false;
    workflowMocks.existingRuleHasAllocation.current = false;
    workflowMocks.ruleDraft.current = null;
    workflowMocks.proposalTarget.current = null;
    workflowMocks.removeRule.mockClear();
});

describe("transaction inspector automation focus continuity", () => {
    it("moves focus to the Automation heading before dismissing a keyboard-focused proposal", () => {
        const controller = createController();
        publishTagsCommit(controller);
        renderAutomation(controller);
        const proposal = screen.getByTestId("tags-rule-proposal");
        expect(proposal).toHaveAttribute("data-kind", "create");
        const dismiss = screen.getByTestId("rule-cancel");
        enterInspectorFrom(controller, dismiss);

        fireEvent.click(dismiss, { detail: 0 });

        expect(screen.queryByTestId("tags-rule-proposal")).not.toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByTestId(HEADING));
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
    });

    it("moves focus to the Automation heading after a successful keyboard-confirmed proposal", () => {
        const controller = createController();
        publishTagsCommit(controller);
        renderAutomation(controller);
        const confirm = screen.getByTestId("rule-save");
        enterInspectorFrom(controller, confirm);

        fireEvent.click(confirm, { detail: 0 });

        expect(workflowMocks.applyProposal).toHaveBeenCalledOnce();
        expect(screen.queryByTestId("tags-rule-proposal")).not.toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByTestId(HEADING));
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
    });

    it("keeps a refused proposal mounted with focus where it was", () => {
        workflowMocks.applyProposal.mockReturnValue(false);
        const controller = createController();
        publishTagsCommit(controller);
        renderAutomation(controller);
        const confirm = screen.getByTestId("rule-save");
        enterInspectorFrom(controller, confirm);

        fireEvent.click(confirm, { detail: 0 });

        expect(workflowMocks.applyProposal).toHaveBeenCalledOnce();
        expect(screen.getByTestId("tags-rule-proposal")).toBeInTheDocument();
        expect(document.activeElement).toBe(confirm);
        expect(controller.getSnapshot().automation.proposal).not.toBeNull();
    });

    it("moves focus to the Automation heading before deleting a keyboard-focused rule", () => {
        workflowMocks.existingRuleVisible.current = true;
        const controller = createController();
        const view = renderAutomation(controller);
        expect(screen.getByTestId("rule-inspector-rule-1")).toHaveAttribute(
            "data-automation-field",
            "tags"
        );
        const remove = screen.getByTestId("rule-delete");
        enterInspectorFrom(controller, remove);

        fireEvent.click(remove, { detail: 0 });
        view.rerender(
            <TransactionInspectorAutomation
                context={CONTEXT}
                controller={controller}
                transactionId={TRANSACTION_ID}
            />
        );

        expect(workflowMocks.removeRule).toHaveBeenCalledOnce();
        expect(screen.queryByTestId("rule-inspector-rule-1")).not.toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByTestId(HEADING));
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
    });

    it("moves focus to the Automation heading before applying a drifted rule to the transaction", () => {
        workflowMocks.existingRuleVisible.current = true;
        workflowMocks.existingRuleDrifted.current = true;
        const controller = createController();
        renderAutomation(controller);
        const applyThis = screen.getByTestId("rule-apply-this-tags");
        enterInspectorFrom(controller, applyThis);

        fireEvent.click(applyThis, { detail: 0 });

        expect(workflowMocks.applyThis).toHaveBeenCalledOnce();
        expect(document.activeElement).toBe(screen.getByTestId(HEADING));
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
    });

    it("keeps an existing rule's card beside a create proposal, which folds nothing", () => {
        workflowMocks.existingRuleVisible.current = true;
        const controller = createController();
        publishTagsCommit(controller);
        renderAutomation(controller);
        // The mocked target is a create, so the existing rule keeps its own card.
        expect(screen.getByTestId("tags-rule-proposal")).toBeInTheDocument();
        expect(screen.getByTestId("rule-inspector-rule-1")).toBeInTheDocument();
    });
});

describe("transaction inspector rule card Split gate", () => {
    function cardEditor(): HTMLElement {
        return (
            screen
                .getByTestId("rule-inspector-rule-1")
                .querySelector('[data-testid="field-rule-editor"]') ?? fail()
        );
    }
    function fail(): never {
        throw new Error("rule card editor not rendered");
    }
    function rerender(
        view: ReturnType<typeof renderAutomation>,
        controller: ReturnType<typeof createController>
    ) {
        view.rerender(
            <TransactionInspectorAutomation
                context={CONTEXT}
                controller={controller}
                transactionId={TRANSACTION_ID}
            />
        );
    }

    it("offers Split only while the draft equals the stored rule", () => {
        workflowMocks.existingRuleVisible.current = true;
        workflowMocks.existingRuleHasAllocation.current = true;
        const stored = draftFromRule(existingRule(), "USD", DEFAULT_REMEMBERED_CHOICE);
        workflowMocks.ruleDraft.current = stored;
        const controller = createController();
        const view = renderAutomation(controller);
        expect(cardEditor()).toHaveAttribute("data-can-split", "true");

        // An unsaved edit would be discarded by Split, so it is withheld until reverted.
        workflowMocks.ruleDraft.current = {
            ...stored,
            outputs: { ...stored.outputs, tags: { mode: "add", tagIds: ["tag-b"] } }
        };
        rerender(view, controller);
        expect(cardEditor()).toHaveAttribute("data-can-split", "false");

        workflowMocks.ruleDraft.current = stored;
        rerender(view, controller);
        expect(cardEditor()).toHaveAttribute("data-can-split", "true");
    });

    it("marks an output added but not saved as pending and offers no Split", () => {
        workflowMocks.existingRuleVisible.current = true;
        workflowMocks.existingRuleHasAllocation.current = true;
        const stored = draftFromRule(existingRule(), "USD", DEFAULT_REMEMBERED_CHOICE);
        workflowMocks.ruleDraft.current = {
            ...stored,
            outputs: { ...stored.outputs, descriptionAlias: { aliasId: "" } }
        };
        renderAutomation(createController());
        expect(cardEditor()).toHaveAttribute("data-can-split", "false");
        expect(cardEditor()).toHaveAttribute("data-pending-field", "descriptionAlias");
    });

    it("offers no Split on a single-output rule", () => {
        workflowMocks.existingRuleVisible.current = true;
        workflowMocks.ruleDraft.current = draftFromRule(
            existingRule(),
            "USD",
            DEFAULT_REMEMBERED_CHOICE
        );
        renderAutomation(createController());
        expect(cardEditor()).toHaveAttribute("data-can-split", "false");
        expect(cardEditor()).toHaveAttribute("data-pending-field", "");
    });
});

describe("transaction inspector proposal title", () => {
    it.each<[string, string, () => RuleExtensionTarget]>([
        ["a create", "new", () => ({ kind: "create" })],
        // Updating an output the rule already has edits that rule, so it reads as the rule.
        ["an update-owner", "rule", () => ({ kind: "update-owner", rule: existingRule() })],
        ["an extend", "extend", () => ({ kind: "extend", rule: existingRule() })]
    ])("titles %s proposal as %s", (_label, titleKind, target) => {
        workflowMocks.proposalTarget.current = target();
        const controller = createController();
        publishTagsCommit(controller);
        renderAutomation(controller);
        const proposal = screen.getByTestId("tags-rule-proposal");
        expect(proposal.querySelector('[data-testid="field-rule-editor"]')).toHaveAttribute(
            "data-title-kind",
            titleKind
        );
    });
});
