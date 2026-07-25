/**
 * Recovery-phrase credential helpers
 *
 * The canonical credential field carries the whole phrase as one string while the visible UI keeps
 * twelve word slots. These pure helpers are the only bridge between the two representations, so
 * they are pinned here independently of React.
 *
 * Every literal phrase below is the public BIP39 English test vector
 * ("abandon" x11 + "about"). No generated production phrase is ever committed.
 */

import { describe, expect, it } from "vitest";

import {
    joinWordSlotsIntoPhrase,
    RECOVERY_PHRASE_ACCOUNT_NAME,
    splitPhraseIntoWordSlots,
    WORD_SLOT_COUNT
} from "@/components/features/identity/recoveryPhraseCredential";

const PUBLIC_TEST_VECTOR =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("splitPhraseIntoWordSlots", () => {
    it("always produces exactly twelve slots", () => {
        expect(splitPhraseIntoWordSlots("")).toHaveLength(WORD_SLOT_COUNT);
        expect(splitPhraseIntoWordSlots("abandon")).toHaveLength(WORD_SLOT_COUNT);
        expect(splitPhraseIntoWordSlots(PUBLIC_TEST_VECTOR)).toHaveLength(WORD_SLOT_COUNT);
    });

    it("distributes a whole pasted or manager-filled phrase across the slots in order", () => {
        expect(splitPhraseIntoWordSlots(PUBLIC_TEST_VECTOR)).toEqual([
            "abandon",
            "abandon",
            "abandon",
            "abandon",
            "abandon",
            "abandon",
            "abandon",
            "abandon",
            "abandon",
            "abandon",
            "abandon",
            "about"
        ]);
    });

    it("pads the unused tail with empty slots", () => {
        expect(splitPhraseIntoWordSlots("abandon about")).toEqual([
            "abandon",
            "about",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        ]);
    });

    it("collapses the whitespace a password manager or clipboard may introduce", () => {
        const noisy = "  abandon\n\tabandon   about  ";

        expect(splitPhraseIntoWordSlots(noisy).slice(0, 3)).toEqual([
            "abandon",
            "abandon",
            "about"
        ]);
    });

    it("lowercases words the same way the existing per-word entry does", () => {
        expect(splitPhraseIntoWordSlots("ABANDON About").slice(0, 2)).toEqual(["abandon", "about"]);
    });

    it("keeps non-wordlist input verbatim so an invalid secret is never silently corrected", () => {
        expect(splitPhraseIntoWordSlots("abandonn zzzz").slice(0, 2)).toEqual(["abandonn", "zzzz"]);
    });

    it("never overflows the grid when more than twelve words arrive", () => {
        const thirteen = `${PUBLIC_TEST_VECTOR} about`;
        const slots = splitPhraseIntoWordSlots(thirteen);

        expect(slots).toHaveLength(WORD_SLOT_COUNT);
        expect(slots[11]).toBe("about");
    });
});

describe("joinWordSlotsIntoPhrase", () => {
    it("round-trips a complete phrase byte-for-byte", () => {
        expect(joinWordSlotsIntoPhrase(splitPhraseIntoWordSlots(PUBLIC_TEST_VECTOR))).toBe(
            PUBLIC_TEST_VECTOR
        );
    });

    it("emits an empty string when no slot is filled", () => {
        expect(joinWordSlotsIntoPhrase(splitPhraseIntoWordSlots(""))).toBe("");
    });

    it("does not leak padding whitespace from unfilled slots", () => {
        expect(joinWordSlotsIntoPhrase(splitPhraseIntoWordSlots("abandon about"))).toBe(
            "abandon about"
        );
    });

    it("collapses gaps left by a partially filled grid", () => {
        const slots = splitPhraseIntoWordSlots("");
        const withGap = [...slots];
        withGap[0] = "abandon";
        withGap[2] = "about";

        expect(joinWordSlotsIntoPhrase(withGap)).toBe("abandon about");
    });
});

describe("RECOVERY_PHRASE_ACCOUNT_NAME", () => {
    it("is a stable non-secret identifier so save and fill match the same credential", () => {
        expect(RECOVERY_PHRASE_ACCOUNT_NAME).toBeTruthy();
        expect(RECOVERY_PHRASE_ACCOUNT_NAME.trim()).toBe(RECOVERY_PHRASE_ACCOUNT_NAME);
    });

    it("contains no wordlist-derived material", () => {
        expect(RECOVERY_PHRASE_ACCOUNT_NAME).not.toContain("abandon");
    });
});
