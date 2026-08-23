/**
 * Config for the measurement entry point only.
 *
 * The measurement needs a running production server and takes minutes, so it
 * must never be collected by `pnpm test`. Keeping it in its own config, with an
 * include glob the default config cannot match, is what guarantees that.
 */
import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "../../src") } },
    test: {
        environment: "node",
        fileParallelism: false,
        hookTimeout: 1_800_000,
        include: ["tests/perf/*.measure.ts"],
        testTimeout: 1_800_000
    }
});
