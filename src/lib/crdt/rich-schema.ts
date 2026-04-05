/**
 * Rich Domain Type Transforms for Loro Mirror Schema
 *
 * Centralises conversions between CRDT primitives and rich domain types.
 * After applying these transforms, mirror.getState() returns domain types directly
 * and mirror.setState() accepts them.
 *
 * Decode: Simple casts/conversions only. Never throws.
 * Validate: Runtime checks (enum membership, integer check, valid currency code).
 */

import type { TransformDefinition } from "loro-mirror";
import { schema } from "loro-mirror";
import { Temporal } from "temporal-polyfill";

import {
    type CurrencyCode,
    isValidCurrencyCode,
    type MoneyMinorUnits,
} from "@/lib/domain/currency";
import type { Percentage } from "@/types";

// ============================================
// TRANSFORM DEFINITIONS
// ============================================

/**
 * string (ISO YYYY-MM-DD) ↔ Temporal.PlainDate
 */
export const plainDateTransform: TransformDefinition<string, Temporal.PlainDate> = {
    decode: (value) => Temporal.PlainDate.from(value),
    encode: (value) => value.toString(),
    isEqual: (a, b) => Temporal.PlainDate.compare(a, b) === 0,
    validate: (value) => {
        if (!(value instanceof Temporal.PlainDate)) return "Expected Temporal.PlainDate";
        return true;
    },
};

/**
 * number (epoch milliseconds) ↔ Temporal.Instant
 */
export const instantFromMillisTransform: TransformDefinition<number, Temporal.Instant> = {
    decode: (value) => Temporal.Instant.fromEpochMilliseconds(value),
    encode: (value) => value.epochMilliseconds,
    isEqual: (a, b) => a.epochMilliseconds === b.epochMilliseconds,
    validate: (value) => {
        if (!(value instanceof Temporal.Instant)) return "Expected Temporal.Instant";
        return true;
    },
};

/**
 * number ↔ MoneyMinorUnits (branded number)
 * Branded number — === does value comparison on primitives.
 */
export const moneyMinorUnitsTransform: TransformDefinition<number, MoneyMinorUnits> = {
    decode: (value) => value as MoneyMinorUnits,
    encode: (value) => value as number,
    validate: (value) => {
        if (!Number.isInteger(value)) return "MoneyMinorUnits must be an integer";
        return true;
    },
};

/**
 * number ↔ Percentage (branded number)
 * Branded number — === does value comparison on primitives.
 */
export const percentageTransform: TransformDefinition<number, Percentage> = {
    decode: (value) => value as Percentage,
    encode: (value) => value as number,
};

/**
 * string ↔ CurrencyCode (branded string from Currencies keyof)
 * === works for string comparison.
 */
export const currencyCodeTransform: TransformDefinition<string, CurrencyCode> = {
    decode: (value) => value as CurrencyCode,
    encode: (value) => value as string,
    validate: (value) => {
        if (!isValidCurrencyCode(value as string)) return `Invalid currency code: ${value}`;
        return true;
    },
};

/**
 * Generic factory for string literal union transforms.
 * Decode is a cast; validate checks membership.
 */
export function createEnumTransform<T extends string>(
    values: readonly T[]
): TransformDefinition<string, T> {
    const valueSet = new Set<string>(values);
    return {
        decode: (value) => value as T,
        encode: (value) => value as string,
        validate: (value) => {
            if (!valueSet.has(value as string)) {
                return `Expected one of: ${values.join(", ")}; got: ${value}`;
            }
            return true;
        },
    };
}

// ============================================
// RICH SCHEMA FACTORY
// ============================================

import type { SchemaOptions } from "loro-mirror";

/**
 * Factory for schema fields with rich domain type transforms.
 *
 * Each method is generic over `O extends SchemaOptions` so that specific
 * options like `{ required: false }` propagate through to the returned
 * schema type, preserving optionality in InferType / InferInputType.
 *
 * loro-mirror v2 infers transformed fields as `T | undefined` unless the
 * schema options include `defaultValue`. Each helper spreads a sensible
 * CRDT-level default that the caller's options override via spread order.
 *
 * Usage:
 *   richSchema.PlainDate({ required: true })   // → PlainDate
 *   richSchema.PlainDate({ required: false })   // → PlainDate | undefined
 *   richSchema.Instant()                        // → Instant
 *   richSchema.Percentage()                     // → Percentage
 *   richSchema.StringEnum(["a", "b"] as const, { required: true })
 */
export const richSchema = {
    PlainDate: <O extends SchemaOptions>(opts: O) =>
        schema.String({ defaultValue: "1970-01-01", ...opts }).transform(plainDateTransform),

    Instant: <O extends SchemaOptions>(opts: O) =>
        schema.Number({ defaultValue: 0, ...opts }).transform(instantFromMillisTransform),

    MoneyMinorUnits: <O extends SchemaOptions>(opts: O) =>
        schema.Number({ defaultValue: 0, ...opts }).transform(moneyMinorUnitsTransform),

    Percentage: <O extends SchemaOptions>(opts: O) =>
        schema.Number({ defaultValue: 0, ...opts }).transform(percentageTransform),

    CurrencyCode: <O extends SchemaOptions>(opts: O) =>
        schema.String({ defaultValue: "USD", ...opts }).transform(currencyCodeTransform),

    StringEnum: <T extends string, O extends SchemaOptions>(values: readonly T[], opts: O) =>
        schema.String({ defaultValue: values[0], ...opts }).transform(createEnumTransform(values)),
};
