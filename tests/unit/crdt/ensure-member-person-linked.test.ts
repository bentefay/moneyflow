/**
 * Tests for `ensureMemberPersonLinked` (HS-012).
 *
 * This is the document-level wrapper that applies the idempotent member->person
 * linkage to a live Loro doc and reports whether the doc actually changed, so
 * callers only persist/sync when there is a real mutation. Assertions read the
 * doc directly (as production does after linkage) rather than a long-lived
 * mirror, which can go stale after an external mirror mutates the same doc.
 */

import type { LoroDoc } from "loro-crdt";
import { describe, expect, it } from "vitest";

import { DEFAULT_PERSON_ID, getDefaultVaultState } from "@/lib/crdt/defaults";
import { createVaultMirror, ensureMemberPersonLinked } from "@/lib/crdt/mirror";
import { deriveMemberPersonId } from "@/lib/crdt/person";

const OWNER_HASH = "c".repeat(64);
const INVITEE_HASH = "d".repeat(64);

interface PersonJson {
    linkedUserId?: string;
    name?: string;
}

/**
 * Seed a doc with the real default vault state (including the seeded "Me"
 * person) and return it with the seeding mirror disposed, mirroring a vault
 * that already exists before linkage runs.
 */
function seededDoc(): LoroDoc {
    const { mirror, doc } = createVaultMirror();
    mirror.setState(() => getDefaultVaultState());
    mirror.dispose();
    return doc;
}

function readPerson(doc: LoroDoc, personId: string): PersonJson | undefined {
    const people = doc.getMap("people").toJSON() as Record<string, PersonJson>;
    return people[personId];
}

describe("ensureMemberPersonLinked", () => {
    it("owner adoption links the seeded default person and reports a change", () => {
        const doc = seededDoc();
        const changed = ensureMemberPersonLinked(doc, OWNER_HASH, true);

        expect(changed).toBe(true);
        expect(readPerson(doc, DEFAULT_PERSON_ID)?.linkedUserId).toBe(OWNER_HASH);
    });

    it("is idempotent: a second call reports no change", () => {
        const doc = seededDoc();
        expect(ensureMemberPersonLinked(doc, OWNER_HASH, true)).toBe(true);
        expect(ensureMemberPersonLinked(doc, OWNER_HASH, true)).toBe(false);
    });

    it("invitee gets a new deterministic person and reports a change", () => {
        const doc = seededDoc();
        const changed = ensureMemberPersonLinked(doc, INVITEE_HASH, false);

        expect(changed).toBe(true);
        expect(readPerson(doc, deriveMemberPersonId(INVITEE_HASH))?.linkedUserId).toBe(
            INVITEE_HASH
        );
        // The default person is untouched for a non-adopting invitee.
        expect(readPerson(doc, DEFAULT_PERSON_ID)?.linkedUserId ?? undefined).toBeUndefined();
    });

    it("owner then invitee produces two distinct linked persons", () => {
        const doc = seededDoc();
        ensureMemberPersonLinked(doc, OWNER_HASH, true);
        ensureMemberPersonLinked(doc, INVITEE_HASH, false);

        expect(readPerson(doc, DEFAULT_PERSON_ID)?.linkedUserId).toBe(OWNER_HASH);
        expect(readPerson(doc, deriveMemberPersonId(INVITEE_HASH))?.linkedUserId).toBe(
            INVITEE_HASH
        );
    });
});
