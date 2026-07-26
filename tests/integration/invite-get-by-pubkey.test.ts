/**
 * Integration tests for `invite.getByPubkey` (HS-011).
 *
 * This is the server half of the redemption fix: the recipient can only unwrap
 * the REAL vault key if the server returns the owner's X25519 public key (the
 * authenticated `crypto_box` sender). These tests drive the real router logic
 * against a mocked Supabase client and assert:
 *   - the owner's `enc_public_key` is resolved from `vault_memberships` and
 *     returned as `senderEncPublicKey`,
 *   - the invite is rejected (NOT_FOUND) when it is missing, expired, or the
 *     owner's membership/sender key cannot be resolved,
 *   - an unrecognised persisted role is a boundary error, not a silent cast.
 *
 * No real secret material is used: keys are synthetic public base64 strings.
 */

import { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    createSupabaseClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
    createSupabaseClient: mocks.createSupabaseClient
}));

import { inviteRouter } from "@/server/routers/invite";
import type { TRPCContext } from "@/server/trpc";

type SupabaseResponse = { data: unknown; error: unknown };

/**
 * Minimal Supabase query-builder mock. Every terminal (`.single()`,
 * `.maybeSingle()`, or awaiting a chain) resolves the next queued response in
 * call order, which is deterministic for a given router procedure.
 */
function createSupabaseMock(responses: SupabaseResponse[]) {
    const queue = [...responses];
    const next = (): SupabaseResponse => {
        const value = queue.shift();
        if (value == null) throw new Error("supabase mock: no queued response");
        return value;
    };
    const makeBuilder = () => {
        const builder = {
            select: () => builder,
            insert: () => builder,
            delete: () => builder,
            eq: () => builder,
            order: () => builder,
            single: () => Promise.resolve(next()),
            maybeSingle: () => Promise.resolve(next()),
            then: (resolve: (v: SupabaseResponse) => unknown, reject?: (e: unknown) => unknown) =>
                Promise.resolve(next()).then(resolve, reject)
        };
        return builder;
    };
    return { from: () => makeBuilder(), rpc: () => makeBuilder() };
}

function queueResponses(responses: SupabaseResponse[]): void {
    mocks.createSupabaseClient.mockResolvedValue(createSupabaseMock(responses));
}

// getByPubkey is a public procedure; the context is unused by the resolver.
const publicContext = {} as unknown as TRPCContext;

const INVITE_PUBKEY = btoa("invite-ephemeral-public-key-3232");
const OWNER_SENDER_KEY = btoa("owner-x25519-public-key-32-bytes");
const WRAPPED_VAULT_KEY = btoa("wrapped-vault-key-ciphertext-blob");
const INVITE_ID = "550e8400-e29b-41d4-a716-446655440000";
const VAULT_ID = "660e8400-e29b-41d4-a716-446655440111";

function futureExpiry(): string {
    return Temporal.Now.instant().add({ hours: 24 }).toString();
}

function pastExpiry(): string {
    return Temporal.Now.instant().subtract({ hours: 1 }).toString();
}

function inviteRow(overrides: Record<string, unknown> = {}) {
    return {
        data: {
            id: INVITE_ID,
            vault_id: VAULT_ID,
            encrypted_vault_key: WRAPPED_VAULT_KEY,
            role: "member",
            expires_at: futureExpiry(),
            created_by: "owner-pubkey-hash",
            ...overrides
        },
        error: null
    };
}

const ownerMembershipRow: SupabaseResponse = {
    data: { enc_public_key: OWNER_SENDER_KEY },
    error: null
};

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("invite.getByPubkey", () => {
    it("returns the owner sender key resolved from vault_memberships", async () => {
        queueResponses([inviteRow(), ownerMembershipRow]);

        const result = await inviteRouter
            .createCaller(publicContext)
            .getByPubkey({ invitePubkey: INVITE_PUBKEY });

        expect(result.senderEncPublicKey).toBe(OWNER_SENDER_KEY);
        expect(result.encryptedVaultKey).toBe(WRAPPED_VAULT_KEY);
        expect(result.vaultId).toBe(VAULT_ID);
        expect(result.role).toBe("member");
    });

    it("rejects when the invite pubkey does not exist", async () => {
        queueResponses([{ data: null, error: { code: "PGRST116" } }]);

        await expect(
            inviteRouter.createCaller(publicContext).getByPubkey({ invitePubkey: INVITE_PUBKEY })
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("rejects when the owner membership (sender key) cannot be resolved", async () => {
        // Without the owner's enc_public_key the envelope cannot be authenticated,
        // so redemption must not proceed with a partial result.
        queueResponses([inviteRow(), { data: null, error: { code: "PGRST116" } }]);

        await expect(
            inviteRouter.createCaller(publicContext).getByPubkey({ invitePubkey: INVITE_PUBKEY })
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("rejects when the owner membership has a null sender key", async () => {
        queueResponses([inviteRow(), { data: { enc_public_key: null }, error: null }]);

        await expect(
            inviteRouter.createCaller(publicContext).getByPubkey({ invitePubkey: INVITE_PUBKEY })
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("rejects an expired invite", async () => {
        queueResponses([inviteRow({ expires_at: pastExpiry() }), ownerMembershipRow]);

        await expect(
            inviteRouter.createCaller(publicContext).getByPubkey({ invitePubkey: INVITE_PUBKEY })
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("treats an unrecognised persisted role as a boundary error, not a cast", async () => {
        queueResponses([inviteRow({ role: "superuser" }), ownerMembershipRow]);

        await expect(
            inviteRouter.createCaller(publicContext).getByPubkey({ invitePubkey: INVITE_PUBKEY })
        ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    });
});
