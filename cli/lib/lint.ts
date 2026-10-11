import type { ExitCode } from "./exec";
import { exec } from "./exec";

export const runOxlint = (args: readonly string[]): Promise<ExitCode> => exec("oxlint", args);
