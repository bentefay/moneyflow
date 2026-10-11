import type { InferValue } from "@optique/core";
import { or } from "@optique/core";

import type { ExitCode } from "../lib/exec";
import { browser, browserCommand } from "./browser";
import { check, checkCommand } from "./check";
import { db, dbCommand } from "./db";
import { deps, depsCommand } from "./deps";
import { format, formatCommand } from "./format";
import { lint, lintCommand } from "./lint";
import { buildCommand, devCommand, next, startCommand } from "./next";
import { test, testCommand } from "./test";
import { tsc, tscCommand } from "./tsc";

export const cli = or(
    devCommand,
    buildCommand,
    startCommand,
    checkCommand,
    tscCommand,
    lintCommand,
    formatCommand,
    testCommand,
    browserCommand,
    dbCommand,
    depsCommand
);

export type CliCommand = InferValue<typeof cli>;

export const dispatch = (parsed: CliCommand): Promise<ExitCode> => {
    switch (parsed.command) {
        case "dev":
        case "build":
        case "start":
            return next(parsed);
        case "check":
            return check();
        case "tsc":
            return tsc(parsed);
        case "lint":
            return lint(parsed);
        case "format":
            return format(parsed);
        case "test-unit":
        case "test-cli":
        case "test-e2e":
            return test(parsed);
        case "browser":
        case "browser-install":
            return browser(parsed);
        case "db":
        case "db-types":
            return db(parsed);
        case "deps-outdated":
            return deps(parsed);
    }
};
