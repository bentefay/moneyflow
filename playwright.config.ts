import { defineConfig, devices } from "@playwright/test";

import { resolveRealtimeJwtSecret } from "./cli/lib/realtimeJwtSecret";

const localRealtimeJwtSecret = (() => {
    const resolved = resolveRealtimeJwtSecret();
    if (!resolved.ok) {
        throw new Error(
            `Playwright requires the running local Supabase Realtime stack or a server-only SUPABASE_JWT_SECRET, but ${resolved.reason}. Run \`run db start\` before E2E.`
        );
    }
    return resolved.secret;
})();

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
        command: "run dev",
        env: { SUPABASE_JWT_SECRET: localRealtimeJwtSecret },
        url: "http://localhost:3000",
        reuseExistingServer: false
    }
});
