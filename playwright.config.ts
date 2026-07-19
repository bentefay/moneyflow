import { defineConfig, devices } from "@playwright/test";

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
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI
    }
});
