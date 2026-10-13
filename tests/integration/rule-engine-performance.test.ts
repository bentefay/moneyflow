/**
 * Cost ceilings for the rule engine on a 5,000-row / 500-rule vault.
 *
 * Each ceiling sits well above the quiet-machine median, so a loaded machine does not flake it, and
 * well below what the pre-index engine cost, so a return to matching every rule against every row,
 * or to finding a row by walking the vault, fails here. A looser ceiling would not: the pre-index
 * count took ~22 ms and the pre-index single-row apply ~3.5x a plain write at this size. The
 * single-row ceiling is a ratio to a plain write measured alongside it, interleaved, so machine
 * load moves both sides together.
 */

import { beforeAll, describe, expect, it, vi } from "vitest";

import { applyFieldRulesToSingleTransaction } from "@/lib/crdt/apply-field-rule-to-transaction";
import { readActiveFieldRules, readRulePopulation } from "@/lib/crdt/field-rules";
import { updateTransaction } from "@/lib/crdt/mutations";
import { type VaultState } from "@/lib/crdt/schema";
import {
    countRulePopulation,
    type RulePopulationTransaction
} from "@/lib/domain/automation/population";
import { buildRuleIndex, type RuleIndex } from "@/lib/domain/automation/rule-index";
import { selectWinningRulesByField } from "@/lib/domain/automation/rules";

import {
    buildRuleEngineFixture,
    medianMs,
    type RuleEngineFixture
} from "./helpers/rule-engine-fixture";

const ROWS = 5_000;
const RULES = 500;
const SAMPLES = 9;

// Quiet-machine medians after the index: ~1 ms to count, ~2 ms to match every row, and ~1x a
// plain write for the single-row apply.
const COUNT_CEILING_MS = 10;
const MATCH_CEILING_MS = 50;
const SINGLE_ROW_RATIO_CEILING = 2;

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

describe("rule engine cost at 5,000 rows and 500 rules", () => {
    let fixture: RuleEngineFixture;
    let index: RuleIndex;
    let population: readonly RulePopulationTransaction[];

    beforeAll(() => {
        fixture = buildRuleEngineFixture(ROWS, RULES);
        const state = fixture.vault.mirror.getState();
        index = buildRuleIndex(readActiveFieldRules(state));
        population = readRulePopulation(state.transactions, state.descriptionAliases);
    });

    it("counts a rule's population without testing every rule against every row", () => {
        const [rule] = index.rules;
        if (rule == null) throw new Error("fixture has no rules");
        const count = (): number =>
            countRulePopulation({
                rule,
                rules: index,
                transactions: population,
                scope: "all",
                referenceDate: null
            });

        // The fixture must give the count something to find, or a fast zero proves nothing.
        expect(count()).toBeGreaterThan(0);
        expect(medianMs(SAMPLES, count)).toBeLessThan(COUNT_CEILING_MS);
    });

    it("matches every row through the index", () => {
        let winners = 0;
        const matchAll = (): void => {
            winners = 0;
            for (const row of population) {
                winners += Object.keys(selectWinningRulesByField(index, row.subject)).length;
            }
        };

        expect(medianMs(SAMPLES, matchAll)).toBeLessThan(MATCH_CEILING_MS);
        // Half the rows carry a rule's text; each of those has a tags winner.
        expect(winners).toBe(ROWS / 2);
    });

    it("applies rules to one located row for about the cost of a plain write to it", () => {
        const { vault, sampleLocation } = fixture;
        const { transactionId, accountId, date } = sampleLocation;
        const plainSamples: number[] = [];
        const applySamples: number[] = [];
        const time = (samples: number[], write: (state: VaultState) => void): void => {
            const started = performance.now();
            vault.mirror.setState(write);
            samples.push(performance.now() - started);
        };

        // Interleaved, so a load spike lands on both sides rather than skewing the ratio.
        for (let sample = 0; sample < SAMPLES; sample += 1) {
            time(plainSamples, (state) =>
                updateTransaction(state.transactions, {
                    location: sampleLocation,
                    updates: { notes: `note ${sample}` }
                })
            );
            time(applySamples, (state) => {
                const result = applyFieldRulesToSingleTransaction(state, {
                    transactionId,
                    location: { accountId, date }
                });
                expect(result.ok).toBe(true);
            });
        }

        const median = (samples: readonly number[]): number =>
            [...samples].sort((left, right) => left - right)[Math.floor(samples.length / 2)] ?? 0;
        expect(median(applySamples)).toBeLessThan(median(plainSamples) * SINGLE_ROW_RATIO_CEILING);
    });
});
