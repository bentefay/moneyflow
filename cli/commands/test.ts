import type { InferValue } from "@optique/core";
import {
    command,
    constant,
    message,
    multiple,
    object,
    option,
    or,
    passThrough,
    string
} from "@optique/core";

const vitestOptions = {
    watch: option("--watch", "-w", { description: message`Rerun on changes` }),
    filters: multiple(
        option("--filter", string({ metavar: "TEXT" }), {
            description: message`Run only test files whose path contains this text; repeatable`
        })
    )
};

const unitCommand = command("unit", object({ command: constant("test-unit"), ...vitestOptions }), {
    description: message`Runs the app's unit and integration tests with vitest`
});

const cliTestCommand = command("cli", object({ command: constant("test-cli"), ...vitestOptions }), {
    description: message`Runs the CLI's own tests with vitest`
});

const endToEndCommand = command(
    "e2e",
    object({
        command: constant("test-e2e"),
        args: passThrough({
            format: "greedy",
            description: message`Arguments for playwright test, such as spec paths, --ui or --reporter=html`
        })
    }),
    {
        description: message`Runs the Playwright end-to-end tests, streaming results unless a reporter is given`
    }
);

export const testCommand = command("test", or(unitCommand, cliTestCommand, endToEndCommand), {
    description: message`Runs a test suite`
});

export const test = async (parsed: InferValue<typeof testCommand>) => {
    switch (parsed.command) {
        case "test-unit":
            return (await import("../lib/vitest")).runVitest("unit", parsed);
        case "test-cli":
            return (await import("../lib/vitest")).runVitest("cli", parsed);
        case "test-e2e":
            return (await import("../lib/playwright")).runEndToEnd(parsed);
    }
};
