"use client";

/**
 * Inline rule-PROPOSAL controls (HS-007 / UR-009, frozen `specs/human-scratch.md:249-266`).
 *
 * These are the controls the frozen text asks to "appear" when a user changes a rule-backed field on
 * a transaction whose text does not already match a rule. They are deliberately NOT the robot: the
 * robot opens an existing rule, these offer to make one.
 *
 * The frozen layout constraints (`:252-254`) are met structurally, not by styling alone:
 * - the content is rendered in a Radix popover PORTAL, so it lives outside the table's grid and
 *   cannot contribute to any row or column's size — the table cannot resize because of it;
 * - it is anchored to the edited cell and opens to its side/below, so it sits near the pointer;
 * - `onOpenAutoFocus` is prevented so the popup never steals the caret from the cell the user is
 *   still working in, which is what makes an "unfocused popup" possible.
 *
 * The controls themselves are exactly the frozen list: the four-mode select, a tick button beside it,
 * the "only if $x" and "only this account" checkboxes, and (for tags only, per `:290-292`) the
 * add/set select. The four modes carry the shared tooltip explaining the "Updating" vs "Update"
 * distinction, reusing the SAME copy the automations-page editor shows so the two surfaces can never
 * drift apart.
 *
 * Presentational: every draft change and the write itself belong to {@link useFieldRuleProposal}.
 */

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type RuleField } from "@/lib/domain/automation/rules";

import {
    APPLY_MODE_TOOLTIP,
    APPLY_MODES,
    applyModeLabel,
    type RuleEditorDraft,
    type RuleEditorFieldErrors
} from "../automations/rule-editor-model";

/** Stable, field-specific testid so each surface is independently addressable. */
const PROPOSAL_TESTID: Readonly<Record<RuleField, string>> = {
    descriptionAlias: "description-rule-proposal",
    tags: "tags-rule-proposal",
    allocation: "allocation-rule-proposal"
};

const FIELD_NOUN: Readonly<Record<RuleField, string>> = {
    descriptionAlias: "description",
    tags: "tags",
    allocation: "person percentages"
};

export interface FieldRuleProposalProps {
    readonly field: RuleField;
    /** "create" offers a new rule; "update" changes the rule that already matches this row. */
    readonly kind: "create" | "update";
    readonly draft: RuleEditorDraft;
    readonly onDraftChange: (next: RuleEditorDraft) => void;
    readonly errors: RuleEditorFieldErrors;
    /** Formatted amount for the "only if $x" label, so x is the row's real amount. */
    readonly amountLabel: string;
    readonly accountLabel: string;
    readonly onConfirm: () => void;
    readonly onDismiss: () => void;
    readonly idPrefix: string;
}

export function FieldRuleProposal(props: FieldRuleProposalProps): React.JSX.Element {
    const { draft, onDraftChange, errors, field, kind, idPrefix } = props;
    const set = (partial: Partial<RuleEditorDraft>): void =>
        onDraftChange({ ...draft, ...partial });

    const modeId = `${idPrefix}-proposal-mode`;
    const tagModeId = `${idPrefix}-proposal-tag-mode`;
    const noun = FIELD_NOUN[field];

    return (
        <div
            aria-label={
                kind === "create"
                    ? `Create an automation rule from this ${noun} change`
                    : `Update this ${noun} automation rule`
            }
            className="flex flex-col gap-2"
            data-kind={kind}
            data-testid={PROPOSAL_TESTID[field]}
            role="group"
        >
            <div className="flex items-center gap-2">
                <Select
                    value={draft.applyMode}
                    onValueChange={(value) => {
                        const next = APPLY_MODES.find((candidate) => candidate === value);
                        if (next != null) set({ applyMode: next });
                    }}
                >
                    <SelectTrigger
                        aria-label="When to apply this rule"
                        className="w-40"
                        data-testid="proposal-apply-mode"
                        id={modeId}
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent data-owned-by-row="true">
                        {APPLY_MODES.map((applyMode) => (
                            <SelectItem key={applyMode} value={applyMode}>
                                {applyModeLabel(applyMode)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* The tick button beside the select (frozen `:257`). */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            aria-label={kind === "create" ? "Create this rule" : "Update this rule"}
                            data-testid="proposal-confirm"
                            onClick={props.onConfirm}
                            size="icon-sm"
                            type="button"
                        >
                            <Check aria-hidden="true" className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs" data-testid="proposal-apply-mode-tooltip">
                        {APPLY_MODE_TOOLTIP}
                    </TooltipContent>
                </Tooltip>

                <Button
                    aria-label="Dismiss without creating a rule"
                    data-testid="proposal-dismiss"
                    onClick={props.onDismiss}
                    size="sm"
                    type="button"
                    variant="ghost"
                >
                    Not now
                </Button>
            </div>

            {/* The two frozen restrictions (`:258-260`). */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={draft.useAmountScope}
                        data-testid="proposal-amount-toggle"
                        id={`${idPrefix}-proposal-amount`}
                        onCheckedChange={(checked) => set({ useAmountScope: checked === true })}
                    />
                    <Label className="text-xs" htmlFor={`${idPrefix}-proposal-amount`}>
                        {`Only if ${props.amountLabel}`}
                    </Label>
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={draft.useAccountScope}
                        data-testid="proposal-account-toggle"
                        id={`${idPrefix}-proposal-account`}
                        onCheckedChange={(checked) => set({ useAccountScope: checked === true })}
                    />
                    <Label className="text-xs" htmlFor={`${idPrefix}-proposal-account`}>
                        {`Only this account (${props.accountLabel})`}
                    </Label>
                </div>
            </div>

            {/* Tags get one further select after "only this account" (frozen `:290-292`). */}
            {field === "tags" ? (
                <div className="flex items-center gap-2">
                    <Label className="text-xs" htmlFor={tagModeId}>
                        Tags
                    </Label>
                    <Select
                        value={draft.tagMode}
                        onValueChange={(value) => set({ tagMode: value === "set" ? "set" : "add" })}
                    >
                        <SelectTrigger
                            className="w-44"
                            data-testid="proposal-tag-mode"
                            id={tagModeId}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent data-owned-by-row="true">
                            <SelectItem value="add">Add tags</SelectItem>
                            <SelectItem value="set">Set tags (clear existing)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            ) : null}

            {/* An amount typed into the row can be unparseable in this currency; surface it here
                rather than failing silently when the tick is pressed. */}
            {errors.amount ? (
                <p
                    className="text-destructive text-xs"
                    data-testid="proposal-amount-error"
                    role="alert"
                >
                    {errors.amount}
                </p>
            ) : null}
            {errors.descriptionText ? (
                <p
                    className="text-destructive text-xs"
                    data-testid="proposal-description-error"
                    role="alert"
                >
                    {errors.descriptionText}
                </p>
            ) : null}
            {errors.allocations ? (
                <p
                    className="text-destructive text-xs"
                    data-testid="proposal-allocations-error"
                    role="alert"
                >
                    {errors.allocations}
                </p>
            ) : null}
            {errors.tagIds ? (
                <p
                    className="text-destructive text-xs"
                    data-testid="proposal-tags-error"
                    role="alert"
                >
                    {errors.tagIds}
                </p>
            ) : null}
        </div>
    );
}
