"use client";

/**
 * BehaviorSelector Component
 *
 * Dropdown selector for status behaviors.
 * Currently supports "treatAsPaid" which marks transactions as paid for settlement calculations.
 */

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

/** The behaviour a status can carry; `undefined` means "no special behaviour". */
export type StatusBehavior = "treatAsPaid";

export interface BehaviorSelectorProps {
    /** Current behavior, or undefined for none */
    value: StatusBehavior | undefined;
    /** Callback when behavior changes; undefined means the user chose "None" */
    onChange: (value: StatusBehavior | undefined) => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Radix `Select` cannot represent "no selection" as an item value, so "None" needs a sentinel.
 * It is confined to this module: `value`/`onChange` speak only the domain type, so a caller
 * cannot leak the sentinel into a persisted `behavior` field.
 */
const NONE_VALUE = "none";

/** Available status behaviors */
export const STATUS_BEHAVIORS = [
    { value: undefined, label: "None" },
    { value: "treatAsPaid", label: "Treat as Paid" }
] as const satisfies readonly { value: StatusBehavior | undefined; label: string }[];

/**
 * Behavior selector component for status configuration.
 *
 * "Treat as Paid" behavior includes the transaction in settlement
 * calculations, marking the expense as settled between parties.
 */
export function BehaviorSelector({ value, onChange, className }: BehaviorSelectorProps) {
    return (
        <Select
            value={value ?? NONE_VALUE}
            onValueChange={(next) => onChange(next === NONE_VALUE ? undefined : "treatAsPaid")}
        >
            <SelectTrigger className={className} data-testid="behavior-selector">
                <SelectValue placeholder="Select behavior" />
            </SelectTrigger>
            <SelectContent>
                {STATUS_BEHAVIORS.map((behavior) => (
                    <SelectItem
                        key={behavior.value ?? NONE_VALUE}
                        value={behavior.value ?? NONE_VALUE}
                        data-testid={`behavior-option-${behavior.value ?? NONE_VALUE}`}
                    >
                        {behavior.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
