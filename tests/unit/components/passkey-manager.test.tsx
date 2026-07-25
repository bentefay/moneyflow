/**
 * PasskeyManager last-credential revocation guard
 *
 * Review-01 B-2: revoking the sole credential destroys the only wrapped secret, and at BASE that
 * was gated behind changed prompt text alone. For a passkey-only vault those two clicks are
 * permanent data loss.
 *
 * The gate must demand the recovery phrase AND check that the phrase derives THIS identity - a
 * validity-only check is bypassable with any public test vector, which is what these tests pin.
 *
 * Every phrase literal here is the public BIP39 English test vector. No production phrase is used.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    listCredentials: vi.fn(),
    refetch: vi.fn(),
    revoke: vi.fn(),
    registerPasskey: vi.fn()
}));

vi.mock("@/lib/trpc", () => ({
    trpc: {
        passkey: {
            listCredentials: {
                useQuery: () => ({ data: mocks.listCredentials(), refetch: mocks.refetch })
            },
            revokeCredential: { useMutation: () => ({ mutateAsync: mocks.revoke }) }
        }
    }
}));

vi.mock("@/hooks/use-passkey", () => ({
    usePasskey: () => ({
        capability: "supported",
        isBusy: false,
        error: null,
        clearError: vi.fn(),
        registerPasskey: mocks.registerPasskey,
        unlockWithPasskey: vi.fn()
    })
}));

import { PasskeyManager } from "@/components/features/identity/PasskeyManager";
import { computePubkeyHash, storeIdentitySession } from "@/lib/crypto/identity";
import { deriveKeysFromSeed, initCrypto } from "@/lib/crypto/keypair";
import { mnemonicToMasterSeed } from "@/lib/crypto/seed";
import { clearSession } from "@/lib/crypto/session";

const PUBLIC_TEST_VECTOR =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

/** A second public BIP39 vector, standing in for "a valid phrase that is not this user's". */
const OTHER_PUBLIC_TEST_VECTOR =
    "legal winner thank year wave sausage worth useful legal winner thank yellow";

/** Types a whole phrase into the gate's canonical credential field. */
function fillPhraseGate(mnemonic: string): void {
    const field = screen
        .getByTestId("last-passkey-phrase-gate")
        .querySelector<HTMLInputElement>('[data-testid="recovery-phrase-credential"]');
    if (!field) throw new Error("phrase gate is missing its credential field");
    fireEvent.change(field, { target: { value: mnemonic } });
}

function credential(credentialId: string, label: string) {
    return {
        credentialId,
        label,
        createdAt: "2026-01-01T00:00:00.000Z",
        lastUsedAt: null,
        transports: ["internal"],
        backedUp: false
    };
}

/** Installs the session that the given public vector derives, so the gate has an identity. */
async function installSessionFor(mnemonic: string): Promise<void> {
    const masterSeed = await mnemonicToMasterSeed(mnemonic);
    const keys = deriveKeysFromSeed(masterSeed);
    storeIdentitySession({ keys, pubkeyHash: computePubkeyHash(keys.signing.publicKey) });
}

beforeAll(async () => {
    await initCrypto();
});

beforeEach(async () => {
    vi.clearAllMocks();
    clearSession();
    mocks.refetch.mockResolvedValue(undefined);
    mocks.revoke.mockResolvedValue({ revoked: true });
    await installSessionFor(PUBLIC_TEST_VECTOR);
});

afterEach(() => {
    clearSession();
});

describe("PasskeyManager last-credential revocation", () => {
    it("demands the recovery phrase before removing the only credential", () => {
        mocks.listCredentials.mockReturnValue([credential("only-one", "This device")]);

        render(<PasskeyManager />);
        fireEvent.click(screen.getByTestId("revoke-passkey-button"));

        expect(screen.getByTestId("last-passkey-phrase-gate")).toBeInTheDocument();
        expect(screen.getByTestId("confirm-revoke-button")).toBeDisabled();
        expect(mocks.revoke).not.toHaveBeenCalled();
    });

    it("refuses a valid phrase that derives a different identity", async () => {
        mocks.listCredentials.mockReturnValue([credential("only-one", "This device")]);

        render(<PasskeyManager />);
        fireEvent.click(screen.getByTestId("revoke-passkey-button"));

        fillPhraseGate(OTHER_PUBLIC_TEST_VECTOR);
        fireEvent.click(screen.getByTestId("confirm-revoke-button"));

        await waitFor(() => {
            expect(screen.getByTestId("last-passkey-phrase-error")).toBeInTheDocument();
        });
        // The whole point: a checksum-valid phrase for someone else must not open the guard.
        expect(mocks.revoke).not.toHaveBeenCalled();
    });

    it("allows revocation once the user's own phrase is supplied", async () => {
        mocks.listCredentials.mockReturnValue([credential("only-one", "This device")]);

        render(<PasskeyManager />);
        fireEvent.click(screen.getByTestId("revoke-passkey-button"));

        fillPhraseGate(PUBLIC_TEST_VECTOR);
        fireEvent.click(screen.getByTestId("confirm-revoke-button"));

        await waitFor(() => {
            expect(mocks.revoke).toHaveBeenCalledWith({ credentialId: "only-one" });
        });
    });

    it("does not demand a phrase when another credential still opens the vault", async () => {
        mocks.listCredentials.mockReturnValue([
            credential("first", "Laptop"),
            credential("second", "Phone")
        ]);

        render(<PasskeyManager />);
        fireEvent.click(screen.getAllByTestId("revoke-passkey-button")[0]);

        expect(screen.queryByTestId("last-passkey-phrase-gate")).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId("confirm-revoke-button"));
        await waitFor(() => {
            expect(mocks.revoke).toHaveBeenCalledWith({ credentialId: "first" });
        });
    });
});
