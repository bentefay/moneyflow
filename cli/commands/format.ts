import type { InferValue } from "@optique/core";
import {
    argument,
    command,
    constant,
    message,
    multiple,
    object,
    option,
    string
} from "@optique/core";

export const formatCommand = command(
    "format",
    object({
        command: constant("format"),
        check: option("--check", {
            description: message`Report unformatted files without rewriting them`
        }),
        paths: multiple(argument(string({ metavar: "PATH" })))
    }),
    { description: message`Formats the repo, or the given paths, with oxfmt` }
);

export const format = async ({ check, paths }: InferValue<typeof formatCommand>) =>
    (await import("../lib/format")).runOxfmt({ check, paths });
