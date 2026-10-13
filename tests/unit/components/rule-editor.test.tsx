/**
 * The shared rule editor rendered in each state the mockup defines
 * (`specs/fusion-mission-recovery/mockups/rule-editor.html`).
 *
 * The inspector and the Automations page both drive these props; the inspector's own tests mock the
 * editor, so its behaviour is pinned here. Assertions use roles and accessible names; copy is
 * asserted only where it is the behaviour.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
    type RuleEditorDraft,
    emptyRuleDraft
} from "@/components/features/automations/rule-editor-model";
import { RuleEditor, type RuleEditorProps } from "@/components/features/automations/RuleEditor";
import { DEFAULT_REMEMBERED_CHOICE } from "@/lib/domain/automation/preferences";
import { asMinorUnits } from "@/lib/domain/currency";

beforeAll(() => {
    // jsdom lacks layout and the Pointer Capture API, both of which Radix's select uses when its
    // list opens. Supplying only those keeps the real component under test.
    Element.prototype.scrollIntoView ??= () => {};
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const ACCOUNTS = [
    { id: "acc-a", label: "Everyday" },
    { id: "acc-b", label: "Credit card" }
];
const TAGS = [
    { id: "tag-coffee", label: "coffee" },
    { id: "tag-work", label: "work" }
];
const PEOPLE = [
    { id: "p-alex", label: "Alex" },
    { id: "p-sam", label: "Sam" }
];
const ALIASES = [
    { id: "alias-coffee", label: "Coffee" },
    { id: "alias-cafe", label: "Cafe" }
];

const THREE_OUTPUTS: RuleEditorDraft = {
    ...emptyRuleDraft(DEFAULT_REMEMBERED_CHOICE),
    descriptionText: "COFFEE SHOP 123",
    outputs: {
        descriptionAlias: { aliasId: "alias-coffee" },
        tags: { mode: "add", tagIds: ["tag-coffee"] },
        allocation: { "p-alex": "50", "p-sam": "50" }
    }
};

const TRANSACTION = {
    accountId: "acc-a",
    accountLabel: "Everyday",
    amount: asMinorUnits(-450),
    amountLabel: "-$4.50"
};

function props(overrides: Partial<RuleEditorProps> = {}): RuleEditorProps {
    return {
        mode: "edit",
        context: "transaction",
        title: { kind: "rule", conditions: "COFFEE SHOP 123 · any account · any amount" },
        draft: THREE_OUTPUTS,
        onDraftChange: vi.fn(),
        errors: {},
        accounts: ACCOUNTS,
        tags: TAGS,
        people: PEOPLE,
        aliases: ALIASES,
        currencyCode: "USD",
        referenceDate: Temporal.PlainDate.from("2026-07-25"),
        transaction: TRANSACTION,
        canSplit: true,
        onSplit: vi.fn(),
        onAddOutput: vi.fn(),
        onApply: vi.fn(),
        onCancel: vi.fn(),
        onDelete: vi.fn(),
        idPrefix: "test-rule",
        ...overrides
    };
}

function editor(): HTMLElement {
    return screen.getByRole("group", { name: /^(New rule|Rule|Adding)/ });
}

/** Open a Radix select from the keyboard: Radix opens on pointer capture, which jsdom lacks. */
function openSelect(trigger: HTMLElement): void {
    fireEvent.keyDown(trigger, { key: "Enter" });
}

describe("RuleEditor: create", () => {
    it("names the group after the title and offers no Delete", () => {
        render(
            <RuleEditor
                {...props({
                    mode: "create",
                    context: "standalone",
                    title: { kind: "new" },
                    draft: emptyRuleDraft(DEFAULT_REMEMBERED_CHOICE),
                    canSplit: false,
                    onDelete: undefined,
                    applyLabel: "Create and apply",
                    transaction: undefined,
                    referenceDate: undefined
                })}
            />
        );

        expect(screen.getByRole("group", { name: "New rule" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Create and apply" })).toBeEnabled();
        expect(screen.queryByRole("button", { name: /delete rule/i })).toBeNull();
        expect(screen.getByRole("textbox", { name: /exact description text/i })).toHaveValue("");
        expect(screen.queryByRole("button", { name: /^split/i })).toBeNull();
    });

    it("types the description into the draft", () => {
        const onDraftChange = vi.fn();
        const draft = emptyRuleDraft(DEFAULT_REMEMBERED_CHOICE);
        render(
            <RuleEditor
                {...props({
                    mode: "create",
                    context: "standalone",
                    title: { kind: "new" },
                    draft,
                    onDraftChange,
                    transaction: undefined
                })}
            />
        );

        fireEvent.change(screen.getByRole("textbox", { name: /exact description text/i }), {
            target: { value: "COFFEE SHOP 123" }
        });

        expect(onDraftChange).toHaveBeenCalledWith({
            ...draft,
            descriptionText: "COFFEE SHOP 123"
        });
    });

    it("defaults the Apply label to Apply", () => {
        render(<RuleEditor {...props()} />);
        expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    });
});

describe("RuleEditor: edit with three outputs", () => {
    it("shows one badge per output, each with Edit and Split, and Delete rule", () => {
        render(<RuleEditor {...props()} />);

        expect(
            screen.getByRole("group", {
                name: "Rule · COFFEE SHOP 123 · any account · any amount"
            })
        ).toBeInTheDocument();
        for (const label of ["Description", "Tags", "Allocation"]) {
            expect(screen.getByRole("button", { name: `Edit ${label}` })).toHaveAttribute(
                "aria-expanded",
                "false"
            );
            expect(
                screen.getByRole("button", { name: `Split ${label} into its own rule` })
            ).toBeInTheDocument();
        }
        expect(screen.getByRole("button", { name: /delete rule/i })).toBeInTheDocument();
        // The description is the rule's stored key: shown, not editable.
        expect(screen.queryByRole("textbox", { name: /exact description text/i })).toBeNull();
    });

    it("summarises each output's value", () => {
        render(<RuleEditor {...props()} />);

        expect(screen.getByTestId("rule-output-descriptionAlias")).toHaveTextContent(
            "rename to “Coffee”"
        );
        expect(screen.getByTestId("rule-output-tags")).toHaveTextContent("add #coffee");
        expect(screen.getByTestId("rule-output-allocation")).toHaveTextContent(
            "Alex 50% / Sam 50%"
        );
    });

    it("splits the chosen output", () => {
        const onSplit = vi.fn();
        render(<RuleEditor {...props({ onSplit })} />);

        fireEvent.click(screen.getByRole("button", { name: "Split Tags into its own rule" }));

        expect(onSplit).toHaveBeenCalledWith("tags");
    });

    it("previews a split as two rules with the same conditions and acts only on confirm", () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<RuleEditor {...props({ splitPreview: { field: "tags", onConfirm, onCancel } })} />);

        const preview = screen.getByRole("group", { name: "Split preview" });
        expect(preview).toHaveTextContent("Split tags into its own rule.");
        const source = within(preview).getByTestId("rule-split-preview-source");
        const split = within(preview).getByTestId("rule-split-preview-new");
        for (const card of [source, split]) {
            expect(card).toHaveTextContent("COFFEE SHOP 123");
            expect(card).toHaveTextContent("any account · any amount");
        }
        expect(source).toHaveTextContent("Description: rename to “Coffee”");
        expect(source).toHaveTextContent("Allocation: Alex 50% / Sam 50%");
        expect(source).not.toHaveTextContent("Tags:");
        expect(split).toHaveTextContent("Tags: add #coffee");
        expect(split).not.toHaveTextContent("Description:");
        expect(within(split).getByText("new")).toBeVisible();
        expect(onConfirm).not.toHaveBeenCalled();

        fireEvent.click(within(preview).getByRole("button", { name: "Back" }));
        expect(onCancel).toHaveBeenCalledTimes(1);
        fireEvent.click(within(preview).getByRole("button", { name: "Confirm split" }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("names the restricted account and amount in the split preview", () => {
        render(
            <RuleEditor
                {...props({
                    draft: {
                        ...THREE_OUTPUTS,
                        useAccountScope: true,
                        accountId: "acc-b",
                        useAmountScope: true,
                        amountText: "-4.5"
                    },
                    splitPreview: { field: "allocation", onConfirm: vi.fn(), onCancel: vi.fn() }
                })}
            />
        );
        expect(screen.getByTestId("rule-split-preview-new")).toHaveTextContent(
            "Credit card · -4.5"
        );
    });

    it("hides Split everywhere when splitting is not allowed", () => {
        render(<RuleEditor {...props({ canSplit: false })} />);
        expect(screen.queryByRole("button", { name: /^split/i })).toBeNull();
    });

    it("calls Apply, Cancel and Delete", () => {
        const onApply = vi.fn();
        const onCancel = vi.fn();
        const onDelete = vi.fn();
        render(<RuleEditor {...props({ onApply, onCancel, onDelete })} />);

        fireEvent.click(screen.getByRole("button", { name: "Apply" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: /delete rule/i }));

        expect(onApply).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("disables Apply on request", () => {
        render(<RuleEditor {...props({ applyDisabled: true })} />);
        expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    });
});

describe("RuleEditor: output value editors", () => {
    it("expands a badge into its editor and toggles tags with aria-pressed", () => {
        const onDraftChange = vi.fn();
        render(<RuleEditor {...props({ onDraftChange })} />);

        fireEvent.click(screen.getByRole("button", { name: "Edit Tags" }));
        expect(screen.getByRole("button", { name: "Done editing Tags" })).toHaveAttribute(
            "aria-expanded",
            "true"
        );

        const group = screen.getByRole("group", { name: "Tags to apply" });
        expect(within(group).getByRole("button", { name: "coffee" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
        fireEvent.click(within(group).getByRole("button", { name: "work" }));

        expect(onDraftChange).toHaveBeenCalledWith({
            ...THREE_OUTPUTS,
            outputs: {
                ...THREE_OUTPUTS.outputs,
                tags: { mode: "add", tagIds: ["tag-coffee", "tag-work"] }
            }
        });
    });

    it("edits allocation as one labelled input per person, blank meaning no answer", () => {
        const onDraftChange = vi.fn();
        render(
            <RuleEditor
                {...props({
                    onDraftChange,
                    draft: { ...THREE_OUTPUTS, outputs: { allocation: { "p-alex": "100" } } }
                })}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Edit Allocation" }));
        expect(screen.getByRole("textbox", { name: "Alex" })).toHaveValue("100");
        expect(screen.getByRole("textbox", { name: "Sam" })).toHaveValue("");

        fireEvent.change(screen.getByRole("textbox", { name: "Sam" }), { target: { value: "0" } });

        expect(onDraftChange).toHaveBeenCalledWith({
            ...THREE_OUTPUTS,
            outputs: { allocation: { "p-alex": "100", "p-sam": "0" } }
        });
    });

    it("shows each output's error on its own badge even when collapsed", () => {
        render(
            <RuleEditor
                {...props({
                    errors: { aliasId: "Choose an alias.", tagIds: "Choose a tag." }
                })}
            />
        );

        expect(
            within(screen.getByTestId("rule-output-descriptionAlias")).getByRole("alert")
        ).toHaveTextContent("Choose an alias.");
        expect(within(screen.getByTestId("rule-output-tags")).getByRole("alert")).toHaveTextContent(
            "Choose a tag."
        );
        expect(
            within(screen.getByTestId("rule-output-allocation")).queryByRole("alert")
        ).toBeNull();
    });

    it("reports a missing output set on the outputs section", () => {
        render(
            <RuleEditor
                {...props({
                    draft: { ...THREE_OUTPUTS, outputs: {} },
                    errors: { outputs: "Add at least one output." }
                })}
            />
        );
        expect(screen.getByTestId("rule-outputs-error")).toHaveAttribute("role", "alert");
    });
});

describe("RuleEditor: Add output", () => {
    it("lists only the fields the draft has no output for and expands the added one", () => {
        const onAddOutput = vi.fn();
        const { rerender } = render(
            <RuleEditor
                {...props({
                    onAddOutput,
                    draft: { ...THREE_OUTPUTS, outputs: { tags: { mode: "add", tagIds: [] } } }
                })}
            />
        );

        openSelect(screen.getByRole("combobox", { name: "Add output" }));
        const listbox = screen.getByRole("listbox");
        expect(
            within(listbox)
                .getAllByRole("option")
                .map((option) => option.textContent)
        ).toEqual(["Description", "Allocation"]);

        fireEvent.click(within(listbox).getByRole("option", { name: "Allocation" }));
        expect(onAddOutput).toHaveBeenCalledWith("allocation");

        rerender(
            <RuleEditor
                {...props({
                    onAddOutput,
                    draft: {
                        ...THREE_OUTPUTS,
                        outputs: { tags: { mode: "add", tagIds: [] }, allocation: {} }
                    }
                })}
            />
        );
        expect(screen.getByRole("button", { name: "Done editing Allocation" })).toBeInTheDocument();
        expect(screen.getByTestId("rule-allocation-grid")).toBeInTheDocument();
    });

    it("is absent when every field already has an output", () => {
        render(<RuleEditor {...props()} />);
        expect(screen.queryByRole("combobox", { name: "Add output" })).toBeNull();
    });
});

describe("RuleEditor: pending field", () => {
    it("marks the pending badge and hides Split on every badge", () => {
        render(<RuleEditor {...props({ pendingField: "tags" })} />);

        expect(within(screen.getByTestId("rule-output-tags")).getByText("pending")).toBeVisible();
        expect(
            within(screen.getByTestId("rule-output-descriptionAlias")).queryByText("pending")
        ).toBeNull();
        expect(screen.queryByRole("button", { name: /^split/i })).toBeNull();
    });

    const TWO_OUTPUTS = {
        ...THREE_OUTPUTS,
        outputs: {
            descriptionAlias: { aliasId: "alias-coffee" },
            tags: { mode: "add", tagIds: ["tag-coffee"] }
        }
    } as const;

    it("opens the pending output's editor and, when locked, locks every other output", () => {
        render(
            <RuleEditor
                {...props({ draft: TWO_OUTPUTS, lockOtherOutputs: true, pendingField: "tags" })}
            />
        );

        // Only the pending output is written, so it alone is editable, and it starts open.
        expect(screen.getByRole("button", { name: "Done editing Tags" })).toHaveAttribute(
            "aria-expanded",
            "true"
        );
        expect(screen.getByTestId("rule-tag-mode")).toBeVisible();
        expect(screen.getByTestId("rule-tag-tag-coffee")).toHaveAttribute("aria-pressed", "true");
        expect(screen.queryByRole("button", { name: "Edit Description" })).toBeNull();
        expect(screen.queryByRole("combobox", { name: "Add output" })).toBeNull();
    });

    it("keeps Edit and Add output when not locked, because Apply writes the whole draft", () => {
        render(<RuleEditor {...props({ draft: TWO_OUTPUTS, pendingField: "tags" })} />);

        expect(within(screen.getByTestId("rule-output-tags")).getByText("pending")).toBeVisible();
        expect(screen.getByRole("button", { name: "Edit Description" })).toBeVisible();
        expect(screen.getByRole("combobox", { name: "Add output" })).toBeVisible();
        expect(screen.queryByRole("button", { name: /^split/i })).toBeNull();
    });

    it("shows the stored value a pending output overwrites under its badge only", () => {
        render(
            <RuleEditor
                {...props({
                    draft: TWO_OUTPUTS,
                    lockOtherOutputs: true,
                    pendingField: "tags",
                    pendingStoredSummary: "add #tea"
                })}
            />
        );

        const tags = screen.getByTestId("rule-output-tags");
        expect(within(tags).getByTestId("rule-output-stored-tags")).toHaveTextContent(
            "Stored: add #tea"
        );
        expect(screen.getAllByText(/^Stored:/)).toHaveLength(1);
    });

    it("shows no stored line without a stored value", () => {
        render(<RuleEditor {...props({ draft: TWO_OUTPUTS, pendingField: "tags" })} />);
        expect(screen.queryByText(/^Stored:/)).toBeNull();
    });

    it("names the extended rule in the title", () => {
        render(
            <RuleEditor
                {...props({
                    title: { kind: "extend", field: "tags", conditions: "COFFEE SHOP 123" },
                    pendingField: "tags"
                })}
            />
        );
        expect(
            screen.getByRole("group", { name: "Adding tags to rule · COFFEE SHOP 123" })
        ).toBeInTheDocument();
    });
});

describe("RuleEditor: divergence", () => {
    it("marks the diverging badge amber, states both values and applies to this row", () => {
        const onApplyThis = vi.fn();
        render(
            <RuleEditor
                {...props({
                    onApplyThis,
                    divergence: { descriptionAlias: { ruleValue: "“Coffee”", rowValue: "“Cafe”" } }
                })}
            />
        );

        const badge = screen.getByTestId("rule-output-descriptionAlias");
        expect(badge.className).toMatch(/border-amber-500/);
        expect(within(badge).getByTestId("transaction-rule-drift")).toHaveTextContent(
            /differs on this transaction/i
        );
        const drift = within(badge).getByTestId("rule-drift-descriptionAlias");
        expect(drift).toHaveTextContent("“Coffee”");
        expect(drift).toHaveTextContent("“Cafe”");

        fireEvent.click(within(badge).getByRole("button", { name: /apply to this transaction/i }));
        expect(onApplyThis).toHaveBeenCalledWith("descriptionAlias");

        // Only the diverging output is marked.
        expect(screen.getByTestId("rule-output-tags").className).not.toMatch(/border-amber-500/);
        expect(screen.getAllByTestId("transaction-rule-drift")).toHaveLength(1);
    });
});

describe("RuleEditor: resolution panels", () => {
    it("states that a move keeps the owner when it has other outputs", () => {
        render(
            <RuleEditor
                {...props({
                    pendingField: "tags",
                    resolution: {
                        kind: "conflict",
                        owner: { id: "r-owner", label: "Tags + Allocation rule" },
                        host: { id: "r-host", label: "Description rule" },
                        choice: "keep",
                        onChoose: vi.fn(),
                        ownerKeepsOutputs: true
                    }
                })}
            />
        );
        const move = screen.getByRole("radio", { name: /move tags into the description rule/i });
        expect(move).toHaveAccessibleDescription(
            /tags \+ allocation rule keeps its other outputs/i
        );
        expect(move).not.toHaveAccessibleDescription(/is deleted/i);
    });

    it("defaults a conflict to keeping the owner and offers moving as a choice", () => {
        const onChoose = vi.fn();
        render(
            <RuleEditor
                {...props({
                    pendingField: "tags",
                    resolution: {
                        kind: "conflict",
                        owner: { id: "r2", label: "Tags rule · COFFEE SHOP 123" },
                        host: { id: "r1", label: "Description rule · COFFEE SHOP 123" },
                        choice: "keep",
                        onChoose,
                        ownerKeepsOutputs: false
                    }
                })}
            />
        );

        const panel = screen.getByTestId("rule-resolution");
        const group = within(panel).getByRole("radiogroup");
        const keep = within(group).getByRole("radio", { name: /update the tags rule/i });
        const move = within(group).getByRole("radio", {
            name: /move tags into the description rule/i
        });
        expect(keep).toBeChecked();
        expect(move).not.toBeChecked();
        // The move option states the source rule's fate before it is chosen.
        expect(move).toHaveAccessibleDescription(/tags rule · coffee shop 123 is deleted/i);
        expect(move).not.toHaveAccessibleDescription(/keeps its other outputs/i);

        fireEvent.click(move);
        expect(onChoose).toHaveBeenCalledWith("move");
    });

    it("renders the panel above the conditions", () => {
        render(
            <RuleEditor
                {...props({
                    resolution: {
                        kind: "conflict",
                        owner: { id: "r2", label: "Owner" },
                        host: { id: "r1", label: "Host" },
                        choice: "keep",
                        onChoose: vi.fn(),
                        ownerKeepsOutputs: false
                    }
                })}
            />
        );
        const panel = screen.getByTestId("rule-resolution");
        const matches = screen.getByRole("group", { name: "Matches" });
        expect(
            panel.compareDocumentPosition(matches) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });

    it("disables Apply until an ambiguous target is chosen", () => {
        const onChoose = vi.fn();
        const resolution = {
            kind: "ambiguous" as const,
            candidates: [
                { id: "r1", label: "Rule one", summary: "Everyday · any amount" },
                { id: "r2", label: "Rule two", summary: "any account · -$4.50" }
            ],
            choice: null,
            onChoose
        };
        const { rerender } = render(<RuleEditor {...props({ resolution })} />);

        expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
        fireEvent.click(screen.getByRole("radio", { name: "Rule two" }));
        expect(onChoose).toHaveBeenCalledWith("r2");

        rerender(<RuleEditor {...props({ resolution: { ...resolution, choice: "r2" } })} />);
        expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
        expect(screen.getByRole("radio", { name: "Rule two" })).toBeChecked();
    });
});

describe("RuleEditor: conditions and scope by context", () => {
    it("offers this row's account and amount as checkboxes in a transaction", () => {
        const onDraftChange = vi.fn();
        render(<RuleEditor {...props({ onDraftChange })} />);

        const account = screen.getByRole("checkbox", { name: "Only this account: Everyday" });
        const amount = screen.getByRole("checkbox", { name: "Only if amount is -$4.50" });
        expect(account).not.toBeChecked();
        expect(amount).not.toBeChecked();

        fireEvent.click(account);
        expect(onDraftChange).toHaveBeenLastCalledWith({
            ...THREE_OUTPUTS,
            useAccountScope: true,
            accountId: "acc-a"
        });
        fireEvent.click(amount);
        expect(onDraftChange).toHaveBeenLastCalledWith({
            ...THREE_OUTPUTS,
            useAmountScope: true,
            amountText: "-4.5"
        });
    });

    it("names the stored account when the rule's condition differs from the row", () => {
        render(
            <RuleEditor
                {...props({
                    draft: { ...THREE_OUTPUTS, useAccountScope: true, accountId: "acc-b" },
                    storedConditionsNote:
                        "Stored conditions shown; this transaction is on Everyday."
                })}
            />
        );
        expect(
            screen.getByRole("checkbox", { name: "Only this account: Credit card" })
        ).toBeChecked();
        expect(screen.getByTestId("rule-stored-conditions-note").className).toMatch(/amber/);
    });

    it("shows the inclusive date hint and Apply on blur in a transaction", () => {
        const onDraftChange = vi.fn();
        render(<RuleEditor {...props({ onDraftChange })} />);

        const updateNew = screen.getByRole("radio", { name: "Update new" });
        expect(updateNew).toHaveAccessibleDescription(
            `Matching transactions dated ${Temporal.PlainDate.from("2026-07-25").toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric" })} or later, plus future imports.`
        );
        const applyOnBlur = screen.getByRole("checkbox", { name: "Apply on blur" });
        expect(applyOnBlur).toHaveAccessibleDescription(/focus leaves this transaction row/i);

        fireEvent.click(applyOnBlur);
        expect(onDraftChange).toHaveBeenCalledWith({
            ...THREE_OUTPUTS,
            applyOnBlur: !THREE_OUTPUTS.applyOnBlur
        });
    });

    it("offers an account select and amount input on the Automations page, without Apply on blur", () => {
        const onDraftChange = vi.fn();
        render(
            <RuleEditor
                {...props({
                    context: "standalone",
                    transaction: undefined,
                    referenceDate: undefined,
                    onDraftChange
                })}
            />
        );

        expect(screen.queryByRole("checkbox", { name: "Apply on blur" })).toBeNull();
        expect(screen.getByRole("radio", { name: "Update new" })).toHaveAccessibleDescription(
            "Only transactions imported from now on."
        );
        expect(screen.getByRole("combobox", { name: "Only this account" })).toHaveTextContent(
            "Any account"
        );

        fireEvent.change(screen.getByRole("textbox", { name: "Only if amount is" }), {
            target: { value: "4.50" }
        });
        expect(onDraftChange).toHaveBeenLastCalledWith({
            ...THREE_OUTPUTS,
            amountText: "4.50",
            useAmountScope: true
        });

        openSelect(screen.getByRole("combobox", { name: "Only this account" }));
        fireEvent.click(screen.getByRole("option", { name: "Credit card" }));
        expect(onDraftChange).toHaveBeenLastCalledWith({
            ...THREE_OUTPUTS,
            useAccountScope: true,
            accountId: "acc-b"
        });
    });

    it("puts the scope radios in one radiogroup and reports the choice", () => {
        const onDraftChange = vi.fn();
        render(
            <RuleEditor {...props({ onDraftChange, draft: { ...THREE_OUTPUTS, scope: "new" } })} />
        );

        const group = screen.getByRole("radiogroup", { name: "Which transactions to update" });
        const radios = within(group).getAllByRole("radio");
        expect(radios.map((radio) => radio.getAttribute("data-testid"))).toEqual([
            "rule-scope-all",
            "rule-scope-new"
        ]);
        expect(within(group).getByRole("radio", { name: "Update new" })).toBeChecked();

        fireEvent.click(within(group).getByRole("radio", { name: "Update all" }));
        expect(onDraftChange).toHaveBeenCalledWith({ ...THREE_OUTPUTS, scope: "all" });
    });

    it("shows the population line only when a count is given", () => {
        const { rerender } = render(<RuleEditor {...props()} />);
        expect(screen.queryByTestId("rule-population")).toBeNull();

        rerender(<RuleEditor {...props({ populationCount: 3 })} />);
        expect(screen.getByTestId("rule-population")).toHaveTextContent(
            "3 transactions would change now"
        );
        rerender(<RuleEditor {...props({ populationCount: 1 })} />);
        expect(screen.getByTestId("rule-population")).toHaveTextContent(
            "1 transaction would change now"
        );
    });
});

describe("RuleEditor: portals", () => {
    it("registers every select's portaled list with the owner", () => {
        const registerPortal = vi.fn();
        const draft: RuleEditorDraft = {
            ...THREE_OUTPUTS,
            outputs: {
                descriptionAlias: { aliasId: "alias-coffee" },
                tags: { mode: "add", tagIds: [] }
            }
        };
        render(
            <RuleEditor
                {...props({
                    context: "standalone",
                    transaction: undefined,
                    draft,
                    registerPortal
                })}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: "Edit Description" }));
        fireEvent.click(screen.getByRole("button", { name: "Edit Tags" }));

        const triggers = [
            screen.getByRole("combobox", { name: "Only this account" }),
            screen.getByRole("combobox", { name: "Description alias to apply" }),
            screen.getByRole("combobox", { name: "Tag mode" }),
            screen.getByRole("combobox", { name: "Add output" })
        ];
        for (const trigger of triggers) {
            registerPortal.mockClear();
            openSelect(trigger);
            const listbox = screen.getByRole("listbox");
            const registered = registerPortal.mock.calls
                .map(([element]: unknown[]) => element)
                .filter((element): element is HTMLElement => element instanceof HTMLElement);
            expect(registered.some((element) => element.contains(listbox))).toBe(true);
            fireEvent.keyDown(listbox, { key: "Escape" });
            expect(screen.queryByRole("listbox")).toBeNull();
        }
    });
});

describe("RuleEditor: keyboard", () => {
    /** The document's sequential focus order, as Tab would walk it. */
    function tabSequence(container: HTMLElement): readonly HTMLElement[] {
        return Array.from(
            container.querySelectorAll<HTMLElement>("button, input, select, textarea, [tabindex]")
        ).filter(
            (element) =>
                !element.hasAttribute("disabled") &&
                element.tabIndex >= 0 &&
                element.getAttribute("aria-hidden") !== "true"
        );
    }

    it("reaches every control by Tab, in layout order, with no positive tabindex", () => {
        render(
            <RuleEditor
                {...props({
                    draft: { ...THREE_OUTPUTS, outputs: { tags: { mode: "add", tagIds: [] } } },
                    canSplit: false,
                    divergence: { tags: { ruleValue: "#coffee", rowValue: "no tags" } },
                    onApplyThis: vi.fn()
                })}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: "Edit Tags" }));

        const sequence = tabSequence(editor());
        expect(sequence.every((element) => element.tabIndex === 0)).toBe(true);

        const expectedOrder = [
            screen.getByRole("checkbox", { name: /only this account/i }),
            screen.getByRole("checkbox", { name: /only if amount is/i }),
            screen.getByRole("button", { name: "Done editing Tags" }),
            screen.getByRole("button", { name: /apply to this transaction/i }),
            screen.getByRole("combobox", { name: "Tag mode" }),
            screen.getByRole("button", { name: "coffee" }),
            screen.getByRole("button", { name: "work" }),
            screen.getByRole("combobox", { name: "Add output" }),
            // A radiogroup is one Tab stop, which forwards focus to its checked radio.
            screen.getByRole("radiogroup", { name: "Which transactions to update" }),
            screen.getByRole("checkbox", { name: "Apply on blur" }),
            screen.getByRole("button", { name: "Apply" }),
            screen.getByRole("button", { name: "Cancel" }),
            screen.getByRole("button", { name: /delete rule/i })
        ];
        expect(sequence).toEqual(expectedOrder);
    });

    it("enters the radiogroup on its checked radio and moves with the arrow keys", async () => {
        const onDraftChange = vi.fn();
        render(
            <RuleEditor {...props({ onDraftChange, draft: { ...THREE_OUTPUTS, scope: "all" } })} />
        );

        const group = screen.getByRole("radiogroup", { name: "Which transactions to update" });
        const all = screen.getByRole("radio", { name: "Update all" });
        const updateNew = screen.getByRole("radio", { name: "Update new" });

        group.focus();
        expect(all).toHaveFocus();

        // Radix moves roving focus in a timeout after the keydown, so wait for it.
        fireEvent.keyDown(all, { key: "ArrowDown" });
        await waitFor(() => expect(updateNew).toHaveFocus());
    });
});
