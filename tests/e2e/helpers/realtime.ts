import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import type { Page, Request, WebSocket } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { base64ToPrivateKey } from "@/lib/crypto/keypair";
import { unwrapKeyFromBase64, wrapKeyToBase64 } from "@/lib/crypto/keywrap";

interface BrowserIdentitySession {
    pubkeyHash: string;
    encPublicKey: string;
    encSecretKey: string;
}

type RealtimePurpose = "sync" | "presence";
type RealtimeProcedure = "authorize" | "revoke";

export interface RealtimeLifecycleCounts {
    authorize: Record<RealtimePurpose, number>;
    revoke: Record<RealtimePurpose, number>;
}

export interface RealtimeGrantCounts {
    total: number;
    live: number;
    revoked: number;
    expiredUnrevoked: number;
}

export interface RealtimeFrameCounts {
    postgresChanges: number;
    postgresChangeJoins: number;
    postgresChangeBindings: number;
}

export interface RealtimeSubscriptionCounts {
    total: number;
    authenticated: number;
    liveExactGrant: number;
}

export type RealtimeGrantAggregates = Record<RealtimePurpose, RealtimeGrantCounts>;

function emptyLifecycleCounts(): RealtimeLifecycleCounts {
    return {
        authorize: { sync: 0, presence: 0 },
        revoke: { sync: 0, presence: 0 }
    };
}

function readRealtimePurpose(body: string | null): RealtimePurpose | null {
    if (body?.includes('"purpose":"sync"')) return "sync";
    if (body?.includes('"purpose":"presence"')) return "presence";
    return null;
}

/**
 * Records only procedure/purpose aggregates. Signed bodies, vaults and identities stay in memory
 * and never enter returned diagnostics or Playwright artifacts.
 */
export function observeRealtimeLifecycle(page: Page): {
    snapshot: () => RealtimeLifecycleCounts;
    stop: () => void;
} {
    const counts = emptyLifecycleCounts();
    const listener = (request: Request) => {
        const match = request.url().match(/\/api\/trpc\/realtime\.(authorize|revoke)(?:\?|$)/);
        const procedure = match?.[1] as RealtimeProcedure | undefined;
        const purpose = readRealtimePurpose(request.postData());
        if (procedure && purpose) counts[procedure][purpose] += 1;
    };
    page.on("request", listener);

    return {
        snapshot: () => ({
            authorize: { ...counts.authorize },
            revoke: { ...counts.revoke }
        }),
        stop: () => page.off("request", listener)
    };
}

/** Records only aggregate event kinds from incoming Realtime frames, never frame payloads. */
export function observeRealtimeFrames(page: Page): {
    snapshot: () => RealtimeFrameCounts;
    stop: () => void;
} {
    let postgresChanges = 0;
    let postgresChangeJoins = 0;
    let postgresChangeBindings = 0;
    const socketListeners = new Map<
        WebSocket,
        {
            received: (event: { payload: string | Buffer }) => void;
            sent: (event: { payload: string | Buffer }) => void;
        }
    >();
    const socketListener = (socket: WebSocket) => {
        if (!socket.url().includes("/realtime/v1/websocket")) return;
        const readFrame = (payload: string | Buffer): unknown =>
            JSON.parse(typeof payload === "string" ? payload : payload.toString("utf8"));
        const readEvent = (frame: unknown): unknown =>
            Array.isArray(frame) ? frame[3] : isUnknownRecord(frame) ? frame.event : null;
        const received = ({ payload }: { payload: string | Buffer }) => {
            try {
                if (readEvent(readFrame(payload)) === "postgres_changes") postgresChanges += 1;
            } catch {
                // Binary/non-JSON frames have no event kind to aggregate.
            }
        };
        const sent = ({ payload }: { payload: string | Buffer }) => {
            try {
                const frame = readFrame(payload);
                if (readEvent(frame) !== "phx_join") return;
                const joinPayload = Array.isArray(frame)
                    ? frame[4]
                    : isUnknownRecord(frame)
                      ? frame.payload
                      : null;
                if (!isUnknownRecord(joinPayload) || !isUnknownRecord(joinPayload.config)) return;
                const bindings = joinPayload.config.postgres_changes;
                if (!Array.isArray(bindings)) return;
                postgresChangeJoins += 1;
                postgresChangeBindings += bindings.length;
            } catch {
                // Binary/non-JSON frames have no join configuration to aggregate.
            }
        };
        socketListeners.set(socket, { received, sent });
        socket.on("framereceived", received);
        socket.on("framesent", sent);
    };
    page.on("websocket", socketListener);

    return {
        snapshot: () => ({ postgresChanges, postgresChangeJoins, postgresChangeBindings }),
        stop: () => {
            page.off("websocket", socketListener);
            for (const [socket, listeners] of socketListeners) {
                socket.off("framereceived", listeners.received);
                socket.off("framesent", listeners.sent);
            }
            socketListeners.clear();
        }
    };
}

function emptyGrantCounts(): RealtimeGrantCounts {
    return { total: 0, live: 0, revoked: 0, expiredUnrevoked: 0 };
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

/** Returns sanitized lifecycle aggregates without grant, identity or vault identifiers. */
export async function getRealtimeGrantAggregates(
    pubkeyHash: string,
    vaultId: string
): Promise<RealtimeGrantAggregates> {
    const result: RealtimeGrantAggregates = {
        sync: emptyGrantCounts(),
        presence: emptyGrantCounts()
    };
    if (!/^[0-9a-f]{64}$/.test(pubkeyHash) || !/^[0-9a-f-]{36}$/.test(vaultId)) {
        throw new Error("Realtime grant lifecycle fixture scope is invalid");
    }

    const query = `COPY (
        SELECT purpose,
               count(*)::integer,
               count(*) FILTER (WHERE revoked_at IS NULL AND expires_at > clock_timestamp())::integer,
               count(*) FILTER (WHERE revoked_at IS NOT NULL)::integer,
               count(*) FILTER (WHERE revoked_at IS NULL AND expires_at <= clock_timestamp())::integer
        FROM public.realtime_grants
        WHERE pubkey_hash = '${pubkeyHash}' AND vault_id = '${vaultId}'::uuid
        GROUP BY purpose
        ORDER BY purpose
    ) TO STDOUT WITH (FORMAT csv);`;
    let output: string;
    try {
        output = execFileSync(
            "docker",
            [
                "exec",
                "-i",
                "supabase_db_moneyflow",
                "psql",
                "-U",
                "postgres",
                "-d",
                "postgres",
                "-X",
                "-q"
            ],
            { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
        );
    } catch {
        throw new Error("Realtime grant lifecycle fixture query failed");
    }

    for (const line of output.trim().split("\n")) {
        if (!line) continue;
        const [purpose, total, live, revoked, expiredUnrevoked] = line.split(",");
        if (purpose !== "sync" && purpose !== "presence") continue;
        result[purpose] = {
            total: Number(total),
            live: Number(live),
            revoked: Number(revoked),
            expiredUnrevoked: Number(expiredUnrevoked)
        };
    }
    return result;
}

/** Returns sanitized permanent-op subscription counts without claims or identifiers. */
export function getRealtimeSubscriptionCounts(vaultId: string): RealtimeSubscriptionCounts {
    if (
        !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            vaultId
        )
    ) {
        throw new Error("Realtime subscription fixture vault ID is invalid");
    }
    const query = `COPY (
        SELECT count(*)::integer,
               count(*) FILTER (WHERE subscription.claims ->> 'role' = 'authenticated')::integer,
               count(*) FILTER (WHERE EXISTS (
                   SELECT 1
                   FROM public.realtime_grants grant_row
                   JOIN public.vault_memberships membership
                     ON membership.vault_id = grant_row.vault_id
                    AND membership.pubkey_hash = grant_row.pubkey_hash
                    AND membership.role = grant_row.vault_role
                   JOIN public.vaults vault ON vault.id = grant_row.vault_id
                   WHERE grant_row.id::text = subscription.claims ->> 'jti'
                     AND grant_row.vault_id::text = subscription.claims ->> 'vault_id'
                     AND grant_row.vault_role = subscription.claims ->> 'vault_role'
                     AND grant_row.purpose = 'sync'
                     AND grant_row.revoked_at IS NULL
                     AND grant_row.expires_at > clock_timestamp()
                     AND vault.deleted_at IS NULL
                     AND subscription.claims ->> 'role' = 'authenticated'
                     AND subscription.claims ->> 'realtime_table' = 'vault_ops'
                     AND subscription.claims ->> 'realtime_purpose' = 'sync'
                     AND subscription.claims ->> 'realtime_topic' =
                         'vault:' || grant_row.vault_id::text || ':sync'
               ))::integer
        FROM realtime.subscription subscription
        WHERE subscription.entity = 'public.vault_ops'::regclass
          AND subscription.claims ->> 'vault_id' = '${vaultId}'
    ) TO STDOUT WITH (FORMAT csv);`;
    let output: string;
    try {
        output = execFileSync(
            "docker",
            [
                "exec",
                "-i",
                "supabase_db_moneyflow",
                "psql",
                "-U",
                "postgres",
                "-d",
                "postgres",
                "-X",
                "-q"
            ],
            { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
        );
    } catch {
        throw new Error("Realtime subscription fixture query failed");
    }

    const [total, authenticated, liveExactGrant] = output.trim().split(",").map(Number);
    if (
        !Number.isInteger(total) ||
        !Number.isInteger(authenticated) ||
        !Number.isInteger(liveExactGrant)
    ) {
        throw new Error("Realtime subscription fixture result is invalid");
    }
    return { total, authenticated, liveExactGrant };
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
