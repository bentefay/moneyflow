import { AllocationPercentageSchema } from "@/lib/domain";

export const BASE_TRANSACTION_GRID_PREFIX = "32px 120px minmax(150px,2fr) 160px 140px 110px";
export const BASE_TRANSACTION_GRID_SUFFIX = "112px 88px";
export const ALLOCATION_COLUMN_WIDTH = "minmax(112px,128px)";

export type AllocationField = `allocation:${string}`;

export interface AllocationColumn {
    readonly field: AllocationField;
    readonly label: string;
    readonly personId: string;
}

export interface AllocationColumnPerson {
    readonly deletedAt?: unknown;
    readonly id: string;
    readonly name: string;
}

export interface AllocationColumnTransaction {
    readonly allocations?: unknown;
}

export interface AllocationColumnModel {
    readonly columns: readonly AllocationColumn[];
    readonly gridTemplateColumns: string;
}

interface BuildAllocationColumnModelInput {
    readonly activePeople: readonly AllocationColumnPerson[];
    readonly allPeople: readonly AllocationColumnPerson[];
    readonly transactions: readonly AllocationColumnTransaction[];
}

export type AllocationDraftResult =
    | { readonly ok: true; readonly value: number }
    | { readonly error: string; readonly ok: false };

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

/** Copies only own enumerable data properties and strips Loro collection metadata. */
export function materializeAllocationRecord(value: unknown): Readonly<Record<string, unknown>> {
    if (value == null || typeof value !== "object") return {};

    const result: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        if (key !== "$cid" && descriptor.enumerable && "value" in descriptor) {
            result[key] = descriptor.value;
        }
    }
    return result;
}

function hasHistoricalAllocation(value: unknown): boolean {
    return typeof value !== "number" || !Object.is(value, 0);
}

export function allocationField(personId: string): AllocationField {
    return `allocation:${personId}`;
}

export function buildTransactionGridTemplate(allocationCount: number): string {
    return [
        BASE_TRANSACTION_GRID_PREFIX,
        ...Array.from({ length: allocationCount }, () => ALLOCATION_COLUMN_WIDTH),
        BASE_TRANSACTION_GRID_SUFFIX
    ].join(" ");
}

/**
 * Active People use the People screen's name/id ordering. Historical references follow by ID so
 * malformed legacy state cannot destabilise the table between renders.
 */
export function buildAllocationColumnModel({
    activePeople,
    allPeople,
    transactions
}: BuildAllocationColumnModelInput): AllocationColumnModel {
    const active = [...activePeople].sort(
        (left, right) => left.name.localeCompare(right.name) || compareText(left.id, right.id)
    );
    const activeIds = new Set(active.map(({ id }) => id));
    const peopleById = new Map(allPeople.map((person) => [person.id, person]));
    const historicalIds = new Set<string>();

    for (const transaction of transactions) {
        for (const [personId, value] of Object.entries(
            materializeAllocationRecord(transaction.allocations)
        )) {
            if (!activeIds.has(personId) && hasHistoricalAllocation(value)) {
                historicalIds.add(personId);
            }
        }
    }

    const columns: AllocationColumn[] = active.map(({ id, name }) => ({
        field: allocationField(id),
        label: name,
        personId: id
    }));
    for (const personId of [...historicalIds].sort(compareText)) {
        const person = peopleById.get(personId);
        columns.push({
            field: allocationField(personId),
            label: person ? `${person.name} (deleted)` : `Unknown person ${personId}`,
            personId
        });
    }

    return Object.freeze({
        columns: Object.freeze(columns),
        gridTemplateColumns: buildTransactionGridTemplate(columns.length)
    });
}

export function parseAllocationDraft(input: string): AllocationDraftResult {
    const trimmed = input.trim();
    if (trimmed.length === 0 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
        return { error: "Enter a number from -100 to 100.", ok: false };
    }

    const value = Number(trimmed);
    const parsed = AllocationPercentageSchema.safeParse(value);
    if (!parsed.success) {
        return {
            error: Object.is(value, -0)
                ? "Negative zero is not a valid allocation."
                : "Enter a finite number from -100 to 100.",
            ok: false
        };
    }
    return { ok: true, value: parsed.data };
}
