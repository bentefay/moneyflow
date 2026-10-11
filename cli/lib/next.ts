import type { ExitCode } from "./exec";
import { exec } from "./exec";
import { resolveRealtimeJwtSecret } from "./realtimeJwtSecret";

export type NextSubcommand = "dev" | "build" | "start";

/**
 * The servers sign Realtime tokens, so they need the secret; without it the app still starts but
 * every vault fails to load, which is worth a loud warning rather than a refusal to start.
 */
const serverEnvironment = (): Readonly<Record<string, string>> => {
    const resolved = resolveRealtimeJwtSecret();
    if (resolved.ok) return { SUPABASE_JWT_SECRET: resolved.secret };
    console.warn(
        `\u001b[33m⚠ SUPABASE_JWT_SECRET is unavailable because ${resolved.reason}. ` +
            "Vaults will fail to load until `run db start` has run.\u001b[0m"
    );
    return {};
};

export const runNext = (subcommand: NextSubcommand, args: readonly string[]): Promise<ExitCode> =>
    exec("next", [subcommand, ...(subcommand === "dev" ? ["--turbopack"] : []), ...args], {
        env: subcommand === "build" ? {} : serverEnvironment()
    });
