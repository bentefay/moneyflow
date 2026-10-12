import type { InferValue, Message } from "@optique/core";
import { command, constant, message, object, or } from "@optique/core";

const lifecycle = <const Name extends "start" | "stop" | "reset">(
    name: Name,
    description: Message
) => command(name, object({ command: constant("db"), lifecycle: constant(name) }), { description });

export const dbCommand = command(
    "db",
    or(
        lifecycle("start", message`Starts the local Supabase stack`),
        lifecycle("stop", message`Stops the local Supabase stack`),
        lifecycle(
            "reset",
            message`Recreates the local database from the migrations, discarding its data`
        ),
        command("types", object({ command: constant("db-types") }), {
            description: message`Regenerates src/lib/supabase/database.types.ts from the local database`
        })
    ),
    { description: message`Manages the local Supabase stack` }
);

export const db = async (parsed: InferValue<typeof dbCommand>) => {
    const supabase = await import("../lib/supabase");
    return parsed.command === "db-types"
        ? supabase.generateDatabaseTypes()
        : supabase.runDatabase(parsed.lifecycle);
};
