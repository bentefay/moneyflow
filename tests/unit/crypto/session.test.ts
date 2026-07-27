/**
 * Regression tests for sessionStorage boundary validation.
 *
 * sessionStorage is an untrusted boundary: a partially-written or version-skewed blob previously
 * came back typed as `SessionData` with `undefined` key fields, which then failed deep inside
 * `sodium.from_base64` far from the actual cause.
 *
 * All values here are synthetic placeholders, not real key material.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { clearSession, getSession, hasSession, storeSession } from "@/lib/crypto/session";

const SESSION_KEY = "moneyflow_session";

/** Structurally complete session with synthetic, non-secret placeholder values. */
const validSession = {
    publicKey: "cHVibGljLWtleQ==",
    secretKey: "c2VjcmV0LWtleQ==",
    encPublicKey: "ZW5jLXB1YmxpYw==",
    encSecretKey: "ZW5jLXNlY3JldA==",
    pubkeyHash: "a".repeat(64)
};

beforeEach(() => {
    sessionStorage.clear();
});

describe("getSession", () => {
    it("returns a stored session unchanged", () => {
        storeSession(validSession);
        expect(getSession()).toEqual(validSession);
        expect(hasSession()).toBe(true);
    });

    it("returns null when no session is stored", () => {
        expect(getSession()).toBeNull();
    });

    const corruptBlobs: Array<[string, string]> = [
        ["truncated JSON", '{"publicKey":"abc","secretKey"'],
        ["not JSON at all", "definitely-not-json"],
        [
            "partial write missing secretKey",
            JSON.stringify({
                publicKey: validSession.publicKey,
                encPublicKey: validSession.encPublicKey,
                encSecretKey: validSession.encSecretKey,
                pubkeyHash: validSession.pubkeyHash
            })
        ],
        [
            "version skew with a null key field",
            JSON.stringify({ ...validSession, secretKey: null })
        ],
        [
            "version skew with a non-string key field",
            JSON.stringify({ ...validSession, encSecretKey: { wrapped: true } })
        ],
        ["empty-string key field", JSON.stringify({ ...validSession, publicKey: "" })],
        ["JSON array instead of an object", "[]"],
        ["JSON null", "null"]
    ];

    it.each(corruptBlobs)("rejects and clears a %s", (_label, blob) => {
        sessionStorage.setItem(SESSION_KEY, blob);

        expect(getSession()).toBeNull();
        // A rejected blob must not linger, or every later read repeats the same failure.
        expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
        expect(hasSession()).toBe(false);
    });

    it("ignores unknown extra fields from a newer writer", () => {
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ ...validSession, futureField: "ignored" })
        );

        expect(getSession()).toMatchObject(validSession);
    });
});

describe("clearSession", () => {
    it("removes a stored session", () => {
        storeSession(validSession);
        clearSession();
        expect(getSession()).toBeNull();
    });
});
