/**
 * Tag E2E Helpers
 *
 * Multi-step tag flows driven through the real Tags page controls.
 */

import { expect, type Page } from "@playwright/test";

export interface TagSpec {
    readonly name: string;
    /** Name of an existing tag to nest under. */
    readonly parentName?: string;
    readonly isTransfer?: boolean;
}

/**
 * Creates a tag through the Add Tag form and waits for it to appear in the list.
 *
 * Assumes the Tags page is already open.
 */
export async function createTag(page: Page, spec: TagSpec): Promise<void> {
    await page.getByRole("button", { name: /add tag/i }).click();

    const nameInput = page.getByPlaceholder(/enter tag name/i);
    await nameInput.waitFor({ state: "visible", timeout: 3000 });
    await nameInput.fill(spec.name);

    if (spec.parentName) {
        await page.getByRole("combobox").click();
        await page.getByRole("option", { name: spec.parentName }).click();
    }

    if (spec.isTransfer) {
        await page.getByLabel(/transfer tag/i).check();
    }

    await page.getByRole("button", { name: /^add tag$/i }).click();
    await expect(page.getByText(spec.name, { exact: true })).toBeVisible();
}
