import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    APPLY_MODES,
    type ApplyMode,
    applyModeIsAutomatic,
    applyModeTargetsNewOnly,
    DEFAULT_APPLY_MODE,
    isApplyMode
} from "@/lib/domain/automation/apply-mode";

describe("apply-mode domain", () => {
    it("exposes exactly the four frozen modes", () => {
        expect([...APPLY_MODES].sort()).toEqual(
            ["updateAll", "updateNew", "updatingAll", "updatingNew"].sort()
        );
    });

    it("defaults to the conservative explicit-new mode", () => {
        expect(DEFAULT_APPLY_MODE).toBe("updateNew");
        expect(applyModeIsAutomatic(DEFAULT_APPLY_MODE)).toBe(false);
        expect(applyModeTargetsNewOnly(DEFAULT_APPLY_MODE)).toBe(true);
    });

    it("isApplyMode narrows known values and rejects others", () => {
        for (const mode of APPLY_MODES) expect(isApplyMode(mode)).toBe(true);
        for (const other of ["", "update", "UpdatingAll", "apply", "updateNewest"]) {
            expect(isApplyMode(other)).toBe(false);
        }
    });

    it("decomposes each mode into its automatic and new-only axes", () => {
        const table: ReadonlyArray<{
            readonly mode: ApplyMode;
            readonly automatic: boolean;
            readonly newOnly: boolean;
        }> = [
            { mode: "updatingAll", automatic: true, newOnly: false },
            { mode: "updatingNew", automatic: true, newOnly: true },
            { mode: "updateAll", automatic: false, newOnly: false },
            { mode: "updateNew", automatic: false, newOnly: true }
        ];
        for (const { mode, automatic, newOnly } of table) {
            expect(applyModeIsAutomatic(mode)).toBe(automatic);
            expect(applyModeTargetsNewOnly(mode)).toBe(newOnly);
        }
    });

    it("property: the two axes reconstruct the mode name (updating/update prefix, All/New suffix)", () => {
        fc.assert(
            fc.property(fc.constantFrom(...APPLY_MODES), (mode) => {
                const prefix = applyModeIsAutomatic(mode) ? "updating" : "update";
                const suffix = applyModeTargetsNewOnly(mode) ? "New" : "All";
                expect(mode).toBe(`${prefix}${suffix}`);
            })
        );
    });

    it("guard round-trips every real mode string", () => {
        for (const mode of APPLY_MODES) {
            const value: string = mode;
            expect(isApplyMode(value)).toBe(true);
            if (isApplyMode(value)) {
                // Narrowed to ApplyMode: usable without a cast.
                expect(applyModeIsAutomatic(value)).toBe(applyModeIsAutomatic(mode));
            }
        }
    });
});
