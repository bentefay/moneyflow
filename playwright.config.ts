import { execFileSync } from "node:child_process";

import { defineConfig, devices } from "@playwright/test";

function requireLocalRealtimeJwtSecret(): string {
    const inherited = process.env.SUPABASE_JWT_SECRET;
    if (inherited && Buffer.byteLength(inherited, "utf8") >= 32) return inherited;

    try {
        const containerEnvironment = execFileSync(
            "docker",
            [
                "inspect",
                "supabase_realtime_moneyflow",
                "--format",
                "{{range .Config.Env}}{{println .}}{{end}}"
            ],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
        );
        const jwksLine = containerEnvironment
            .split("\n")
            .find((line) => line.startsWith("API_JWT_JWKS="));
        const parsed: unknown = jwksLine
            ? JSON.parse(jwksLine.slice("API_JWT_JWKS=".length))
            : null;
        if (typeof parsed !== "object" || parsed === null || !("keys" in parsed)) {
            throw new Error("missing local JWKS");
        }
        const keys = (parsed as { keys?: unknown }).keys;
        if (!Array.isArray(keys)) throw new Error("invalid local JWKS");
        const symmetric = keys.find(
            (key): key is { kty: "oct"; k: string } =>
                typeof key === "object" &&
                key !== null &&
                "kty" in key &&
                key.kty === "oct" &&
                "k" in key &&
                typeof key.k === "string"
        );
        const secret = symmetric ? Buffer.from(symmetric.k, "base64url").toString("utf8") : "";
        if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("invalid symmetric key");
        return secret;
    } catch {
        throw new Error(
            "Playwright requires the running local Supabase Realtime stack or a server-only SUPABASE_JWT_SECRET. Run `pnpm db:start` before E2E."
        );
    }
}

const localRealtimeJwtSecret = requireLocalRealtimeJwtSecret();

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    // The local Next.js/Supabase stack becomes navigation-bound with Playwright's
    // default 50% CPU worker count (16 on common dev hosts). Four workers keeps
    // parallel coverage while avoiding load-induced timeouts.
    workers: process.env.CI ? 1 : 4,
    reporter: "html",
    timeout: 30000,
    // `timeout` above bounds the whole test; it does not reach `expect()`, which has its own 5s
    // default. Under full-suite parallel load a navigation plus CRDT hydration routinely exceeds
    // 5s, so every assertion written without an explicit timeout was racing hydration. 15s matches
    // the value the suite's own waits already converged on independently in 206 places.
    expect: { timeout: 15_000 },
    use: {
        baseURL: "http://localhost:3000",
        trace: "on-first-retry"
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
        }
    ],
    webServer: {
        command: "pnpm run dev",
        env: { SUPABASE_JWT_SECRET: localRealtimeJwtSecret },
        url: "http://localhost:3000",
        reuseExistingServer: false
    }
});
