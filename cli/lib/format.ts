import type { ExitCode } from "./exec";
import { exec } from "./exec";

export const runOxfmt = (options: {
    readonly check: boolean;
    readonly paths: readonly string[];
}): Promise<ExitCode> => exec("oxfmt", [...(options.check ? ["--check"] : []), ...options.paths]);
