/**
 * Passkey E2E Helpers
 *
 * Drives Chromium's CDP virtual authenticator with the WebAuthn PRF extension enabled.
 *
 * The option set below is not arbitrary. Chromium only honours `hasPrf` when `protocol` is
 * `ctap2`, and `virtual_ctap2_device.cc` returns PRF results only when the assertion was user
 * verified - so `hasUserVerification` and `isUserVerified` must BOTH be true or the extension
 * silently yields nothing at all. `hasPrf` and `hasHmacSecret` are mutually exclusive in the
 * device layer, so only `hasPrf` is set.
 */

import type { CDPSession, Page } from "@playwright/test";

export interface VirtualAuthenticator {
    client: CDPSession;
    authenticatorId: string;
}

/**
 * Attach a PRF-capable platform authenticator to the page's browser context.
 *
 * Only one `internal` transport authenticator may exist per context, so callers must remove the
 * previous one before adding another.
 */
export async function addVirtualAuthenticator(page: Page): Promise<VirtualAuthenticator> {
    const client = await page.context().newCDPSession(page);
    await client.send("WebAuthn.enable");

    const { authenticatorId } = await client.send("WebAuthn.addVirtualAuthenticator", {
        options: {
            protocol: "ctap2",
            ctap2Version: "ctap2_1",
            transport: "internal",
            hasResidentKey: true,
            hasUserVerification: true,
            hasPrf: true,
            isUserVerified: true,
            automaticPresenceSimulation: true
        }
    });

    return { client, authenticatorId };
}

/**
 * Detach the authenticator, destroying every credential and PRF key it held.
 *
 * This is how a test simulates a lost or wiped authenticator.
 */
export async function removeVirtualAuthenticator(
    authenticator: VirtualAuthenticator
): Promise<void> {
    await authenticator.client
        .send("WebAuthn.removeVirtualAuthenticator", {
            authenticatorId: authenticator.authenticatorId
        })
        .catch(() => {
            // The context may already be closing during teardown.
        });
    await authenticator.client.detach().catch(() => {});
}

/** Count the credentials the authenticator currently holds. */
export async function countCredentials(authenticator: VirtualAuthenticator): Promise<number> {
    const { credentials } = await authenticator.client.send("WebAuthn.getCredentials", {
        authenticatorId: authenticator.authenticatorId
    });
    return credentials.length;
}
