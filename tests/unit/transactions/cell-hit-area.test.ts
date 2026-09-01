import { describe, expect, it } from "vitest";

import { CHECKBOX_HIT_AREA } from "@/components/features/transactions/cells/cell-hit-area";
import {
    TRANSACTION_MAIN_ROW_HEIGHT_CLASS,
    TRANSACTION_MAIN_ROW_HEIGHT_PX
} from "@/components/features/transactions/transaction-row-geometry";

function utilities(classes: string): string[] {
    return classes.split(" ").filter((utility) => utility.length > 0);
}

function pixels(utility: string): number {
    const matched = /\[-?(\d+(?:\.\d+)?)px\]/.exec(utility);
    if (matched?.[1] == null) throw new Error(`no pixel value in "${utility}"`);
    return Number(matched[1]);
}

describe("transaction spreadsheet geometry", () => {
    it("publishes one exact 57px DOM and virtualizer contract", () => {
        expect(TRANSACTION_MAIN_ROW_HEIGHT_PX).toBe(57);
        expect(utilities(TRANSACTION_MAIN_ROW_HEIGHT_CLASS)).toEqual([
            "h-[57px]",
            "min-h-[57px]",
            "max-h-[57px]"
        ]);
    });

    it("keeps the data checkbox target centered and inside the main row", () => {
        const dataRow = utilities(CHECKBOX_HIT_AREA.dataRow);
        const reachAbove = pixels(
            dataRow.find((utility) => utility.startsWith("before:-top-")) ?? ""
        );
        const reachBelow = pixels(
            dataRow.find((utility) => utility.startsWith("before:-bottom-")) ?? ""
        );
        const reachLeft = pixels(
            dataRow.find((utility) => utility.startsWith("before:-left-")) ?? ""
        );
        const reachRight = pixels(
            dataRow.find((utility) => utility.startsWith("before:-right-")) ?? ""
        );

        expect(16 + reachAbove + reachBelow).toBe(32);
        expect(16 + reachLeft + reachRight).toBe(32);
        expect(32).toBeLessThan(TRANSACTION_MAIN_ROW_HEIGHT_PX);
    });

    it("keeps the header checkbox target inside its 37px cell", () => {
        const header = utilities(CHECKBOX_HIT_AREA.header);
        const reachAbove = pixels(
            header.find((utility) => utility.startsWith("before:-top-")) ?? ""
        );
        const reachBelow = pixels(
            header.find((utility) => utility.startsWith("before:-bottom-")) ?? ""
        );

        expect(16 + reachAbove + reachBelow).toBe(37);
    });

    it("contains no full-row negative inset that can overlap a neighboring cell", () => {
        for (const [geometry, hitArea] of Object.entries(CHECKBOX_HIT_AREA)) {
            for (const utility of utilities(hitArea)) {
                if (!utility.startsWith("before:-")) continue;
                expect(pixels(utility), `${geometry} ${utility}`).toBeLessThanOrEqual(11);
            }
        }
    });
});
