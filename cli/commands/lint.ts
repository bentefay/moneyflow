import type { InferValue } from "@optique/core";
import { command, constant, message, object, passThrough } from "@optique/core";

export const lintCommand = command(
    "lint",
    object({
        command: constant("lint"),
        args: passThrough({ format: "greedy", description: message`Extra arguments for oxlint` })
    }),
    { description: message`Lints the repo with oxlint` }
);

export const lint = async ({ args }: InferValue<typeof lintCommand>) =>
    (await import("../lib/lint")).runOxlint(args);
