/**
 * UR-003: presence avatars show member name initials, never pubkeyHash characters.
 *
 * The reported defect was an avatar labelled "AD" with a raw hash tooltip: the first two hex
 * characters of the member's pubkeyHash, because no display name was ever supplied. These tests
 * assert behaviour at the render boundary — what a member actually sees — for both the vault OWNER
 * path and the INVITED MEMBER path, and pin the hash fallback as unreachable from the avatar.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PresenceAvatar } from "@/components/features/presence/PresenceAvatar";
import { PresenceAvatarGroup } from "@/components/features/presence/PresenceAvatarGroup";
import { DEFAULT_PERSON, DEFAULT_PERSON_ID } from "@/lib/crdt/defaults";
import {
    ensureMemberPerson,
    type PeopleDraft,
    resolveMemberDisplayName,
    UNNAMED_MEMBER_LABEL
} from "@/lib/crdt/person";
import { getInitials } from "@/lib/utils/color";

/** Synthetic, non-secret pubkey hashes. A pubkey hash is public material in any case. */
const OWNER_HASH = "ad3f2a9b1c".padEnd(64, "0");
const MEMBER_HASH = "bd7e4c1a55".padEnd(64, "1");

/** Builds a vault where the owner has adopted the seeded "Me" person. */
function vaultWithOwner(): PeopleDraft {
    const draft: PeopleDraft = { people: { [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } } };
    ensureMemberPerson(draft, OWNER_HASH, { adoptDefaultPerson: true });
    return draft;
}

describe("PresenceAvatar", () => {
    it("shows initials of the OWNER's name, not their pubkeyHash", () => {
        const draft = vaultWithOwner();
        render(
            <PresenceAvatar
                userId={OWNER_HASH}
                displayName={resolveMemberDisplayName(draft.people, OWNER_HASH)}
                isOnline
            />
        );

        // The seeded owner person is named "Me", so initials are "M".
        const avatar = screen.getByRole("img", { name: "Me" });
        expect(avatar).toHaveTextContent("M");
        // The defect: the first two hex characters of the hash.
        expect(avatar).not.toHaveTextContent("AD");
    });

    it("shows both initials of a two-word name", () => {
        const draft = vaultWithOwner();
        const owner = draft.people[DEFAULT_PERSON_ID];
        if (owner == null) throw new Error("expected the owner person");
        owner.name = "Ben Tefay";

        render(
            <PresenceAvatar
                userId={OWNER_HASH}
                displayName={resolveMemberDisplayName(draft.people, OWNER_HASH)}
            />
        );

        expect(screen.getByRole("img", { name: "Ben Tefay" })).toHaveTextContent("BT");
    });

    it("shows no initials at all for an INVITED MEMBER who has no name yet", () => {
        const draft = vaultWithOwner();
        ensureMemberPerson(draft, MEMBER_HASH);

        render(
            <PresenceAvatar
                userId={MEMBER_HASH}
                displayName={resolveMemberDisplayName(draft.people, MEMBER_HASH)}
            />
        );

        const avatar = screen.getByRole("img", { name: UNNAMED_MEMBER_LABEL });
        // A person icon, so no text is rendered — in particular no hash characters and no
        // "M3" derived from the "Member <hash>" fallback.
        expect(avatar).toHaveTextContent("");
        expect(avatar.querySelector("svg")).not.toBeNull();
    });

    it("never renders any part of the pubkeyHash, named or unnamed", () => {
        const draft = vaultWithOwner();
        ensureMemberPerson(draft, MEMBER_HASH);

        for (const hash of [OWNER_HASH, MEMBER_HASH]) {
            const { container, unmount } = render(
                <PresenceAvatar
                    userId={hash}
                    displayName={resolveMemberDisplayName(draft.people, hash)}
                    isOnline
                />
            );

            const rendered = container.textContent ?? "";
            expect(rendered).not.toContain(hash);
            expect(rendered.toLowerCase()).not.toContain(hash.slice(0, 4));
            // Tooltip and accessible name agree and are never a hash either.
            const tooltip = container.querySelector("[title]")?.getAttribute("title") ?? "";
            expect(tooltip).not.toContain(hash);
            expect(tooltip).not.toContain(hash.slice(0, 8));
            unmount();
        }
    });

    it("tooltip carries the resolved name and the online state", () => {
        const draft = vaultWithOwner();
        const { container } = render(
            <PresenceAvatar
                userId={OWNER_HASH}
                displayName={resolveMemberDisplayName(draft.people, OWNER_HASH)}
                isOnline
            />
        );

        expect(container.querySelector("[title]")?.getAttribute("title")).toBe("Me (online)");
    });

    it("tooltip of an unnamed member is human-readable, not a hash", () => {
        const draft = vaultWithOwner();
        ensureMemberPerson(draft, MEMBER_HASH);

        const { container } = render(
            <PresenceAvatar
                userId={MEMBER_HASH}
                displayName={resolveMemberDisplayName(draft.people, MEMBER_HASH)}
            />
        );

        expect(container.querySelector("[title]")?.getAttribute("title")).toBe(
            UNNAMED_MEMBER_LABEL
        );
    });

    it("keeps colour keyed on the userId so it survives a rename", () => {
        const draft = vaultWithOwner();
        const readColour = (name: string): string | undefined => {
            const owner = draft.people[DEFAULT_PERSON_ID];
            if (owner == null) throw new Error("expected the owner person");
            owner.name = name;
            const { container, unmount } = render(
                <PresenceAvatar
                    userId={OWNER_HASH}
                    displayName={resolveMemberDisplayName(draft.people, OWNER_HASH)}
                />
            );
            const style =
                container.querySelector<HTMLElement>("[style*='background']")?.style
                    .backgroundColor;
            unmount();
            return style;
        };

        expect(readColour("Ben Tefay")).toBe(readColour("Someone Else"));
    });

    it("gives two unnamed members distinct colours", () => {
        const draft: PeopleDraft = { people: {} };
        ensureMemberPerson(draft, OWNER_HASH);
        ensureMemberPerson(draft, MEMBER_HASH);

        const colours = [OWNER_HASH, MEMBER_HASH].map((hash) => {
            const { container, unmount } = render(
                <PresenceAvatar
                    userId={hash}
                    displayName={resolveMemberDisplayName(draft.people, hash)}
                />
            );
            const colour =
                container.querySelector<HTMLElement>("[style*='background']")?.style
                    .backgroundColor;
            unmount();
            return colour;
        });

        expect(colours[0]).not.toBe(colours[1]);
    });
});

describe("PresenceAvatarGroup", () => {
    it("labels each avatar by its own resolved name", () => {
        const draft = vaultWithOwner();
        const invitedId = ensureMemberPerson(draft, MEMBER_HASH);
        const invited = draft.people[invitedId ?? ""];
        if (invited == null) throw new Error("expected the invited person");
        invited.name = "Ben Tefay";

        render(
            <PresenceAvatarGroup
                users={[OWNER_HASH, MEMBER_HASH].map((userId) => ({
                    userId,
                    displayName: resolveMemberDisplayName(draft.people, userId),
                    isOnline: true
                }))}
            />
        );

        expect(screen.getByRole("img", { name: "Me" })).toHaveTextContent("M");
        expect(screen.getByRole("img", { name: "Ben Tefay" })).toHaveTextContent("BT");
    });

    it("renders a mixed named and unnamed group without exposing hashes", () => {
        const draft = vaultWithOwner();
        ensureMemberPerson(draft, MEMBER_HASH);

        const { container } = render(
            <PresenceAvatarGroup
                users={[OWNER_HASH, MEMBER_HASH].map((userId) => ({
                    userId,
                    displayName: resolveMemberDisplayName(draft.people, userId),
                    isOnline: true
                }))}
            />
        );

        expect(screen.getByRole("img", { name: "Me" })).toBeInTheDocument();
        expect(screen.getByRole("img", { name: UNNAMED_MEMBER_LABEL })).toBeInTheDocument();
        expect(container.textContent ?? "").not.toContain(MEMBER_HASH.slice(0, 4));
    });
});

describe("getInitials remains the shared derivation", () => {
    it("derives initials from names, unchanged by UR-003", () => {
        expect(getInitials("Me")).toBe("M");
        expect(getInitials("Ben Tefay")).toBe("BT");
    });

    it("still has a hash branch, which the avatar no longer reaches", () => {
        // The branch stays as a last-resort for other callers; UR-003's fix is that the
        // avatar is never handed a hash in the first place.
        expect(getInitials(OWNER_HASH)).toBe("AD");
    });
});
