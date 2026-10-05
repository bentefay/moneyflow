"use client";

/**
 * Transaction-context rule popup content (HS-007 / P17C).
 *
 * Presentational shell that mounts the SHARED {@link FieldRuleEditor} (never a fork) for one
 * transaction's matching rule. The description text is fixed here (`descriptionEditable={false}`)
 * because the row's transaction determines it; everything else — field, constraints, value editor,
 * the four apply modes, apply-all / apply-new, delete — is the same editor the Automations page
 * uses. When the row has drifted from its rule it additionally offers "apply to this transaction" to
 * reconcile just this row. All state and writes live in the caller's workflow hook.
 */

import type { RefCallback } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FieldRuleEditor, type RuleEditorOption } from "../automations/FieldRuleEditor";
import { type RuleEditorDraft, type RuleEditorFieldErrors } from "../automations/rule-editor-model";

export interface TransactionRulePopupProps {
    readonly draft: RuleEditorDraft;
    readonly onDraftChange: (next: RuleEditorDraft) => void;
    readonly errors: RuleEditorFieldErrors;
    readonly accounts: readonly RuleEditorOption[];
    readonly tags: readonly RuleEditorOption[];
    readonly people: readonly RuleEditorOption[];
    readonly aliases: readonly RuleEditorOption[];
    readonly currencyCode: string;
    /** True when the row's current value differs from the rule's implied value. */
    readonly isDrift: boolean;
    readonly onSave: () => void;
    readonly onDelete: () => void;
    readonly onApplyAll: () => void;
    readonly onApplyNew: () => void;
    readonly onApplyThis: () => void;
    readonly idPrefix: string;
    readonly className?: string;
    readonly registerPortal?: RefCallback<HTMLDivElement>;
}

export function TransactionRulePopup(props: TransactionRulePopupProps): React.JSX.Element {
    return (
        <div className={cn("space-y-3", props.className)} data-testid="transaction-rule-popup">
            {props.isDrift ? (
                <div
                    className="border-destructive/40 bg-destructive/5 space-y-2 rounded-md border p-2"
                    data-testid="transaction-rule-drift"
                >
                    <p className="text-muted-foreground text-xs">
                        This transaction no longer matches its rule. Apply the rule to bring just
                        this transaction back in line, or edit the rule below.
                    </p>
                    <Button
                        data-testid="rule-apply-this"
                        onClick={props.onApplyThis}
                        size="sm"
                        type="button"
                    >
                        Apply to this transaction
                    </Button>
                </div>
            ) : null}

            <FieldRuleEditor
                accounts={props.accounts}
                aliases={props.aliases}
                currencyCode={props.currencyCode}
                descriptionEditable={false}
                draft={props.draft}
                errors={props.errors}
                idPrefix={props.idPrefix}
                mode="edit"
                onApplyAll={props.onApplyAll}
                onApplyNew={props.onApplyNew}
                onDelete={props.onDelete}
                onDraftChange={props.onDraftChange}
                onSave={props.onSave}
                people={props.people}
                registerPortal={props.registerPortal}
                tags={props.tags}
            />
        </div>
    );
}
