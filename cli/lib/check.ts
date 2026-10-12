import type { ExitCode } from "./exec";
import { runOxfmt } from "./format";
import { runOxlint } from "./lint";
import { runEndToEnd } from "./playwright";
import { runSteps } from "./steps";
import { runTypeScript } from "./typescript";
import { runVitest } from "./vitest";

/** Every gate a change must pass before it is committed, cheapest first. */
export const runCheck = (): Promise<ExitCode> =>
    runSteps([
        { name: "tsc app", run: () => runTypeScript("app", { watch: false }) },
        { name: "tsc cli", run: () => runTypeScript("cli", { watch: false }) },
        { name: "lint", run: () => runOxlint([]) },
        { name: "format --check", run: () => runOxfmt({ check: true, paths: [] }) },
        { name: "test unit", run: () => runVitest("unit", { watch: false, filters: [] }) },
        { name: "test cli", run: () => runVitest("cli", { watch: false, filters: [] }) },
        { name: "test e2e", run: () => runEndToEnd({ args: [] }) }
    ]);
