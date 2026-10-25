"use client";

/**
 * The shared rule editor: one layout for creating and editing a grouped rule, whether opened from a
 * transaction in the inspector or from the Automations page.
 *
 * Conditions, then one badge per output, then the scope choice, then the actions. It is
 * presentational: the caller owns the draft, the vault mutations and the resolution of which rule an
 * edit extends. The only local state is which output badges are expanded.
 */

import { type RefCallback, useState } from "react";
import { type Temporal } from "temporal-polyfill";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { RULE_FIELDS, type RuleField, type TagRuleMode } from "@/lib/domain/automation/rules";
import { type MoneyMinorUnits } from "@/lib/domain/currency";
import { cn } from "@/lib/utils";
import { assertNever } from "@/lib/utils/exhaustive";

import {
    amountTextFromMinor,
    outputValueSummary,
    RULE_FIELD_LABELS,
    type RuleEditorOption
} from "./rule-editor-data";
import {
    type ApplyScope,
    draftOutputFields,
    type RuleEditorDraft,
    type RuleEditorFieldErrors
} from "./rule-editor-model";

/** What the editor's title names: a new rule, an existing rule, or a rule an output joins. */
export type RuleEditorTitle =
    | { readonly kind: "new" }
    | { readonly kind: "rule"; readonly conditions: string }
    | { readonly kind: "extend"; readonly field: RuleField; readonly conditions: string };

/** The transaction the inspector opened the editor from, for the "Only this …" checkboxes. */
export interface RuleEditorTransaction {
    readonly accountId: string;
    readonly accountLabel: string;
    /** `undefined` when the row's amount is blank; ticking the amount restriction then fails validation. */
    readonly amount: MoneyMinorUnits | undefined;
    readonly amountLabel: string;
}

/** How one output's rule value differs from the transaction's current value. */
export interface RuleEditorDivergence {
    readonly ruleValue: string;
    readonly rowValue: string;
}

/**
 * A required choice about which rule takes the pending output. `conflict`: the field already belongs
 * to another rule, and the user keeps it there (default) or moves it into the host. `ambiguous`:
 * several rules could take it and the user must pick one before Apply.
 */
export type RuleEditorResolution =
    | {
          readonly kind: "conflict";
          readonly owner: RuleEditorOption;
          readonly host: RuleEditorOption;
          readonly choice: "keep" | "move";
          readonly onChoose: (choice: "keep" | "move") => void;
          /**
           * Whether the owner keeps other outputs after the move. `moveFieldRuleOutput` deletes the
           * owner only when the move empties it, so the move hint must state whichever fate applies.
           * Required: a default would state the wrong fate for one of the two cases.
           */
          readonly ownerKeepsOutputs: boolean;
      }
    | {
          readonly kind: "ambiguous";
          readonly candidates: readonly (RuleEditorOption & { readonly summary: string })[];
          readonly choice: string | null;
          readonly onChoose: (id: string) => void;
      };

/** An open "Split <field> into its own rule" preview. Nothing is written until Confirm split. */
export interface RuleEditorSplitPreview {
    readonly field: RuleField;
    readonly onConfirm: () => void;
    readonly onCancel: () => void;
}

export interface RuleEditorProps {
    /** `create` for a rule that does not exist yet; `edit` for an existing rule. */
    readonly mode: "create" | "edit";
    /** `transaction` in the inspector, `standalone` on the Automations page. */
    readonly context: "transaction" | "standalone";
    /** What the heading names; also the editor group's accessible name. */
    readonly title: RuleEditorTitle;
    readonly draft: RuleEditorDraft;
    readonly onDraftChange: (next: RuleEditorDraft) => void;
    readonly errors: RuleEditorFieldErrors;
    readonly accounts: readonly RuleEditorOption[];
    readonly tags: readonly RuleEditorOption[];
    readonly people: readonly RuleEditorOption[];
    readonly aliases: readonly RuleEditorOption[];
    readonly currencyCode: string;
    /** Transaction context: the date Update new counts from, inclusive. */
    readonly referenceDate?: Temporal.PlainDate;
    /** Transaction context: the row whose account and amount the restriction checkboxes use. */
    readonly transaction?: RuleEditorTransaction;
    /** Shown in amber under the conditions when the rule's stored conditions differ from the row. */
    readonly storedConditionsNote?: string;
    /**
     * The output an unapplied edit is for. Its badge is marked pending and starts expanded, and Split
     * is hidden on every badge, because a split acts on the stored rule.
     */
    readonly pendingField?: RuleField;
    /**
     * The pending output's stored value, shown muted under its badge so the user sees what Apply
     * overwrites. Only meaningful with {@link pendingField}.
     */
    readonly pendingStoredSummary?: string;
    /**
     * Lock every output except {@link pendingField}: Edit on the others and Add output are hidden.
     * The inspector's proposal card sets it because its Apply writes only the pending output; the
     * Automations page writes the whole draft and so never locks.
     */
    readonly lockOtherOutputs?: boolean;
    /** Outputs whose rule value disagrees with the transaction. Information, so amber, not red. */
    readonly divergence?: Partial<Record<RuleField, RuleEditorDivergence>>;
    /** A required choice of target rule, rendered above the conditions. */
    readonly resolution?: RuleEditorResolution;
    /** How many transactions Apply would change now. The line is hidden when undefined. */
    readonly populationCount?: number;
    /** True only when the rule exists, has more than one output and nothing is pending. */
    readonly canSplit: boolean;
    /** Asks to split `field` out. The caller opens {@link splitPreview}; it acts only on confirm. */
    readonly onSplit?: (field: RuleField) => void;
    /** The open split preview, rendered under the outputs. */
    readonly splitPreview?: RuleEditorSplitPreview;
    /** Adds an empty output for `field` to the draft. The editor expands its badge. */
    readonly onAddOutput: (field: RuleField) => void;
    readonly onApply: () => void;
    readonly onCancel: () => void;
    /** Rendered as Delete rule only when provided. */
    readonly onDelete?: () => void;
    /** Applies the rule's `field` output to this one transaction, without linking it to the rule. */
    readonly onApplyThis?: (field: RuleField) => void;
    /** Defaults to "Apply". */
    readonly applyLabel?: string;
    readonly applyDisabled?: boolean;
    /** Keeps control ids unique when several editors render on one page. */
    readonly idPrefix: string;
    /** Registers every portaled select surface, so an inspector can treat it as inside itself. */
    readonly registerPortal?: RefCallback<HTMLDivElement>;
    readonly className?: string;
}

const ANY_ACCOUNT = "__any-account__";

const AMBER_TEXT = "text-amber-700 dark:text-amber-400";

/** The mockup's pending tint: a blue accent distinct from amber divergence and red errors. */
const PENDING_CHIP =
    "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
const PENDING_BORDER = "border-blue-500/60 dark:border-blue-400/60";

function isRuleField(value: string): value is RuleField {
    return RULE_FIELDS.some((field) => field === value);
}

function titleText(title: RuleEditorTitle): { readonly heading: string; readonly target?: string } {
    switch (title.kind) {
        case "new":
            return { heading: "New rule" };
        case "rule":
            return { heading: "Rule", target: title.conditions };
        case "extend":
            return {
                heading: `Adding ${RULE_FIELD_LABELS[title.field].toLowerCase()} to rule`,
                target: title.conditions
            };
        default:
            return assertNever(title);
    }
}

function formatReferenceDate(date: Temporal.PlainDate): string {
    return date.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function RuleEditor(props: RuleEditorProps): React.JSX.Element {
    const {
        mode,
        context,
        title,
        draft,
        onDraftChange,
        errors,
        accounts,
        tags,
        people,
        aliases,
        currencyCode,
        referenceDate,
        transaction,
        storedConditionsNote,
        pendingField,
        pendingStoredSummary,
        lockOtherOutputs = false,
        divergence,
        resolution,
        populationCount,
        canSplit,
        onSplit,
        splitPreview,
        onAddOutput,
        onApply,
        onCancel,
        onDelete,
        onApplyThis,
        applyLabel = "Apply",
        applyDisabled = false,
        idPrefix,
        registerPortal,
        className
    } = props;

    // The pending output starts open so its value controls are reachable without a click.
    const [expanded, setExpanded] = useState<readonly RuleField[]>(
        pendingField == null ? [] : [pendingField]
    );

    const set = (partial: Partial<RuleEditorDraft>): void =>
        onDraftChange({ ...draft, ...partial });

    const { heading, target } = titleText(title);
    const groupLabel = target == null ? heading : `${heading} · ${target}`;
    const fields = draftOutputFields(draft);
    const locked = lockOtherOutputs && pendingField != null;
    const absentFields = locked ? [] : RULE_FIELDS.filter((field) => !fields.includes(field));
    const splitAvailable = canSplit && pendingField == null && onSplit != null;
    const unresolved = resolution?.kind === "ambiguous" && resolution.choice == null;
    const rowConditions = context === "transaction" ? transaction : undefined;

    const toggleExpanded = (field: RuleField): void =>
        setExpanded((current) =>
            current.includes(field)
                ? current.filter((candidate) => candidate !== field)
                : [...current, field]
        );

    const addOutput = (value: string): void => {
        if (!isRuleField(value)) return;
        setExpanded((current) => (current.includes(value) ? current : [...current, value]));
        onAddOutput(value);
    };

    const newHint =
        context === "transaction" && referenceDate != null
            ? `Matching transactions dated ${formatReferenceDate(referenceDate)} or later, plus future imports.`
            : "Only transactions imported from now on.";

    return (
        <div
            aria-label={groupLabel}
            className={cn("space-y-4", className)}
            data-testid="field-rule-editor"
            role="group"
        >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h3 className="text-sm font-semibold">{heading}</h3>
                {target == null ? null : (
                    <span className="text-muted-foreground text-xs break-all">{target}</span>
                )}
            </div>

            {resolution == null ? null : (
                <ResolutionPanel
                    idPrefix={idPrefix}
                    pendingField={pendingField}
                    resolution={resolution}
                />
            )}

            <fieldset className="space-y-2">
                <legend className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    Matches
                </legend>
                <DescriptionCondition
                    editable={context === "standalone" && mode === "create"}
                    error={errors.descriptionText}
                    idPrefix={idPrefix}
                    onChange={(descriptionText) => set({ descriptionText })}
                    value={draft.descriptionText}
                />
                {rowConditions == null ? (
                    <StandaloneConditions
                        accounts={accounts}
                        draft={draft}
                        errors={errors}
                        idPrefix={idPrefix}
                        onChange={set}
                        registerPortal={registerPortal}
                    />
                ) : (
                    <TransactionConditions
                        accounts={accounts}
                        currencyCode={currencyCode}
                        draft={draft}
                        errors={errors}
                        idPrefix={idPrefix}
                        onChange={set}
                        transaction={rowConditions}
                    />
                )}
                {storedConditionsNote == null ? null : (
                    <p
                        className={cn("text-xs", AMBER_TEXT)}
                        data-testid="rule-stored-conditions-note"
                    >
                        {storedConditionsNote}
                    </p>
                )}
            </fieldset>

            <fieldset className="space-y-2">
                <legend className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    Outputs
                </legend>
                {fields.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No outputs yet.</p>
                ) : (
                    <div className="space-y-2">
                        {fields.map((field) => (
                            <OutputBadge
                                aliases={aliases}
                                divergence={divergence?.[field]}
                                draft={draft}
                                editable={!locked || pendingField === field}
                                errors={errors}
                                expanded={expanded.includes(field)}
                                field={field}
                                idPrefix={idPrefix}
                                key={field}
                                onApplyThis={onApplyThis}
                                onChange={set}
                                onSplit={splitAvailable ? onSplit : undefined}
                                onToggleExpanded={toggleExpanded}
                                pending={pendingField === field}
                                storedSummary={
                                    pendingField === field ? pendingStoredSummary : undefined
                                }
                                people={people}
                                registerPortal={registerPortal}
                                tags={tags}
                            />
                        ))}
                    </div>
                )}
                {absentFields.length === 0 ? null : (
                    <div className="flex items-center gap-2">
                        <Select onValueChange={addOutput} value="">
                            <SelectTrigger
                                aria-label="Add output"
                                className="w-44"
                                data-testid="rule-add-output"
                                id={`${idPrefix}-add-output`}
                                size="sm"
                            >
                                <SelectValue placeholder="Add output…" />
                            </SelectTrigger>
                            <SelectContent ref={registerPortal}>
                                {absentFields.map((field) => (
                                    <SelectItem key={field} value={field}>
                                        {RULE_FIELD_LABELS[field]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <FieldError message={errors.outputs} testId="rule-outputs-error" />
                {splitPreview == null ? null : (
                    <SplitPreviewPanel
                        accounts={accounts}
                        aliases={aliases}
                        draft={draft}
                        people={people}
                        preview={splitPreview}
                        tags={tags}
                    />
                )}
            </fieldset>

            <fieldset className="space-y-2">
                <legend className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    Apply to
                </legend>
                <RadioGroup
                    aria-label="Which transactions to update"
                    className="gap-2"
                    onValueChange={(value) => {
                        const scope: ApplyScope | null =
                            value === "all" ? "all" : value === "new" ? "new" : null;
                        if (scope != null) set({ scope });
                    }}
                    value={draft.scope}
                >
                    <ChoiceRow
                        hint="Every matching transaction, past and future."
                        id={`${idPrefix}-scope-all`}
                        label="Update all"
                    >
                        <RadioGroupItem
                            aria-describedby={`${idPrefix}-scope-all-hint`}
                            data-testid="rule-scope-all"
                            id={`${idPrefix}-scope-all`}
                            value="all"
                        />
                    </ChoiceRow>
                    <ChoiceRow hint={newHint} id={`${idPrefix}-scope-new`} label="Update new">
                        <RadioGroupItem
                            aria-describedby={`${idPrefix}-scope-new-hint`}
                            data-testid="rule-scope-new"
                            id={`${idPrefix}-scope-new`}
                            value="new"
                        />
                    </ChoiceRow>
                </RadioGroup>
                {context === "transaction" ? (
                    <ChoiceRow
                        hint="Apply automatically when focus leaves this transaction row. Unchecked: wait for Apply."
                        id={`${idPrefix}-apply-on-blur`}
                        label="Apply on blur"
                    >
                        <Checkbox
                            aria-describedby={`${idPrefix}-apply-on-blur-hint`}
                            checked={draft.applyOnBlur}
                            data-testid="rule-apply-on-blur"
                            id={`${idPrefix}-apply-on-blur`}
                            onCheckedChange={(checked) => set({ applyOnBlur: checked === true })}
                        />
                    </ChoiceRow>
                ) : null}
                {populationCount == null ? null : (
                    <p className="text-muted-foreground text-xs" data-testid="rule-population">
                        {populationCount} transaction{populationCount === 1 ? "" : "s"} would change
                        now
                    </p>
                )}
            </fieldset>

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <Button
                    data-testid="rule-save"
                    disabled={applyDisabled || unresolved}
                    onClick={onApply}
                    type="button"
                >
                    {applyLabel}
                </Button>
                <Button
                    data-testid="rule-cancel"
                    onClick={onCancel}
                    type="button"
                    variant="outline"
                >
                    Cancel
                </Button>
                <span className="flex-1" />
                {onDelete == null ? null : (
                    <Button
                        className="text-destructive"
                        data-testid="rule-delete"
                        onClick={onDelete}
                        type="button"
                        variant="ghost"
                    >
                        Delete rule
                    </Button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Pieces
// ============================================================================

function FieldError({
    id,
    message,
    testId
}: {
    readonly id?: string;
    readonly message?: string;
    readonly testId: string;
}): React.JSX.Element | null {
    if (message == null) return null;
    return (
        <p className="text-destructive text-xs" data-testid={testId} id={id} role="alert">
            {message}
        </p>
    );
}

/** A labelled radio or checkbox with its hint, which the control names as its description. */
function ChoiceRow({
    children,
    hint,
    id,
    label
}: {
    readonly children: React.ReactNode;
    readonly hint: string;
    readonly id: string;
    readonly label: React.ReactNode;
}): React.JSX.Element {
    return (
        <div className="flex items-start gap-2">
            <div className="pt-0.5">{children}</div>
            <div className="grid gap-0.5">
                <Label className="font-normal" htmlFor={id}>
                    {label}
                </Label>
                <span className="text-muted-foreground text-xs" id={`${id}-hint`}>
                    {hint}
                </span>
            </div>
        </div>
    );
}

function DescriptionCondition({
    editable,
    error,
    idPrefix,
    onChange,
    value
}: {
    readonly editable: boolean;
    readonly error?: string;
    readonly idPrefix: string;
    readonly onChange: (value: string) => void;
    readonly value: string;
}): React.JSX.Element {
    const id = `${idPrefix}-description`;
    const errorId = `${id}-error`;
    return (
        <div className="space-y-1">
            {editable ? (
                <>
                    <Label htmlFor={id}>Exact description text</Label>
                    <Input
                        aria-describedby={error == null ? undefined : errorId}
                        aria-invalid={error != null}
                        data-testid="rule-description"
                        id={id}
                        onChange={(event) => onChange(event.target.value)}
                        placeholder="e.g. COFFEE SHOP 123"
                        value={value}
                    />
                </>
            ) : (
                <>
                    <span className="text-muted-foreground text-xs" id={`${id}-label`}>
                        Exact description text
                    </span>
                    <p
                        aria-labelledby={`${id}-label`}
                        className="bg-muted border-input rounded-md border px-2 py-1.5 font-mono text-sm break-all"
                        data-testid="rule-description"
                        id={id}
                    >
                        {value}
                    </p>
                </>
            )}
            <FieldError id={errorId} message={error} testId="rule-description-error" />
        </div>
    );
}

interface ConditionsProps {
    readonly accounts: readonly RuleEditorOption[];
    readonly draft: RuleEditorDraft;
    readonly errors: RuleEditorFieldErrors;
    readonly idPrefix: string;
    readonly onChange: (partial: Partial<RuleEditorDraft>) => void;
}

/** The inspector's restrictions: tick to narrow the rule to this row's account or amount. */
function TransactionConditions({
    accounts,
    currencyCode,
    draft,
    errors,
    idPrefix,
    onChange,
    transaction
}: ConditionsProps & {
    readonly currencyCode: string;
    readonly transaction: RuleEditorTransaction;
}): React.JSX.Element {
    const accountLabel =
        draft.useAccountScope && draft.accountId !== transaction.accountId
            ? (accounts.find((account) => account.id === draft.accountId)?.label ??
              transaction.accountLabel)
            : transaction.accountLabel;
    const rowAmountText =
        transaction.amount == null ? "" : amountTextFromMinor(transaction.amount, currencyCode);
    const amountLabel =
        draft.useAmountScope && draft.amountText !== rowAmountText
            ? draft.amountText
            : transaction.amountLabel;
    return (
        <div className="space-y-2">
            <ChoiceRow
                hint="Unchecked: any account with this description."
                id={`${idPrefix}-account-toggle`}
                label={
                    <span>
                        Only this account: <strong>{accountLabel}</strong>
                    </span>
                }
            >
                <Checkbox
                    aria-describedby={`${idPrefix}-account-toggle-hint`}
                    aria-invalid={errors.accountId != null}
                    checked={draft.useAccountScope}
                    data-testid="rule-account-toggle"
                    id={`${idPrefix}-account-toggle`}
                    onCheckedChange={(checked) =>
                        onChange(
                            checked === true
                                ? { useAccountScope: true, accountId: transaction.accountId }
                                : { useAccountScope: false }
                        )
                    }
                />
            </ChoiceRow>
            <FieldError message={errors.accountId} testId="rule-account-error" />
            <ChoiceRow
                hint="Unchecked: any amount."
                id={`${idPrefix}-amount-toggle`}
                label={
                    <span>
                        Only if amount is <strong>{amountLabel}</strong>
                    </span>
                }
            >
                <Checkbox
                    aria-describedby={`${idPrefix}-amount-toggle-hint`}
                    aria-invalid={errors.amount != null}
                    checked={draft.useAmountScope}
                    data-testid="rule-amount-toggle"
                    id={`${idPrefix}-amount-toggle`}
                    onCheckedChange={(checked) =>
                        onChange(
                            checked === true
                                ? { useAmountScope: true, amountText: rowAmountText }
                                : { useAmountScope: false }
                        )
                    }
                />
            </ChoiceRow>
            <FieldError message={errors.amount} testId="rule-amount-error" />
        </div>
    );
}

/** The Automations page's restrictions: pick any account, or type an amount. */
function StandaloneConditions({
    accounts,
    draft,
    errors,
    idPrefix,
    onChange,
    registerPortal
}: ConditionsProps & {
    readonly registerPortal?: RefCallback<HTMLDivElement>;
}): React.JSX.Element {
    const accountId = `${idPrefix}-account`;
    const amountId = `${idPrefix}-amount`;
    return (
        <div className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:items-center">
            <Label className="font-normal" htmlFor={accountId}>
                Only this account
            </Label>
            <div className="space-y-1">
                <Select
                    onValueChange={(value) =>
                        onChange(
                            value === ANY_ACCOUNT
                                ? { useAccountScope: false, accountId: "" }
                                : { useAccountScope: true, accountId: value }
                        )
                    }
                    value={draft.useAccountScope ? draft.accountId : ANY_ACCOUNT}
                >
                    <SelectTrigger
                        aria-invalid={errors.accountId != null}
                        className="w-56"
                        data-testid="rule-account"
                        id={accountId}
                    >
                        <SelectValue placeholder="Any account" />
                    </SelectTrigger>
                    <SelectContent ref={registerPortal}>
                        <SelectItem value={ANY_ACCOUNT}>Any account</SelectItem>
                        {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                                {account.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FieldError message={errors.accountId} testId="rule-account-error" />
            </div>
            <Label className="font-normal" htmlFor={amountId}>
                Only if amount is
            </Label>
            <div className="space-y-1">
                <Input
                    aria-invalid={errors.amount != null}
                    className="w-40"
                    data-testid="rule-amount"
                    id={amountId}
                    inputMode="decimal"
                    onChange={(event) =>
                        onChange({
                            amountText: event.target.value,
                            useAmountScope: event.target.value.trim().length > 0
                        })
                    }
                    placeholder="Any amount"
                    value={draft.useAmountScope ? draft.amountText : ""}
                />
                <FieldError message={errors.amount} testId="rule-amount-error" />
            </div>
        </div>
    );
}

// ============================================================================
// Outputs
// ============================================================================

interface OutputBadgeProps {
    readonly field: RuleField;
    readonly draft: RuleEditorDraft;
    readonly errors: RuleEditorFieldErrors;
    readonly aliases: readonly RuleEditorOption[];
    readonly tags: readonly RuleEditorOption[];
    readonly people: readonly RuleEditorOption[];
    readonly expanded: boolean;
    /** False while the editor locks every output but the pending one: only that one is written. */
    readonly editable: boolean;
    readonly pending: boolean;
    /** The stored value a pending output overwrites, shown muted under the badge. */
    readonly storedSummary?: string;
    readonly divergence?: RuleEditorDivergence;
    readonly idPrefix: string;
    readonly onChange: (partial: Partial<RuleEditorDraft>) => void;
    readonly onToggleExpanded: (field: RuleField) => void;
    readonly onSplit?: (field: RuleField) => void;
    readonly onApplyThis?: (field: RuleField) => void;
    readonly registerPortal?: RefCallback<HTMLDivElement>;
}

function outputError(field: RuleField, errors: RuleEditorFieldErrors): string | undefined {
    switch (field) {
        case "descriptionAlias":
            return errors.aliasId;
        case "tags":
            return errors.tagIds;
        case "allocation":
            return errors.allocations;
        default:
            return assertNever(field);
    }
}

const OUTPUT_ERROR_TEST_IDS: Readonly<Record<RuleField, string>> = {
    descriptionAlias: "rule-alias-error",
    tags: "rule-tags-error",
    allocation: "rule-alloc-error"
};

function OutputBadge(props: OutputBadgeProps): React.JSX.Element {
    const {
        field,
        draft,
        errors,
        aliases,
        tags,
        people,
        expanded,
        editable,
        pending,
        storedSummary,
        divergence,
        idPrefix,
        onChange,
        onToggleExpanded,
        onSplit,
        onApplyThis,
        registerPortal
    } = props;
    const label = RULE_FIELD_LABELS[field];
    const editorId = `${idPrefix}-output-${field}-editor`;
    const error = outputError(field, errors);
    const summary = outputValueSummary(field, draft.outputs, { aliases, tags, people });

    return (
        <div
            className={cn(
                "space-y-2 rounded-md border p-2",
                pending && PENDING_BORDER,
                divergence != null && "border-amber-500/50 bg-amber-500/10",
                error != null && "border-destructive/60"
            )}
            data-testid={`rule-output-${field}`}
        >
            {/* One line that wraps as a whole: the value takes the slack and wraps rather than
                truncating, and the buttons stay together at the end. */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground min-w-[5.5rem] text-xs font-semibold tracking-wide uppercase">
                    {label}
                </span>
                <span className="min-w-0 flex-[1_1_9rem] text-sm font-medium break-words">
                    {summary}
                </span>
                {pending ? (
                    <Badge className={PENDING_CHIP} data-testid="rule-pending-chip">
                        pending
                    </Badge>
                ) : null}
                {divergence == null ? null : (
                    <Badge
                        className={cn("border-amber-500/50 bg-amber-500/10", AMBER_TEXT)}
                        data-testid="transaction-rule-drift"
                        variant="outline"
                    >
                        differs on this transaction
                    </Badge>
                )}
                <span className="ml-auto flex shrink-0 gap-1 whitespace-nowrap">
                    {editable ? (
                        <Button
                            aria-controls={expanded ? editorId : undefined}
                            aria-expanded={expanded}
                            aria-label={expanded ? `Done editing ${label}` : `Edit ${label}`}
                            data-testid={`rule-output-edit-${field}`}
                            onClick={() => onToggleExpanded(field)}
                            size="sm"
                            type="button"
                            variant="outline"
                        >
                            {expanded ? "Done" : "Edit"}
                        </Button>
                    ) : null}
                    {onSplit == null ? null : (
                        <Button
                            aria-label={`Split ${label} into its own rule`}
                            data-testid={`rule-split-${field}`}
                            onClick={() => onSplit(field)}
                            size="sm"
                            type="button"
                            variant="outline"
                        >
                            Split
                        </Button>
                    )}
                </span>
            </div>
            {storedSummary == null ? null : (
                <p
                    className="text-muted-foreground text-xs break-words"
                    data-testid={`rule-output-stored-${field}`}
                >
                    Stored: {storedSummary}
                </p>
            )}
            {divergence == null ? null : (
                <div
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                    data-testid={`rule-drift-${field}`}
                >
                    <span>Rule: {divergence.ruleValue}</span>
                    <span className={AMBER_TEXT}>This transaction: {divergence.rowValue}</span>
                    {onApplyThis == null ? null : (
                        <Button
                            data-testid={`rule-apply-this-${field}`}
                            onClick={() => onApplyThis(field)}
                            size="sm"
                            type="button"
                            variant="outline"
                        >
                            Apply to this transaction
                        </Button>
                    )}
                </div>
            )}
            {expanded && editable ? (
                <div className="border-t pt-2" id={editorId}>
                    <OutputValueEditor
                        aliases={aliases}
                        draft={draft}
                        error={error}
                        field={field}
                        idPrefix={idPrefix}
                        onChange={onChange}
                        people={people}
                        registerPortal={registerPortal}
                        tags={tags}
                    />
                </div>
            ) : null}
            <FieldError message={error} testId={OUTPUT_ERROR_TEST_IDS[field]} />
        </div>
    );
}

function OutputValueEditor({
    aliases,
    draft,
    error,
    field,
    idPrefix,
    onChange,
    people,
    registerPortal,
    tags
}: {
    readonly aliases: readonly RuleEditorOption[];
    readonly draft: RuleEditorDraft;
    readonly error?: string;
    readonly field: RuleField;
    readonly idPrefix: string;
    readonly onChange: (partial: Partial<RuleEditorDraft>) => void;
    readonly people: readonly RuleEditorOption[];
    readonly registerPortal?: RefCallback<HTMLDivElement>;
    readonly tags: readonly RuleEditorOption[];
}): React.JSX.Element | null {
    const outputs = draft.outputs;
    switch (field) {
        case "descriptionAlias": {
            const id = `${idPrefix}-alias`;
            return (
                <div className="space-y-1">
                    <Label htmlFor={id}>Description alias to apply</Label>
                    <Select
                        onValueChange={(aliasId) =>
                            onChange({ outputs: { ...outputs, descriptionAlias: { aliasId } } })
                        }
                        value={outputs.descriptionAlias?.aliasId ?? ""}
                    >
                        <SelectTrigger
                            aria-invalid={error != null}
                            className="w-56"
                            data-testid="rule-alias"
                            id={id}
                        >
                            <SelectValue placeholder="Select alias" />
                        </SelectTrigger>
                        <SelectContent ref={registerPortal}>
                            {aliases.map((alias) => (
                                <SelectItem key={alias.id} value={alias.id}>
                                    {alias.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }
        case "tags": {
            const value = outputs.tags;
            if (value == null) return null;
            const setTags = (next: { mode?: TagRuleMode; tagIds?: readonly string[] }): void =>
                onChange({ outputs: { ...outputs, tags: { ...value, ...next } } });
            const modeId = `${idPrefix}-tag-mode`;
            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Label htmlFor={modeId}>Tag mode</Label>
                        <Select
                            onValueChange={(mode) =>
                                setTags({ mode: mode === "set" ? "set" : "add" })
                            }
                            value={value.mode}
                        >
                            <SelectTrigger
                                aria-describedby={`${modeId}-hint`}
                                className="w-52"
                                data-testid="rule-tag-mode"
                                id={modeId}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent ref={registerPortal}>
                                <SelectItem value="add">Add tags</SelectItem>
                                <SelectItem value="set">Set tags (clear existing)</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-muted-foreground text-xs" id={`${modeId}-hint`}>
                            {value.mode === "set"
                                ? "Set replaces tags typed by hand."
                                : "Add keeps whatever tags are already there."}
                        </span>
                    </div>
                    <div aria-label="Tags to apply" className="flex flex-wrap gap-2" role="group">
                        {tags.length === 0 ? (
                            <p className="text-muted-foreground text-xs">No tags available.</p>
                        ) : (
                            tags.map((tag) => {
                                const selected = value.tagIds.includes(tag.id);
                                return (
                                    <Button
                                        aria-pressed={selected}
                                        data-testid={`rule-tag-${tag.id}`}
                                        key={tag.id}
                                        onClick={() =>
                                            setTags({
                                                tagIds: selected
                                                    ? value.tagIds.filter((id) => id !== tag.id)
                                                    : [...value.tagIds, tag.id]
                                            })
                                        }
                                        size="sm"
                                        type="button"
                                        variant={selected ? "default" : "outline"}
                                    >
                                        {tag.label}
                                    </Button>
                                );
                            })
                        )}
                    </div>
                </div>
            );
        }
        case "allocation": {
            const values = outputs.allocation ?? {};
            return (
                <div className="space-y-2" data-testid="rule-allocation-grid">
                    {people.length === 0 ? (
                        <p className="text-muted-foreground text-xs">No people available.</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {people.map((person) => {
                                const controlId = `${idPrefix}-alloc-${person.id}`;
                                return (
                                    <div className="space-y-1" key={person.id}>
                                        <Label className="text-xs" htmlFor={controlId}>
                                            {person.label}
                                        </Label>
                                        <Input
                                            aria-invalid={error != null}
                                            className="w-24"
                                            data-testid={`rule-alloc-${person.id}`}
                                            id={controlId}
                                            inputMode="decimal"
                                            onChange={(event) =>
                                                onChange({
                                                    outputs: {
                                                        ...outputs,
                                                        allocation: {
                                                            ...values,
                                                            [person.id]: event.target.value
                                                        }
                                                    }
                                                })
                                            }
                                            placeholder="—"
                                            value={values[person.id] ?? ""}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <p className="text-muted-foreground text-xs">
                        The whole set is saved together. Blank means no answer and counts as 0%; an
                        explicit 0 shows as 0%.
                    </p>
                </div>
            );
        }
        default:
            return assertNever(field);
    }
}

// ============================================================================
// Resolution
// ============================================================================

function ResolutionPanel({
    idPrefix,
    pendingField,
    resolution
}: {
    readonly idPrefix: string;
    readonly pendingField?: RuleField;
    readonly resolution: RuleEditorResolution;
}): React.JSX.Element {
    const fieldLabel = pendingField == null ? "This output" : RULE_FIELD_LABELS[pendingField];
    const panelClass = "space-y-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3";
    switch (resolution.kind) {
        case "conflict":
            return (
                <div
                    aria-label={`Which rule should own ${fieldLabel.toLowerCase()}`}
                    className={panelClass}
                    data-testid="rule-resolution"
                    role="group"
                >
                    <p className="text-sm font-medium" id={`${idPrefix}-resolution-label`}>
                        Another rule already sets {fieldLabel.toLowerCase()} on this transaction.
                    </p>
                    <RadioGroup
                        aria-labelledby={`${idPrefix}-resolution-label`}
                        className="gap-2"
                        onValueChange={(value) => {
                            if (value === "keep" || value === "move") resolution.onChoose(value);
                        }}
                        value={resolution.choice}
                    >
                        <ChoiceRow
                            hint={`Only the ${fieldLabel.toLowerCase()} value changes. Every rule keeps its own transactions.`}
                            id={`${idPrefix}-resolution-keep`}
                            label={
                                <span>
                                    Update the <strong>{resolution.owner.label}</strong> (keeps
                                    things as they are)
                                </span>
                            }
                        >
                            <RadioGroupItem
                                aria-describedby={`${idPrefix}-resolution-keep-hint`}
                                data-testid="rule-resolution-keep"
                                id={`${idPrefix}-resolution-keep`}
                                value="keep"
                            />
                        </ChoiceRow>
                        <ChoiceRow
                            hint={`${
                                resolution.ownerKeepsOutputs
                                    ? `The ${resolution.owner.label} keeps its other outputs.`
                                    : `The ${resolution.owner.label} is deleted.`
                            } ${fieldLabel} then applies wherever the ${resolution.host.label} applies.`}
                            id={`${idPrefix}-resolution-move`}
                            label={
                                <span>
                                    Move {fieldLabel.toLowerCase()} into the{" "}
                                    <strong>{resolution.host.label}</strong>
                                </span>
                            }
                        >
                            <RadioGroupItem
                                aria-describedby={`${idPrefix}-resolution-move-hint`}
                                data-testid="rule-resolution-move"
                                id={`${idPrefix}-resolution-move`}
                                value="move"
                            />
                        </ChoiceRow>
                    </RadioGroup>
                </div>
            );
        case "ambiguous":
            return (
                <div className={panelClass} data-testid="rule-resolution">
                    <p className="text-sm font-medium" id={`${idPrefix}-resolution-label`}>
                        More than one rule could take {fieldLabel.toLowerCase()}. Choose one.
                    </p>
                    <RadioGroup
                        aria-labelledby={`${idPrefix}-resolution-label`}
                        aria-required
                        className="gap-2"
                        onValueChange={resolution.onChoose}
                        value={resolution.choice ?? ""}
                    >
                        {resolution.candidates.map((candidate) => (
                            <ChoiceRow
                                hint={candidate.summary}
                                id={`${idPrefix}-resolution-${candidate.id}`}
                                key={candidate.id}
                                label={candidate.label}
                            >
                                <RadioGroupItem
                                    aria-describedby={`${idPrefix}-resolution-${candidate.id}-hint`}
                                    data-testid={`rule-resolution-candidate-${candidate.id}`}
                                    id={`${idPrefix}-resolution-${candidate.id}`}
                                    value={candidate.id}
                                />
                            </ChoiceRow>
                        ))}
                    </RadioGroup>
                </div>
            );
        default:
            return assertNever(resolution);
    }
}

// ============================================================================
// Split preview
// ============================================================================

function draftConditionsLabel(
    draft: RuleEditorDraft,
    accounts: readonly RuleEditorOption[]
): string {
    const account = draft.useAccountScope
        ? (accounts.find((option) => option.id === draft.accountId)?.label ?? "an unknown account")
        : "any account";
    const amount = draft.useAmountScope ? draft.amountText : "any amount";
    return `${account} · ${amount}`;
}

/** The two rules a split leaves: same conditions, the remaining outputs and the moved one. */
function SplitPreviewPanel({
    accounts,
    aliases,
    draft,
    people,
    preview,
    tags
}: {
    readonly accounts: readonly RuleEditorOption[];
    readonly aliases: readonly RuleEditorOption[];
    readonly draft: RuleEditorDraft;
    readonly people: readonly RuleEditorOption[];
    readonly preview: RuleEditorSplitPreview;
    readonly tags: readonly RuleEditorOption[];
}): React.JSX.Element {
    const label = RULE_FIELD_LABELS[preview.field];
    const conditions = draftConditionsLabel(draft, accounts);
    const remaining = draftOutputFields(draft).filter((field) => field !== preview.field);
    const summary = (field: RuleField): string =>
        `${RULE_FIELD_LABELS[field]}: ${outputValueSummary(field, draft.outputs, { aliases, tags, people })}`;
    const cardClass = "bg-background grid min-w-0 gap-0.5 rounded-md border p-2 text-xs";
    return (
        <div
            aria-label="Split preview"
            className="space-y-2 rounded-md border p-3"
            data-testid="rule-split-preview"
            role="group"
        >
            <p className="text-sm">
                <strong>Split {label.toLowerCase()} into its own rule.</strong> Both rules keep the
                same match conditions. No transaction changes.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
                <div className={cardClass} data-testid="rule-split-preview-source">
                    <span className="font-mono break-all">{draft.descriptionText}</span>
                    <span className="text-muted-foreground">{conditions}</span>
                    {remaining.map((field) => (
                        <span key={field}>{summary(field)}</span>
                    ))}
                </div>
                <div className={cardClass} data-testid="rule-split-preview-new">
                    <span className="flex flex-wrap items-center gap-1">
                        <span className="font-mono break-all">{draft.descriptionText}</span>
                        <Badge variant="secondary">new</Badge>
                    </span>
                    <span className="text-muted-foreground">{conditions}</span>
                    <span>{summary(preview.field)}</span>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button
                    data-testid="rule-split-confirm"
                    onClick={preview.onConfirm}
                    size="sm"
                    type="button"
                >
                    Confirm split
                </Button>
                <Button
                    data-testid="rule-split-cancel"
                    onClick={preview.onCancel}
                    size="sm"
                    type="button"
                    variant="outline"
                >
                    Back
                </Button>
            </div>
        </div>
    );
}
