import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MappingTab } from "@/components/features/import/tabs/MappingTab";
import { parseCSV } from "@/lib/import/csv";
import { detectColumnMappingsFromValues } from "@/lib/import/detection";

/**
 * UR-008 — the Auto-detect button must not disagree with detection on load.
 *
 * These are two entry points to the same decision. They used to run DIFFERENT
 * implementations: the load ran `autoDetectColumnMappings`, the button ran
 * `MappingTab`'s own `autoDetectMappings`, and both matched HEADER NAMES. On a
 * headerless file the names are synthesised as "Column 1", "Column 2", ..., so
 * a click returned `{}` — which, once the load path became value-driven and got
 * the mappings right, would have WIPED them. The user's reported complaint was
 * precisely that clicking Auto-detect did not work.
 *
 * This renders the real component and clicks the real button, so it fails if
 * the button is ever pointed back at a header-name implementation.
 */
const HEADERLESS_CSV = [
    '01/07/2026,"-45.00","COFFEE SHOP   MAIN ST",""',
    '02/07/2026,"+69.00","PAYMENT RECEIVED, THANK YOU",""',
    '30/06/2026,"-33.07","BAKERY",""'
].join("\n");

describe("MappingTab Auto-detect", () => {
    it("maps every column of a headerless file rather than clearing them", () => {
        const onMappingsChange = vi.fn();
        const { headers, rows } = parseCSV(HEADERLESS_CSV, { hasHeaders: false });

        render(
            <MappingTab
                availableHeaders={headers}
                dataRows={rows}
                columnMappings={{}}
                onMappingsChange={onMappingsChange}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Auto-detect/i }));

        expect(onMappingsChange).toHaveBeenCalledTimes(1);
        // Observed before the fix: {} - the button cleared the mapping instead.
        expect(onMappingsChange).toHaveBeenCalledWith({
            "0": "date",
            "1": "amount",
            "2": "description"
        });
    });

    it("produces exactly what the load path produces, for the same rows", () => {
        const onMappingsChange = vi.fn();
        const { headers, rows } = parseCSV(HEADERLESS_CSV, { hasHeaders: false });

        render(
            <MappingTab
                availableHeaders={headers}
                dataRows={rows}
                columnMappings={{}}
                onMappingsChange={onMappingsChange}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Auto-detect/i }));

        // The load path's answer, computed independently of the component.
        expect(onMappingsChange).toHaveBeenCalledWith(detectColumnMappingsFromValues(rows));
    });
});
