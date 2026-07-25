/**
 * SeedPhraseInput credential contract
 *
 * Unlock is a login credential form: exactly one canonical `current-password` field carries the
 * whole phrase for password managers, while the twelve visible word inputs stay the usable UI and
 * must never advertise themselves as password fields (Chromium ignores autocomplete entirely when
 * more than two password fields are present, and Firefox drops forms with more than five).
 *
 * Every phrase literal is the public BIP39 English test vector. No production phrase is used.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SeedPhraseInput } from "@/components/features/identity/SeedPhraseInput";

const PUBLIC_TEST_VECTOR =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

function canonicalField(): HTMLInputElement {
    const field = document.querySelector<HTMLInputElement>(
        '[data-testid="recovery-phrase-credential"]'
    );
    if (!field) throw new Error("canonical credential field is missing");
    return field;
}

function wordInput(index: number): HTMLInputElement {
    const input = document.querySelector<HTMLInputElement>(
        `[data-testid="seed-word-input-${index}"]`
    );
    if (!input) throw new Error(`word input ${index} is missing`);
    return input;
}

function wordInputs(): HTMLInputElement[] {
    return Array.from(
        document.querySelectorAll<HTMLInputElement>('[data-testid^="seed-word-input-"]')
    );
}

describe("SeedPhraseInput canonical credential field", () => {
    it("exposes exactly one password-typed field for the whole phrase", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        const passwordFields = Array.from(
            document.querySelectorAll<HTMLInputElement>('input[type="password"]')
        );

        expect(passwordFields).toHaveLength(1);
        expect(passwordFields[0]).toBe(canonicalField());
    });

    it("marks the canonical field as the current password so managers offer to fill", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        expect(canonicalField()).toHaveAttribute("autocomplete", "current-password");
    });

    it("carries a stable non-secret account identifier alongside the credential", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        const identifiers = Array.from(
            document.querySelectorAll<HTMLInputElement>('input[autocomplete="username"]')
        );

        expect(identifiers).toHaveLength(1);
        expect(identifiers[0].value).toBeTruthy();
        expect(identifiers[0].type).not.toBe("password");
    });

    it("suppresses mobile keyboard transforms on the canonical field", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        const field = canonicalField();
        expect(field).toHaveAttribute("autocapitalize", "none");
        expect(field).toHaveAttribute("autocorrect", "off");
        expect(field).toHaveAttribute("spellcheck", "false");
    });

    it("gives the canonical field an accessible name", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        const field = canonicalField();
        const labelledBy =
            field.getAttribute("aria-label") ?? field.getAttribute("aria-labelledby");

        expect(labelledBy).toBeTruthy();
    });

    it("keeps the canonical field rendered rather than type=hidden or display:none", () => {
        // A `type="hidden"` or `display:none` field is not a fill target in Chromium or WebKit.
        render(<SeedPhraseInput autoFocus={false} />);

        const field = canonicalField();
        expect(field.type).toBe("password");
        expect(field.style.display).not.toBe("none");
        expect(field.hidden).toBe(false);
    });
});

describe("SeedPhraseInput word inputs stay non-credential", () => {
    it("renders twelve word inputs", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        expect(wordInputs()).toHaveLength(12);
    });

    it("never types a word input as a password", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        for (const input of wordInputs()) {
            expect(input.type).toBe("text");
        }
    });

    it("never attaches password autocomplete tokens to the word inputs", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        for (const input of wordInputs()) {
            expect(input.getAttribute("autocomplete")).toBe("off");
        }
    });

    it("opts the word inputs out of third-party manager heuristics", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        for (const input of wordInputs()) {
            expect(input).toHaveAttribute("data-1p-ignore");
            expect(input).toHaveAttribute("data-bwignore");
            expect(input).toHaveAttribute("data-lpignore", "true");
        }
    });

    it("labels each word slot by position for screen readers", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        expect(screen.getByRole("textbox", { name: /word 1\b/i })).toBe(wordInput(0));
        expect(screen.getByRole("textbox", { name: /word 12\b/i })).toBe(wordInput(11));
    });
});

describe("SeedPhraseInput synchronizes the canonical field with the word grid", () => {
    it("distributes a manager fill of the canonical field across all twelve inputs", () => {
        const onChange = vi.fn();
        render(<SeedPhraseInput autoFocus={false} onChange={onChange} />);

        fireEvent.change(canonicalField(), { target: { value: PUBLIC_TEST_VECTOR } });

        for (let index = 0; index < 11; index++) {
            expect(wordInput(index)).toHaveValue("abandon");
        }
        expect(wordInput(11)).toHaveValue("about");
        expect(onChange).toHaveBeenCalledWith(PUBLIC_TEST_VECTOR);
    });

    it("reports completion when a manager fills a valid phrase in one shot", () => {
        const onComplete = vi.fn();
        render(<SeedPhraseInput autoFocus={false} onComplete={onComplete} />);

        fireEvent.change(canonicalField(), { target: { value: PUBLIC_TEST_VECTOR } });

        expect(onComplete).toHaveBeenCalledWith(PUBLIC_TEST_VECTOR);
    });

    it("normalizes the whitespace and case a manager may supply", () => {
        const onChange = vi.fn();
        render(<SeedPhraseInput autoFocus={false} onChange={onChange} />);

        fireEvent.change(canonicalField(), {
            target: { value: `  ${PUBLIC_TEST_VECTOR.toUpperCase()}  ` }
        });

        expect(onChange).toHaveBeenLastCalledWith(PUBLIC_TEST_VECTOR);
        expect(wordInput(0)).toHaveValue("abandon");
    });

    it("mirrors per-word typing back into the canonical field so a save prompt sees the phrase", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        fireEvent.change(wordInput(0), { target: { value: "abandon" } });
        fireEvent.change(wordInput(1), { target: { value: "about" } });

        expect(canonicalField()).toHaveValue("abandon about");
    });

    it("mirrors a multi-word paste into the canonical field", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        fireEvent.paste(wordInput(0), {
            clipboardData: { getData: () => PUBLIC_TEST_VECTOR }
        });

        expect(canonicalField()).toHaveValue(PUBLIC_TEST_VECTOR);
        expect(wordInput(11)).toHaveValue("about");
    });

    it("keeps the canonical field in step when a word is cleared", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        fireEvent.change(canonicalField(), { target: { value: PUBLIC_TEST_VECTOR } });
        fireEvent.change(wordInput(11), { target: { value: "" } });

        expect(canonicalField()).toHaveValue(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon"
        );
    });

    it("adopts a value already present in the credential field when it mounts", () => {
        // Stands in for a browser or manager autofill that landed before React hydrated: the field
        // holds a value that no React change event ever reported. Covered end to end, against real
        // hydration timing, by the unlock autofill journey in tests/e2e/identity.spec.ts.
        const onChange = vi.fn();
        render(
            <SeedPhraseInput autoFocus={false} value={PUBLIC_TEST_VECTOR} onChange={onChange} />
        );

        expect(canonicalField()).toHaveValue(PUBLIC_TEST_VECTOR);
        expect(wordInput(0)).toHaveValue("abandon");
        expect(wordInput(11)).toHaveValue("about");
    });

    it("follows a controlled value change into both representations", () => {
        const { rerender } = render(<SeedPhraseInput autoFocus={false} value="" />);

        rerender(<SeedPhraseInput autoFocus={false} value={PUBLIC_TEST_VECTOR} />);

        expect(canonicalField()).toHaveValue(PUBLIC_TEST_VECTOR);
        expect(wordInput(11)).toHaveValue("about");
    });
});

describe("SeedPhraseInput validation is preserved through the canonical field", () => {
    it("does not report completion for an invalid phrase filled canonically", () => {
        const onComplete = vi.fn();
        const onChange = vi.fn();
        render(<SeedPhraseInput autoFocus={false} onChange={onChange} onComplete={onComplete} />);

        const invalid = PUBLIC_TEST_VECTOR.replace(/about$/, "abandon");
        fireEvent.change(canonicalField(), { target: { value: invalid } });

        expect(onChange).toHaveBeenCalledWith(invalid);
        expect(onComplete).not.toHaveBeenCalled();
    });

    it("reports a checksum-failing phrase of twelve real words as invalid", () => {
        // Every word is in the BIP39 wordlist but the checksum does not hold. A corrupted manager
        // fill must not be presented to the user as a valid phrase.
        render(<SeedPhraseInput autoFocus={false} />);

        fireEvent.change(canonicalField(), {
            target: { value: PUBLIC_TEST_VECTOR.replace(/about$/, "abandon") }
        });

        expect(screen.getByText(/invalid phrase/i)).toBeInTheDocument();
        expect(screen.queryByText(/valid recovery phrase/i)).not.toBeInTheDocument();
    });

    it("does not silently repair a non-wordlist word arriving from a manager", () => {
        const onChange = vi.fn();
        render(<SeedPhraseInput autoFocus={false} onChange={onChange} />);

        const invalid = PUBLIC_TEST_VECTOR.replace(/about$/, "notaword");
        fireEvent.change(canonicalField(), { target: { value: invalid } });

        expect(wordInput(11)).toHaveValue("notaword");
        expect(onChange).toHaveBeenCalledWith(invalid);
        expect(screen.getByText(/invalid phrase/i)).toBeInTheDocument();
    });

    it("still shows the valid indicator for a canonical fill of a valid phrase", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        fireEvent.change(canonicalField(), { target: { value: PUBLIC_TEST_VECTOR } });

        expect(screen.getByText(/valid recovery phrase/i)).toBeInTheDocument();
    });

    it("keeps the progress counter accurate after a canonical fill", () => {
        render(<SeedPhraseInput autoFocus={false} />);

        fireEvent.change(canonicalField(), { target: { value: "abandon about" } });

        expect(screen.getByText(/2 of 12 words entered/i)).toBeInTheDocument();
    });
});
