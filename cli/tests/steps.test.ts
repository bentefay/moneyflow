import { describe, expect, it } from "vitest";

import type { Step, StepsReporter } from "../lib/steps";
import { runSteps } from "../lib/steps";

const silent: StepsReporter = { started: () => {}, failed: () => {} };

const recordingSteps = (codes: readonly number[]) => {
    const ran: string[] = [];
    const steps: Step[] = codes.map((code, index) => ({
        name: `step ${index}`,
        run: async () => {
            ran.push(`step ${index}`);
            return code;
        }
    }));
    return { ran, steps };
};

describe("runSteps", () => {
    it.each([
        { codes: [], expected: 0, ran: 0 },
        { codes: [0, 0, 0], expected: 0, ran: 3 },
        { codes: [0, 2, 0], expected: 2, ran: 2 },
        { codes: [130], expected: 130, ran: 1 }
    ])("returns $expected after $ran steps for $codes", async ({ codes, expected, ran }) => {
        const recorded = recordingSteps(codes);
        expect(await runSteps(recorded.steps, silent)).toBe(expected);
        expect(recorded.ran).toHaveLength(ran);
    });
});
