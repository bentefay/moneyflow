import { command, constant, message, object } from "@optique/core";

export const checkCommand = command("check", object({ command: constant("check") }), {
    description: message`Runs every pre-commit gate: tsc, lint, format, unit, CLI and e2e tests`
});

export const check = async () => (await import("../lib/check")).runCheck();
