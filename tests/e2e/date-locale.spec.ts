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

import type { Browser, Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
    activateTransactionEditor,
    createNewIdentity,
    expectTransactionDateDisplay,
    goToSettings,
    goToTransactions,
    transactionGridCell
} from "./helpers";
import { addEmptyTransaction } from "./helpers/settlement";

/** The freshly added transaction row whose description editor Add explicitly activates. */
async function addRow(page: Page): Promise<Locator> {
    const row = page.locator(`[data-transaction-id="${await addEmptyTransaction(page)}"]`);
    await expect(row).toBeVisible();
    await expect(row.getByTestId("description-editable")).toBeFocused();
    return row;
}

/** Choose a presentation on the settings page. */
async function chooseDateFormat(page: Page, label: RegExp): Promise<void> {
    await page.getByRole("combobox", { name: /date format/i }).click();
    await page.getByRole("option", { name: label }).click();
}

/** Open a vault in a context pinned to `locale`, then hand the transactions page to the caller. */
async function withLocale(
    browser: Browser,
    locale: string,
    body: (page: Page) => Promise<void>
): Promise<void> {
    // Brisbane throughout: the reported environment, and the zone that would expose any date that
    // shifts by time zone rather than staying a calendar date.
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
        await withLocale(browser, "en-AU", async (page) => {
            const row = await addRow(page);
            const dateEditor = await activateTransactionEditor(row, "date");
            await dateEditor.fill("03/08/25");
            await transactionGridCell(row, "description").click();
            await expectTransactionDateDisplay(row, "3/8/2025");

            // Re-projecting the committed value through an unambiguous format proves that 03/08 was
            // stored as 3 August rather than the transposed 8 March.
            await goToSettings(page);
            await chooseDateFormat(page, /year first/i);
            await goToTransactions(page);
            await expectTransactionDateDisplay(row, "2025-08-03");
        });
    });

    test("a month-first viewer's identical keystrokes mean the other date", async ({ browser }) => {
        await withLocale(browser, "en-US", async (page) => {
            const row = await addRow(page);
            const dateEditor = await activateTransactionEditor(row, "date");
            await dateEditor.fill("03/08/25");
            await transactionGridCell(row, "description").click();
            await expectTransactionDateDisplay(row, "3/8/2025");

            await goToSettings(page);
            await chooseDateFormat(page, /year first/i);
            await goToTransactions(page);
            await expectTransactionDateDisplay(row, "2025-03-08");
        });
    });

    test("the editing presentation carries the year in full", async ({ browser }) => {
        await withLocale(browser, "en-AU", async (page) => {
            const row = await addRow(page);
            const dateEditor = await activateTransactionEditor(row, "date");
            await dateEditor.fill("15/06/25");
            await transactionGridCell(row, "description").click();
            await expectTransactionDateDisplay(row, "15/6/2025");

            const reopenedEditor = await activateTransactionEditor(row, "date");
            await expect(reopenedEditor).toHaveValue("15/6/2025");
            await reopenedEditor.press("Escape");
            await expectTransactionDateDisplay(row, "15/6/2025");
        });
    });

    test("a different-year date rests with the full year, a same-year date without one", async ({
        browser
    }) => {
        await withLocale(browser, "en-AU", async (page) => {
            const row = await addRow(page);
            const pastEditor = await activateTransactionEditor(row, "date");
            await pastEditor.fill("15/06/25");
            await transactionGridCell(row, "description").click();
            await expectTransactionDateDisplay(row, "15/6/2025");

            const currentYear = await page.evaluate(() => new Date().getFullYear() % 100);
            const currentEditor = await activateTransactionEditor(row, "date");
            await currentEditor.fill(`03/08/${String(currentYear).padStart(2, "0")}`);
            await transactionGridCell(row, "description").click();
            await expectTransactionDateDisplay(row, "3/8");
        });
    });

    test("natural language entry still works", async ({ browser }) => {
        await withLocale(browser, "en-AU", async (page) => {
            const row = await addRow(page);
            const dateEditor = await activateTransactionEditor(row, "date");
            await dateEditor.fill("25 December 2023");
            await transactionGridCell(row, "description").click();
            await expectTransactionDateDisplay(row, "25/12/2023");
        });
    });
});

test.describe("UR-007: a chosen date format overrides the browser", () => {
    test("a day-first choice beats a month-first browser", async ({ browser }) => {
        const context = await browser.newContext({
            locale: "en-US",
            timezoneId: "Australia/Brisbane"
        });
        const page = await context.newPage();

        try {
            await createNewIdentity(page);
            await goToTransactions(page);

            const row = await addRow(page);
            const dateEditor = await activateTransactionEditor(row, "date");
            await dateEditor.fill("1988-01-27");
            await transactionGridCell(row, "description").click();
            await expectTransactionDateDisplay(row, "1/27/1988");

            await goToSettings(page);
            await chooseDateFormat(page, /day first/i);
            await goToTransactions(page);
            await expectTransactionDateDisplay(row, "27/1/1988");
        } finally {
            await context.close();
        }
    });

    test("the choice survives a reload", async ({ browser }) => {
        const context = await browser.newContext({
            locale: "en-US",
            timezoneId: "Australia/Brisbane"
        });
        const page = await context.newPage();

        try {
            await createNewIdentity(page);
            await chooseDateFormat(page, /year first/i);

            await goToTransactions(page);
            const row = await addRow(page);
            const dateEditor = await activateTransactionEditor(row, "date");
            await dateEditor.fill("1988-01-27");
            await transactionGridCell(row, "description").click();
            await expectTransactionDateDisplay(row, "1988-01-27");

            await page.reload();
            await expectTransactionDateDisplay(row, "1988-01-27");
        } finally {
            await context.close();
        }
    });
});
