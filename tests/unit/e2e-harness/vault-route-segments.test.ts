/**
 * The durability barrier's route list must not fall behind the routes that mount `VaultProvider`.
 *
 * `awaitVaultPersistence` requires the seam only on the routes `src/app/(app)/` serves, because
 * nowhere else mounts the provider that installs it. That makes the list a silent single point of
 * decay: a route group added to `(app)` and forgotten here would leave the barrier a no-op on that
 * route alone — the exact failure this barrier exists to make impossible — with every other route
 * still covered and nothing red.
 */

import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { VAULT_ROUTE_SEGMENTS } from "../../e2e/helpers/persistence";

describe("the durability barrier's vault route list", () => {
    it("matches the route segments served by src/app/(app)", () => {
        const appRoutes = readdirSync(path.join(process.cwd(), "src", "app", "(app)"), {
            withFileTypes: true
        })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();

        expect(appRoutes.length).toBeGreaterThan(0);
        expect([...VAULT_ROUTE_SEGMENTS].sort()).toEqual(appRoutes);
    });
});
