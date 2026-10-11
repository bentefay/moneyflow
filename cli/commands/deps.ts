import type { InferValue } from "@optique/core";
import { command, constant, message, object, option } from "@optique/core";

export const depsCommand = command(
    "deps",
    command(
        "outdated",
        object({
            command: constant("deps-outdated"),
            all: option("--all", {
                description: message`Also list dependencies that are up to date`
            })
        }),
        { description: message`Lists updates old enough to pass the minimum release age` }
    ),
    { description: message`Inspects npm dependencies` }
);

export const deps = async ({ all }: InferValue<typeof depsCommand>) =>
    (await import("../lib/deps/outdated")).listOutdated({ all });
