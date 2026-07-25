/**
 * Tests for the passkey tRPC router.
 *
 * Covers the server's half of the protocol: single-use server-generated challenges, verified
 * WebAuthn registration/authentication, signature-counter monotonicity, credential ownership,
 * and the rule that a wrapped secret is released only after a fully verified assertion.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyRequest: vi.fn(),
    createSupabaseClient: vi.fn(),
    rpc: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    generateRegistrationOptions: vi.fn(),
    verifyRegistrationResponse: vi.fn(),
    generateAuthenticationOptions: vi.fn(),
    verifyAuthenticationResponse: vi.fn()
}));

vi.mock("@/lib/crypto/signing", () => ({
    isSignedTRPCOperationList: () => true,
    verifyRequest: mocks.verifyRequest
}));

vi.mock("@/lib/supabase/server", () => ({
    createSupabaseClient: mocks.createSupabaseClient
}));

vi.mock("@simplewebauthn/server", () => ({
    generateRegistrationOptions: mocks.generateRegistrationOptions,
    verifyRegistrationResponse: mocks.verifyRegistrationResponse,
    generateAuthenticationOptions: mocks.generateAuthenticationOptions,
    verifyAuthenticationResponse: mocks.verifyAuthenticationResponse
}));

import { passkeyRouter } from "@/server/routers/passkey";
import type { TRPCContext } from "@/server/trpc";

const verifiedHash = "a".repeat(64);
const otherHash = "b".repeat(64);
const credentialId = "Y3JlZGVudGlhbC1pZA";
const storedPublicKey = Buffer.from(new Uint8Array(77).fill(7)).toString("base64");

/** Structural placeholder, not real ciphertext. */
const WRAPPED_SECRET = Buffer.from(new Uint8Array(104).fill(3)).toString("base64");

function createContext(authenticated: boolean): TRPCContext {
    return {
        pubkeyHash: null,
        publicKey: authenticated ? "verified-public-key" : null,
        headers: authenticated
            ? {
                  "x-pubkey": "verified-public-key",
                  "x-timestamp": "1740000000000",
                  "x-nonce": "verified-nonce",
                  "x-signature": "verified-signature"
              }
            : {},
        req: {
            method: "POST",
            path: "/api/trpc",
            body: [{ path: "passkey.listCredentials", input: {} }]
        }
    };
}

function registrationInput(overrides: Record<string, unknown> = {}) {
    return {
        challengeId: "11111111-1111-4111-8111-111111111111",
        label: "Test key",
        wrappedSecret: WRAPPED_SECRET,
        response: {
            id: credentialId,
            rawId: credentialId,
            type: "public-key" as const,
            response: {
                clientDataJSON: "e30",
                attestationObject: "o2M",
                transports: ["internal" as const]
            },
            clientExtensionResults: {}
        },
        ...overrides
    };
}

function authenticationInput(overrides: Record<string, unknown> = {}) {
    return {
        challengeId: "22222222-2222-4222-8222-222222222222",
        response: {
            id: credentialId,
            rawId: credentialId,
            type: "public-key" as const,
            response: {
                clientDataJSON: "e30",
                authenticatorData: "SZYN",
                signature: "MEUCIQ",
                userHandle: null
            },
            clientExtensionResults: {}
        },
        ...overrides
    };
}

beforeEach(() => {
    vi.clearAllMocks();

    const query = {
        select: mocks.select,
        eq: mocks.eq,
        order: mocks.order,
        maybeSingle: mocks.maybeSingle,
        insert: mocks.insert
    };

    mocks.createSupabaseClient.mockResolvedValue({ rpc: mocks.rpc, from: mocks.from });
    mocks.from.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.order.mockResolvedValue({ data: [], error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.insert.mockResolvedValue({ data: null, error: null });

    // Default: every RPC succeeds. Individual tests narrow this.
    mocks.rpc.mockImplementation((name: string) => {
        if (name === "claim_request_nonce") return Promise.resolve({ data: true, error: null });
        if (name === "create_passkey_challenge") {
            return Promise.resolve({
                data: [
                    {
                        challenge_id: "11111111-1111-4111-8111-111111111111",
                        challenge: "Y2hhbGxlbmdlLWJ5dGVz"
                    }
                ],
                error: null
            });
        }
        if (name === "claim_passkey_challenge") {
            return Promise.resolve({
                data: [{ challenge: "Y2hhbGxlbmdlLWJ5dGVz", pubkey_hash: verifiedHash }],
                error: null
            });
        }
        if (name === "register_passkey_credential")
            return Promise.resolve({ data: true, error: null });
        if (name === "revoke_passkey_credential")
            return Promise.resolve({ data: true, error: null });
        if (name === "record_passkey_authentication") {
            return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: null });
    });

    mocks.verifyRequest.mockResolvedValue({
        verified: true,
        pubkeyHash: verifiedHash,
        nonce: "verified-nonce",
        requestTimestampMs: 1740000000000
    });

    mocks.generateRegistrationOptions.mockResolvedValue({
        rp: { id: "localhost", name: "MoneyFlow" },
        user: { id: "dXNlcg", name: "u", displayName: "u" },
        challenge: "Y2hhbGxlbmdlLWJ5dGVz",
        pubKeyCredParams: []
    });
    mocks.generateAuthenticationOptions.mockResolvedValue({
        challenge: "Y2hhbGxlbmdlLWJ5dGVz",
        rpId: "localhost"
    });
    mocks.verifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
            credential: {
                id: credentialId,
                publicKey: new Uint8Array(77).fill(7),
                counter: 0,
                transports: ["internal"]
            },
            credentialDeviceType: "multiDevice",
            credentialBackedUp: true,
            aaguid: "00000000-0000-0000-0000-000000000000",
            userVerified: true
        }
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: { credentialID: credentialId, newCounter: 1, userVerified: true }
    });
});

describe("passkey router surface", () => {
    it("exposes exactly the passkey ceremony procedures", () => {
        expect(Object.keys(passkeyRouter._def.procedures).sort()).toEqual([
            "finishAuthentication",
            "finishRegistration",
            "listCredentials",
            "revokeCredential",
            "startAuthentication",
            "startRegistration"
        ]);
    });
});

describe("registration is protected", () => {
    it("rejects anonymous registration start before any database access", async () => {
        await expect(
            passkeyRouter.createCaller(createContext(false)).startRegistration({})
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
        expect(mocks.createSupabaseClient).not.toHaveBeenCalled();
    });

    it("rejects anonymous registration finish", async () => {
        await expect(
            passkeyRouter.createCaller(createContext(false)).finishRegistration(registrationInput())
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("rejects anonymous credential listing and revocation", async () => {
        await expect(
            passkeyRouter.createCaller(createContext(false)).listCredentials()
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
        await expect(
            passkeyRouter.createCaller(createContext(false)).revokeCredential({ credentialId })
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("binds the registration challenge to the verified identity, not client input", async () => {
        await passkeyRouter.createCaller(createContext(true)).startRegistration({});

        const call = mocks.rpc.mock.calls.find(([name]) => name === "create_passkey_challenge");
        expect(call?.[1]).toMatchObject({ p_pubkey_hash: verifiedHash });
        expect(JSON.stringify(call?.[1])).not.toContain(otherHash);
    });

    it("requests the PRF extension and a discoverable, user-verified credential", async () => {
        await passkeyRouter.createCaller(createContext(true)).startRegistration({});

        const options = mocks.generateRegistrationOptions.mock.calls[0][0];
        expect(options.extensions).toMatchObject({ prf: {} });
        expect(options.authenticatorSelection).toMatchObject({
            residentKey: "required",
            userVerification: "required"
        });
        expect(options.attestationType).toBe("none");
    });

    it("excludes already-registered credentials so one authenticator cannot double-register", async () => {
        mocks.order.mockResolvedValue({
            data: [{ credential_id: credentialId, transports: ["internal"] }],
            error: null
        });

        await passkeyRouter.createCaller(createContext(true)).startRegistration({});

        const options = mocks.generateRegistrationOptions.mock.calls[0][0];
        expect(options.excludeCredentials).toEqual([
            { id: credentialId, transports: ["internal"] }
        ]);
    });
});

describe("registration verification", () => {
    it("verifies against the server-stored challenge, origin and RP ID", async () => {
        await passkeyRouter
            .createCaller(createContext(true))
            .finishRegistration(registrationInput());

        const options = mocks.verifyRegistrationResponse.mock.calls[0][0];
        expect(options.expectedChallenge).toBe("Y2hhbGxlbmdlLWJ5dGVz");
        expect(options.expectedOrigin).toBe("http://localhost:3000");
        expect(options.expectedRPID).toBe("localhost");
        expect(options.requireUserVerification).toBe(true);
    });

    it("consumes the challenge exactly once", async () => {
        await passkeyRouter
            .createCaller(createContext(true))
            .finishRegistration(registrationInput());

        const claims = mocks.rpc.mock.calls.filter(([name]) => name === "claim_passkey_challenge");
        expect(claims).toHaveLength(1);
    });

    it("rejects a replayed challenge that the database refuses to re-claim", async () => {
        mocks.rpc.mockImplementation((name: string) =>
            name === "claim_passkey_challenge"
                ? Promise.resolve({ data: [], error: null })
                : Promise.resolve({ data: true, error: null })
        );

        await expect(
            passkeyRouter.createCaller(createContext(true)).finishRegistration(registrationInput())
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        expect(mocks.verifyRegistrationResponse).not.toHaveBeenCalled();
    });

    it("rejects a challenge minted for a different identity", async () => {
        mocks.rpc.mockImplementation((name: string) =>
            name === "claim_passkey_challenge"
                ? Promise.resolve({
                      data: [{ challenge: "Y2hhbGxlbmdlLWJ5dGVz", pubkey_hash: otherHash }],
                      error: null
                  })
                : Promise.resolve({ data: true, error: null })
        );

        await expect(
            passkeyRouter.createCaller(createContext(true)).finishRegistration(registrationInput())
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("stores nothing when WebAuthn verification fails", async () => {
        mocks.verifyRegistrationResponse.mockResolvedValue({ verified: false });

        await expect(
            passkeyRouter.createCaller(createContext(true)).finishRegistration(registrationInput())
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });

        expect(
            mocks.rpc.mock.calls.filter(([name]) => name === "register_passkey_credential")
        ).toHaveLength(0);
    });

    it("stores nothing when the verifier throws", async () => {
        mocks.verifyRegistrationResponse.mockRejectedValue(new Error("bad attestation"));

        await expect(
            passkeyRouter.createCaller(createContext(true)).finishRegistration(registrationInput())
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        expect(
            mocks.rpc.mock.calls.filter(([name]) => name === "register_passkey_credential")
        ).toHaveLength(0);
    });

    it("persists the credential against the verified identity with its wrapped secret", async () => {
        await passkeyRouter
            .createCaller(createContext(true))
            .finishRegistration(registrationInput());

        const call = mocks.rpc.mock.calls.find(([name]) => name === "register_passkey_credential");
        expect(call?.[1]).toMatchObject({
            p_pubkey_hash: verifiedHash,
            p_credential_id: credentialId,
            p_wrapped_secret: WRAPPED_SECRET,
            p_counter: 0
        });
    });

    it("rejects a wrapped secret that is not base64", async () => {
        await expect(
            passkeyRouter
                .createCaller(createContext(true))
                .finishRegistration(registrationInput({ wrappedSecret: "!!!not base64!!!" }))
        ).rejects.toThrow();
    });

    it("rejects an absurdly large wrapped secret", async () => {
        await expect(
            passkeyRouter
                .createCaller(createContext(true))
                .finishRegistration(registrationInput({ wrappedSecret: "A".repeat(100_000) }))
        ).rejects.toThrow();
    });
});

describe("authentication is public but fails closed", () => {
    it("mints an authentication challenge without requiring a signature", async () => {
        await expect(
            passkeyRouter.createCaller(createContext(false)).startAuthentication()
        ).resolves.toMatchObject({ options: expect.anything() });
    });

    it("never reveals which identities exist in the authentication options", async () => {
        const result = await passkeyRouter.createCaller(createContext(false)).startAuthentication();

        expect(JSON.stringify(result)).not.toContain(verifiedHash);
        const options = mocks.generateAuthenticationOptions.mock.calls[0][0];
        expect(options.allowCredentials).toBeUndefined();
        expect(options.userVerification).toBe("required");
        expect(options.extensions?.prf?.eval?.first).toBeDefined();
    });

    it("verifies the assertion against the stored credential, origin and RP ID", async () => {
        mocks.maybeSingle.mockResolvedValue({
            data: {
                credential_id: credentialId,
                public_key: storedPublicKey,
                counter: 0,
                transports: ["internal"],
                wrapped_secret: WRAPPED_SECRET,
                wrap_version: 1,
                pubkey_hash: verifiedHash
            },
            error: null
        });

        await passkeyRouter
            .createCaller(createContext(false))
            .finishAuthentication(authenticationInput());

        const options = mocks.verifyAuthenticationResponse.mock.calls[0][0];
        expect(options.expectedOrigin).toBe("http://localhost:3000");
        expect(options.expectedRPID).toBe("localhost");
        expect(options.requireUserVerification).toBe(true);
        expect(options.credential.id).toBe(credentialId);
        expect(options.credential.counter).toBe(0);
        expect(options.advancedFIDOConfig).toBeUndefined();
    });

    it("releases the wrapped secret ONLY after a verified assertion", async () => {
        mocks.maybeSingle.mockResolvedValue({
            data: {
                credential_id: credentialId,
                public_key: storedPublicKey,
                counter: 0,
                transports: ["internal"],
                wrapped_secret: WRAPPED_SECRET,
                wrap_version: 1,
                pubkey_hash: verifiedHash
            },
            error: null
        });

        await expect(
            passkeyRouter
                .createCaller(createContext(false))
                .finishAuthentication(authenticationInput())
        ).resolves.toMatchObject({
            wrappedSecret: WRAPPED_SECRET,
            wrapVersion: 1,
            pubkeyHash: verifiedHash
        });
    });

    it("withholds the wrapped secret when verification fails", async () => {
        mocks.maybeSingle.mockResolvedValue({
            data: {
                credential_id: credentialId,
                public_key: storedPublicKey,
                counter: 0,
                transports: ["internal"],
                wrapped_secret: WRAPPED_SECRET,
                wrap_version: 1,
                pubkey_hash: verifiedHash
            },
            error: null
        });
        mocks.verifyAuthenticationResponse.mockResolvedValue({
            verified: false,
            authenticationInfo: { credentialID: credentialId, newCounter: 1, userVerified: true }
        });

        await expect(
            passkeyRouter
                .createCaller(createContext(false))
                .finishAuthentication(authenticationInput())
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("withholds the wrapped secret when the verifier throws a counter replay", async () => {
        mocks.maybeSingle.mockResolvedValue({
            data: {
                credential_id: credentialId,
                public_key: storedPublicKey,
                counter: 5,
                transports: ["internal"],
                wrapped_secret: WRAPPED_SECRET,
                wrap_version: 1,
                pubkey_hash: verifiedHash
            },
            error: null
        });
        mocks.verifyAuthenticationResponse.mockRejectedValue(
            new Error("Response counter value 3 was lower than 5")
        );

        await expect(
            passkeyRouter
                .createCaller(createContext(false))
                .finishAuthentication(authenticationInput())
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("rejects an unknown credential without disclosing why", async () => {
        mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

        await expect(
            passkeyRouter
                .createCaller(createContext(false))
                .finishAuthentication(authenticationInput())
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
        expect(mocks.verifyAuthenticationResponse).not.toHaveBeenCalled();
    });

    it("rejects a replayed authentication challenge", async () => {
        mocks.rpc.mockImplementation((name: string) =>
            name === "claim_passkey_challenge"
                ? Promise.resolve({ data: [], error: null })
                : Promise.resolve({ data: true, error: null })
        );

        await expect(
            passkeyRouter
                .createCaller(createContext(false))
                .finishAuthentication(authenticationInput())
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        expect(mocks.verifyAuthenticationResponse).not.toHaveBeenCalled();
    });

    it("persists the advanced signature counter after success", async () => {
        mocks.maybeSingle.mockResolvedValue({
            data: {
                credential_id: credentialId,
                public_key: storedPublicKey,
                counter: 0,
                transports: ["internal"],
                wrapped_secret: WRAPPED_SECRET,
                wrap_version: 1,
                pubkey_hash: verifiedHash
            },
            error: null
        });

        await passkeyRouter
            .createCaller(createContext(false))
            .finishAuthentication(authenticationInput());

        const call = mocks.rpc.mock.calls.find(
            ([name]) => name === "record_passkey_authentication"
        );
        expect(call?.[1]).toMatchObject({ p_credential_id: credentialId, p_counter: 1 });
    });
});

describe("revocation", () => {
    it("scopes revocation to the verified identity", async () => {
        await passkeyRouter.createCaller(createContext(true)).revokeCredential({ credentialId });

        const call = mocks.rpc.mock.calls.find(([name]) => name === "revoke_passkey_credential");
        expect(call?.[1]).toMatchObject({
            p_pubkey_hash: verifiedHash,
            p_credential_id: credentialId
        });
    });

    it("reports a no-op when the credential does not belong to the caller", async () => {
        mocks.rpc.mockImplementation((name: string) =>
            name === "revoke_passkey_credential"
                ? Promise.resolve({ data: false, error: null })
                : Promise.resolve({ data: true, error: null })
        );

        await expect(
            passkeyRouter.createCaller(createContext(true)).revokeCredential({ credentialId })
        ).resolves.toEqual({ revoked: false });
    });
});

describe("credential listing never leaks secrets", () => {
    it("returns only non-secret metadata - never the wrapped secret", async () => {
        mocks.order.mockResolvedValue({
            data: [
                {
                    credential_id: credentialId,
                    label: "Test key",
                    created_at: "2026-07-20T00:00:00.000Z",
                    last_used_at: null,
                    transports: ["internal"],
                    backed_up: true
                }
            ],
            error: null
        });

        const result = await passkeyRouter.createCaller(createContext(true)).listCredentials();

        expect(JSON.stringify(result)).not.toContain(WRAPPED_SECRET);
        expect(result[0]).not.toHaveProperty("wrappedSecret");
        expect(result[0]).toMatchObject({ credentialId, label: "Test key" });
    });

    it("lists only the verified identity's credentials", async () => {
        await passkeyRouter.createCaller(createContext(true)).listCredentials();

        expect(mocks.eq).toHaveBeenCalledWith("pubkey_hash", verifiedHash);
        expect(mocks.eq).not.toHaveBeenCalledWith("pubkey_hash", otherHash);
    });
});
