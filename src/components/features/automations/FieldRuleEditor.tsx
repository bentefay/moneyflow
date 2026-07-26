"use client";

/**
 * Shared field-rule editor (HS-007 / P17B).
 *
 * ONE accessible, controlled editor that powers the Automations page now and is structured so P17C
 * can mount the SAME component inside a contextual popup later (nothing here assumes a page layout;
 * `descriptionEditable` and the `onApply*` callbacks are the only surface-specific seams). It covers
 * the field selector, optional amount and/or account constraints, the four apply modes with an
 * explanatory tooltip, the mode-specific value editors, inline validation, delete, and apply-all /
 * apply-new actions.
 *
 * It is presentational: all draft state and CRDT wiring live in the caller (the Automations page's
 * manager, or the future inline popup). Precedence/matching/application are never re-implemented
 * here — they belong to the P17A engine reached through the caller's mutations.
 */

import { Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type RuleField, type TagRuleMode } from "@/lib/domain/automation/rules";
import { cn } from "@/lib/utils";

import {
    APPLY_MODES,
    applyModeLabel,
    applyModeTargetsNewOnly,
    type RuleEditorDraft,
    type RuleEditorFieldErrors
} from "./rule-editor-model";

export interface RuleEditorOption {
    readonly id: string;
    readonly label: string;
}

export interface FieldRuleEditorProps {
    readonly draft: RuleEditorDraft;
    readonly onDraftChange: (next: RuleEditorDraft) => void;
    readonly errors: RuleEditorFieldErrors;
    readonly accounts: readonly RuleEditorOption[];
    readonly tags: readonly RuleEditorOption[];
    readonly people: readonly RuleEditorOption[];
    readonly aliases: readonly RuleEditorOption[];
    readonly currencyCode: string;
    /** Page create/edit lets the user type the exact text; the inline surface fixes it. */
    readonly descriptionEditable?: boolean;
    readonly mode: "create" | "edit";
    readonly onSave: () => void;
    readonly onDelete?: () => void;
    readonly onApplyAll: () => void;
    readonly onApplyNew: () => void;
    readonly saveDisabled?: boolean;
    readonly className?: string;
    /** Stable id prefix so multiple editors on a page keep unique control ids. */
    readonly idPrefix?: string;
}

const FIELD_LABELS: Readonly<Record<RuleField, string>> = {
    descriptionAlias: "Description alias",
    tags: "Tags",
    allocation: "Person percentages"
};

const FIELD_OPTIONS: readonly RuleField[] = ["descriptionAlias", "tags", "allocation"];

const RULE_FIELD_SET: ReadonlySet<string> = new Set(FIELD_OPTIONS);

function isRuleField(value: string): value is RuleField {
    return RULE_FIELD_SET.has(value);
}

const APPLY_MODE_TOOLTIP =
    "Update all applies to every existing and new transaction with this exact description. " +
    'Update new applies only to newer transactions. "Updating" applies automatically when the ' +
    'edited row loses focus; "Update" applies only when you click the tick or an Apply button.';

export function FieldRuleEditor(props: FieldRuleEditorProps): React.JSX.Element {
    const {
        draft,
        onDraftChange,
        errors,
        accounts,
        tags,
        people,
        aliases,
        descriptionEditable = true,
        mode,
        onSave,
        onDelete,
        onApplyAll,
        onApplyNew,
        saveDisabled,
        className,
        idPrefix = "field-rule"
    } = props;

    const set = (partial: Partial<RuleEditorDraft>): void =>
        onDraftChange({ ...draft, ...partial });

    const descriptionId = `${idPrefix}-description`;
    const fieldId = `${idPrefix}-field`;
    const amountId = `${idPrefix}-amount`;
    const accountId = `${idPrefix}-account`;
    const aliasId = `${idPrefix}-alias`;
    const modeId = `${idPrefix}-apply-mode`;

    return (
        <form
            aria-label="Field rule editor"
            className={cn("space-y-4", className)}
            data-testid="field-rule-editor"
            onSubmit={(event) => {
                event.preventDefault();
                if (!saveDisabled) onSave();
            }}
        >
            <div className="flex items-center gap-2">
                <Bot aria-hidden="true" className="text-muted-foreground size-5" />
                <h3 className="text-sm font-semibold">
                    {mode === "create" ? "New rule" : "Edit rule"}
                </h3>
            </div>

            {/* Field selector */}
            <div className="space-y-1.5">
                <Label htmlFor={fieldId}>Field</Label>
                <Select
                    value={draft.field}
                    onValueChange={(value) => {
                        if (isRuleField(value)) set({ field: value });
                    }}
                >
                    <SelectTrigger data-testid="rule-field" id={fieldId}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FIELD_OPTIONS.map((field) => (
                            <SelectItem key={field} value={field}>
                                {FIELD_LABELS[field]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {draft.field === "descriptionAlias" ? (
                    <p className="text-muted-foreground text-xs">
                        Description alias rules apply only to imported transactions, never to
                        manually created ones.
                    </p>
                ) : null}
            </div>

            {/* Exact description text */}
            <div className="space-y-1.5">
                <Label htmlFor={descriptionId}>Exact description text</Label>
                <Input
                    aria-describedby={errors.descriptionText ? `${descriptionId}-error` : undefined}
                    aria-invalid={errors.descriptionText != null}
                    data-testid="rule-description"
                    disabled={!descriptionEditable}
                    id={descriptionId}
                    onChange={(event) => set({ descriptionText: event.target.value })}
                    placeholder="e.g. COFFEE SHOP 123"
                    value={draft.descriptionText}
                />
                {errors.descriptionText ? (
                    <p
                        className="text-destructive text-xs"
                        data-testid="rule-description-error"
                        id={`${descriptionId}-error`}
                        role="alert"
                    >
                        {errors.descriptionText}
                    </p>
                ) : null}
            </div>

            {/* Constraints */}
            <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Constraints</legend>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={draft.useAmountScope}
                            data-testid="rule-amount-toggle"
                            id={`${idPrefix}-amount-toggle`}
                            onCheckedChange={(checked) => set({ useAmountScope: checked === true })}
                        />
                        <Label htmlFor={`${idPrefix}-amount-toggle`}>Only if amount is</Label>
                    </div>
                    {draft.useAmountScope ? (
                        <div className="space-y-1">
                            <Input
                                aria-invalid={errors.amount != null}
                                aria-label="Amount constraint value"
                                className="w-32"
                                data-testid="rule-amount"
                                id={amountId}
                                inputMode="decimal"
                                onChange={(event) => set({ amountText: event.target.value })}
                                placeholder="0.00"
                                value={draft.amountText}
                            />
                            {errors.amount ? (
                                <p
                                    className="text-destructive text-xs"
                                    data-testid="rule-amount-error"
                                    role="alert"
                                >
                                    {errors.amount}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={draft.useAccountScope}
                            data-testid="rule-account-toggle"
                            id={`${idPrefix}-account-toggle`}
                            onCheckedChange={(checked) =>
                                set({ useAccountScope: checked === true })
                            }
                        />
                        <Label htmlFor={`${idPrefix}-account-toggle`}>Only this account</Label>
                    </div>
                    {draft.useAccountScope ? (
                        <div className="space-y-1">
                            <Select
                                value={draft.accountId}
                                onValueChange={(value) => set({ accountId: value })}
                            >
                                <SelectTrigger
                                    aria-invalid={errors.accountId != null}
                                    aria-label="Account constraint"
                                    className="w-48"
                                    data-testid="rule-account"
                                    id={accountId}
                                >
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.accountId ? (
                                <p
                                    className="text-destructive text-xs"
                                    data-testid="rule-account-error"
                                    role="alert"
                                >
                                    {errors.accountId}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </fieldset>

            {/* Field-specific value editor */}
            <div className="space-y-1.5">
                {draft.field === "descriptionAlias" ? (
                    <AliasValueEditor
                        aliasId={aliasId}
                        aliases={aliases}
                        error={errors.aliasId}
                        onChange={(value) => set({ aliasId: value })}
                        value={draft.aliasId}
                    />
                ) : null}
                {draft.field === "tags" ? (
                    <TagsValueEditor
                        error={errors.tagIds}
                        idPrefix={idPrefix}
                        mode={draft.tagMode}
                        onModeChange={(tagMode) => set({ tagMode })}
                        onToggle={(tagId) =>
                            set({
                                tagIds: draft.tagIds.includes(tagId)
                                    ? draft.tagIds.filter((id) => id !== tagId)
                                    : [...draft.tagIds, tagId]
                            })
                        }
                        selected={draft.tagIds}
                        tags={tags}
                    />
                ) : null}
                {draft.field === "allocation" ? (
                    <AllocationValueEditor
                        error={errors.allocations}
                        idPrefix={idPrefix}
                        onChange={(personId, value) =>
                            set({ allocations: { ...draft.allocations, [personId]: value } })
                        }
                        people={people}
                        values={draft.allocations}
                    />
                ) : null}
            </div>

            {/* Four apply modes + explanation */}
            <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                    <Label htmlFor={modeId}>When to apply</Label>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                aria-label="Explain apply modes"
                                className="text-muted-foreground text-xs underline"
                                type="button"
                            >
                                What do these mean?
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs" data-testid="apply-mode-tooltip">
                            {APPLY_MODE_TOOLTIP}
                        </TooltipContent>
                    </Tooltip>
                </div>
                <Select
                    value={draft.applyMode}
                    onValueChange={(value) => {
                        const next = APPLY_MODES.find((candidate) => candidate === value);
                        if (next != null) set({ applyMode: next });
                    }}
                >
                    <SelectTrigger className="w-48" data-testid="rule-apply-mode" id={modeId}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {APPLY_MODES.map((applyMode) => (
                            <SelectItem key={applyMode} value={applyMode}>
                                {applyModeLabel(applyMode)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs" data-testid="rule-precedence-note">
                    More specific rules win: account + amount beats account, which beats amount,
                    which beats a rule with no constraints.
                </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button data-testid="rule-save" disabled={saveDisabled} type="submit">
                    {mode === "create" ? "Create rule" : "Save rule"}
                </Button>
                <Button
                    data-testid="rule-apply-all"
                    onClick={onApplyAll}
                    type="button"
                    variant="outline"
                >
                    Apply to all
                </Button>
                <Button
                    data-testid="rule-apply-new"
                    onClick={onApplyNew}
                    type="button"
                    variant="outline"
                >
                    Apply to new imports
                </Button>
                {onDelete ? (
                    <Button
                        className="ml-auto"
                        data-testid="rule-delete"
                        onClick={onDelete}
                        type="button"
                        variant="ghost"
                    >
                        Delete
                    </Button>
                ) : null}
            </div>
            <p className="text-muted-foreground text-xs">
                {applyModeTargetsNewOnly(draft.applyMode)
                    ? "Apply to new imports updates only transactions newer than the reference date."
                    : "Apply to all updates every matching transaction, existing and new."}
            </p>
        </form>
    );
}

function AliasValueEditor(props: {
    readonly aliasId: string;
    readonly aliases: readonly RuleEditorOption[];
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly error?: string;
}): React.JSX.Element {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={props.aliasId}>Description alias to apply</Label>
            <Select value={props.value} onValueChange={props.onChange}>
                <SelectTrigger
                    aria-invalid={props.error != null}
                    data-testid="rule-alias"
                    id={props.aliasId}
                >
                    <SelectValue placeholder="Select alias" />
                </SelectTrigger>
                <SelectContent>
                    {props.aliases.map((alias) => (
                        <SelectItem key={alias.id} value={alias.id}>
                            {alias.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {props.error ? (
                <p className="text-destructive text-xs" data-testid="rule-alias-error" role="alert">
                    {props.error}
                </p>
            ) : null}
        </div>
    );
}

function TagsValueEditor(props: {
    readonly tags: readonly RuleEditorOption[];
    readonly selected: readonly string[];
    readonly mode: TagRuleMode;
    readonly onModeChange: (mode: TagRuleMode) => void;
    readonly onToggle: (tagId: string) => void;
    readonly idPrefix: string;
    readonly error?: string;
}): React.JSX.Element {
    const modeId = `${props.idPrefix}-tag-mode`;
    return (
        <div className="space-y-2">
            <div className="space-y-1.5">
                <Label htmlFor={modeId}>Tag mode</Label>
                <Select
                    value={props.mode}
                    onValueChange={(value) => props.onModeChange(value === "set" ? "set" : "add")}
                >
                    <SelectTrigger className="w-40" data-testid="rule-tag-mode" id={modeId}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="add">Add tags</SelectItem>
                        <SelectItem value="set">Set tags (clear existing)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tags to apply">
                {props.tags.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No tags available.</p>
                ) : (
                    props.tags.map((tag) => {
                        const isSelected = props.selected.includes(tag.id);
                        return (
                            <Button
                                aria-pressed={isSelected}
                                data-testid={`rule-tag-${tag.id}`}
                                key={tag.id}
                                onClick={() => props.onToggle(tag.id)}
                                size="sm"
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                            >
                                {tag.label}
                            </Button>
                        );
                    })
                )}
            </div>
            {props.error ? (
                <p className="text-destructive text-xs" data-testid="rule-tags-error" role="alert">
                    {props.error}
                </p>
            ) : null}
        </div>
    );
}

function AllocationValueEditor(props: {
    readonly people: readonly RuleEditorOption[];
    readonly values: Readonly<Record<string, string>>;
    readonly onChange: (personId: string, value: string) => void;
    readonly idPrefix: string;
    readonly error?: string;
}): React.JSX.Element {
    return (
        <div className="space-y-2" data-testid="rule-allocation-grid">
            <Label>Person percentages</Label>
            {props.people.length === 0 ? (
                <p className="text-muted-foreground text-xs">No people available.</p>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {props.people.map((person) => {
                        const controlId = `${props.idPrefix}-alloc-${person.id}`;
                        return (
                            <div className="space-y-1" key={person.id}>
                                <Label className="text-xs" htmlFor={controlId}>
                                    {person.label}
                                </Label>
                                <Input
                                    className="w-24"
                                    data-testid={`rule-alloc-${person.id}`}
                                    id={controlId}
                                    inputMode="decimal"
                                    onChange={(event) =>
                                        props.onChange(person.id, event.target.value)
                                    }
                                    placeholder="%"
                                    value={props.values[person.id] ?? ""}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
            <p className="text-muted-foreground text-xs">
                Enter the explicit percentage set for this rule. Effective shares and the owner
                remainder are still computed by the allocation views.
            </p>
            {props.error ? (
                <p className="text-destructive text-xs" data-testid="rule-alloc-error" role="alert">
                    {props.error}
                </p>
            ) : null}
        </div>
    );
}
