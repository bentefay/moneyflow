import type { InferValue, Message } from "@optique/core";
import { command, constant, message, object, passThrough } from "@optique/core";

const nextCommand = <const Name extends "dev" | "build" | "start">(
    name: Name,
    description: Message
) =>
    command(
        name,
        object({
            command: constant(name),
            args: passThrough({
                format: "greedy",
                description: message`Extra arguments for next ${name}`
            })
        }),
        { description }
    );

export const devCommand = nextCommand("dev", message`Runs the Next.js dev server with Turbopack`);
export const buildCommand = nextCommand("build", message`Builds the app for production`);
export const startCommand = nextCommand("start", message`Serves the production build`);

export const next = async (
    parsed:
        | InferValue<typeof devCommand>
        | InferValue<typeof buildCommand>
        | InferValue<typeof startCommand>
) => (await import("../lib/next")).runNext(parsed.command, parsed.args);
