/**
 * Allocation context for a settlement source row.
 *
 * Reuses the P16A primitive `deriveEffectiveAllocations` so the People page shows exactly the
 * explicit and effective percentages the canonical engine apportioned. Nothing is recomputed with
 * binary floating point and no value is clamped, normalized or rewritten: an input the primitive
 * rejects yields no allocation context at all rather than a plausible-looking substitute.
 */

import { deriveEffectiveAllocations } from "@/lib/domain/allocation";

import {
    resolvePersonLabel,
    type SettlementAllocationEntry,
    type SettlementViewInput
} from "./settlement-view";

/** Copies only own enumerable data properties and strips Loro collection metadata. */
function materializeRecord(value: unknown): Readonly<Record<string, unknown>> {
    if (value == null || typeof value !== "object") return {};

    const result: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        if (key !== "$cid" && descriptor.enumerable && "value" in descriptor) {
            result[key] = descriptor.value;
        }
    }
    return result;
}

/**
 * Derive the explicit/effective allocation entries shown when an obligation is expanded.
 *
 * Returns an empty list when the stored allocation or ownership data cannot be derived, which is
 * the same condition under which the engine excludes the transaction and raises a typed issue.
 */
export function buildAllocationEntries(
    allocations: unknown,
    ownerships: unknown,
    resolvePerson: SettlementViewInput["resolvePerson"]
): readonly SettlementAllocationEntry[] {
    const derivation = deriveEffectiveAllocations(
        materializeRecord(allocations),
        materializeRecord(ownerships)
    );
    if (!derivation.ok) return Object.freeze([]);

    const { effectiveAllocations, explicitAllocations } = derivation.value;
    return Object.freeze(
        Object.entries(effectiveAllocations).map(
            ([personId, effectivePercentage]): SettlementAllocationEntry => {
                const explicit = explicitAllocations[personId];
                return Object.freeze({
                    effectivePercentage,
                    explicitPercentage: explicit == null ? null : String(explicit),
                    person: resolvePersonLabel(personId, resolvePerson),
                    personId
                });
            }
        )
    );
}
