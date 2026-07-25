/**
 * Tests for the client-side passkey ceremony helpers.
 *
 * The most important behaviour proven here is the secret-safety control from the WebAuthn spec:
 * `clientExtensionResults.prf.results` carries the raw key-encryption key, and the spec warns it
 * would be transmitted verbatim if the credential response were serialized as-is. Nothing may reach
 * the server with that field attached.
 */

import { describe, expect, it } from "vitest";

import {
    extractPrfOutput,
    isPasskeySupportedResult,
    stripPrfResults
} from "@/lib/crypto/passkeyCeremony";

/** A synthetic 32-byte PRF output. Not real key material. */
const SYNTHETIC_PRF = new Uint8Array(32).fill(0xab);

function prfBuffer(): ArrayBuffer {
    return Uint8Array.from(SYNTHETIC_PRF).buffer;
}

function registrationResponse(extras: Record<string, unknown> = {}) {
    return {
        id: "Y3JlZGVudGlhbC1pZA",
        rawId: "Y3JlZGVudGlhbC1pZA",
        type: "public-key",
        response: { clientDataJSON: "e30", attestationObject: "o2M", transports: ["internal"] },
        clientExtensionResults: { credProps: { rk: true }, prf: { enabled: true } },
        ...extras
    };
}

function authenticationResponse() {
    return {
        id: "Y3JlZGVudGlhbC1pZA",
        rawId: "Y3JlZGVudGlhbC1pZA",
        type: "public-key",
        response: {
            clientDataJSON: "e30",
            authenticatorData: "SZYN",
            signature: "MEUCIQ",
            userHandle: null
        },
        clientExtensionResults: { prf: { results: { first: prfBuffer() } } }
    };
}

describe("stripPrfResults", () => {
    it("removes the prf extension results before transmission", () => {
        const stripped = stripPrfResults(authenticationResponse());

        expect(stripped.clientExtensionResults).not.toHaveProperty("prf");
        expect(JSON.stringify(stripped)).not.toContain("prf");
    });

    it("removes prf even when only `enabled` is present", () => {
        const stripped = stripPrfResults(registrationResponse());

        expect(stripped.clientExtensionResults).not.toHaveProperty("prf");
    });

    it("preserves every field the server needs to verify the ceremony", () => {
        const original = registrationResponse();
        const stripped = stripPrfResults(original);

        expect(stripped.id).toBe(original.id);
        expect(stripped.rawId).toBe(original.rawId);
        expect(stripped.type).toBe(original.type);
        expect(stripped.response).toEqual(original.response);
        expect(stripped.clientExtensionResults.credProps).toEqual({ rk: true });
    });

    it("does not mutate the caller's object", () => {
        const original = authenticationResponse();
        stripPrfResults(original);

        expect(original.clientExtensionResults.prf).toBeDefined();
    });

    it("is safe when there are no extension results at all", () => {
        const stripped = stripPrfResults({
            id: "a",
            rawId: "a",
            type: "public-key" as const,
            response: { clientDataJSON: "e30" },
            clientExtensionResults: {} as Record<string, unknown>
        });

        expect(stripped.clientExtensionResults).toEqual({});
    });

    it("leaves no PRF bytes anywhere in the serialized payload", () => {
        const serialized = JSON.stringify(stripPrfResults(authenticationResponse()));

        // Every encoding a naive serializer might pick.
        expect(serialized).not.toContain(Buffer.from(SYNTHETIC_PRF).toString("base64"));
        expect(serialized).not.toContain(Buffer.from(SYNTHETIC_PRF).toString("base64url"));
        expect(serialized).not.toContain(Buffer.from(SYNTHETIC_PRF).toString("hex"));
    });
});

describe("extractPrfOutput", () => {
    it("returns the 32-byte PRF output from an assertion", () => {
        const output = extractPrfOutput(authenticationResponse());

        expect(output).toEqual(SYNTHETIC_PRF);
    });

    it("returns null when the authenticator produced no PRF results", () => {
        expect(extractPrfOutput(registrationResponse())).toBeNull();
    });

    it("returns null when extension results are absent", () => {
        expect(extractPrfOutput({ clientExtensionResults: {} })).toBeNull();
    });

    it("refuses a PRF result of the wrong width rather than padding it", () => {
        expect(
            extractPrfOutput({
                clientExtensionResults: { prf: { results: { first: new Uint8Array(16).buffer } } }
            })
        ).toBeNull();
    });
});

describe("isPasskeySupportedResult", () => {
    it("accepts a registration whose authenticator enabled PRF", () => {
        expect(isPasskeySupportedResult(registrationResponse())).toBe(true);
    });

    it("rejects a registration where PRF was not enabled - no silent downgrade", () => {
        expect(
            isPasskeySupportedResult({
                ...registrationResponse(),
                clientExtensionResults: { prf: { enabled: false } }
            })
        ).toBe(false);
    });

    it("rejects a registration with no prf extension output at all", () => {
        expect(
            isPasskeySupportedResult({
                ...registrationResponse(),
                clientExtensionResults: { credProps: { rk: true } } as Record<string, unknown>
            })
        ).toBe(false);
    });
});
