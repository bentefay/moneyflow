import { expect, test } from "@playwright/test";

import {
    awaitVaultPersistence,
    createNewIdentity,
    goToPeople,
    goToSettings,
    readBrowserIdentity
} from "./helpers";
import { memberHoldsSameVaultKeyAsOwner } from "./helpers/invite";
import { readActiveVaultId } from "./helpers/realtime";

/**
 * HS-011: a second user must be able to redeem an invite generated from Vault
 * Settings and recover the REAL vault key.
 *
 * This exercises the two defects P08 fixes end-to-end:
 *   1. Reachability — the invite generator is reached from Vault Settings (it was
 *      previously stranded behind People-page hardcoding).
 *   2. Real-key redemption — the invitee's stored membership key must decrypt to
 *      the SAME vault master key the owner holds. The prior placeholder code also
 *      showed a success screen while storing a random key, so the assertion is on
 *      key equality, not on the success text.
 *
 * The recovered key is compared in memory by the helper and never surfaced.
 */
test("a second user redeems an invite and recovers the real vault key", async ({ browser }) => {
    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const memberContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const member = await memberContext.newPage();

    try {
        // Two independent identities, each initially owning their own vault.
        await createNewIdentity(owner);
        await createNewIdentity(member);

        // Owner mints an invite link from Vault Settings (reachability fix).
        await goToSettings(owner);
        const generateButton = owner.getByTestId("generate-invite-button");
        await generateButton.waitFor({ state: "visible", timeout: 15000 });
        await generateButton.click();

        const inviteUrlInput = owner.getByTestId("invite-url-input");
        await inviteUrlInput.waitFor({ state: "visible", timeout: 15000 });
        const inviteUrl = await inviteUrlInput.inputValue();
        expect(inviteUrl).toContain("/invite/");
        expect(inviteUrl).toContain("#");

        const sharedVaultId = await readActiveVaultId(owner);

        // Member opens the link and accepts. The member's own vault creation may still be queued
        // for encryption in the document this navigation tears down.
        await awaitVaultPersistence(member);
        await member.goto(inviteUrl);
        const acceptButton = member.getByRole("button", { name: /accept invitation/i });
        await acceptButton.waitFor({ state: "visible", timeout: 15000 });
        await acceptButton.click();

        // A successful redemption redirects into the app; a failed one stays on the
        // invite card in an error state. The success alert itself is transient.
        await member.waitForURL(/\/transactions/, { timeout: 15000 });

        // The decisive check: the member's membership row decrypts to the owner's
        // real vault key. A placeholder key would not.
        expect(await memberHoldsSameVaultKeyAsOwner(owner, member, sharedVaultId)).toBe(true);
    } finally {
        await ownerContext.close();
        await memberContext.close();
    }
});

/**
 * HS-012: accepting an invite must deliver the member INTO the shared vault and
 * materialize their linked Person, so both members see each other.
 *
 * The key-equality test above passes even when the member never actually opens
 * the shared vault (their own vault stays active), so it cannot catch the B-2
 * defect where linkage never runs on the real journey. This test asserts on the
 * member's own app UI:
 *   - after acceptance the member's active vault is the SHARED vault, and
 *   - the member's People page shows two linked persons — themselves ("You") and
 *     the owner ("Linked") — with no raw pubkey hash surfaced, and
 *   - the owner's People page also gains the member's linked person, proving the
 *     freshly materialized Person op syncs back (bidirectional).
 */
test("accepting an invite opens the shared vault and links both members", async ({ browser }) => {
    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const memberContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const member = await memberContext.newPage();

    try {
        await createNewIdentity(owner);
        await createNewIdentity(member);

        // Owner mints an invite from Vault Settings.
        await goToSettings(owner);
        const generateButton = owner.getByTestId("generate-invite-button");
        await generateButton.waitFor({ state: "visible", timeout: 15000 });
        await generateButton.click();

        const inviteUrlInput = owner.getByTestId("invite-url-input");
        await inviteUrlInput.waitFor({ state: "visible", timeout: 15000 });
        const inviteUrl = await inviteUrlInput.inputValue();

        const sharedVaultId = await readActiveVaultId(owner);
        const ownerHash = (await readBrowserIdentity(owner)).pubkeyHash;

        // Member accepts. As above, the member's own vault writes must be durable before this
        // document is torn down.
        await awaitVaultPersistence(member);
        await member.goto(inviteUrl);
        const acceptButton = member.getByRole("button", { name: /accept invitation/i });
        await acceptButton.waitFor({ state: "visible", timeout: 15000 });
        await acceptButton.click();
        await member.waitForURL(/\/transactions/, { timeout: 15000 });

        // The member must land in the SHARED vault, not their own. (RED before fix.)
        await expect.poll(() => readActiveVaultId(member), { timeout: 15000 }).toBe(sharedVaultId);

        // The member's People page shows themselves and the owner, both linked.
        await goToPeople(member);
        await expect(member.getByText("You", { exact: true })).toBeVisible({ timeout: 20000 });
        await expect(member.getByText("Linked", { exact: true })).toBeVisible({ timeout: 20000 });

        // A member's name never surfaces a raw pubkey hash.
        await expect(member.getByText(ownerHash)).toHaveCount(0);

        // Bidirectional: the member's freshly materialized Person syncs to the owner.
        await goToPeople(owner);
        await expect(owner.getByText("You", { exact: true })).toBeVisible({ timeout: 20000 });
        await expect(owner.getByText("Linked", { exact: true })).toBeVisible({ timeout: 20000 });
    } finally {
        await ownerContext.close();
        await memberContext.close();
    }
});
