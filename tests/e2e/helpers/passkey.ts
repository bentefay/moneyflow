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

import { readFileSync } from "node:fs";

import type { CDPSession, Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

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
    transport: "internal" | "usb" = "internal",
    // With presence simulation off the authenticator never answers, which is how a user who
    // ignores the system prompt behaves - the ceremony promise simply stays pending.
    automaticPresenceSimulation = true
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
            automaticPresenceSimulation
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

// ============================================================================
// Server-side state fixtures
// ============================================================================

/**
 * Every server row an identity owns.
 *
 * Asserting "no partial state" needs the server's view: the browser cannot see these tables, and
 * a page-only assertion passes straight over an orphaned identity exactly as review-01 found.
 *
 * Scoped to one pubkey hash rather than counted globally, because the suite runs in parallel and
 * a global count races with whatever another worker is creating. Scoping is also the stronger
 * claim - it says THIS attempt left nothing, not merely that the totals happened to balance.
 */
export interface ServerIdentityFootprint {
    users: number;
    vaultMemberships: number;
    passkeyCredentials: number;
}

function localEnvironment(): Readonly<Record<string, string>> {
    const entries = readFileSync(".env.local", "utf8")
        .split(/\r?\n/)
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .flatMap((line) => {
            const separator = line.indexOf("=");
            return separator > 0 ? [[line.slice(0, separator), line.slice(separator + 1)]] : [];
        });
    return Object.fromEntries(entries);
}

function createAdminClient() {
    const fallback = localEnvironment();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fallback.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fallback.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Supabase E2E fixture configuration is unavailable");
    return createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

async function countRowsForIdentity(
    table: "user_data" | "vault_memberships" | "passkey_credentials",
    pubkeyHash: string
) {
    const admin = createAdminClient();
    const { count, error } = await admin
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("pubkey_hash", pubkeyHash);
    if (error || count == null) throw new Error(`Passkey fixture could not count ${table}`);
    return count;
}

/** Every row the given identity owns across the tables a creation flow writes to. */
export async function readServerIdentityFootprint(
    pubkeyHash: string
): Promise<ServerIdentityFootprint> {
    const [users, vaultMemberships, passkeyCredentials] = await Promise.all([
        countRowsForIdentity("user_data", pubkeyHash),
        countRowsForIdentity("vault_memberships", pubkeyHash),
        countRowsForIdentity("passkey_credentials", pubkeyHash)
    ]);
    return { users, vaultMemberships, passkeyCredentials };
}
