import type { ExitCode } from "./exec";
import { exec } from "./exec";
import { runSteps } from "./steps";

export const typeScriptTargets = ["app", "cli"] as const;
export type TypeScriptTarget = (typeof typeScriptTargets)[number];

const projects: Readonly<Record<TypeScriptTarget, string>> = {
    app: "tsconfig.json",
    cli: "cli/tsconfig.json"
};

export const runTypeScript = (
    target: TypeScriptTarget,
    options: { readonly watch: boolean }
): Promise<ExitCode> =>
    exec("tsc", ["--noEmit", "--project", projects[target], ...(options.watch ? ["--watch"] : [])]);

export const runAllTypeScript = (): Promise<ExitCode> =>
    runSteps(
        typeScriptTargets.map((target) => ({
            name: `tsc ${target}`,
            run: () => runTypeScript(target, { watch: false })
        }))
    );
