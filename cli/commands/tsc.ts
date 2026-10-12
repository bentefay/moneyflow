import type { InferValue } from "@optique/core";
import {
    argument,
    choice,
    command,
    constant,
    message,
    object,
    option,
    withDefault
} from "@optique/core";

import { typeScriptTargets } from "../lib/typescript";

export const tscCommand = command(
    "tsc",
    object({
        command: constant("tsc"),
        target: withDefault(
            argument(choice([...typeScriptTargets, "all"], { metavar: "TARGET" })),
            "all"
        ),
        watch: option("--watch", "-w", { description: message`Rerun on changes` })
    }),
    { description: message`Type checks the app, the CLI, or both` }
);

export const tsc = async ({ target, watch }: InferValue<typeof tscCommand>) => {
    const typescript = await import("../lib/typescript");
    if (target !== "all") return typescript.runTypeScript(target, { watch });
    if (watch) {
        console.error(
            "`run tsc all` can't be combined with --watch. Watch a single target instead."
        );
        return 1;
    }
    return typescript.runAllTypeScript();
};
