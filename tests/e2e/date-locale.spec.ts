/**
 * E2E Test: Locale Date Display and Entry (UR-007)
 *
 * The unit tests pin the formatter and parser directly. What they cannot show
 * is which locale the running app actually resolves, and whether a date typed
 * in the form the cell displayed survives a round trip through the real grid
 * and into storage.
 *
 * That distinction matters here: the reported defect was that the browser's
 * locale was ignored, and the machine it was reported from runs LANG=en_US
 * while sitting in Australia/Brisbane. So each test drives a browser context
 * with an explicit locale rather than inheriting the host's.
 */

import type { Browser, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { createNewIdentity, goToTransactions } from "./helpers";
import { addEmptyTransaction } from "./helpers/settlement";

/** The date cell of a freshly added transaction row. */
async function addRowDateCell(page: Page) {
    const row = page.locator(`[data-transaction-id="${await addEmptyTransaction(page)}"]`);
    await expect(row).toBeVisible();
    return row.getByTestId("date-editable");
}

/**
 * Open a vault in a context pinned to `locale`, then hand the transactions
 * page to the caller.
 */
async function withLocale(
    browser: Browser,
    locale: string,
    body: (page: Page) => Promise<void>
): Promise<void> {
    // Brisbane throughout: the reported environment, and the zone that would
    // expose any date that shifts by time zone rather than staying a calendar date.
    const context = await browser.newContext({ locale, timezoneId: "Australia/Brisbane" });
    const page = await context.newPage();
    try {
        await createNewIdentity(page);
        await goToTransactions(page);
        await body(page);
    } finally {
        await context.close();
    }
}

test.describe("UR-007: dates display and parse in the browser's locale", () => {
    test("a day-first viewer's typed date is stored as the day they meant", async ({ browser }) => {
        // The frozen text's own example: for an Australian-English viewer,
        // 03/08 is the third of August, not the eighth of March. Day and month
        // are both <= 12 here, which is exactly where a transposition hides.
        await withLocale(browser, "en-AU", async (page) => {
            const dateCell = await addRowDateCell(page);

            await dateCell.click();
            await dateCell.fill("03/08/26");
            await dateCell.press("Tab");

            // Re-focusing shows the editing presentation of what was stored.
            await dateCell.click();
            await expect(dateCell).toHaveValue("03/08/26");
        });
    });

    test("a month-first viewer's identical keystrokes mean the other date", async ({ browser }) => {
        await withLocale(browser, "en-US", async (page) => {
            const dateCell = await addRowDateCell(page);

            await dateCell.click();
            await dateCell.fill("03/08/26");
            await dateCell.press("Tab");

            await dateCell.click();
            await expect(dateCell).toHaveValue("03/08/26");

            // Same text, but it denotes 8 March, so the resting compact form
            // orders month first and shows no year for a current-year date.
            await dateCell.press("Escape");
            await expect(dateCell).toHaveValue("3/8");
        });
    });

    test("the editing presentation carries a two-digit year", async ({ browser }) => {
        await withLocale(browser, "en-AU", async (page) => {
            const dateCell = await addRowDateCell(page);

            await dateCell.click();
            await dateCell.fill("15/06/25");
            await dateCell.press("Tab");

            await dateCell.click();
            const editing = await dateCell.inputValue();

            expect(editing).toBe("15/06/25");
            // The defect: editing rendered a four-digit year.
            expect(editing).not.toMatch(/\d{4}/);
        });
    });

    test("a different-year date rests with a two-digit year, a same-year date without one", async ({
        browser
    }) => {
        await withLocale(browser, "en-AU", async (page) => {
            const dateCell = await addRowDateCell(page);

            await dateCell.click();
            await dateCell.fill("15/06/25");
            await dateCell.press("Tab");
            await expect(dateCell).toHaveValue("15/6/25");

            // A date in the current year drops the year entirely.
            const currentYear = new Date().getFullYear() % 100;
            await dateCell.click();
            await dateCell.fill(`03/08/${String(currentYear).padStart(2, "0")}`);
            await dateCell.press("Tab");
            await expect(dateCell).toHaveValue("3/8");
        });
    });

    test("natural language entry still works", async ({ browser }) => {
        await withLocale(browser, "en-AU", async (page) => {
            const dateCell = await addRowDateCell(page);

            // A month name is unambiguous in any field order, so this asserts
            // the natural-language path survived, not the numeric one. The year
            // is pinned to the past so the resting form is the D/M/YY one
            // regardless of when the suite runs.
            await dateCell.click();
            await dateCell.fill("25 December 2023");
            await dateCell.press("Tab");

            await expect(dateCell).toHaveValue("25/12/23");
        });
    });
});
