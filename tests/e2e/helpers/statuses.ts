/**
 * Statuses E2E Helpers
 *
 * Multi-step flows against the real /statuses page. A status's "Treat as Paid" behavior is what
 * admits a transaction into settlement, so these drive the production controls rather than the
 * CRDT directly.
 */

import { expect, type Locator, type Page } from "@playwright/test";

/** Human label of the only behavior the BehaviorSelector currently offers. */
export const TREAT_AS_PAID_LABEL = "Treat as Paid";

/**
 * Locates a status row by the name it renders.
 *
 * Only valid while the row is at rest: in edit mode the name moves out of the row's text and into
 * an input value, so a text filter stops matching the very row it just opened. Anything that opens
 * the editor must resolve the row's stable testid first via {@link statusRowById}.
 */
export function statusRow(page: Page, name: string): Locator {
    return page.locator('[data-testid^="status-row-"]').filter({ hasText: name });
}

/** Locates a status row by its stable testid, which survives edit mode. */
function statusRowById(page: Page, testId: string): Locator {
    return page.getByTestId(testId);
}

/** Reads the stable row testid for a status that is currently at rest. */
async function resolveStatusRowTestId(page: Page, name: string): Promise<string> {
    const row = statusRow(page, name);
    await expect(row).toHaveCount(1);
    const testId = await row.getAttribute("data-testid");
    expect(testId).not.toBeNull();
    return testId ?? "";
}

/** Picks a behavior in whichever BehaviorSelector is currently open for editing. */
async function selectBehavior(scope: Locator | Page, page: Page, label: string): Promise<void> {
    await scope.getByTestId("behavior-selector").click();
    await page.getByRole("option", { name: label, exact: true }).click();
}

/**
 * Creates a status through the inline add form and waits for its row.
 *
 * Assumes the Statuses page is already open.
 */
export async function createStatus(
    page: Page,
    options: { readonly name: string; readonly treatAsPaid?: boolean }
): Promise<Locator> {
    await page.getByTestId("add-status-btn").click();
    await page.getByTestId("new-status-name-input").fill(options.name);

    if (options.treatAsPaid) {
        await selectBehavior(page, page, TREAT_AS_PAID_LABEL);
    }

    await page.getByTestId("create-status-btn").click();

    // The add form closing is what proves the create committed rather than being rejected.
    await expect(page.getByTestId("new-status-name-input")).toHaveCount(0);
    const row = statusRow(page, options.name);
    await expect(row).toHaveCount(1);
    return row;
}

/** Opens a status row's inline editor, returning a locator that survives the mode switch. */
async function startEditStatus(page: Page, name: string): Promise<Locator> {
    const testId = await resolveStatusRowTestId(page, name);
    const row = statusRowById(page, testId);
    await row.hover();
    await row.getByTestId("edit-status-btn").click();
    await expect(row.getByTestId("status-name-input")).toBeVisible();
    return row;
}

/** Renames a status through its inline editor and waits for the renamed row. */
export async function renameStatus(page: Page, from: string, to: string): Promise<Locator> {
    const row = await startEditStatus(page, from);
    await row.getByTestId("status-name-input").fill(to);
    await row.getByTestId("save-status-btn").click();

    await expect(statusRow(page, from)).toHaveCount(0);
    const renamed = statusRow(page, to);
    await expect(renamed).toHaveCount(1);
    return renamed;
}

/** Turns on a status's Treat-as-Paid behavior and waits for the badge that reports it. */
export async function enableTreatAsPaid(page: Page, name: string): Promise<void> {
    const row = await startEditStatus(page, name);
    await selectBehavior(row, page, TREAT_AS_PAID_LABEL);
    await row.getByTestId("save-status-btn").click();
    await expect(statusRow(page, name)).toContainText(TREAT_AS_PAID_LABEL);
}

/** Turns off a status's behavior, returning it to None. */
export async function disableTreatAsPaid(page: Page, name: string): Promise<void> {
    const row = await startEditStatus(page, name);
    await selectBehavior(row, page, "None");
    await row.getByTestId("save-status-btn").click();
    await expect(statusRow(page, name)).not.toContainText(TREAT_AS_PAID_LABEL);
}

/** Deletes a status. The delete control requires a second click to confirm. */
export async function deleteStatus(page: Page, name: string): Promise<void> {
    const testId = await resolveStatusRowTestId(page, name);
    const row = statusRowById(page, testId);
    await row.hover();
    const deleteButton = row.getByTestId("delete-status-btn");

    // First click only arms the confirmation; the row must survive it.
    await deleteButton.click();
    await expect(row).toHaveCount(1);

    await deleteButton.click();
    await expect(row).toHaveCount(0);
}
