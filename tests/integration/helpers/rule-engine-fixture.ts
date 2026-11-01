/**
 * A large vault for the rule engine's cost tests: `rowCount` imported rows across four accounts and
 * a year of dates, and `ruleCount` tag rules written straight to `state.fieldRules`. Half the rules
 * are unscoped and half account-scoped over the same descriptions, so every matching row has two
 * competing rules per field, and half the rows' descriptions match no rule at all.
 */

import { Temporal } from "temporal-polyfill";

import { toFieldRuleInput } from "@/lib/crdt/field-rules";
import { createVaultMirror } from "@/lib/crdt/mirror";
import { insertTransaction, type TransactionLocation } from "@/lib/crdt/mutations";
import { type FieldRuleInput, type TransactionInput, type VaultState } from "@/lib/crdt/schema";
import { buildFieldRule, type FieldRuleCandidate } from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";

export const FIXTURE_ACCOUNTS = ["account-0", "account-1", "account-2", "account-3"] as const;
const FIRST_DATE = Temporal.PlainDate.from("2025-01-01");
const CREATION = Temporal.Instant.from("2025-01-01T00:00:00Z");

export type RuleEngineVault = ReturnType<typeof createVaultMirror>;

export interface RuleEngineFixture {
    readonly vault: RuleEngineVault;
    /** A row some rule matches, for single-row paths. */
    readonly sampleLocation: TransactionLocation;
    readonly descriptionCount: number;
}

export function fixtureDescription(index: number): string {
    return `MERCHANT ${index}`;
}

function fixtureRow(index: number, descriptionCount: number): TransactionInput {
    const accountId = FIXTURE_ACCOUNTS[index % FIXTURE_ACCOUNTS.length] ?? "account-0";
    return {
        id: `tx-${index}`,
        date: FIRST_DATE.add({ days: index % 365 }),
        // Twice as many descriptions as rule texts, so half the rows match nothing.
        description: fixtureDescription(index % (descriptionCount * 2)),
        descriptionAliasId: undefined,
        notes: "",
        amount: asMinorUnits(-100 - (index % 50)),
        originalAmount: undefined,
        accountId,
        tagIds: [],
        statusId: "status-1",
        importId: "import-1",
        allocations: {},
        creationInstant: CREATION,
        importRowIndex: undefined,
        suspectedDuplicates: [],
        deletedAt: undefined
    };
}

/** The `index`th fixture rule: unscoped for the first half, account-scoped for the second. */
export function fixtureRuleCandidate(index: number, ruleCount: number): FieldRuleCandidate<number> {
    const descriptionCount = Math.max(1, Math.floor(ruleCount / 2));
    const scoped = index >= descriptionCount;
    return {
        id: `rule-${index}`,
        descriptionText: fixtureDescription(index % descriptionCount),
        accountId: scoped ? FIXTURE_ACCOUNTS[index % FIXTURE_ACCOUNTS.length] : undefined,
        outputs: { tags: { mode: scoped ? "set" : "add", tagIds: [`tag-${index}`] } },
        createdAtEpochMs: 1000 + index
    };
}

export function fixtureRuleInput(index: number, ruleCount: number): FieldRuleInput {
    const built = buildFieldRule(fixtureRuleCandidate(index, ruleCount));
    if (!built.ok) throw new Error(`fixture rule ${index} is invalid`);
    return toFieldRuleInput(built.value);
}

export function buildRuleEngineFixture(rowCount: number, ruleCount: number): RuleEngineFixture {
    const vault = createVaultMirror();
    const descriptionCount = Math.max(1, Math.floor(ruleCount / 2));
    vault.mirror.setState((state: VaultState) => {
        for (let index = 0; index < rowCount; index += 1) {
            insertTransaction(state.transactions, {
                transaction: fixtureRow(index, descriptionCount)
            });
        }
        const draft: Record<string, FieldRuleInput> = state.fieldRules;
        for (let index = 0; index < ruleCount; index += 1) {
            draft[`rule-${index}`] = fixtureRuleInput(index, ruleCount);
        }
    });
    const sample = fixtureRow(0, descriptionCount);
    return {
        vault,
        sampleLocation: {
            accountId: sample.accountId,
            date: sample.date,
            transactionId: sample.id
        },
        descriptionCount
    };
}

/** Median wall-clock milliseconds of `runs` calls to `measure`. */
export function medianMs(runs: number, measure: () => void): number {
    const samples: number[] = [];
    for (let run = 0; run < runs; run += 1) {
        const started = performance.now();
        measure();
        samples.push(performance.now() - started);
    }
    samples.sort((left, right) => left - right);
    return samples[Math.floor(samples.length / 2)] ?? Number.NaN;
}
