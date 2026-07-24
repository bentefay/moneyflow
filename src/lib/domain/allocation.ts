/**
 * Exact allocation validation, owner-remainder derivation and minor-unit apportionment.
 */

import Decimal from "decimal.js";
import { z } from "zod";

import {
    type OwnershipValidationError,
    type ValidatedOwnershipSet,
    validateOwnershipSet
} from "./ownership";

const ExactDecimal = Decimal.clone({
    precision: 80,
    rounding: Decimal.ROUND_HALF_EVEN
});

export const AllocationPercentageSchema = z
    .number()
    .refine(Number.isFinite)
    .refine((value) => !Object.is(value, -0))
    .min(-100)
    .max(100)
    .brand<"AllocationPercentage">();

const ExactDecimalStringSchema = z.string().brand<"ExactDecimalString">();

export type AllocationPercentage = z.infer<typeof AllocationPercentageSchema>;
export type ExactDecimalString = z.infer<typeof ExactDecimalStringSchema>;
export type ValidatedAllocationSet = Readonly<Record<string, AllocationPercentage>>;
export type ExactPercentageWeights = Readonly<Record<string, ExactDecimalString>>;

export type ExactPercentageWeightsValidationResult =
    | {
          readonly ok: true;
          readonly value: ExactPercentageWeights;
      }
    | {
          readonly error:
              | {
                    readonly personId: string;
                    readonly type: "invalid-weight";
                }
              | {
                    readonly total: string;
                    readonly type: "invalid-weight-total";
                };
          readonly ok: false;
      };

type AllocationEntryErrorReason = "negative-zero" | "not-finite" | "not-number" | "out-of-range";

export interface AllocationValidationError {
    readonly domain: "allocation";
    readonly personId: string;
    readonly reason: AllocationEntryErrorReason;
    readonly type: "invalid-allocation";
}

export type AllocationSetValidationResult =
    | {
          readonly ok: true;
          readonly value: ValidatedAllocationSet;
      }
    | {
          readonly errors: readonly AllocationValidationError[];
          readonly ok: false;
      };

export interface EffectiveAllocationDerivation {
    readonly effectiveAllocations: ExactPercentageWeights;
    readonly effectiveTotal: ExactDecimalString;
    readonly explicitAllocations: ValidatedAllocationSet;
    readonly ownerRemainder: ExactDecimalString;
    readonly ownershipTotal: ExactDecimalString;
    readonly ownershipWeightTotal: ExactDecimalString;
    readonly ownershipWeights: ExactPercentageWeights;
}

export type EffectiveAllocationResult =
    | {
          readonly ok: true;
          readonly value: EffectiveAllocationDerivation;
      }
    | {
          readonly errors: readonly (AllocationValidationError | OwnershipValidationError)[];
          readonly ok: false;
      };

export type ApportionmentError =
    | {
          readonly type: "invalid-amount";
      }
    | {
          readonly personId: string;
          readonly type: "invalid-weight";
      }
    | {
          readonly total: string;
          readonly type: "invalid-weight-total";
      }
    | {
          readonly type: "unsafe-apportionment";
      };

export type MinorUnitApportionmentResult =
    | {
          readonly ok: true;
          readonly value: Readonly<Record<string, number>>;
      }
    | {
          readonly error: ApportionmentError;
          readonly ok: false;
      };

function allocationEntryErrorReason(value: unknown): AllocationEntryErrorReason | null {
    if (typeof value !== "number") return "not-number";
    if (!Number.isFinite(value)) return "not-finite";
    if (Object.is(value, -0)) return "negative-zero";
    if (value < -100 || value > 100) return "out-of-range";
    return null;
}

function exactDecimalString(value: Decimal): ExactDecimalString {
    const parsed = ExactDecimalStringSchema.safeParse(value.toString());
    if (!parsed.success) throw new Error("Decimal produced a non-string representation");
    return parsed.data;
}

function comparePersonIds(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function decimalSum(values: readonly Decimal[]): Decimal {
    return values.reduce((total, value) => total.plus(value), new ExactDecimal(0));
}

function parseExactDecimal(value: string): Decimal | null {
    try {
        const parsed = new ExactDecimal(value);
        return parsed.isFinite() ? parsed : null;
    } catch {
        return null;
    }
}

export function validateExactPercentageWeights(
    weights: Readonly<Record<string, string>>
): ExactPercentageWeightsValidationResult {
    const validated: Record<string, ExactDecimalString> = {};
    const parsedWeights: Decimal[] = [];
    for (const [personId, value] of Object.entries(weights).sort(([left], [right]) =>
        comparePersonIds(left, right)
    )) {
        const parsed = parseExactDecimal(value);
        if (parsed == null) {
            return { ok: false, error: { personId, type: "invalid-weight" } };
        }
        validated[personId] = exactDecimalString(parsed);
        parsedWeights.push(parsed);
    }
    const total = decimalSum(parsedWeights);
    if (!total.equals(100)) {
        return {
            ok: false,
            error: { total: total.toString(), type: "invalid-weight-total" }
        };
    }
    return { ok: true, value: Object.freeze(validated) };
}

export function validateAllocationSet(
    allocations: Readonly<Record<string, unknown>>
): AllocationSetValidationResult {
    const entries = Object.entries(allocations);
    const errors = entries.flatMap(([personId, value]): readonly AllocationValidationError[] => {
        const reason = allocationEntryErrorReason(value);
        return reason == null
            ? []
            : [{ domain: "allocation", personId, reason, type: "invalid-allocation" }];
    });
    if (errors.length > 0) return { ok: false, errors: Object.freeze(errors) };

    const validated: Record<string, AllocationPercentage> = {};
    for (const [personId, value] of entries) {
        const parsed = AllocationPercentageSchema.safeParse(value);
        if (parsed.success) validated[personId] = parsed.data;
    }
    return { ok: true, value: Object.freeze(validated) };
}

function deriveOwnershipWeights(ownerships: ValidatedOwnershipSet): {
    readonly ownershipTotal: Decimal;
    readonly weights: Readonly<Record<string, Decimal>>;
} {
    const entries = Object.entries(ownerships).sort(([left], [right]) =>
        comparePersonIds(left, right)
    );
    const ownershipTotal = decimalSum(
        entries.map(([, percentage]) => new ExactDecimal(percentage))
    );
    const weights: Record<string, Decimal> = {};
    let assigned = new ExactDecimal(0);

    entries.forEach(([personId, percentage], index) => {
        const isLast = index === entries.length - 1;
        const weight = isLast
            ? new ExactDecimal(100).minus(assigned)
            : new ExactDecimal(percentage).mul(100).div(ownershipTotal);
        weights[personId] = weight;
        assigned = assigned.plus(weight);
    });

    return { ownershipTotal, weights: Object.freeze(weights) };
}

function stringifyWeights(weights: Readonly<Record<string, Decimal>>): ExactPercentageWeights {
    return Object.freeze(
        Object.fromEntries(
            Object.entries(weights).map(([personId, weight]) => [
                personId,
                exactDecimalString(weight)
            ])
        )
    );
}

export function deriveEffectiveAllocations(
    explicitInput: Readonly<Record<string, unknown>>,
    ownershipInput: Readonly<Record<string, unknown>>
): EffectiveAllocationResult {
    const explicitResult = validateAllocationSet(explicitInput);
    const ownershipResult = validateOwnershipSet(ownershipInput);
    const errors = [
        ...(explicitResult.ok ? [] : explicitResult.errors),
        ...(ownershipResult.ok ? [] : ownershipResult.errors)
    ];
    if (errors.length > 0 || !explicitResult.ok || !ownershipResult.ok) {
        return { ok: false, errors: Object.freeze(errors) };
    }

    const explicitEntries = Object.entries(explicitResult.value);
    const explicitTotal = decimalSum(
        explicitEntries.map(([, percentage]) => new ExactDecimal(percentage))
    );
    const ownerRemainder = new ExactDecimal(100).minus(explicitTotal);
    const { ownershipTotal, weights: ownershipWeights } = deriveOwnershipWeights(
        ownershipResult.value
    );
    const ownerEntries = Object.entries(ownershipWeights);
    const ownerContributions: Record<string, Decimal> = {};
    let assignedRemainder = new ExactDecimal(0);

    ownerEntries.forEach(([personId, ownershipWeight], index) => {
        const isLast = index === ownerEntries.length - 1;
        const contribution = isLast
            ? ownerRemainder.minus(assignedRemainder)
            : ownerRemainder.mul(ownershipWeight).div(100);
        ownerContributions[personId] = contribution;
        assignedRemainder = assignedRemainder.plus(contribution);
    });

    const personIds = Array.from(
        new Set([
            ...explicitEntries.map(([personId]) => personId),
            ...Object.keys(ownershipWeights)
        ])
    ).sort(comparePersonIds);
    const effective: Record<string, Decimal> = {};
    for (const personId of personIds) {
        effective[personId] = new ExactDecimal(explicitResult.value[personId] ?? 0).plus(
            ownerContributions[personId] ?? 0
        );
    }
    const effectiveTotal = decimalSum(Object.values(effective));
    const ownershipWeightTotal = decimalSum(Object.values(ownershipWeights));

    return {
        ok: true,
        value: Object.freeze({
            effectiveAllocations: stringifyWeights(effective),
            effectiveTotal: exactDecimalString(effectiveTotal),
            explicitAllocations: explicitResult.value,
            ownerRemainder: exactDecimalString(ownerRemainder),
            ownershipTotal: exactDecimalString(ownershipTotal),
            ownershipWeightTotal: exactDecimalString(ownershipWeightTotal),
            ownershipWeights: stringifyWeights(ownershipWeights)
        })
    };
}

interface ApportionmentRow {
    readonly exactShare: Decimal;
    readonly floorShare: Decimal;
    readonly fractionalRemainder: Decimal;
    readonly personId: string;
}

export function apportionMinorUnits(
    amountMinor: number,
    weights: ExactPercentageWeights
): MinorUnitApportionmentResult {
    if (!Number.isSafeInteger(amountMinor)) {
        return { ok: false, error: { type: "invalid-amount" } };
    }

    const parsedEntries: Array<readonly [string, Decimal]> = [];
    for (const [personId, value] of Object.entries(weights)) {
        const parsed = parseExactDecimal(value);
        if (parsed == null) {
            return { ok: false, error: { personId, type: "invalid-weight" } };
        }
        parsedEntries.push([personId, parsed]);
    }
    parsedEntries.sort(([left], [right]) => comparePersonIds(left, right));

    const weightTotal = decimalSum(parsedEntries.map(([, weight]) => weight));
    if (!weightTotal.equals(100)) {
        return {
            ok: false,
            error: { total: weightTotal.toString(), type: "invalid-weight-total" }
        };
    }

    const rows: readonly ApportionmentRow[] = parsedEntries.map(([personId, weight]) => {
        const exactShare = new ExactDecimal(amountMinor).mul(weight).div(100);
        const floorShare = exactShare.floor();
        return {
            exactShare,
            floorShare,
            fractionalRemainder: exactShare.minus(floorShare),
            personId
        };
    });
    const floorTotal = decimalSum(rows.map(({ floorShare }) => floorShare));
    const remainingDecimal = new ExactDecimal(amountMinor).minus(floorTotal);
    if (
        !remainingDecimal.isInteger() ||
        remainingDecimal.isNegative() ||
        remainingDecimal.greaterThan(rows.length)
    ) {
        return { ok: false, error: { type: "unsafe-apportionment" } };
    }
    const remaining = remainingDecimal.toNumber();
    const recipients = new Set(
        [...rows]
            .sort((left, right) => {
                const remainderOrder = right.fractionalRemainder.comparedTo(
                    left.fractionalRemainder
                );
                return remainderOrder === 0
                    ? comparePersonIds(left.personId, right.personId)
                    : remainderOrder;
            })
            .slice(0, remaining)
            .map(({ personId }) => personId)
    );
    const apportioned: Record<string, number> = {};
    for (const { floorShare, personId } of rows) {
        const share = floorShare.plus(recipients.has(personId) ? 1 : 0);
        if (!share.isInteger() || share.abs().greaterThan(Number.MAX_SAFE_INTEGER)) {
            return { ok: false, error: { type: "unsafe-apportionment" } };
        }
        apportioned[personId] = share.toNumber();
    }

    return { ok: true, value: Object.freeze(apportioned) };
}
