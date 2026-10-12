import { describe, expect, it } from "vitest";

import { playwrightTestArgs } from "../lib/playwright";

describe("playwrightTestArgs", () => {
    it.each([
        { args: [], expected: ["test", "--reporter=list"] },
        {
            args: ["tests/e2e/a.spec.ts"],
            expected: ["test", "--reporter=list", "tests/e2e/a.spec.ts"]
        },
        { args: ["--reporter=line"], expected: ["test", "--reporter=line"] },
        { args: ["--reporter", "html"], expected: ["test", "--reporter", "html"] },
        { args: ["--ui"], expected: ["test", "--ui"] }
    ])("$args becomes $expected", ({ args, expected }) => {
        expect(playwrightTestArgs(args)).toEqual(expected);
    });
});
