import { expect, test } from "@playwright/test";

import { createNewIdentity, goToSettings } from "./helpers";
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

        // Member opens the link and accepts.
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
