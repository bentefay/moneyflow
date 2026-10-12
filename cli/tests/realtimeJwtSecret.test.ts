import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { resolveRealtimeJwtSecret, secretFromRealtimeEnvironment } from "../lib/realtimeJwtSecret";

const secret = "a-local-realtime-secret-at-least-32-bytes";
const jwks = (keys: unknown) => `API_JWT_JWKS=${JSON.stringify({ keys })}`;
const symmetric = (value: string) => ({ kty: "oct", k: Buffer.from(value).toString("base64url") });

describe("secretFromRealtimeEnvironment", () => {
    it.each([
        {
            name: "a symmetric key among others",
            environment: [
                "PORT=4000",
                jwks([{ kty: "EC", x: "a" }, symmetric(secret)]),
                "DB_HOST=db"
            ],
            expected: { ok: true, secret, source: "container" }
        },
        {
            name: "no JWKS variable",
            environment: ["PORT=4000"],
            expected: { ok: false, reason: "the Realtime container has no API_JWT_JWKS" }
        },
        {
            name: "malformed JWKS JSON",
            environment: ["API_JWT_JWKS={not json"],
            expected: { ok: false, reason: "the Realtime JWKS has no key list" }
        },
        {
            name: "only asymmetric keys",
            environment: [jwks([{ kty: "EC", x: "a" }])],
            expected: { ok: false, reason: "the Realtime JWKS has no symmetric key" }
        },
        {
            name: "a symmetric key that is too short",
            environment: [jwks([symmetric("short")])],
            expected: { ok: false, reason: "the Realtime symmetric key is shorter than 32 bytes" }
        }
    ])("handles $name", ({ environment, expected }) => {
        expect(secretFromRealtimeEnvironment(environment.join("\n"))).toEqual(expected);
    });

    it("round-trips any symmetric key of at least 32 bytes", () => {
        fc.assert(
            fc.property(fc.string({ minLength: 32, unit: "grapheme-ascii" }), (value) => {
                expect(secretFromRealtimeEnvironment(jwks([symmetric(value)]))).toEqual({
                    ok: true,
                    secret: value,
                    source: "container"
                });
            })
        );
    });
});

describe("resolveRealtimeJwtSecret", () => {
    it("prefers a usable inherited secret without inspecting docker", () => {
        expect(resolveRealtimeJwtSecret(secret)).toEqual({
            ok: true,
            secret,
            source: "environment"
        });
    });
});
