import type { ExitCode } from "./exec";
import { exec } from "./exec";

export type NextSubcommand = "dev" | "build" | "start";

export const runNext = (subcommand: NextSubcommand, args: readonly string[]): Promise<ExitCode> =>
    exec("next", [subcommand, ...(subcommand === "dev" ? ["--turbopack"] : []), ...args]);
