import type { ExitCode } from "./exec";
import { exec } from "./exec";
import { runSteps } from "./steps";

const installChromium = (): Promise<ExitCode> => exec("playwright", ["install", "chromium"]);

/** Streams results with the list reporter unless the caller picked a reporter or the UI. */
export const playwrightTestArgs = (args: readonly string[]): readonly string[] => [
    "test",
    ...(args.some((arg) => arg === "--ui" || arg.startsWith("--reporter"))
        ? []
        : ["--reporter=list"]),
    ...args
];

export const runEndToEnd = (options: { readonly args: readonly string[] }): Promise<ExitCode> =>
    runSteps([
        { name: "playwright install chromium", run: installChromium },
        { name: "playwright test", run: () => exec("playwright", playwrightTestArgs(options.args)) }
    ]);

export const runBrowser = (args: readonly string[]): Promise<ExitCode> =>
    exec("playwright-cli", args);

export const installBrowser = (): Promise<ExitCode> =>
    exec("playwright-cli", ["install-browser", "chromium"]);
