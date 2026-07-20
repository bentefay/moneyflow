import { expect, test } from "@playwright/test";

import { createNewIdentity, goToAccounts, goToImportNew, goToTxDescriptions } from "./helpers";

const IMPORT_CSV = `Date,Description,Amount
2026-07-01,Undo Import One,-10.00
2026-07-02,Undo Import Two,-20.00`;

async function createAlias(page: import("@playwright/test").Page, name: string): Promise<void> {
    await page.getByRole("button", { name: /add alias/i }).click();
    await page.getByPlaceholder(/enter alias name/i).fill(name);
    await page.getByRole("button", { name: /^add alias$/i }).click();
}

test("document history controls group real add, edit, delete, alias and import actions", async ({
    page
}) => {
    test.setTimeout(90_000);
    await createNewIdentity(page);

    const undo = page.getByRole("button", { name: "Undo" });
    const redo = page.getByRole("button", { name: "Redo" });

    await test.step("show discoverable, initially truthful controls", async () => {
        await expect(undo).toBeDisabled();
        await expect(redo).toBeDisabled();
        await undo.locator("..").hover();
        await expect(page.getByText("Undo (Ctrl+Z)")).toBeVisible();
    });

    await test.step("undo and redo an add with the visible buttons", async () => {
        await goToAccounts(page);
        await page.getByRole("button", { name: /add account/i }).click();
        await page.getByPlaceholder(/account name/i).fill("History Account");
        await page.getByRole("button", { name: /^add$/i }).click();
        await expect(page.getByText("History Account", { exact: true })).toBeVisible();
        await expect(undo).toBeEnabled();

        await undo.click();
        await expect(page.getByText("History Account", { exact: true })).not.toBeVisible();
        await expect(redo).toBeEnabled();

        await redo.click();
        await expect(page.getByText("History Account", { exact: true })).toBeVisible();
    });

    await test.step("use Ctrl+Z and Ctrl+Shift+Z while preserving native input history", async () => {
        await page.getByText("History Account", { exact: true }).click();
        const nameInput = page.getByPlaceholder(/account name/i);
        await nameInput.fill("History Renamed");
        await nameInput.press("Enter");
        await expect(page.getByText("History Renamed", { exact: true })).toBeVisible();

        await page.keyboard.press("Control+z");
        await expect(page.getByText("History Account", { exact: true })).toBeVisible();
        await page.keyboard.press("Control+Shift+z");
        await expect(page.getByText("History Renamed", { exact: true })).toBeVisible();

        await page.getByText("History Renamed", { exact: true }).click();
        await nameInput.press("Control+a");
        await nameInput.pressSequentially("Native draft");
        await nameInput.press("Control+z");
        await nameInput.press("Escape");
        await expect(page.getByText("History Renamed", { exact: true })).toBeVisible();
    });

    await test.step("undo a delete and redo it with Ctrl+Y", async () => {
        const accountRow = page.getByRole("row").filter({ hasText: "History Renamed" });
        await accountRow.hover();
        await accountRow.getByRole("button", { name: "Delete account" }).click();
        await accountRow.getByRole("button", { name: "Confirm delete" }).click();
        await expect(page.getByText("History Renamed", { exact: true })).not.toBeVisible();

        await page.keyboard.press("Control+z");
        await expect(page.getByText("History Renamed", { exact: true })).toBeVisible();
        await page.keyboard.press("Control+y");
        await expect(page.getByText("History Renamed", { exact: true })).not.toBeVisible();
        await undo.click();
        await expect(page.getByText("History Renamed", { exact: true })).toBeVisible();
    });

    await test.step("support conventional Meta undo and redo for alias actions", async () => {
        await goToTxDescriptions(page);
        await createAlias(page, "History Alias");
        await expect(page.getByText("History Alias", { exact: true })).toBeVisible();

        await page.keyboard.press("Meta+z");
        await expect(page.getByText("History Alias", { exact: true })).not.toBeVisible();
        await page.keyboard.press("Meta+Shift+z");
        await expect(page.getByText("History Alias", { exact: true })).toBeVisible();
        await page.keyboard.press("Meta+z");
        await expect(page.getByText("History Alias", { exact: true })).not.toBeVisible();
        await page.keyboard.press("Meta+y");
        await expect(page.getByText("History Alias", { exact: true })).toBeVisible();
    });

    await test.step("undo and redo a complete multi-record import as one step", async () => {
        await goToImportNew(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: "undo-import.csv",
            mimeType: "text/csv",
            buffer: Buffer.from(IMPORT_CSV)
        });
        await page.getByRole("tab", { name: /Columns/i }).click();
        await page.getByRole("button", { name: /Auto-detect/i }).click();
        await expect(page.getByText(/All required fields mapped/i)).toBeVisible();
        await page.getByRole("tab", { name: /Account/i }).click();
        await page.locator("#account-select").click();
        await page.getByRole("option", { name: /Default/i }).click();
        await page.getByRole("button", { name: /Import 2 Transactions/i }).click();

        await expect(page).toHaveURL(/\/transactions/);
        await expect(page.getByRole("row", { name: /Undo Import One/i })).toBeVisible();
        await undo.click();
        await expect(page.getByRole("row", { name: /Undo Import One/i })).not.toBeVisible();
        await expect(page.getByRole("row", { name: /Undo Import Two/i })).not.toBeVisible();
        await redo.click();
        await expect(page.getByRole("row", { name: /Undo Import One/i })).toBeVisible();
        await expect(page.getByRole("row", { name: /Undo Import Two/i })).toBeVisible();
    });

    await test.step("reset local history after refresh without reverting document state", async () => {
        await page.reload();
        await expect(page.getByRole("row", { name: /Undo Import One/i })).toBeVisible();
        await expect(undo).toBeDisabled();
        await expect(redo).toBeDisabled();
    });
});

test("remote history stays excluded while local undo syncs to a second client", async ({
    browser,
    page
}) => {
    test.setTimeout(60_000);
    await createNewIdentity(page);
    const sessionState = await page.evaluate(() => ({
        activeVault: localStorage.getItem("moneyflow_active_vault"),
        session: sessionStorage.getItem("moneyflow_session")
    }));
    if (!sessionState.activeVault || !sessionState.session) {
        throw new Error("Authenticated second-client fixture state is unavailable");
    }
    const authenticatedSessionState = {
        activeVault: sessionState.activeVault,
        session: sessionState.session
    };
    const secondContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    await secondContext.addInitScript((state: { activeVault: string; session: string }) => {
        if (location.origin !== "http://localhost:3000") return;
        localStorage.setItem("moneyflow_active_vault", state.activeVault);
        sessionStorage.setItem("moneyflow_session", state.session);
    }, authenticatedSessionState);
    const secondPage = await secondContext.newPage();

    try {
        await goToTxDescriptions(page);
        await goToTxDescriptions(secondPage);
        await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();

        await createAlias(secondPage, "Remote Alias");
        await expect(page.getByText("Remote Alias", { exact: true })).toBeVisible({
            timeout: 15_000
        });
        await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();

        await createAlias(page, "Local Alias");
        await expect(secondPage.getByText("Local Alias", { exact: true })).toBeVisible({
            timeout: 15_000
        });
        await page.getByRole("button", { name: "Undo" }).click();

        await expect(page.getByText("Local Alias", { exact: true })).not.toBeVisible();
        await expect(secondPage.getByText("Local Alias", { exact: true })).not.toBeVisible({
            timeout: 15_000
        });
        await expect(page.getByText("Remote Alias", { exact: true })).toBeVisible();
        await expect(secondPage.getByText("Remote Alias", { exact: true })).toBeVisible();
    } finally {
        await secondContext.close();
    }
});
