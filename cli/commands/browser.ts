import type { InferValue } from "@optique/core";
import { command, constant, message, object, or, passThrough } from "@optique/core";

export const browserCommand = command(
    "browser",
    or(
        command("install", object({ command: constant("browser-install") }), {
            description: message`Installs the Chromium build playwright-cli drives`
        }),
        object({
            command: constant("browser"),
            args: passThrough({
                format: "greedy",
                description: message`Arguments for playwright-cli`
            })
        })
    ),
    { description: message`Drives a browser session with playwright-cli for manual testing` }
);

export const browser = async (parsed: InferValue<typeof browserCommand>) => {
    const playwright = await import("../lib/playwright");
    return parsed.command === "browser-install"
        ? playwright.installBrowser()
        : playwright.runBrowser(parsed.args);
};
