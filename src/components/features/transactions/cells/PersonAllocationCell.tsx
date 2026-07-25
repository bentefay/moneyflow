"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { deriveEffectiveAllocations, type EffectiveAllocationResult } from "@/lib/domain";
import { cn } from "@/lib/utils";

import { materializeAllocationRecord, parseAllocationDraft } from "../allocation-columns";

export interface PersonAllocationCellProps {
    readonly accountOwnerships?: unknown;
    readonly allocations?: unknown;
    readonly className?: string;
    readonly explicitValue?: unknown;
    readonly effectiveDerivation?: EffectiveAllocationResult;
    readonly onCommit?: (personId: string, value: number) => void;
    readonly personId: string;
    readonly personLabel: string;
}

interface AllocationPresentation {
    readonly description: string;
    readonly display: string;
    readonly invalid: boolean;
}

function displayPercentage(value: unknown): string | null {
    return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)
        ? `${String(value)}%`
        : null;
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

function allocationPresentation(
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

function initialDraft(explicitValue: unknown): string {
    return explicitValue == null ? "" : String(explicitValue);
}

export function PersonAllocationCell({
    accountOwnerships = {},
    allocations = {},
    className,
    explicitValue,
    effectiveDerivation,
    onCommit,
    personId,
    personLabel
}: PersonAllocationCellProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(() => initialDraft(explicitValue));
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
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

    const beginEditing = () => {
        setDraft(initialDraft(explicitValue));
        setError(null);
        setEditing(true);
    };

    const cancelEditing = () => {
        setDraft(initialDraft(explicitValue));
        setError(null);
        setEditing(false);
    };

    const commit = () => {
        const parsed = parseAllocationDraft(draft);
        if (!parsed.ok) {
            setError(parsed.error);
            return;
        }
        onCommit?.(personId, parsed.value);
        setError(null);
        setEditing(false);
    };

    if (editing) {
        return (
            <div
                className={cn("relative flex min-w-0 items-center gap-1", className)}
                data-testid={`allocation-cell-${personId}`}
                data-presence-field={`allocation:${personId}`}
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
                    onBlur={commit}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            commit();
                        } else if (event.key === "Escape") {
                            event.preventDefault();
                            cancelEditing();
                        }
                    }}
                    aria-label={`${personLabel} allocation percentage`}
                    aria-invalid={error ? "true" : undefined}
                    aria-describedby={error ? errorId : descriptionId}
                    className="h-8 min-w-0 flex-1 px-2 text-right tabular-nums"
                />
                {error && (
                    <span
                        id={errorId}
                        role="alert"
                        className="text-destructive shrink-0 text-xs font-bold"
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
            onClick={beginEditing}
            onDoubleClick={beginEditing}
            aria-describedby={descriptionId}
            aria-label={`Edit ${personLabel} allocation`}
            className={cn(
                "hover:bg-accent focus-visible:ring-primary flex h-8 w-full min-w-0 items-center justify-end rounded px-2 text-right text-sm tabular-nums focus-visible:ring-2 focus-visible:outline-none",
                presentation.invalid ? "text-destructive font-medium" : "text-muted-foreground",
                className
            )}
            data-testid={`allocation-cell-${personId}`}
            data-presence-field={`allocation:${personId}`}
        >
            {presentation.display}
            <span id={descriptionId} className="sr-only">
                {presentation.description}
            </span>
        </button>
    );
}
