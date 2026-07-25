/**
 * SeedPhraseDisplay credential contract
 *
 * Vault creation must present the generated phrase as a savable credential: one canonical
 * `new-password` field plus one non-secret account identifier, inside a real form with a submit
 * control, while the readable numbered 12-word grid stays exactly as it was.
 *
 * Every phrase literal is the public BIP39 English test vector. No production phrase is used.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SeedPhraseDisplay } from "@/components/features/identity/SeedPhraseDisplay";

const PUBLIC_TEST_VECTOR =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

function canonicalField(): HTMLInputElement {
    const field = document.querySelector<HTMLInputElement>(
        '[data-testid="recovery-phrase-credential"]'
    );
    if (!field) throw new Error("canonical credential field is missing");
    return field;
}

describe("SeedPhraseDisplay canonical credential field", () => {
    it("exposes exactly one password-typed field carrying the generated phrase", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        const passwordFields = Array.from(
            document.querySelectorAll<HTMLInputElement>('input[type="password"]')
        );

        expect(passwordFields).toHaveLength(1);
        expect(passwordFields[0].value).toBe(PUBLIC_TEST_VECTOR);
    });

    it("marks the credential as a new password so managers offer to save it", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        expect(canonicalField()).toHaveAttribute("autocomplete", "new-password");
    });

    it("carries exactly one stable non-secret account identifier", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        const identifiers = Array.from(
            document.querySelectorAll<HTMLInputElement>('input[autocomplete="username"]')
        );

        expect(identifiers).toHaveLength(1);
        expect(identifiers[0].value).toBeTruthy();
        expect(identifiers[0].value).not.toContain("abandon");
    });

    it("keeps the credential rendered rather than type=hidden or display:none", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        const field = canonicalField();
        expect(field.type).toBe("password");
        expect(field.style.display).not.toBe("none");
        expect(field.hidden).toBe(false);
    });

    it("suppresses mobile keyboard transforms on the credential", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        const field = canonicalField();
        expect(field).toHaveAttribute("autocapitalize", "none");
        expect(field).toHaveAttribute("autocorrect", "off");
        expect(field).toHaveAttribute("spellcheck", "false");
    });

    it("gives the credential an accessible name", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        const field = canonicalField();
        const name = field.getAttribute("aria-label") ?? field.getAttribute("aria-labelledby");

        expect(name).toBeTruthy();
    });

    it("is not readonly, which would drop it from Chromium's password-candidate parse", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        expect(canonicalField().readOnly).toBe(false);
        expect(canonicalField().disabled).toBe(false);
    });

    it("cannot diverge from the displayed phrase even if the field is written to", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        fireEvent.change(canonicalField(), { target: { value: "abandon about" } });

        expect(canonicalField().value).toBe(PUBLIC_TEST_VECTOR);
    });

    it("tracks the mnemonic when it changes", () => {
        const { rerender } = render(<SeedPhraseDisplay mnemonic="abandon about" />);
        expect(canonicalField().value).toBe("abandon about");

        rerender(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);
        expect(canonicalField().value).toBe(PUBLIC_TEST_VECTOR);
    });
});

describe("SeedPhraseDisplay existing presentation is preserved", () => {
    it("still renders the twelve numbered word cells", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        expect(screen.getAllByTestId("seed-phrase-word")).toHaveLength(12);
    });

    it("still masks the words when not revealed while the credential keeps the real value", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} initiallyRevealed={false} />);

        expect(screen.queryByText("about")).not.toBeInTheDocument();
        expect(canonicalField().value).toBe(PUBLIC_TEST_VECTOR);
    });

    it("still offers the copy and reveal controls and the security warning", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} initiallyRevealed={false} />);

        expect(screen.getByTestId("copy-button")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /click to reveal/i })).toBeInTheDocument();
        expect(screen.getByText(/save your recovery phrase/i)).toBeInTheDocument();
    });

    it("never routes the phrase through a URL-bearing attribute", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        for (const element of Array.from(document.querySelectorAll("*"))) {
            for (const attribute of ["href", "src", "action", "formaction", "data-testid"]) {
                expect(element.getAttribute(attribute) ?? "").not.toContain("abandon");
            }
        }
    });

    it("never places the phrase in a name or id that would be submitted or logged as a key", () => {
        render(<SeedPhraseDisplay mnemonic={PUBLIC_TEST_VECTOR} />);

        for (const element of Array.from(document.querySelectorAll("input"))) {
            expect(element.name).not.toContain("abandon");
            expect(element.id).not.toContain("abandon");
        }
    });
});
