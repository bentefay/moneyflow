/**
 * Person helpers (HS-012)
 *
 * Auto-linkage of vault members to encrypted CRDT `Person` records, plus a
 * single source of truth for resolving a display name.
 *
 * Design (see D-013):
 * - A `Person` is encrypted financial state; a member is server-authorized
 *   identity. We link them on the member's `pubkeyHash` (stable identity), not
 *   the membership row UUID, so the link is deterministic and survives
 *   membership churn.
 * - Person creation is idempotent and deterministic: the id is derived from the
 *   pubkeyHash, and we never create a second person for a pubkeyHash that is
 *   already linked. This keeps concurrent opens (multiple devices) convergent.
 * - `name` is optional; unnamed auto-created members resolve to a stable
 *   fallback rather than blocking on a name.
 */

import { DEFAULT_PERSON_ID } from "./defaults";
import type { PersonInput } from "./schema";

/** Minimal shape needed to resolve a display name. */
export interface NamedPerson {
    readonly name?: string;
    readonly linkedUserId?: string;
}

/** Minimal shape needed to find the person linked to a vault member. */
export interface LinkedPerson extends NamedPerson {
    readonly deletedAt?: unknown;
}

/**
 * A member's display name, resolved from the person linked to their pubkeyHash.
 *
 * The two cases are kept distinct rather than collapsed into one string because
 * they must be PRESENTED differently: a resolved name is shown as initials, but
 * an unresolved one has no name to take initials from, and falling back to the
 * pubkeyHash is what UR-003 exists to stop. Surfaces destructure on `kind` and
 * therefore cannot accidentally render hash characters as a name.
 */
export type MemberDisplayName =
    | { readonly kind: "named"; readonly name: string }
    | { readonly kind: "unnamed" };

/** Shown wherever a member has no name yet and no hash may be displayed. */
export const UNNAMED_MEMBER_LABEL = "Unnamed member";

/**
 * The person's own name, trimmed, or null when they have none.
 *
 * The single rung shared by {@link resolvePersonDisplayName} and
 * {@link resolveMemberDisplayName}, so the two cannot disagree about what
 * counts as "having a name".
 */
function personOwnName(person: NamedPerson): string | null {
    const trimmed = person.name?.trim();
    return trimmed != null && trimmed.length > 0 ? trimmed : null;
}

/** Draft shape accepted by {@link ensureMemberPerson} (loro-mirror people map). */
export interface PeopleDraft {
    people: Record<string, PersonInput>;
}

/** Fallback shown when a linked member has no name yet. */
export function memberFallbackName(pubkeyHash: string): string {
    return `Member ${pubkeyHash.slice(0, 8)}`;
}

/**
 * Resolve a person's display name with a stable fallback chain:
 * explicit name -> linked-member fallback -> generic "Unnamed".
 */
export function resolvePersonDisplayName(person: NamedPerson): string {
    const ownName = personOwnName(person);
    if (ownName != null) {
        return ownName;
    }
    if (person.linkedUserId != null && person.linkedUserId.length > 0) {
        return memberFallbackName(person.linkedUserId);
    }
    return "Unnamed";
}

/**
 * Resolve a vault member's display name from the people map (UR-003, UR-006).
 *
 * The single lookup shared by the presence avatars and the Vault Settings
 * members list, so the two surfaces cannot drift apart.
 *
 * Matching is on `linkedUserId` rather than on {@link deriveMemberPersonId},
 * because the vault OWNER adopts the seeded default person and so is keyed
 * `person-default-me`, not `person-member-<hash>`. A lookup by derived id would
 * silently miss the owner — the very case UR-003 was reported against.
 *
 * Soft-deleted people are skipped, matching {@link ensureMemberPerson}.
 */
export function resolveMemberDisplayName(
    people: Readonly<Record<string, LinkedPerson | undefined>>,
    pubkeyHash: string
): MemberDisplayName {
    if (pubkeyHash.length === 0) return { kind: "unnamed" };

    for (const person of Object.values(people)) {
        if (person == null || person.deletedAt != null) continue;
        if (person.linkedUserId !== pubkeyHash) continue;
        const ownName = personOwnName(person);
        return ownName != null ? { kind: "named", name: ownName } : { kind: "unnamed" };
    }
    return { kind: "unnamed" };
}

/** Deterministic person id for a member, derived from their pubkeyHash. */
export function deriveMemberPersonId(pubkeyHash: string): string {
    return `person-member-${pubkeyHash}`;
}

export interface EnsureMemberPersonOptions {
    /**
     * When true and no person is linked yet, adopt an existing unlinked default
     * "Me" person instead of creating a new one. Used for the vault owner so the
     * seeded person (and its account ownership) becomes the owner's person on
     * legacy vaults. Invitees never adopt the default person.
     */
    readonly adoptDefaultPerson?: boolean;
}

/**
 * Ensure a `Person` linked to `pubkeyHash` exists in the draft. Idempotent:
 * returns the existing linked person's id without changes when one is present.
 *
 * Allocations and ownerships are never modified here.
 *
 * @returns the id of the linked person, or null if the draft has no people map.
 */
export function ensureMemberPerson(
    draft: PeopleDraft,
    pubkeyHash: string,
    options: EnsureMemberPersonOptions = {}
): string | null {
    if (draft.people == null) return null;

    // 1. Already linked -> no-op (idempotent).
    for (const [id, person] of Object.entries(draft.people)) {
        if (person != null && person.linkedUserId === pubkeyHash && person.deletedAt == null) {
            return id;
        }
    }

    // 2. Owner adopting the seeded, still-unlinked default person.
    if (options.adoptDefaultPerson) {
        const defaultPerson = draft.people[DEFAULT_PERSON_ID];
        if (
            defaultPerson != null &&
            defaultPerson.deletedAt == null &&
            (defaultPerson.linkedUserId == null || defaultPerson.linkedUserId.length === 0)
        ) {
            defaultPerson.linkedUserId = pubkeyHash;
            return DEFAULT_PERSON_ID;
        }
    }

    // 3. Create a new deterministic, unnamed person for this member.
    const personId = deriveMemberPersonId(pubkeyHash);
    draft.people[personId] = {
        id: personId,
        name: undefined,
        linkedUserId: pubkeyHash,
        deletedAt: undefined
    };
    return personId;
}
