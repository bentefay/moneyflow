/**
 * Tests for Person helpers (HS-012).
 *
 * Covers the display-name fallback chain and the idempotent, deterministic
 * auto-linkage of vault members to encrypted `Person` records.
 */

import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { DEFAULT_PERSON, DEFAULT_PERSON_ID } from "@/lib/crdt/defaults";
import {
    type PeopleDraft,
    deriveMemberPersonId,
    ensureMemberPerson,
    memberFallbackName,
    resolvePersonDisplayName
} from "@/lib/crdt/person";
import type { PersonInput } from "@/lib/crdt/schema";

const PUBKEY_HASH = "a".repeat(64);
const OTHER_HASH = "b".repeat(64);

function makeDraft(people: Record<string, PersonInput>): PeopleDraft {
    return { people };
}

describe("resolvePersonDisplayName", () => {
    it("prefers an explicit, trimmed name", () => {
        expect(resolvePersonDisplayName({ name: "  Alice  " })).toBe("Alice");
    });

    it("falls back to the linked-member label when name is empty or whitespace", () => {
        expect(resolvePersonDisplayName({ name: "   ", linkedUserId: PUBKEY_HASH })).toBe(
            memberFallbackName(PUBKEY_HASH)
        );
        expect(resolvePersonDisplayName({ linkedUserId: PUBKEY_HASH })).toBe(
            memberFallbackName(PUBKEY_HASH)
        );
    });

    it("falls back to 'Unnamed' when there is neither a name nor a link", () => {
        expect(resolvePersonDisplayName({})).toBe("Unnamed");
        expect(resolvePersonDisplayName({ name: "  " })).toBe("Unnamed");
        expect(resolvePersonDisplayName({ name: "", linkedUserId: "" })).toBe("Unnamed");
    });

    it("never returns an empty string (property)", () => {
        const nameArb = fc.oneof(fc.constant(undefined), fc.string());
        const linkArb = fc.oneof(fc.constant(undefined), fc.string());
        fc.assert(
            fc.property(nameArb, linkArb, (name, linkedUserId) => {
                const resolved = resolvePersonDisplayName({ name, linkedUserId });
                return resolved.length > 0;
            })
        );
    });
});

describe("deriveMemberPersonId", () => {
    it("is deterministic for a pubkeyHash", () => {
        expect(deriveMemberPersonId(PUBKEY_HASH)).toBe(deriveMemberPersonId(PUBKEY_HASH));
    });

    it("distinguishes different pubkeyHashes", () => {
        expect(deriveMemberPersonId(PUBKEY_HASH)).not.toBe(deriveMemberPersonId(OTHER_HASH));
    });
});

describe("ensureMemberPerson", () => {
    it("creates a new unnamed person linked to the member", () => {
        const draft = makeDraft({});
        const id = ensureMemberPerson(draft, PUBKEY_HASH);

        expect(id).toBe(deriveMemberPersonId(PUBKEY_HASH));
        const created = draft.people[id ?? ""];
        expect(created?.linkedUserId).toBe(PUBKEY_HASH);
        expect(created?.name).toBeUndefined();
        expect(created?.deletedAt).toBeUndefined();
    });

    it("is idempotent: repeated calls do not create duplicates", () => {
        const draft = makeDraft({});
        const first = ensureMemberPerson(draft, PUBKEY_HASH);
        const second = ensureMemberPerson(draft, PUBKEY_HASH);

        expect(second).toBe(first);
        expect(Object.keys(draft.people)).toHaveLength(1);
    });

    it("returns the existing linked person without mutating a set name", () => {
        const draft = makeDraft({
            "custom-id": {
                id: "custom-id",
                name: "Renamed",
                linkedUserId: PUBKEY_HASH,
                deletedAt: undefined
            }
        });

        const id = ensureMemberPerson(draft, PUBKEY_HASH);

        expect(id).toBe("custom-id");
        expect(draft.people["custom-id"]?.name).toBe("Renamed");
        expect(Object.keys(draft.people)).toHaveLength(1);
    });

    it("ignores a soft-deleted linked person and creates a fresh one", () => {
        const draft = makeDraft({
            "deleted-id": {
                id: "deleted-id",
                name: undefined,
                linkedUserId: PUBKEY_HASH,
                deletedAt: Temporal.Now.instant()
            }
        });

        const id = ensureMemberPerson(draft, PUBKEY_HASH);

        expect(id).toBe(deriveMemberPersonId(PUBKEY_HASH));
        expect(Object.keys(draft.people)).toHaveLength(2);
    });

    describe("adoptDefaultPerson (owner path)", () => {
        it("links the seeded default person instead of creating a new one", () => {
            const draft = makeDraft({ [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } });

            const id = ensureMemberPerson(draft, PUBKEY_HASH, { adoptDefaultPerson: true });

            expect(id).toBe(DEFAULT_PERSON_ID);
            expect(draft.people[DEFAULT_PERSON_ID]?.linkedUserId).toBe(PUBKEY_HASH);
            // Adoption preserves the seeded name and account-owning identity.
            expect(draft.people[DEFAULT_PERSON_ID]?.name).toBe("Me");
            expect(Object.keys(draft.people)).toHaveLength(1);
        });

        it("does not adopt a default person that is already linked to someone else", () => {
            const draft = makeDraft({
                [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON, linkedUserId: OTHER_HASH }
            });

            const id = ensureMemberPerson(draft, PUBKEY_HASH, { adoptDefaultPerson: true });

            expect(id).toBe(deriveMemberPersonId(PUBKEY_HASH));
            expect(draft.people[DEFAULT_PERSON_ID]?.linkedUserId).toBe(OTHER_HASH);
            expect(Object.keys(draft.people)).toHaveLength(2);
        });

        it("does not adopt for invitees (adoptDefaultPerson defaults to false)", () => {
            const draft = makeDraft({ [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } });

            const id = ensureMemberPerson(draft, PUBKEY_HASH);

            expect(id).toBe(deriveMemberPersonId(PUBKEY_HASH));
            expect(draft.people[DEFAULT_PERSON_ID]?.linkedUserId).toBeUndefined();
        });

        it("is idempotent after adoption: the owner never gets a second person", () => {
            const draft = makeDraft({ [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } });

            ensureMemberPerson(draft, PUBKEY_HASH, { adoptDefaultPerson: true });
            const second = ensureMemberPerson(draft, PUBKEY_HASH, { adoptDefaultPerson: true });

            expect(second).toBe(DEFAULT_PERSON_ID);
            expect(Object.keys(draft.people)).toHaveLength(1);
        });
    });

    it("distinct members converge on distinct deterministic persons", () => {
        const draft = makeDraft({});
        const idA = ensureMemberPerson(draft, PUBKEY_HASH);
        const idB = ensureMemberPerson(draft, OTHER_HASH);

        expect(idA).not.toBe(idB);
        expect(Object.keys(draft.people)).toHaveLength(2);
    });
});
