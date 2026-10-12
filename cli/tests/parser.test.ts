import { parseSync } from "@optique/core";
import { describe, expect, it } from "vitest";

import { cli } from "../commands";

describe("cli parser", () => {
    it.each([
        { argv: ["dev"], expected: { command: "dev", args: [] } },
        { argv: ["dev", "--port", "3001"], expected: { command: "dev", args: ["--port", "3001"] } },
        { argv: ["check"], expected: { command: "check" } },
        { argv: ["tsc"], expected: { command: "tsc", target: "all", watch: false } },
        {
            argv: ["tsc", "cli", "--watch"],
            expected: { command: "tsc", target: "cli", watch: true }
        },
        { argv: ["lint", "--fix"], expected: { command: "lint", args: ["--fix"] } },
        { argv: ["format"], expected: { command: "format", check: false, paths: [] } },
        {
            argv: ["format", "--check", "src/a.ts"],
            expected: { command: "format", check: true, paths: ["src/a.ts"] }
        },
        { argv: ["test", "unit"], expected: { command: "test-unit", watch: false, filters: [] } },
        {
            argv: ["test", "cli", "--filter", "parser", "--filter", "steps"],
            expected: { command: "test-cli", watch: false, filters: ["parser", "steps"] }
        },
        { argv: ["test", "e2e"], expected: { command: "test-e2e", args: [] } },
        {
            argv: ["test", "e2e", "--retries=0", "--reporter=line", "tests/e2e/a.spec.ts"],
            expected: {
                command: "test-e2e",
                args: ["--retries=0", "--reporter=line", "tests/e2e/a.spec.ts"]
            }
        },
        { argv: ["browser", "install"], expected: { command: "browser-install" } },
        {
            argv: ["browser", "-s=demo", "open", "http://localhost:3000"],
            expected: { command: "browser", args: ["-s=demo", "open", "http://localhost:3000"] }
        },
        { argv: ["db", "reset"], expected: { command: "db", lifecycle: "reset" } },
        { argv: ["db", "types"], expected: { command: "db-types" } },
        { argv: ["deps", "outdated"], expected: { command: "deps-outdated", all: false } }
    ])("parses $argv", ({ argv, expected }) => {
        const result = parseSync(cli, argv);
        expect(result).toMatchObject({ success: true, value: expected });
    });

    it.each([[["unknown"]], [["tsc", "nope"]], [["db"]], [["test", "nope"]]])(
        "rejects %j",
        (argv) => {
            expect(parseSync(cli, argv).success).toBe(false);
        }
    );
});
