/**
 * UR-006: the Vault Settings members list identifies each member by name, never by a raw hash.
 *
 * The reported defect was a roster labelled `3f2a9b1c…4d5e` — a truncated pubkeyHash — because the
 * membership roster is server-authorized identity while names live in encrypted vault state, and
 * the two were never joined. These tests assert at the render boundary, on both the visible label
 * and the accessible name, which the frozen text requires to follow the same rule.
 *
 * Every hash here is synthetic. A pubkeyHash is public material in any case, and no key, seed or
 * recovery material appears in this file.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    members: vi.fn(),
    people: vi.fn(),
    sessionPubkeyHash: vi.fn()
}));

vi.mock("@/lib/trpc/client", () => ({
    trpc: {
        useUtils: () => ({
            membership: { list: { invalidate: vi.fn() } },
            invite: { list: { invalidate: vi.fn() } }
        }),
        membership: {
            list: {
                useQuery: () => ({
                    data: { members: mocks.members() },
                    isLoading: false,
                    isError: false
                })
            },
            remove: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }
        },
        invite: {
            list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
            revoke: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }
        }
    }
}));

vi.mock("@/hooks/use-vault-access", () => ({
    useVaultAccess: () => ({
        vaultId: "vault-1",
        role: "owner",
        isOwner: true,
        vaultKey: undefined,
        encSecretKey: undefined,
        isLoading: false
    })
}));

// The people map is the join's other half. Mocking the selector rather than the resolution keeps
// the REAL `resolveMemberDisplayName` under test — a mocked resolver would pass even if the
// component stopped joining at all.
vi.mock("@/lib/crdt/context", () => ({
    usePeople: () => mocks.people()
}));

vi.mock("@/lib/crypto/session", () => ({
    getSessionPubkeyHash: () => mocks.sessionPubkeyHash()
}));

import { AccessMembersSection } from "@/components/features/vault/AccessMembersSection";
import { DEFAULT_PERSON, DEFAULT_PERSON_ID } from "@/lib/crdt/defaults";
import { ensureMemberPerson, type PeopleDraft, UNNAMED_MEMBER_LABEL } from "@/lib/crdt/person";

/** Synthetic, non-secret pubkey hashes. */
const OWNER_HASH = "3f2a9b1c4d".padEnd(64, "5");
const MEMBER_HASH = "7e8d0a2b6c".padEnd(64, "9");

/** The truncation the defect rendered, rebuilt here so the tests pin the exact reported string. */
function reportedTruncation(pubkeyHash: string): string {
    return `${pubkeyHash.slice(0, 8)}…${pubkeyHash.slice(-4)}`;
}

/** A vault where the owner has adopted the seeded "Me" person, built by the production function. */
function vaultWithOwner(): PeopleDraft {
    const draft: PeopleDraft = { people: { [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } } };
    ensureMemberPerson(draft, OWNER_HASH, { adoptDefaultPerson: true });
    return draft;
}

function renderRoster(
    draft: PeopleDraft,
    members: ReadonlyArray<{ pubkeyHash: string; role: string }>
): void {
    mocks.people.mockReturnValue(draft.people);
    mocks.members.mockReturnValue(members);
    mocks.sessionPubkeyHash.mockReturnValue(OWNER_HASH);
    render(<AccessMembersSection />);
}

describe("AccessMembersSection member identification", () => {
    it("labels the OWNER by their name, not by a truncated pubkeyHash", () => {
        renderRoster(vaultWithOwner(), [{ pubkeyHash: OWNER_HASH, role: "owner" }]);

        // The seeded owner person is named "Me".
        expect(screen.getByText("Me")).toBeInTheDocument();
        // The exact string the principal reported seeing.
        expect(screen.queryByText(reportedTruncation(OWNER_HASH))).not.toBeInTheDocument();
    });

    it("labels a NAMED member by their name", () => {
        const draft = vaultWithOwner();
        const personId = ensureMemberPerson(draft, MEMBER_HASH);
        if (personId == null) throw new Error("expected the member person to be created");
        const person = draft.people[personId];
        if (person == null) throw new Error("expected the member person");
        person.name = "Ben Tefay";

        renderRoster(draft, [
            { pubkeyHash: OWNER_HASH, role: "owner" },
            { pubkeyHash: MEMBER_HASH, role: "member" }
        ]);

        expect(screen.getByText("Ben Tefay")).toBeInTheDocument();
    });

    it("shows a human-readable fallback for a member with NO name, never a bare hash", () => {
        const draft = vaultWithOwner();
        ensureMemberPerson(draft, MEMBER_HASH);

        renderRoster(draft, [
            { pubkeyHash: OWNER_HASH, role: "owner" },
            { pubkeyHash: MEMBER_HASH, role: "member" }
        ]);

        expect(screen.getByText(UNNAMED_MEMBER_LABEL)).toBeInTheDocument();
        expect(screen.queryByText(reportedTruncation(MEMBER_HASH))).not.toBeInTheDocument();
    });

    it("falls back readably for a member with NO linked person at all", () => {
        // A membership row can exist before the member has ever opened the vault, so no person is
        // linked yet. That is the case with no name to resolve and the strongest pull towards
        // rendering the hash.
        renderRoster(vaultWithOwner(), [
            { pubkeyHash: OWNER_HASH, role: "owner" },
            { pubkeyHash: MEMBER_HASH, role: "member" }
        ]);

        expect(screen.getByText(UNNAMED_MEMBER_LABEL)).toBeInTheDocument();
    });

    it("gives the remove control an accessible name following the SAME rule as the visible label", () => {
        const draft = vaultWithOwner();
        const personId = ensureMemberPerson(draft, MEMBER_HASH);
        if (personId == null) throw new Error("expected the member person to be created");
        const person = draft.people[personId];
        if (person == null) throw new Error("expected the member person");
        person.name = "Ben Tefay";

        renderRoster(draft, [
            { pubkeyHash: OWNER_HASH, role: "owner" },
            { pubkeyHash: MEMBER_HASH, role: "member" }
        ]);

        // The frozen text requires the accessible name to follow the visible label's rule; at BASE
        // this read "Remove member 7e8d0a2b…9999".
        expect(screen.getByRole("button", { name: "Remove member Ben Tefay" })).toBeInTheDocument();
    });

    it("renders NO part of any member's pubkeyHash, in text or in any accessible name", () => {
        const draft = vaultWithOwner();
        ensureMemberPerson(draft, MEMBER_HASH);

        renderRoster(draft, [
            { pubkeyHash: OWNER_HASH, role: "owner" },
            { pubkeyHash: MEMBER_HASH, role: "member" }
        ]);

        // Structural rather than copy-dependent: whatever the labels say, no rendered text and no
        // accessible name may carry hash characters. This survives any wording change.
        const rendered = document.body.textContent ?? "";
        const accessibleNames = Array.from(document.querySelectorAll("[aria-label]"))
            .map((element) => element.getAttribute("aria-label") ?? "")
            .join(" ");

        for (const hash of [OWNER_HASH, MEMBER_HASH]) {
            const prefix = hash.slice(0, 8);
            expect(rendered).not.toContain(prefix);
            expect(rendered).not.toContain(hash);
            expect(accessibleNames).not.toContain(prefix);
            expect(accessibleNames).not.toContain(hash);
        }
    });
});
