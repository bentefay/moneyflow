"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
    AllocationPercentageSchema,
    deriveEffectiveAllocations,
    type EffectiveAllocationResult
} from "@/lib/domain";
import { cn } from "@/lib/utils";

import { materializeAllocationRecord, parseAllocationDraft } from "../allocation-columns";
import {
    INNER_CELL_FOCUS_CHROME,
    RESTING_CELL_CHROME,
    TRANSACTION_GRID_EDITOR_INLINE_CHROME
} from "./cell-chrome";
import {
    TRANSACTION_GRID_EDITOR_COMMIT_FAILURE,
    TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED,
    type TransactionGridEditorCommitResult,
    type TransactionGridEditorLifecycle,
    useTransactionGridEditorLifecycle,
    useTransactionGridNativeBlurCommit
} from "./editor-lifecycle";

export interface PersonAllocationCellProps {
    readonly accountOwnerships?: unknown;
    readonly allocations?: unknown;
    readonly className?: string;
    readonly explicitValue?: unknown;
    readonly effectiveDerivation?: EffectiveAllocationResult;
    readonly onCommit?: (personId: string, value: number) => TransactionGridEditorCommitResult;
    /**
     * Reports whether this cell is in its editing state. Callers use it to tell when an allocation
     * edit has finished; the percentage VALUE is never reported.
     */
    readonly onEditingChange?: (isEditing: boolean) => void;
    readonly personId: string;
    readonly personLabel: string;
    readonly presenceField?: string;
    /** Mount directly in the real input branch for controller-owned edit activation. */
    readonly startEditing?: boolean;
}

export interface AllocationPresentation {
    readonly description: string;
    readonly display: string;
    readonly invalid: boolean;
}

export interface PersonAllocationDisplayProps {
    readonly accountOwnerships?: unknown;
    readonly allocations?: unknown;
    readonly className?: string;
    readonly explicitValue?: unknown;
    readonly effectiveDerivation?: EffectiveAllocationResult;
    readonly personId: string;
    readonly presenceField?: string;
}

function displayPercentage(value: unknown): string | null {
    const parsed = AllocationPercentageSchema.safeParse(value);
    return parsed.success ? `${String(parsed.data)}%` : null;
}

function describeDerivationFailure(explicitValue: unknown): AllocationPresentation {
    const explicitDisplay = displayPercentage(explicitValue);
    return {
        description: `${
            explicitDisplay == null ? "Explicit value is invalid." : `Explicit: ${explicitDisplay}.`
        } Effective allocation unavailable because stored allocation or ownership data is invalid.`,
        display: explicitDisplay ?? "Invalid",
        invalid: explicitDisplay == null
    };
}

export function allocationPresentation(
    personId: string,
    explicitValue: unknown,
    allocationsInput: unknown,
    ownershipInput: unknown,
    effectiveDerivation?: EffectiveAllocationResult
): AllocationPresentation {
    const allocations = materializeAllocationRecord(allocationsInput);
    const ownerships = materializeAllocationRecord(ownershipInput);
    const explicitStored = Object.prototype.hasOwnProperty.call(allocations, personId);
    const explicitDisplay = explicitStored ? displayPercentage(explicitValue) : null;
    if (explicitStored && explicitDisplay == null) {
        return describeDerivationFailure(explicitValue);
    }

    const derivation = effectiveDerivation ?? deriveEffectiveAllocations(allocations, ownerships);
    if (!derivation.ok) return describeDerivationFailure(explicitValue);

    const effective = derivation.value.effectiveAllocations[personId] ?? "0";
    const display = explicitStored && explicitValue !== 0 ? (explicitDisplay ?? "Invalid") : "—";
    return {
        description: `${
            explicitStored ? `Explicit: ${explicitDisplay ?? "invalid"}.` : "Explicit: not stored."
        } Effective: ${effective}%. Owner remainder: ${derivation.value.ownerRemainder}%.`,
        display,
        invalid: false
    };
}

function numericAllocations(input: unknown): Readonly<Record<string, number>> {
    return Object.fromEntries(
        Object.entries(materializeAllocationRecord(input)).flatMap(([personId, value]) =>
            typeof value === "number" ? [[personId, value]] : []
        )
    );
}

function initialDraft(explicitValue: unknown): string {
    return explicitValue == null ? "" : String(explicitValue);
}

/** Resting allocation presentation shared by display-first rows and the inline editor. */
export function PersonAllocationDisplay({
    accountOwnerships = {},
    allocations = {},
    className,
    explicitValue,
    effectiveDerivation,
    personId,
    presenceField
}: PersonAllocationDisplayProps) {
    const descriptionId = useId();
    const presentation = allocationPresentation(
        personId,
        explicitValue,
        allocations,
        accountOwnerships,
        effectiveDerivation
    );

    return (
        <span
            aria-describedby={descriptionId}
            aria-invalid={presentation.invalid ? "true" : undefined}
            className={cn(
                "w-full min-w-0 truncate text-right text-sm tabular-nums",
                presentation.invalid ? "text-destructive font-medium" : "text-muted-foreground",
                className
            )}
            data-presence-field={presenceField}
            data-testid={`allocation-cell-${personId}`}
        >
            {presentation.display}
            <span id={descriptionId} className="sr-only">
                {presentation.description}
            </span>
        </span>
    );
}

export function PersonAllocationCell({
    accountOwnerships = {},
    allocations = {},
    className,
    explicitValue,
    effectiveDerivation,
    onCommit,
    onEditingChange,
    personId,
    personLabel,
    presenceField,
    startEditing = false
}: PersonAllocationCellProps) {
    const [editing, setEditing] = useState(startEditing);
    const [draft, setDraft] = useState(() => initialDraft(explicitValue));
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const externalExitValidationResult = useRef<TransactionGridEditorCommitResult | null>(null);
    const publishNativeBlurCommit = useTransactionGridNativeBlurCommit();
    const descriptionId = useId();
    const errorId = useId();
    const presentation = allocationPresentation(
        personId,
        explicitValue,
        allocations,
        accountOwnerships,
        effectiveDerivation
    );

    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editing]);

    // Derived from the single `editing` state so the report can never disagree with the rendering.
    // Layout timing lets a pointer destination observe validation before it claims controller ownership.
    useLayoutEffect(() => {
        onEditingChange?.(editing);
    }, [editing, onEditingChange]);

    const beginEditing = () => {
        setDraft(initialDraft(explicitValue));
        setError(null);
        setEditing(true);
    };

    const cancelEditing = useCallback(() => {
        setDraft(initialDraft(explicitValue));
        setError(null);
        setEditing(false);
    }, [explicitValue]);

    const commit = useCallback(() => {
        const parsed = parseAllocationDraft(draft);
        if (!parsed.ok) {
            setError(parsed.error);
            return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
        }
        const stored = AllocationPercentageSchema.safeParse(explicitValue);
        const unchanged = stored.success
            ? parsed.value === stored.data
            : explicitValue == null && parsed.value === 0;
        setError(null);
        if (unchanged) return TRANSACTION_GRID_EDITOR_COMMIT_UNCHANGED;
        if (onCommit == null) return TRANSACTION_GRID_EDITOR_COMMIT_FAILURE;
        return onCommit(personId, parsed.value);
    }, [draft, explicitValue, onCommit, personId]);
    const finishCommit = useCallback(
        (relatedTarget: EventTarget | null = null) => {
            const result = commit();
            externalExitValidationResult.current = result;
            const controllerHandledBlur = publishNativeBlurCommit?.(result, relatedTarget) ?? false;
            if (result.ok) {
                setEditing(false);
                return;
            }
            if (!controllerHandledBlur) {
                queueMicrotask(() => inputRef.current?.focus({ preventScroll: true }));
            }
        },
        [commit, publishNativeBlurCommit]
    );
    const editorLifecycle = useMemo<TransactionGridEditorLifecycle>(
        () => ({
            automation: {
                draft: { personId, text: draft },
                field: "allocation",
                originalAllocations: numericAllocations(allocations)
            },
            beginExternalExitValidation: () => {
                externalExitValidationResult.current = null;
            },
            cancel: cancelEditing,
            commit,
            externalExitValidation: "blur",
            readExternalExitValidation: () => externalExitValidationResult.current
        }),
        [allocations, cancelEditing, commit, draft, personId]
    );
    useTransactionGridEditorLifecycle(editorLifecycle);

    if (editing) {
        return (
            <div
                className={cn("relative flex h-full w-full min-w-0 items-center", className)}
                data-testid={`allocation-cell-${personId}`}
                data-presence-field={presenceField}
            >
                <Input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={draft}
                    onChange={(event) => {
                        setDraft(event.target.value);
                        if (error) setError(null);
                    }}
                    onBlur={(event) => finishCommit(event.relatedTarget)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            finishCommit();
                        } else if (event.key === "Escape") {
                            event.preventDefault();
                            cancelEditing();
                        }
                    }}
                    aria-label={`${personLabel} allocation percentage`}
                    aria-invalid={error ? "true" : undefined}
                    aria-describedby={error ? errorId : descriptionId}
                    className={cn(
                        "h-8 min-w-0 flex-1 text-right tabular-nums",
                        RESTING_CELL_CHROME,
                        TRANSACTION_GRID_EDITOR_INLINE_CHROME
                    )}
                />
                {error && (
                    <span
                        id={errorId}
                        role="alert"
                        className="text-destructive pointer-events-none absolute right-1 text-xs font-bold"
                        title={error}
                    >
                        !<span className="sr-only">{error}</span>
                    </span>
                )}
                <span id={descriptionId} className="sr-only">
                    {presentation.description}
                </span>
            </div>
        );
    }

    return (
        <button
            type="button"
            data-legacy-edit-activation
            onClick={beginEditing}
            onDoubleClick={beginEditing}
            aria-describedby={descriptionId}
            aria-label={`Edit ${personLabel} allocation`}
            aria-invalid={presentation.invalid ? "true" : undefined}
            className={cn(
                "flex h-8 w-full min-w-0 items-center justify-end rounded-none px-2 text-right text-sm tabular-nums",
                INNER_CELL_FOCUS_CHROME,
                presentation.invalid ? "text-destructive font-medium" : "text-muted-foreground",
                className
            )}
            data-testid={`allocation-cell-${personId}`}
            data-presence-field={presenceField}
        >
            {presentation.display}
            <span id={descriptionId} className="sr-only">
                {presentation.description}
            </span>
        </button>
    );
}
