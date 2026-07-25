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
export async function addVirtualAuthenticator(
    page: Page,
    // Only one `internal` authenticator may exist per context, so a test needing a genuinely
    // second device (one credential each, as `excludeCredentials` enforces) uses another transport.
    transport: "internal" | "usb" = "internal"
): Promise<VirtualAuthenticator> {
    const client = await page.context().newCDPSession(page);
    await client.send("WebAuthn.enable");

    const { authenticatorId } = await client.send("WebAuthn.addVirtualAuthenticator", {
        options: {
            protocol: "ctap2",
            ctap2Version: "ctap2_1",
            transport,
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

/**
 * Attach an additional authenticator on an existing CDP session.
 *
 * Reusing the session matters: disabling the WebAuthn domain when a session detaches tears down
 * every virtual authenticator on the page, so a second session would take the first device with it.
 */
export async function addSecondAuthenticator(
    authenticator: VirtualAuthenticator,
    transport: "usb" | "nfc" | "ble" = "usb"
): Promise<string> {
    const { authenticatorId } = await authenticator.client.send(
        "WebAuthn.addVirtualAuthenticator",
        {
            options: {
                protocol: "ctap2",
                ctap2Version: "ctap2_1",
                transport,
                hasResidentKey: true,
                hasUserVerification: true,
                hasPrf: true,
                isUserVerified: true,
                automaticPresenceSimulation: true
            }
        }
    );
    return authenticatorId;
}

/** Detach one authenticator while leaving the session and its other devices intact. */
export async function removeAuthenticatorById(
    authenticator: VirtualAuthenticator,
    authenticatorId: string
): Promise<void> {
    await authenticator.client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
}

/** Count the credentials the authenticator currently holds. */
export async function countCredentials(authenticator: VirtualAuthenticator): Promise<number> {
    const { credentials } = await authenticator.client.send("WebAuthn.getCredentials", {
        authenticatorId: authenticator.authenticatorId
    });
    return credentials.length;
}
