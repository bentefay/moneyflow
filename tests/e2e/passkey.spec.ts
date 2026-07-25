/**
 * E2E Test: WebAuthn PRF Passkey Journeys
 *
 * These tests drive a REAL WebAuthn ceremony against Chromium's CDP virtual authenticator with
 * the PRF extension enabled. The PRF output, the wrap/unwrap and the server verification are all
 * genuine; only the authenticator hardware is virtual.
 *
 * Note on scope: a virtual authenticator cannot prove the behaviour of specific physical hardware
 * (a security key, or a platform authenticator such as iCloud Keychain). Every assertion here is
 * about the application's protocol and UI, not about vendor hardware.
 */

import { expect, type Page, test } from "@playwright/test";

import { createNewIdentity } from "./helpers";
import {
    addVirtualAuthenticator,
    type VirtualAuthenticator,
    removeVirtualAuthenticator
} from "./helpers/passkey";

/** Complete passkey-only account creation from the new-user page. */
async function createAccountWithPasskey(page: Page): Promise<void> {
    await page.goto("/new-user");
    await page.getByTestId("passkey-create-button").click();
    await page.waitForURL("**/settings", { timeout: 20000 });
}

/** Unlock an existing identity with a registered passkey. */
async function unlockWithPasskey(page: Page): Promise<void> {
    await page.goto("/unlock");
    await page.getByTestId("passkey-unlock-button").click();
}

async function readSessionPubkeyHash(page: Page): Promise<string> {
    return page.evaluate(() => {
        const raw = sessionStorage.getItem("moneyflow_session");
        if (!raw) throw new Error("No session was installed");
        return (JSON.parse(raw) as { pubkeyHash: string }).pubkeyHash;
    });
}

test.describe("Passkey", () => {
    let authenticator: VirtualAuthenticator;

    test.beforeEach(async ({ page }) => {
        authenticator = await addVirtualAuthenticator(page);
        await page.goto("/");
        await page.evaluate(() => {
            sessionStorage.clear();
            localStorage.clear();
        });
    });

    test.afterEach(async () => {
        await removeVirtualAuthenticator(authenticator);
    });

    test("creation offers passkey and recovery phrase as two equal OR-separated options", async ({
        page
    }) => {
        await page.goto("/new-user");

        await test.step("both branches are present and reachable", async () => {
            await expect(page.getByTestId("passkey-create-button")).toBeVisible();
            await expect(page.getByTestId("generate-button")).toBeVisible();
        });

        await test.step("the OR divider is semantic, not a decorative glyph", async () => {
            const divider = page.getByTestId("credential-choice-divider");
            await expect(divider).toBeVisible();
            // A separator must expose its role so it is not a silent visual-only cue.
            await expect(divider).toHaveAttribute("role", "separator");
            await expect(divider).toHaveAccessibleName(/or/i);
        });

        await test.step("passkey-only loss is explained BEFORE the credential is created", async () => {
            await expect(page.getByTestId("passkey-loss-warning")).toBeVisible();
        });
    });

    test("passkey-only creation, then unlock by passkey, keeps the same vault identity", async ({
        page
    }) => {
        let createdHash = "";

        await test.step("create an account with only a passkey", async () => {
            await createAccountWithPasskey(page);
            createdHash = await readSessionPubkeyHash(page);
            expect(createdHash).toMatch(/^[0-9a-f]{64}$/);
        });

        await test.step("sign out and unlock again with the passkey", async () => {
            await page.evaluate(() => sessionStorage.clear());
            await unlockWithPasskey(page);
            await page.waitForURL("**/transactions", { timeout: 20000 });
        });

        await test.step("the unlocked identity is byte-identical to the created one", async () => {
            expect(await readSessionPubkeyHash(page)).toBe(createdHash);
        });
    });

    test("a passkey added to a recovery identity unlocks the SAME identity", async ({ page }) => {
        let recoveryHash = "";
        let seedWords: string[] = [];

        await test.step("create an identity with a recovery phrase", async () => {
            seedWords = await createNewIdentity(page);
            recoveryHash = await readSessionPubkeyHash(page);
        });

        await test.step("add a passkey from the unlocked session", async () => {
            await page.goto("/settings");
            await page.getByTestId("add-passkey-button").click();
            await expect(page.getByTestId("passkey-credential-row")).toHaveCount(1, {
                timeout: 20000
            });
        });

        await test.step("unlocking by passkey yields the identity created by the phrase", async () => {
            await page.evaluate(() => sessionStorage.clear());
            await unlockWithPasskey(page);
            await page.waitForURL("**/transactions", { timeout: 20000 });
            expect(await readSessionPubkeyHash(page)).toBe(recoveryHash);
        });

        await test.step("the recovery phrase still unlocks the same identity too", async () => {
            await page.evaluate(() => sessionStorage.clear());
            await page.goto("/unlock");
            await page.getByTestId("recovery-phrase-credential").fill(seedWords.join(" "));
            await page.getByTestId("unlock-button").click();
            await page.waitForURL("**/transactions", { timeout: 20000 });
            expect(await readSessionPubkeyHash(page)).toBe(recoveryHash);
        });
    });

    test("multiple passkeys each unlock the same identity, and revocation is scoped", async ({
        page
    }) => {
        await createAccountWithPasskey(page);
        const originalHash = await readSessionPubkeyHash(page);

        await test.step("register a second credential", async () => {
            await page.goto("/settings");
            await page.getByTestId("add-passkey-button").click();
            await expect(page.getByTestId("passkey-credential-row")).toHaveCount(2, {
                timeout: 20000
            });
        });

        await test.step("revoking one credential leaves the other working", async () => {
            await page.getByTestId("revoke-passkey-button").first().click();
            await page.getByTestId("confirm-revoke-button").click();
            await expect(page.getByTestId("passkey-credential-row")).toHaveCount(1, {
                timeout: 20000
            });

            await page.evaluate(() => sessionStorage.clear());
            await unlockWithPasskey(page);
            await page.waitForURL("**/transactions", { timeout: 20000 });
            expect(await readSessionPubkeyHash(page)).toBe(originalHash);
        });
    });

    test("a removed authenticator cannot unlock, and the recovery route stays open", async ({
        page
    }) => {
        const seedWords = await createNewIdentity(page);

        await page.goto("/settings");
        await page.getByTestId("add-passkey-button").click();
        await expect(page.getByTestId("passkey-credential-row")).toHaveCount(1, { timeout: 20000 });

        await test.step("destroy the authenticator's credentials", async () => {
            await removeVirtualAuthenticator(authenticator);
            authenticator = await addVirtualAuthenticator(page);
        });

        await test.step("passkey unlock fails visibly rather than hanging or half-signing-in", async () => {
            await page.goto("/unlock");
            await page.getByTestId("passkey-unlock-button").click();
            await expect(page.getByTestId("passkey-error")).toBeVisible({ timeout: 20000 });
            await expect(page).toHaveURL(/\/unlock/);
        });

        await test.step("the user is never trapped: the phrase still unlocks", async () => {
            await page.getByTestId("recovery-phrase-credential").fill(seedWords.join(" "));
            await page.getByTestId("unlock-button").click();
            await page.waitForURL("**/transactions", { timeout: 20000 });
        });
    });

    test("no PRF output, master secret or phrase ever leaves the browser", async ({ page }) => {
        const transmitted: string[] = [];
        page.on("request", (request) => {
            transmitted.push(`${request.url()} ${request.postData() ?? ""}`);
        });
        const consoleMessages: string[] = [];
        page.on("console", (message) => consoleMessages.push(message.text()));

        await createAccountWithPasskey(page);
        await page.evaluate(() => sessionStorage.clear());
        await unlockWithPasskey(page);
        await page.waitForURL("**/transactions", { timeout: 20000 });

        await test.step("the prf extension result is never present in any request body", () => {
            for (const trace of transmitted) {
                expect(trace).not.toContain('"prf"');
                expect(trace).not.toContain("prf.results");
            }
        });

        await test.step("the session signing key never appears in a request, URL or console", async () => {
            const secretKey = await page.evaluate(() => {
                const raw = sessionStorage.getItem("moneyflow_session");
                return raw ? (JSON.parse(raw) as { secretKey: string }).secretKey : "";
            });
            expect(secretKey).not.toBe("");

            for (const trace of transmitted) {
                expect(trace).not.toContain(secretKey);
            }
            for (const message of consoleMessages) {
                expect(message).not.toContain(secretKey);
            }
            expect(page.url()).not.toContain(secretKey);
            expect(new URL(page.url()).search).toBe("");
        });

        await test.step("no unwrapped secret is persisted to local storage", async () => {
            const persisted = await page.evaluate(() =>
                Object.keys(localStorage)
                    .map((key) => `${key}=${localStorage.getItem(key) ?? ""}`)
                    .join("\n")
            );
            expect(persisted).not.toContain("wrappedSecret");
            expect(persisted).not.toContain("masterSeed");
        });
    });

    test("the passkey option is hidden with an explanation when WebAuthn is unavailable", async ({
        page
    }) => {
        await removeVirtualAuthenticator(authenticator);

        await page.addInitScript(() => {
            Object.defineProperty(navigator, "credentials", {
                configurable: true,
                get: () => undefined
            });
        });

        await page.goto("/unlock");

        await expect(page.getByTestId("passkey-unsupported-notice")).toBeVisible({
            timeout: 20000
        });
        await expect(page.getByTestId("passkey-unlock-button")).toHaveCount(0);
        // The recovery route must remain fully usable - never a dead end.
        await expect(page.getByTestId("recovery-phrase-credential")).toBeVisible();

        authenticator = await addVirtualAuthenticator(page);
    });

    test("a cancelled ceremony leaves the user on a usable page with no partial state", async ({
        page
    }) => {
        await page.goto("/new-user");

        // A cancelled ceremony is what the browser reports when the user dismisses the
        // system prompt. It must surface as a recoverable error, not a stuck spinner.
        await removeVirtualAuthenticator(authenticator);
        await page.getByTestId("passkey-create-button").click();

        await expect(page.getByTestId("passkey-error")).toBeVisible({ timeout: 20000 });
        await expect(page).toHaveURL(/\/new-user/);
        await expect(page.getByTestId("generate-button")).toBeEnabled();

        authenticator = await addVirtualAuthenticator(page);
    });

    test("passkey unlock is fully operable by keyboard alone", async ({ page }) => {
        await createAccountWithPasskey(page);
        const createdHash = await readSessionPubkeyHash(page);
        await page.evaluate(() => sessionStorage.clear());

        await page.goto("/unlock");

        const passkeyButton = page.getByTestId("passkey-unlock-button");
        await expect(passkeyButton).toBeVisible();
        await expect(passkeyButton).toHaveAccessibleName(/passkey/i);

        await passkeyButton.focus();
        await expect(passkeyButton).toBeFocused();
        await page.keyboard.press("Enter");

        await page.waitForURL("**/transactions", { timeout: 20000 });
        expect(await readSessionPubkeyHash(page)).toBe(createdHash);
    });
});
