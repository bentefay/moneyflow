import { fireEvent, render, screen } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { emptyRuleDraft } from "@/components/features/automations/rule-editor-model";
import {
    createTransactionCellSelectionAtom,
    createTransactionGridWorkspaceController
} from "@/components/features/transactions/hooks/useTransactionGridController";
import { asTransactionId } from "@/components/features/transactions/table-model";
import { TransactionInspectorAutomation } from "@/components/features/transactions/TransactionInspectorAutomation";
import type { TransactionRulePopupProps } from "@/components/features/transactions/TransactionRulePopup";
import type { TransactionInput } from "@/lib/crdt/schema";
import { buildTransactionIndex, createTransactionCursor } from "@/lib/crdt/transaction-cursor";
import { asMinorUnits } from "@/lib/domain/currency";

import { populateStore } from "../crdt/transaction-cursor-fixtures";

const workflowMocks = vi.hoisted(() => ({
    applyProposal: vi.fn(() => true),
    applyThis: vi.fn(),
    existingRuleVisible: { current: false },
    existingRuleDrifted: { current: false },
    removeRule: vi.fn(() => {
        workflowMocks.existingRuleVisible.current = false;
    })
}));

vi.mock("@/components/features/transactions/use-field-rule-proposal", () => ({
    useFieldRuleProposal: () => ({
        accounts: [],
        aliases: [],
        apply: workflowMocks.applyProposal,
        currencyCode: "USD",
        draft: emptyRuleDraft({
            applyMode: "updateAll",
            field: "tags",
            tagMode: "add",
            useAccountScope: false,
            useAmountScope: false
        }),
        errors: {},
        people: [],
        proposal: {
            descriptionText: "Coffee shop",
            field: "tags",
            kind: "create"
        },
        setDraft: vi.fn(),
        tags: []
    })
}));

vi.mock("@/components/features/transactions/use-transaction-rule-workflow", () => ({
    useTransactionRuleWorkflow: () => {
        const shared = {
            accounts: [],
            aliases: [],
            allocations: [],
            applyAll: vi.fn(),
            applyNew: vi.fn(),
            applyThis: workflowMocks.applyThis,
            currencyCode: "USD",
            errors: {},
            people: [],
            remove: workflowMocks.removeRule,
            resetDraft: vi.fn(),
            save: vi.fn(),
            setDraft: vi.fn(),
            tags: []
        };
        if (!workflowMocks.existingRuleVisible.current) {
            return { ...shared, draft: null, robotState: { kind: "none" } };
        }
        return {
            ...shared,
            draft: emptyRuleDraft({
                applyMode: "updateAll",
                field: "tags",
                tagMode: "add",
                useAccountScope: false,
                useAmountScope: false
            }),
            robotState: {
                kind: workflowMocks.existingRuleDrifted.current ? "drift" : "match",
                rule: { id: "rule-1" }
            }
        };
    }
}));

vi.mock("@/components/features/transactions/TransactionRulePopup", () => ({
    TransactionRulePopup: (props: TransactionRulePopupProps) => (
        <div data-testid="transaction-rule-popup">
            {props.isDrift ? (
                <button data-testid="rule-apply-this" onClick={props.onApplyThis} type="button">
                    Apply to this transaction
                </button>
            ) : null}
            <button data-testid="rule-delete" onClick={props.onDelete} type="button">
                Delete rule
            </button>
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

beforeEach(() => {
    workflowMocks.applyProposal.mockReset();
    workflowMocks.applyProposal.mockReturnValue(true);
    workflowMocks.applyThis.mockReset();
    workflowMocks.existingRuleVisible.current = false;
    workflowMocks.existingRuleDrifted.current = false;
    workflowMocks.removeRule.mockClear();
});

describe("transaction inspector automation focus continuity", () => {
    it("moves focus to the field heading before dismissing a keyboard-focused proposal", () => {
        const controller = createController();
        controller.publishAutomationEditorCommit(
            { columnId: "tags", transactionId: TRANSACTION_ID },
            { ok: true, status: "changed" }
        );
        renderAutomation(controller);
        const dismiss = screen.getByRole("button", {
            name: "Dismiss without creating a rule"
        });
        enterInspectorFrom(controller, dismiss);

        fireEvent.click(dismiss, { detail: 0 });

        expect(screen.queryByTestId("tags-rule-proposal")).not.toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByTestId("tags-automation-title"));
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
    });

    it("moves focus to the field heading after a successful keyboard-confirmed proposal", () => {
        const controller = createController();
        controller.publishAutomationEditorCommit(
            { columnId: "tags", transactionId: TRANSACTION_ID },
            { ok: true, status: "changed" }
        );
        renderAutomation(controller);
        const confirm = screen.getByRole("button", { name: "Create this rule" });
        enterInspectorFrom(controller, confirm);

        fireEvent.click(confirm, { detail: 0 });

        expect(workflowMocks.applyProposal).toHaveBeenCalledOnce();
        expect(screen.queryByTestId("tags-rule-proposal")).not.toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByTestId("tags-automation-title"));
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
    });

    it("moves focus to the field heading before deleting a keyboard-focused existing rule", () => {
        workflowMocks.existingRuleVisible.current = true;
        const controller = createController();
        const view = renderAutomation(controller);
        const remove = screen.getByRole("button", { name: "Delete rule" });
        enterInspectorFrom(controller, remove);

        fireEvent.click(remove, { detail: 0 });
        view.rerender(
            <TransactionInspectorAutomation
                context={CONTEXT}
                controller={controller}
                transactionId={TRANSACTION_ID}
            />
        );

        expect(workflowMocks.removeRule).toHaveBeenCalledWith("rule-1");
        expect(screen.queryByTestId("rule-delete")).not.toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByTestId("tags-automation-title"));
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
    });

    it("moves focus to the field heading before applying a drifted rule to the transaction", () => {
        workflowMocks.existingRuleVisible.current = true;
        workflowMocks.existingRuleDrifted.current = true;
        const controller = createController();
        renderAutomation(controller);
        const applyThis = screen.getByRole("button", { name: "Apply to this transaction" });
        enterInspectorFrom(controller, applyThis);

        fireEvent.click(applyThis, { detail: 0 });

        expect(workflowMocks.applyThis).toHaveBeenCalledOnce();
        expect(document.activeElement).toBe(screen.getByTestId("tags-automation-title"));
        expect(controller.getInteractionState()).toMatchObject({ kind: "inspecting" });
    });
});
