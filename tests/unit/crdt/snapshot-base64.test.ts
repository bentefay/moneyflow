/**
 * Regression tests for snapshot base64 encoding.
 *
 * The previous implementation was `btoa(String.fromCharCode(...bytes))`, which spreads every byte
 * as a separate function argument. A ~366KB shallow snapshot (roughly a 2000-transaction vault)
 * therefore threw `RangeError: Maximum call stack size exceeded` and sync broke for any
 * non-trivial vault. Encoding is now chunked.
 */

import { describe, expect, it } from "vitest";

import { base64ToBytes, bytesToBase64 } from "@/lib/crdt/snapshot";

function pseudoRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    let state = 0x2f6e2b1;
    for (let index = 0; index < length; index++) {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        bytes[index] = state & 0xff;
    }
    return bytes;
}

describe("bytesToBase64 / base64ToBytes", () => {
    it("round-trips an empty array", () => {
        expect(bytesToBase64(new Uint8Array(0))).toBe("");
        expect(base64ToBytes("")).toEqual(new Uint8Array(0));
    });

    it("round-trips every byte value", () => {
        const bytes = Uint8Array.from({ length: 256 }, (_, index) => index);

        expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    });

    it("regression: round-trips a 500KB payload without overflowing the call stack", () => {
        const bytes = pseudoRandomBytes(500_000);

        const encoded = bytesToBase64(bytes);

        expect(base64ToBytes(encoded)).toEqual(bytes);
    });

    it("encodes identically across the chunk boundary", () => {
        // 0x8000 is the chunk size, so this exercises the seam between chunks.
        const bytes = pseudoRandomBytes(0x8000 * 2 + 5);

        expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    });
});
