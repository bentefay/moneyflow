/**
 * Zod 4.5 made `z.iso.datetime()` require seconds. These schemas only ever see timestamps from
 * Temporal, `Date#toISOString` and Postgres, all of which always print seconds - this pins that, so
 * a future tightening cannot start rejecting real data unnoticed.
 */
import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { realtimeGrantRowSchema } from "@/server/schemas/realtime";
import { ISOInstantStringSchema } from "@/types";

const epochMilliseconds = fc.integer({ min: 0, max: 4_102_444_800_000 });

describe("ISO datetime schemas", () => {
    it("accept every Temporal.Instant and Date ISO string", () => {
        fc.assert(
            fc.property(epochMilliseconds, (ms) => {
                const temporal = Temporal.Instant.fromEpochMilliseconds(ms).toString();
                const date = new Date(ms).toISOString();
                expect(ISOInstantStringSchema.safeParse(temporal).success).toBe(true);
                expect(ISOInstantStringSchema.safeParse(date).success).toBe(true);
            })
        );
    });

    it.each([
        "2026-10-11T10:00:00+00:00",
        "2026-10-11T10:00:00.123456+00:00",
        "2026-10-11T20:00:00+10:00"
    ])("accept the Postgres timestamptz %s as a grant expiry", (expiresAt) => {
        const row = {
            grant_id: "4f8a0c8e-2b6f-4d2a-9c1e-3b7d5e6f7a8b",
            vault_role: "owner",
            expires_at: expiresAt
        };
        expect(realtimeGrantRowSchema.safeParse(row).success).toBe(true);
    });

    it("reject a timestamp without seconds", () => {
        expect(ISOInstantStringSchema.safeParse("2026-10-11T10:00Z").success).toBe(false);
    });
});
