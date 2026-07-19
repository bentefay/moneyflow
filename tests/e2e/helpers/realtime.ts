import { readFileSync } from "node:fs";

import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { base64ToPrivateKey } from "@/lib/crypto/keypair";
import { unwrapKeyFromBase64, wrapKeyToBase64 } from "@/lib/crypto/keywrap";

interface BrowserIdentitySession {
    pubkeyHash: string;
    encPublicKey: string;
    encSecretKey: string;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseIdentitySession(value: string | null): BrowserIdentitySession {
    const parsed: unknown = value ? JSON.parse(value) : null;
    if (
        !isUnknownRecord(parsed) ||
        typeof parsed.pubkeyHash !== "string" ||
        typeof parsed.encPublicKey !== "string" ||
        typeof parsed.encSecretKey !== "string"
    ) {
        throw new Error("Browser identity session is unavailable");
    }
    return {
        pubkeyHash: parsed.pubkeyHash,
        encPublicKey: parsed.encPublicKey,
        encSecretKey: parsed.encSecretKey
    };
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

export async function readBrowserIdentity(page: Page): Promise<BrowserIdentitySession> {
    return parseIdentitySession(
        await page.evaluate(() => sessionStorage.getItem("moneyflow_session"))
    );
}

export async function readActiveVaultId(page: Page): Promise<string> {
    const stored = await page.evaluate(() => localStorage.getItem("moneyflow_active_vault"));
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    if (!isUnknownRecord(parsed) || typeof parsed.id !== "string") {
        throw new Error("Active vault fixture is unavailable");
    }
    return parsed.id;
}

/**
 * Deterministic P05 transport fixture. P08 still owns the real invitation/key-wrap UI journey.
 * Secret material stays in test memory and is never returned to reports or console output.
 */
export async function shareActiveVaultWithMember(
    owner: Page,
    member: Page
): Promise<{
    vaultId: string;
    ownerHash: string;
    memberHash: string;
}> {
    const ownerIdentity = await readBrowserIdentity(owner);
    const memberIdentity = await readBrowserIdentity(member);
    const vaultId = await readActiveVaultId(owner);
    const admin = createAdminClient();

    const { data: ownerMembership, error: membershipError } = await admin
        .from("vault_memberships")
        .select("encrypted_vault_key")
        .eq("vault_id", vaultId)
        .eq("pubkey_hash", ownerIdentity.pubkeyHash)
        .single();
    if (membershipError || !ownerMembership) throw new Error("Owner fixture membership missing");

    const vaultKey = await unwrapKeyFromBase64(
        ownerMembership.encrypted_vault_key,
        ownerIdentity.encPublicKey,
        base64ToPrivateKey(ownerIdentity.encSecretKey)
    );
    const memberWrappedKey = await wrapKeyToBase64(
        vaultKey,
        memberIdentity.encPublicKey,
        base64ToPrivateKey(memberIdentity.encSecretKey)
    );
    const { error: insertError } = await admin.from("vault_memberships").insert({
        vault_id: vaultId,
        pubkey_hash: memberIdentity.pubkeyHash,
        encrypted_vault_key: memberWrappedKey,
        role: "member",
        enc_public_key: memberIdentity.encPublicKey
    });
    if (insertError) throw new Error("Member transport fixture could not be created");

    await member.evaluate((selectedVaultId) => {
        localStorage.setItem(
            "moneyflow_active_vault",
            JSON.stringify({ id: selectedVaultId, name: "Shared Vault" })
        );
    }, vaultId);

    return {
        vaultId,
        ownerHash: ownerIdentity.pubkeyHash,
        memberHash: memberIdentity.pubkeyHash
    };
}

export async function countRealtimeGrants(pubkeyHash: string, vaultId: string): Promise<number> {
    const admin = createAdminClient();
    const { count, error } = await admin
        .from("realtime_grants")
        .select("id", { count: "exact", head: true })
        .eq("pubkey_hash", pubkeyHash)
        .eq("vault_id", vaultId)
        .eq("purpose", "sync");
    if (error) throw new Error("Realtime grant fixture query failed");
    return count ?? 0;
}

export async function removeFixtureMember(
    memberPubkeyHash: string,
    vaultId: string
): Promise<void> {
    const admin = createAdminClient();
    const { error } = await admin
        .from("vault_memberships")
        .delete()
        .eq("pubkey_hash", memberPubkeyHash)
        .eq("vault_id", vaultId);
    if (error) throw new Error("Realtime member fixture removal failed");
}
