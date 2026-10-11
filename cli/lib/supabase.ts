import { writeFile } from "node:fs/promises";
import path from "node:path";

import type { ExitCode } from "./exec";
import { exec, execCapture } from "./exec";
import { runOxfmt } from "./format";
import { repoRoot } from "./paths";

export type DatabaseLifecycle = "start" | "stop" | "reset";

const generatedTypesPath = path.join(repoRoot, "src", "lib", "supabase", "database.types.ts");

export const runDatabase = (lifecycle: DatabaseLifecycle): Promise<ExitCode> =>
    exec("supabase", [lifecycle]);

/** Regenerates the database types from the local stack, leaving the file untouched on failure. */
export const generateDatabaseTypes = async (): Promise<ExitCode> => {
    const { code, stdout } = await execCapture("supabase", [
        "gen",
        "types",
        "typescript",
        "--local"
    ]);
    if (code !== 0) return code;
    await writeFile(generatedTypesPath, stdout);
    console.log(`Wrote ${path.relative(repoRoot, generatedTypesPath)}`);
    return runOxfmt({ check: false, paths: [generatedTypesPath] });
};
