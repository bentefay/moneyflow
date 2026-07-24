import { expect, test } from "@playwright/test";

import {
    createNewIdentity,
    goToAccounts,
    goToImportNew,
    goToSettings,
    goToTransactions,
    goToTxDescriptions
} from "./helpers";

const IMPORT_CSV = `Date,Description,Amount
2026-07-01,Undo Import One,-10.00
2026-07-02,Undo Import Two,-20.00`;

async function createAlias(page: import("@playwright/test").Page, name: string): Promise<void> {
    await page.getByRole("button", { name: /add alias/i }).click();
    await page.getByPlaceholder(/enter alias name/i).fill(name);
    await page.getByRole("button", { name: /^add alias$/i }).click();
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function findInsertedIds(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findInsertedIds(item);
            if (found) return found;
        }
        return undefined;
    }
    if (!isUnknownRecord(value)) return undefined;
    if (isStringArray(value.insertedIds)) return value.insertedIds;
    for (const item of Object.values(value)) {
        const found = findInsertedIds(item);
        if (found) return found;
    }
    return undefined;
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

    await test.step("group sequential autosaved input turns around native undo", async () => {
        const vaultName = page.getByRole("textbox", { name: "Vault Name" });
        await expect(vaultName).toHaveValue("My Vault");
        await vaultName.focus();
        await vaultName.press("Control+a");
        await vaultName.pressSequentially("Draft Native");
        await expect(vaultName).toHaveValue("Draft Native");

        await vaultName.press("Shift+ArrowLeft");
        await vaultName.press("X");
        await expect(vaultName).toHaveValue("Draft NativX");
        await vaultName.press("Control+z");
        await expect(vaultName).toHaveValue("Draft Native");
        await vaultName.press("Tab");

        await undo.click();
        await expect(vaultName).toHaveValue("My Vault");
        await expect(undo).toBeDisabled();
        await redo.click();
        await expect(vaultName).toHaveValue("Draft Native");
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

test("each empty transaction Add is one Undo step and Redo restores the same rows", async ({
    page
}) => {
    await createNewIdentity(page);
    await goToTransactions(page);

    const add = page.getByTestId("add-transaction-button");
    const rows = page.getByTestId("transaction-row");
    const undo = page.getByRole("button", { name: "Undo" });
    const redo = page.getByRole("button", { name: "Redo" });

    await test.step("create three distinct persisted rows", async () => {
        await add.click();
        await add.click();
        await add.click();
        await expect(rows).toHaveCount(3);

        const ids = await rows.evaluateAll((elements) =>
            elements.map((element) => element.getAttribute("data-transaction-id"))
        );
        expect(ids.every((id) => id != null)).toBe(true);
        expect(new Set(ids).size).toBe(3);
    });

    const initialIds = await rows.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-transaction-id"))
    );

    await test.step("undo exactly one Add at a time", async () => {
        await undo.click();
        await expect(rows).toHaveCount(2);
        await undo.click();
        await expect(rows).toHaveCount(1);
        await undo.click();
        await expect(rows).toHaveCount(0);
        await expect(undo).toBeDisabled();
    });

    await test.step("redo restores the same logical rows one at a time", async () => {
        await redo.click();
        await expect(rows).toHaveCount(1);
        await redo.click();
        await expect(rows).toHaveCount(2);
        await redo.click();
        await expect(rows).toHaveCount(3);
        await expect(redo).toBeDisabled();

        await expect
            .poll(() =>
                rows.evaluateAll((elements) =>
                    elements.map((element) => element.getAttribute("data-transaction-id"))
                )
            )
            .toEqual(initialIds);
    });

    await test.step("delete and subsequent history retain ordinary row behavior", async () => {
        const deletedId = initialIds[0];
        if (!deletedId) throw new Error("Expected transaction identity");
        const row = page.locator(`[data-transaction-id="${deletedId}"]`);
        await row.hover();
        await row.getByTestId("delete-button").click();
        await row.getByTestId("delete-button").click();
        await expect(row).toHaveCount(0);

        await undo.click();
        await expect(row).toBeVisible();
        await redo.click();
        await expect(row).toHaveCount(0);
        await undo.click();
        await expect(row).toBeVisible();
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

test("a failed offline undo push retries on browser reconnect without another mutation", async ({
    browser,
    context,
    page
}) => {
    test.setTimeout(90_000);
    await createNewIdentity(page);
    await expect(page.getByRole("status", { name: "Saved" })).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await goToSettings(page);
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();

    const sessionState = await page.evaluate(() => ({
        activeVault: localStorage.getItem("moneyflow_active_vault"),
        session: sessionStorage.getItem("moneyflow_session")
    }));
    if (!sessionState.activeVault || !sessionState.session) {
        throw new Error("Authenticated offline peer fixture state is unavailable");
    }
    const authenticatedSessionState = {
        activeVault: sessionState.activeVault,
        session: sessionState.session
    };
    const peerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    await peerContext.addInitScript((state: { activeVault: string; session: string }) => {
        if (location.origin !== "http://localhost:3000") return;
        localStorage.setItem("moneyflow_active_vault", state.activeVault);
        sessionStorage.setItem("moneyflow_session", state.session);
    }, authenticatedSessionState);
    const peer = await peerContext.newPage();

    try {
        await goToSettings(peer);
        await expect(peer.getByRole("button", { name: "Undo" })).toBeDisabled();

        const failedPush = page.waitForEvent("requestfailed", {
            predicate: (request) => request.url().includes("/api/trpc/sync.pushOps"),
            timeout: 15_000
        });
        await context.setOffline(true);
        const vaultName = page.getByRole("textbox", { name: "Vault Name" });
        await vaultName.focus();
        await vaultName.press("Control+a");
        await vaultName.pressSequentially("Offline Review");
        await vaultName.press("Tab");
        await page.getByRole("button", { name: "Undo" }).click();
        await expect(vaultName).toHaveValue("My Vault");
        await failedPush;
        await expect(page.getByRole("status", { name: "Sync error" })).toBeVisible();

        const successfulPush = page.waitForResponse(
            (response) => response.url().includes("/api/trpc/sync.pushOps") && response.ok(),
            { timeout: 15_000 }
        );
        await context.setOffline(false);
        const response = await successfulPush;
        const insertedIds = findInsertedIds(await response.json());

        expect(insertedIds?.length).toBeGreaterThan(1);
        await expect(page.getByRole("status", { name: "Saved" })).toBeVisible();
        await expect(peer.getByRole("textbox", { name: "Vault Name" })).toHaveValue("My Vault", {
            timeout: 15_000
        });
        await expect(peer.getByRole("button", { name: "Undo" })).toBeDisabled();
    } finally {
        await context.setOffline(false);
        await peerContext.close();
    }
});
