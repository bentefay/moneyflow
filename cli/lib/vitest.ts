import type { ExitCode } from "./exec";
import { exec } from "./exec";

export type VitestSuite = "unit" | "cli";

const suiteConfig: Readonly<Record<VitestSuite, readonly string[]>> = {
    unit: [],
    cli: ["--config", "cli/vitest.config.ts"]
};

/** `filters` are vitest's positional file filters: a substring of a test file's path. */
export const runVitest = (
    suite: VitestSuite,
    options: { readonly watch: boolean; readonly filters: readonly string[] }
): Promise<ExitCode> =>
    exec("vitest", [options.watch ? "watch" : "run", ...suiteConfig[suite], ...options.filters]);
