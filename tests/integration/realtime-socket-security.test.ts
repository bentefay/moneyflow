/**
 * @vitest-environment node
 *
 * Integration Tests: websocket security against the REAL local Supabase Realtime server (HS-015).
 *
 * Runs on the node environment deliberately: jsdom installs its own `Event` class, which Node's
 * built-in WebSocket refuses to dispatch.
 *
 * Every case here opens an actual socket to the running Realtime container and lets the server
 * decide, so the assertions prove the deployed authorization boundary rather than a client-side
 * belief about it. A denied subscription is silent by design: the server never confirms the
 * `postgres_changes` subscription and the client receives no rows.
 *
 * Requires the local Supabase stack (`pnpm db:start`). Fixtures use synthetic public vectors only;
 * no secret material is logged or asserted on.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
    addVaultMember,
    appendVaultOp,
    cleanUpVaultFixtures,
    createVaultOwnedBy,
    mintRealtimeToken,
    openVaultOpsSocket,
    type RealtimeStack,
    removeVaultMember,
    requireRealtimeStack,
    revokeGrant,
    rotateGrant,
    runSql,
    runSqlExpectingDenial,
    testIdentityHash,
    waitUntil
} from "./helpers/realtime-stack";

const NO_PREVIOUS_GRANT_ID = "00000000-0000-0000-0000-000000000000";

let stack: RealtimeStack;
let ownerHash: string;
let memberHash: string;
let outsiderHash: string;
let vaultId: string;
let foreignVaultId: string;
const createdVaultIds: string[] = [];

beforeAll(() => {
    stack = requireRealtimeStack();
    ownerHash = testIdentityHash("owner");
    memberHash = testIdentityHash("member");
    outsiderHash = testIdentityHash("outsider");
    vaultId = createVaultOwnedBy(ownerHash);
    foreignVaultId = createVaultOwnedBy(outsiderHash);
    createdVaultIds.push(vaultId, foreignVaultId);
    addVaultMember(vaultId, memberHash);
});

afterAll(() => {
    cleanUpVaultFixtures(createdVaultIds);
});

/** Subscribes with `token` and reports whether the server authorized the vault_ops stream. */
async function subscriptionIsAuthorized(
    targetVaultId: string,
    token: string,
    timeoutMs = 6_000
): Promise<boolean> {
    const socket = openVaultOpsSocket(stack, targetVaultId, token, {
        authorizationTimeoutMs: timeoutMs
    });
    try {
        return await socket.authorized;
    } finally {
        socket.close();
    }
}

describe("publication and table scope", () => {
    it("publishes only the authoritative vault_ops table, never the legacy duplicate", () => {
        const published = runSql(
            "SELECT string_agg(tablename, ',' ORDER BY tablename) FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
        ).trim();

        expect(published).toBe("vault_ops");
        expect(published).not.toContain("vault_updates");
    });

    it("keeps the browser role unable to enumerate grants or memberships in SQL", () => {
        const grantReadable = runSql(
            "SELECT has_table_privilege('authenticated', 'public.realtime_grants', 'SELECT');"
        ).trim();
        const mintable = runSql(
            "SELECT has_function_privilege('authenticated', 'public.rotate_realtime_grant(text,uuid,text,uuid,integer)', 'EXECUTE');"
        ).trim();

        expect(grantReadable).toBe("f");
        expect(mintable).toBe("f");
    });
});

describe("public-key-hash vault access controls minting", () => {
    it("mints for an owner and reports the role the database holds", () => {
        const grant = rotateGrant(ownerHash, vaultId);

        expect(grant.vaultRole).toBe("owner");
        expect(grant.grantId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("mints for a member and reports the lower role", () => {
        const grant = rotateGrant(memberHash, vaultId);

        expect(grant.vaultRole).toBe("member");
    });

    it("denies an outsider identity with 42501 before any token exists", () => {
        const denial = runSqlExpectingDenial(
            `SELECT * FROM public.rotate_realtime_grant('${outsiderHash}', '${vaultId}'::uuid, 'sync', '${NO_PREVIOUS_GRANT_ID}'::uuid, 60);`
        );

        expect(denial).toBe("42501");
    });

    it("denies a member reaching across into a vault it does not belong to", () => {
        const denial = runSqlExpectingDenial(
            `SELECT * FROM public.rotate_realtime_grant('${memberHash}', '${foreignVaultId}'::uuid, 'sync', '${NO_PREVIOUS_GRANT_ID}'::uuid, 60);`
        );

        expect(denial).toBe("42501");
    });

    it("denies minting once membership is removed", () => {
        const revokedHash = testIdentityHash("revoked-member");
        addVaultMember(vaultId, revokedHash);
        expect(rotateGrant(revokedHash, vaultId).vaultRole).toBe("member");

        removeVaultMember(vaultId, revokedHash);

        expect(
            runSqlExpectingDenial(
                `SELECT * FROM public.rotate_realtime_grant('${revokedHash}', '${vaultId}'::uuid, 'sync', '${NO_PREVIOUS_GRANT_ID}'::uuid, 60);`
            )
        ).toBe("42501");
    });

    it("refuses a TTL outside the short-lived band", () => {
        const denial = runSqlExpectingDenial(
            `SELECT * FROM public.rotate_realtime_grant('${ownerHash}', '${vaultId}'::uuid, 'sync', '${NO_PREVIOUS_GRANT_ID}'::uuid, 86400);`
        );

        expect(denial).toBe("42501");
    });
});

describe("live socket authorization", () => {
    it("delivers a real encrypted vault_ops insert to an authorized owner socket", async () => {
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
            await expect(socket.authorized).resolves.toBe(true);
            const operationId = appendVaultOp(vaultId, ownerHash);
            await waitUntil(() => socket.receivedOperationIds.includes(operationId));

            expect(socket.receivedOperationIds).toContain(operationId);
        } finally {
            socket.close();
        }
    }, 20_000);

    it("delivers to an authorized member socket as well as the owner", async () => {
        const grant = rotateGrant(memberHash, vaultId);
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
            await expect(socket.authorized).resolves.toBe(true);
            const operationId = appendVaultOp(vaultId, ownerHash);
            await waitUntil(() => socket.receivedOperationIds.includes(operationId));

            expect(socket.receivedOperationIds).toContain(operationId);
        } finally {
            socket.close();
        }
    }, 20_000);

    it("rejects a socket carrying only the public anon key", async () => {
        await expect(subscriptionIsAuthorized(vaultId, stack.anonKey)).resolves.toBe(false);
    }, 20_000);

    it("rejects a token whose signature has been tampered with", async () => {
        const grant = rotateGrant(ownerHash, vaultId);

        await expect(
            subscriptionIsAuthorized(
                vaultId,
                mintRealtimeToken(
                    stack,
                    { grantId: grant.grantId, vaultId, vaultRole: grant.vaultRole },
                    { corruptSignature: true }
                )
            )
        ).resolves.toBe(false);
    }, 20_000);

    it("rejects a token forged with an attacker-chosen secret", async () => {
        const grant = rotateGrant(ownerHash, vaultId);

        await expect(
            subscriptionIsAuthorized(
                vaultId,
                mintRealtimeToken(
                    stack,
                    { grantId: grant.grantId, vaultId, vaultRole: grant.vaultRole },
                    { secret: "attacker-controlled-secret-of-sufficient-length" }
                )
            )
        ).resolves.toBe(false);
    }, 20_000);

    it("rejects an expired token even though its grant row is otherwise valid", async () => {
        const grant = rotateGrant(ownerHash, vaultId);

        await expect(
            subscriptionIsAuthorized(
                vaultId,
                mintRealtimeToken(stack, {
                    grantId: grant.grantId,
                    vaultId,
                    vaultRole: grant.vaultRole,
                    lifetimeSeconds: -120
                })
            )
        ).resolves.toBe(false);
    }, 20_000);

    it("rejects a replayed token after its grant is revoked", async () => {
        const grant = rotateGrant(ownerHash, vaultId);
        const token = mintRealtimeToken(stack, {
            grantId: grant.grantId,
            vaultId,
            vaultRole: grant.vaultRole
        });
        // The same token authorized a socket a moment ago; only revocation changes.
        await expect(subscriptionIsAuthorized(vaultId, token)).resolves.toBe(true);

        expect(revokeGrant(ownerHash, vaultId, grant.grantId)).toBe(true);

        await expect(subscriptionIsAuthorized(vaultId, token)).resolves.toBe(false);
    }, 30_000);

    it("rejects a replayed token after rotation supersedes its grant", async () => {
        const first = rotateGrant(ownerHash, vaultId);
        const stolenToken = mintRealtimeToken(stack, {
            grantId: first.grantId,
            vaultId,
            vaultRole: first.vaultRole
        });

        rotateGrant(ownerHash, vaultId, "sync", first.grantId);

        await expect(subscriptionIsAuthorized(vaultId, stolenToken)).resolves.toBe(false);
    }, 20_000);

    it("rejects a foreign vault's valid grant presented on this vault's topic", async () => {
        const foreignGrant = rotateGrant(outsiderHash, foreignVaultId);

        await expect(
            subscriptionIsAuthorized(
                vaultId,
                mintRealtimeToken(stack, {
                    grantId: foreignGrant.grantId,
                    vaultId: foreignVaultId,
                    vaultRole: foreignGrant.vaultRole
                })
            )
        ).resolves.toBe(false);
    }, 20_000);

    it("rejects a grant whose vault_id claim is rewritten to target another vault", async () => {
        const foreignGrant = rotateGrant(outsiderHash, foreignVaultId);

        // Claims are self-consistent and correctly signed; only the grant row disagrees.
        await expect(
            subscriptionIsAuthorized(
                vaultId,
                mintRealtimeToken(stack, {
                    grantId: foreignGrant.grantId,
                    vaultId,
                    vaultRole: foreignGrant.vaultRole
                })
            )
        ).resolves.toBe(false);
    }, 20_000);

    it("rejects an escalated vault_role claim that no longer matches its grant", async () => {
        const grant = rotateGrant(memberHash, vaultId);

        await expect(
            subscriptionIsAuthorized(
                vaultId,
                mintRealtimeToken(stack, {
                    grantId: grant.grantId,
                    vaultId,
                    vaultRole: "owner"
                })
            )
        ).resolves.toBe(false);
    }, 20_000);

    it("rejects a table claim widened away from vault_ops", async () => {
        const grant = rotateGrant(ownerHash, vaultId);

        await expect(
            subscriptionIsAuthorized(
                vaultId,
                mintRealtimeToken(stack, {
                    grantId: grant.grantId,
                    vaultId,
                    vaultRole: grant.vaultRole,
                    realtimeTable: "vault_snapshots"
                })
            )
        ).resolves.toBe(false);
    }, 20_000);

    it("rejects a token whose topic claim does not match the channel it joins", async () => {
        const grant = rotateGrant(ownerHash, vaultId);

        await expect(
            subscriptionIsAuthorized(
                vaultId,
                mintRealtimeToken(stack, {
                    grantId: grant.grantId,
                    vaultId,
                    vaultRole: grant.vaultRole,
                    realtimeTopic: `vault:${foreignVaultId}:sync`
                })
            )
        ).resolves.toBe(false);
    }, 20_000);

    it("rejects an unknown grant id that was never minted", async () => {
        await expect(
            subscriptionIsAuthorized(
                vaultId,
                mintRealtimeToken(stack, {
                    grantId: "10000000-0000-4000-8000-00000000dead",
                    vaultId,
                    vaultRole: "owner"
                })
            )
        ).resolves.toBe(false);
    }, 20_000);
});

describe("membership removal fails safe on a live socket", () => {
    it("stops delivering vault_ops once membership is revoked, even with an unexpired token", async () => {
        const departingHash = testIdentityHash("departing-member");
        addVaultMember(vaultId, departingHash);
        const grant = rotateGrant(departingHash, vaultId);
        const token = mintRealtimeToken(stack, {
            grantId: grant.grantId,
            vaultId,
            vaultRole: grant.vaultRole
        });

        const beforeRemoval = openVaultOpsSocket(stack, vaultId, token);
        try {
            await expect(beforeRemoval.authorized).resolves.toBe(true);
        } finally {
            beforeRemoval.close();
        }

        removeVaultMember(vaultId, departingHash);

        // The token has not expired and the grant row is not revoked; only membership changed.
        const afterRemoval = openVaultOpsSocket(stack, vaultId, token);
        try {
            await expect(afterRemoval.authorized).resolves.toBe(false);
            const operationId = appendVaultOp(vaultId, ownerHash);
            await waitUntil(() => afterRemoval.receivedOperationIds.includes(operationId), {
                timeoutMs: 3_000
            });

            expect(afterRemoval.receivedOperationIds).not.toContain(operationId);
        } finally {
            afterRemoval.close();
        }
    }, 40_000);
});

describe("the realtime grant is a read capability only", () => {
    it("does not let the browser role write vault_ops in SQL", () => {
        const insertable = runSql(
            "SELECT has_table_privilege('authenticated', 'public.vault_ops', 'INSERT');"
        ).trim();
        const updatable = runSql(
            "SELECT has_table_privilege('authenticated', 'public.vault_ops', 'UPDATE');"
        ).trim();
        const deletable = runSql(
            "SELECT has_table_privilege('authenticated', 'public.vault_ops', 'DELETE');"
        ).trim();

        expect([insertable, updatable, deletable]).toEqual(["f", "f", "f"]);
    });

    it("verifies writes against membership independently of any realtime grant", () => {
        // The outsider holds a perfectly valid grant for its own vault; that buys it nothing here.
        rotateGrant(outsiderHash, foreignVaultId);

        const denial = runSqlExpectingDenial(
            `SELECT public.append_vault_ops('${vaultId}'::uuid, '${outsiderHash}',
             '[{"id":"10000000-0000-4000-8000-0000000000aa","encrypted_data":"c3Bvb2Y=","version_vector":"e30="}]'::jsonb);`
        );

        expect(denial).toBe("42501");
    });
});
