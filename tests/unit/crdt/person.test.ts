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
    memberDisplayLabel,
    memberFallbackName,
    resolveMemberDisplayName,
    resolvePersonDisplayName,
    UNNAMED_MEMBER_LABEL
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

/**
 * UR-003 / UR-006: the shared pubkeyHash -> display name lookup behind both the presence avatars
 * and the Vault Settings members list.
 *
 * The owner and invited-member paths are built with the real {@link ensureMemberPerson} rather than
 * hand-written fixtures, so these assertions track how members are actually linked.
 */
describe("resolveMemberDisplayName", () => {
    it("resolves the vault OWNER through the adopted default person", () => {
        // Owner path: adopts the seeded "Me" person, keeping its name.
        const draft = makeDraft({ [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } });
        ensureMemberPerson(draft, PUBKEY_HASH, { adoptDefaultPerson: true });

        expect(resolveMemberDisplayName(draft.people, PUBKEY_HASH)).toEqual({
            kind: "named",
            name: "Me"
        });
    });

    it("reports an INVITED MEMBER as unnamed until they are given a name", () => {
        // Invited path: a fresh person with name undefined.
        const draft = makeDraft({ [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } });
        ensureMemberPerson(draft, OTHER_HASH);

        expect(resolveMemberDisplayName(draft.people, OTHER_HASH)).toEqual({ kind: "unnamed" });
    });

    it("resolves an invited member once they are named", () => {
        const draft = makeDraft({});
        const id = ensureMemberPerson(draft, OTHER_HASH);
        const person = draft.people[id ?? ""];
        if (person == null) throw new Error("expected a linked person");
        person.name = "Ben Tefay";

        expect(resolveMemberDisplayName(draft.people, OTHER_HASH)).toEqual({
            kind: "named",
            name: "Ben Tefay"
        });
    });

    it("finds the owner even though their person id is not the derived member id", () => {
        // Guards the lookup strategy: matching on linkedUserId rather than on
        // deriveMemberPersonId, which would miss the owner entirely.
        const draft = makeDraft({ [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } });
        ensureMemberPerson(draft, PUBKEY_HASH, { adoptDefaultPerson: true });

        expect(draft.people[deriveMemberPersonId(PUBKEY_HASH)]).toBeUndefined();
        expect(resolveMemberDisplayName(draft.people, PUBKEY_HASH).kind).toBe("named");
    });

    it("keeps owner and invited member distinct in one vault", () => {
        const draft = makeDraft({ [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } });
        ensureMemberPerson(draft, PUBKEY_HASH, { adoptDefaultPerson: true });
        ensureMemberPerson(draft, OTHER_HASH);

        expect(resolveMemberDisplayName(draft.people, PUBKEY_HASH)).toEqual({
            kind: "named",
            name: "Me"
        });
        expect(resolveMemberDisplayName(draft.people, OTHER_HASH)).toEqual({ kind: "unnamed" });
    });

    it("treats a blank or whitespace-only name as unnamed", () => {
        const draft = makeDraft({
            "p-1": { id: "p-1", name: "   ", linkedUserId: PUBKEY_HASH, deletedAt: undefined }
        });

        expect(resolveMemberDisplayName(draft.people, PUBKEY_HASH)).toEqual({ kind: "unnamed" });
    });

    it("trims a resolved name", () => {
        const draft = makeDraft({
            "p-1": { id: "p-1", name: "  Alice  ", linkedUserId: PUBKEY_HASH, deletedAt: undefined }
        });

        expect(resolveMemberDisplayName(draft.people, PUBKEY_HASH)).toEqual({
            kind: "named",
            name: "Alice"
        });
    });

    it("skips a soft-deleted person", () => {
        const draft = makeDraft({
            "p-1": {
                id: "p-1",
                name: "Removed",
                linkedUserId: PUBKEY_HASH,
                deletedAt: Temporal.Now.instant()
            }
        });

        expect(resolveMemberDisplayName(draft.people, PUBKEY_HASH)).toEqual({ kind: "unnamed" });
    });

    it("reports unnamed for an unknown member, an empty hash and an empty map", () => {
        const draft = makeDraft({ [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } });
        ensureMemberPerson(draft, PUBKEY_HASH, { adoptDefaultPerson: true });

        expect(resolveMemberDisplayName(draft.people, OTHER_HASH)).toEqual({ kind: "unnamed" });
        expect(resolveMemberDisplayName(draft.people, "")).toEqual({ kind: "unnamed" });
        expect(resolveMemberDisplayName({}, PUBKEY_HASH)).toEqual({ kind: "unnamed" });
    });

    it("never surfaces the pubkeyHash as a name (property)", () => {
        const hashArb = fc.string({
            unit: fc.constantFrom(..."0123456789abcdef"),
            minLength: 8,
            maxLength: 64
        });
        const nameArb = fc.oneof(fc.constant(undefined), fc.string());

        fc.assert(
            fc.property(hashArb, nameArb, (pubkeyHash, name) => {
                const people = {
                    "p-1": { id: "p-1", name, linkedUserId: pubkeyHash, deletedAt: undefined }
                };
                const resolved = resolveMemberDisplayName(people, pubkeyHash);
                // A resolved name is the person's own trimmed name, never the hash or a
                // string derived from it.
                return resolved.kind === "unnamed"
                    ? true
                    : resolved.name === name?.trim() && !resolved.name.includes(pubkeyHash);
            })
        );
    });

    it("resolves independently of the vault's own default-person seeding", () => {
        // A vault where the default person was never adopted: nobody is linked, so no
        // member resolves, and in particular the unlinked "Me" is not handed out.
        const draft = makeDraft({ [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } });

        expect(resolveMemberDisplayName(draft.people, PUBKEY_HASH)).toEqual({ kind: "unnamed" });
    });
});

describe("memberDisplayLabel", () => {
    it("uses the resolved name when there is one", () => {
        expect(memberDisplayLabel({ kind: "named", name: "Ben Tefay" })).toBe("Ben Tefay");
    });

    it("uses the readable fallback when there is not", () => {
        expect(memberDisplayLabel({ kind: "unnamed" })).toBe(UNNAMED_MEMBER_LABEL);
    });

    it("never returns an empty or hash-derived label for any resolvable member (property)", () => {
        // The invariant both UR-003 and UR-006 rest on: whatever the people map holds, the one
        // label every surface renders is non-empty and carries no part of the pubkeyHash.
        const hashArb = fc.string({
            unit: fc.constantFrom(..."0123456789abcdef"),
            minLength: 8,
            maxLength: 64
        });
        const nameArb = fc.oneof(fc.constant(undefined), fc.string());

        fc.assert(
            fc.property(hashArb, nameArb, (pubkeyHash, name) => {
                const people = {
                    "p-1": { id: "p-1", name, linkedUserId: pubkeyHash, deletedAt: undefined }
                };
                const label = memberDisplayLabel(resolveMemberDisplayName(people, pubkeyHash));
                return label.length > 0 && !label.includes(pubkeyHash.slice(0, 8));
            })
        );
    });
});
