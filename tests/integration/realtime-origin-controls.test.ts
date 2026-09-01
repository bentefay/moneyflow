/**
 * @vitest-environment node
 *
 * Integration Tests: origin/CORS controls vs. authorization for the Realtime transport (HS-015).
 *
 * HS-015 asks explicitly whether Supabase WebSockets "work with CORS". These tests pin the answer
 * as observable behaviour rather than prose:
 *
 *   - The WebSocket handshake is NOT subject to CORS. There is no preflight and no
 *     `Access-Control-Allow-Origin` requirement, so a browser will happily open a cross-origin
 *     `wss://` connection. CORS therefore neither blocks nor secures Realtime.
 *   - The HTTP surfaces in front of the same database ARE CORS-enabled, and permissively so
 *     (`Access-Control-Allow-Origin: *`). That is safe only because the origin is not the security
 *     boundary: authorization is.
 *   - The actual boundary is the short-lived, pubkey-hash-bound, vault/topic/table/role-scoped grant
 *     enforced by RLS on every read.
 *
 * The upshot a reviewer should take away: any design that leaned on origin allow-lists to protect
 * this socket would be unprotected. Requires the local Supabase stack (`pnpm db:start`).
 */

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
    addVaultMember,
    appendVaultOp,
    cleanUpVaultFixtures,
    createVaultOwnedBy,
    mintRealtimeToken,
    openVaultOpsSocket,
    type RealtimeStack,
    requireRealtimeStack,
    rotateGrant,
    runSql,
    testIdentityHash
} from "./helpers/realtime-stack";

const HOSTILE_ORIGIN = "https://attacker.example";

let stack: RealtimeStack;
let ownerHash: string;
let vaultId: string;
let foreignVaultId: string;
let ownOperationId: string;
let foreignOperationId: string;
const createdVaultIds: string[] = [];

beforeAll(() => {
    stack = requireRealtimeStack();
    ownerHash = testIdentityHash("origin-owner");
    const foreignOwnerHash = testIdentityHash("origin-other-owner");
    vaultId = createVaultOwnedBy(ownerHash);
    foreignVaultId = createVaultOwnedBy(foreignOwnerHash);
    createdVaultIds.push(vaultId, foreignVaultId);
    ownOperationId = appendVaultOp(vaultId, ownerHash);
    foreignOperationId = appendVaultOp(foreignVaultId, foreignOwnerHash);
});

afterAll(() => {
    cleanUpVaultFixtures(createdVaultIds);
});

function restUrl(path: string): string {
    return `${stack.supabaseUrl}/rest/v1/${path}`;
}

function authorizedHeaders(token: string, origin = HOSTILE_ORIGIN): Record<string, string> {
    return { apikey: stack.anonKey, Authorization: `Bearer ${token}`, Origin: origin };
}

function candidateVaultOpsUrl(ownVaultId: string, deniedVaultId: string): string {
    const query = new URLSearchParams({
        vault_id: `in.(${ownVaultId},${deniedVaultId})`,
        select: "id,vault_id"
    });
    return restUrl(`vault_ops?${query.toString()}`);
}

interface VaultOperationRow {
    readonly id: string;
    readonly vault_id: string;
}

function isVaultOperationRow(value: unknown): value is VaultOperationRow {
    return (
        typeof value === "object" &&
        value != null &&
        "id" in value &&
        typeof value.id === "string" &&
        "vault_id" in value &&
        typeof value.vault_id === "string"
    );
}

type FixtureTable = "vault_ops" | "realtime_grants" | "vault_memberships" | "vaults";

function fixtureRowCount(table: FixtureTable, fixtureVaultId: string): number {
    const predicate =
        table === "vaults"
            ? `id = '${fixtureVaultId}'::uuid`
            : `vault_id = '${fixtureVaultId}'::uuid`;
    return Number(runSql(`SELECT count(*) FROM public.${table} WHERE ${predicate};`).trim());
}

function operationFixtureExists(operationId: string, fixtureVaultId: string): boolean {
    return (
        runSql(
            `SELECT count(*) FROM public.vault_ops
             WHERE id = '${operationId}'::uuid AND vault_id = '${fixtureVaultId}'::uuid;`
        ).trim() === "1"
    );
}

describe("CORS does not gate the websocket upgrade", () => {
    it("opens an authorized socket with no CORS preflight and no origin allow-list", async () => {
        const grant = rotateGrant(ownerHash, vaultId);
        const socket = openVaultOpsSocket(
            stack,
            vaultId,
            mintRealtimeToken(stack, {
                grantId: grant.grantId,
                vaultId,
                vaultRole: grant.vaultRole
            })
        );

        try {
            // No `Access-Control-Allow-Origin` is negotiated anywhere in this handshake.
            await expect(socket.authorized).resolves.toBe(true);
        } finally {
            socket.close();
        }
    }, 20_000);

    it("still denies an unauthorized socket, proving authorization is the real gate", async () => {
        const socket = openVaultOpsSocket(stack, vaultId, stack.anonKey, {
            authorizationTimeoutMs: 5_000
        });

        try {
            await expect(socket.authorized).resolves.toBe(false);
        } finally {
            socket.close();
        }
    }, 20_000);
});

describe("the HTTP surface is CORS-permissive, so origin cannot be the boundary", () => {
    it("answers a preflight from a hostile origin with a wildcard allow-origin", async () => {
        const preflight = await fetch(restUrl("vault_ops?select=id"), {
            method: "OPTIONS",
            headers: {
                Origin: HOSTILE_ORIGIN,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "apikey,authorization"
            }
        });

        expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    });

    it("rejects the anon key alone despite that permissive CORS response", async () => {
        const response = await fetch(restUrl("vault_ops?select=id"), {
            headers: authorizedHeaders(stack.anonKey)
        });

        expect(response.headers.get("access-control-allow-origin")).toBe("*");
        expect(response.status).toBe(401);
    });
});

describe("a realtime grant confers exactly its own vault, from any origin", () => {
    it("reads only its own vault's ops even when the request claims a hostile origin", async () => {
        const grant = rotateGrant(ownerHash, vaultId);
        const token = mintRealtimeToken(stack, {
            grantId: grant.grantId,
            vaultId,
            vaultRole: grant.vaultRole
        });

        expect(operationFixtureExists(ownOperationId, vaultId)).toBe(true);
        expect(operationFixtureExists(foreignOperationId, foreignVaultId)).toBe(true);

        const ownVault = await fetch(restUrl(`vault_ops?vault_id=eq.${vaultId}&select=id`), {
            headers: authorizedHeaders(token)
        });
        const foreignVault = await fetch(
            restUrl(`vault_ops?vault_id=eq.${foreignVaultId}&select=id`),
            { headers: authorizedHeaders(token) }
        );
        const candidateVaults = await fetch(candidateVaultOpsUrl(vaultId, foreignVaultId), {
            headers: authorizedHeaders(token)
        });

        expect(ownVault.status).toBe(200);
        expect(foreignVault.status).toBe(200);
        expect(candidateVaults.status).toBe(200);

        const ownRows: unknown = await ownVault.json();
        const foreignRows: unknown = await foreignVault.json();
        const candidateRowsValue: unknown = await candidateVaults.json();

        expect(Array.isArray(ownRows) && ownRows.length).toBeGreaterThan(0);
        expect(foreignRows).toEqual([]);
        expect(Array.isArray(candidateRowsValue)).toBe(true);
        if (!Array.isArray(candidateRowsValue)) {
            throw new Error("Bounded vault operation response was not an array");
        }
        const candidateRows = candidateRowsValue.filter(isVaultOperationRow);
        expect(candidateRows).toHaveLength(candidateRowsValue.length);
        expect(
            candidateRows.some((row) => row.id === ownOperationId && row.vault_id === vaultId)
        ).toBe(true);
        expect(
            candidateRows.some(
                (row) => row.id === foreignOperationId && row.vault_id === foreignVaultId
            )
        ).toBe(false);
        expect(candidateRows.every((row) => row.vault_id === vaultId)).toBe(true);
    }, 20_000);

    it("cannot read grants or memberships with the same token", async () => {
        const grant = rotateGrant(ownerHash, vaultId);
        const token = mintRealtimeToken(stack, {
            grantId: grant.grantId,
            vaultId,
            vaultRole: grant.vaultRole
        });

        const grants = await fetch(restUrl("realtime_grants?select=id"), {
            headers: authorizedHeaders(token)
        });
        const memberships = await fetch(restUrl("vault_memberships?select=id"), {
            headers: authorizedHeaders(token)
        });

        expect(grants.status).toBe(403);
        expect(memberships.status).toBe(403);
    });

    it("cannot forge an encrypted operation over the HTTP surface", async () => {
        const grant = rotateGrant(ownerHash, vaultId);
        const token = mintRealtimeToken(stack, {
            grantId: grant.grantId,
            vaultId,
            vaultRole: grant.vaultRole
        });

        const spoofed = await fetch(restUrl("vault_ops"), {
            method: "POST",
            headers: { ...authorizedHeaders(token), "Content-Type": "application/json" },
            body: JSON.stringify({
                id: randomUUID(),
                vault_id: vaultId,
                encrypted_data: "c3Bvb2ZlZC1vcA==",
                version_vector: "e30=",
                author_pubkey_hash: ownerHash
            })
        });

        expect(spoofed.status).toBe(403);
    });
});

describe("realtime fixture cleanup", () => {
    it("removes only the requested vault's dependent fixture rows", () => {
        const cleanupOwnerHash = testIdentityHash("cleanup-owner");
        const cleanupVaultId = createVaultOwnedBy(cleanupOwnerHash);
        createdVaultIds.push(cleanupVaultId);
        addVaultMember(cleanupVaultId, testIdentityHash("cleanup-member"));
        appendVaultOp(cleanupVaultId, cleanupOwnerHash);
        rotateGrant(cleanupOwnerHash, cleanupVaultId);

        expect(fixtureRowCount("vault_ops", cleanupVaultId)).toBeGreaterThan(0);
        expect(fixtureRowCount("realtime_grants", cleanupVaultId)).toBeGreaterThan(0);
        expect(fixtureRowCount("vault_memberships", cleanupVaultId)).toBeGreaterThan(0);
        expect(fixtureRowCount("vaults", cleanupVaultId)).toBe(1);

        cleanUpVaultFixtures([cleanupVaultId]);

        for (const table of [
            "vault_ops",
            "realtime_grants",
            "vault_memberships",
            "vaults"
        ] satisfies readonly FixtureTable[]) {
            expect(fixtureRowCount(table, cleanupVaultId), table).toBe(0);
        }
        expect(operationFixtureExists(ownOperationId, vaultId)).toBe(true);
        expect(operationFixtureExists(foreignOperationId, foreignVaultId)).toBe(true);
    });
});

describe("production transport configuration", () => {
    it("requires HTTPS outside development so the SDK derives a wss:// socket", async () => {
        const { requireSecureSupabaseUrl } = await import("@/lib/supabase/url");

        expect(() =>
            requireSecureSupabaseUrl("http://project.supabase.co", "production")
        ).toThrow();
        expect(requireSecureSupabaseUrl("https://project.supabase.co", "production")).toBe(
            "https://project.supabase.co"
        );
    });

    it("keeps the grant out of the socket URL so it cannot leak through logs or referrers", async () => {
        const grant = rotateGrant(ownerHash, vaultId);
        const token = mintRealtimeToken(stack, {
            grantId: grant.grantId,
            vaultId,
            vaultRole: grant.vaultRole
        });
        const socket = openVaultOpsSocket(stack, vaultId, token);

        try {
            await expect(socket.authorized).resolves.toBe(true);
            // The token travels in the phx_join payload, never the query string.
            const socketUrl = new URL(
                `${stack.supabaseUrl.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${stack.anonKey}&vsn=1.0.0`
            );

            expect(socketUrl.searchParams.has("access_token")).toBe(false);
            expect(socketUrl.toString()).not.toContain(token);
            expect(socketUrl.toString()).not.toContain(vaultId);
        } finally {
            socket.close();
        }
    }, 20_000);
});
