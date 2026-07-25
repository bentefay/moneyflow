/**
 * PasskeyBackupPhrase step
 *
 * Review-01 B-1: a passkey-only vault whose recovery phrase was never shown has exactly one
 * unlock factor, and the phrase cannot be reconstructed afterwards - BIP39 derivation is one-way
 * from the stored seed. So the phrase must be shown, and acknowledged, while it is still in
 * memory during creation.
 *
 * Every phrase literal here is the public BIP39 English test vector. No production phrase is used.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PasskeyBackupPhrase } from "@/components/features/identity/PasskeyBackupPhrase";

const PUBLIC_TEST_VECTOR =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("PasskeyBackupPhrase", () => {
    it("shows the phrase that was generated for the passkey-only vault", () => {
        render(<PasskeyBackupPhrase mnemonic={PUBLIC_TEST_VECTOR} onContinue={vi.fn()} />);

        expect(screen.getByTestId("passkey-backup-phrase")).toBeInTheDocument();
        expect(screen.getAllByTestId("seed-phrase-word")).toHaveLength(12);
    });

    it("will not let the user leave until they acknowledge saving it", () => {
        const onContinue = vi.fn();

        render(<PasskeyBackupPhrase mnemonic={PUBLIC_TEST_VECTOR} onContinue={onContinue} />);

        const continueButton = screen.getByTestId("passkey-phrase-continue-button");
        expect(continueButton).toBeDisabled();

        fireEvent.click(screen.getByTestId("passkey-phrase-confirm-checkbox"));

        expect(continueButton).toBeEnabled();
        fireEvent.click(continueButton);
        expect(onContinue).toHaveBeenCalledOnce();
    });

    it("explains that this phrase is the only way back in without the passkey", () => {
        render(<PasskeyBackupPhrase mnemonic={PUBLIC_TEST_VECTOR} onContinue={vi.fn()} />);

        // The user chose the passkey branch precisely to avoid a phrase, so the reason they are
        // being handed one anyway has to be on screen.
        expect(screen.getByTestId("passkey-phrase-rationale")).toBeInTheDocument();
    });
});
