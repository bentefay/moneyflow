/**
 * PasskeyManager Component
 *
 * Lists, adds and revokes passkeys for the unlocked identity.
 *
 * Adding a passkey requires re-establishing the master secret, because it is deliberately never
 * kept in session storage. That means the user re-enters their recovery phrase or authenticates
 * with an existing passkey - proving possession of the root before a new unlock factor is minted.
 */

"use client";

import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { usePasskey } from "@/hooks/use-passkey";
import { computePubkeyHash } from "@/lib/crypto/identity";
import { deriveKeysFromSeed, initCrypto } from "@/lib/crypto/keypair";
import { zeroize } from "@/lib/crypto/passkeyWrap";
import { mnemonicToMasterSeed, normalizeMnemonic, validateSeedPhrase } from "@/lib/crypto/seed";
import { getSessionPubkeyHash } from "@/lib/crypto/session";
import { trpc } from "@/lib/trpc";

import { SeedPhraseInput } from "./SeedPhraseInput";

export function PasskeyManager() {
    const { capability, isBusy, error, registerPasskey, clearError } = usePasskey();
    const credentialsQuery = trpc.passkey.listCredentials.useQuery();
    const revokeMutation = trpc.passkey.revokeCredential.useMutation();

    const [isAdding, setIsAdding] = useState(false);
    const [phrase, setPhrase] = useState("");
    const [phraseError, setPhraseError] = useState<string | null>(null);
    const [pendingRevoke, setPendingRevoke] = useState<string | null>(null);
    const [revokePhrase, setRevokePhrase] = useState("");
    const [revokePhraseError, setRevokePhraseError] = useState<string | null>(null);

    const credentials = credentialsQuery.data ?? [];

    // Removing the last credential destroys the only wrapped secret. For a vault created with a
    // passkey alone that is the only path to the master seed, so the user must produce the
    // recovery phrase before it can go.
    const isLastCredential = credentials.length === 1;

    const handleAdd = useCallback(async () => {
        const normalized = normalizeMnemonic(phrase);
        if (!validateSeedPhrase(normalized)) {
            setPhraseError("Enter your full recovery phrase to add a passkey.");
            return;
        }

        setPhraseError(null);
        clearError();

        let masterSecret: Uint8Array | null = null;
        try {
            masterSecret = await mnemonicToMasterSeed(normalized);
            await registerPasskey(masterSecret);
            setPhrase("");
            setIsAdding(false);
            await credentialsQuery.refetch();
        } catch {
            // Surfaced through the hook's error state.
        } finally {
            if (masterSecret) zeroize(masterSecret);
        }
    }, [phrase, registerPasskey, clearError, credentialsQuery]);

    /**
     * Proves the entered phrase belongs to THIS identity.
     *
     * A BIP39 validity check alone would be theatre: any public test vector passes it, so a user
     * who has lost their real phrase could still destroy their last unlock factor. Deriving the
     * pubkey hash and comparing it to the session is what makes the guard mean something.
     *
     * Entirely local - the phrase is never sent anywhere.
     */
    const phraseDerivesThisIdentity = useCallback(async (mnemonic: string): Promise<boolean> => {
        let masterSecret: Uint8Array | null = null;
        try {
            await initCrypto();
            masterSecret = await mnemonicToMasterSeed(mnemonic);
            const keys = deriveKeysFromSeed(masterSecret);
            return computePubkeyHash(keys.signing.publicKey) === getSessionPubkeyHash();
        } finally {
            if (masterSecret) zeroize(masterSecret);
        }
    }, []);

    const handleRevoke = useCallback(
        async (credentialId: string) => {
            if (isLastCredential) {
                const normalized = normalizeMnemonic(revokePhrase);
                if (
                    !validateSeedPhrase(normalized) ||
                    !(await phraseDerivesThisIdentity(normalized))
                ) {
                    setRevokePhraseError(
                        "That isn't the recovery phrase for this vault. Removing your only passkey without it would lock you out for good."
                    );
                    return;
                }
            }

            await revokeMutation.mutateAsync({ credentialId });
            setPendingRevoke(null);
            setRevokePhrase("");
            setRevokePhraseError(null);
            await credentialsQuery.refetch();
        },
        [
            revokeMutation,
            credentialsQuery,
            isLastCredential,
            revokePhrase,
            phraseDerivesThisIdentity
        ]
    );

    const handleCancelRevoke = useCallback(() => {
        setPendingRevoke(null);
        setRevokePhrase("");
        setRevokePhraseError(null);
    }, []);

    if (capability === "unsupported") {
        return (
            <p data-testid="passkey-unsupported-notice" className="text-muted-foreground text-sm">
                This browser doesn&apos;t support passkeys. Your recovery phrase still works
                everywhere.
            </p>
        );
    }

    return (
        <section className="flex flex-col gap-4">
            <div>
                <h2 className="text-lg font-semibold">Passkeys</h2>
                <p className="text-muted-foreground text-sm">
                    Unlock this vault with your device instead of typing your recovery phrase. Your
                    recovery phrase keeps working either way.
                </p>
            </div>

            {credentials.length === 0 ? (
                <p className="text-muted-foreground text-sm">No passkeys yet.</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {credentials.map((credential) => (
                        <li
                            key={credential.credentialId}
                            data-testid="passkey-credential-row"
                            className="bg-card flex flex-col gap-3 rounded-lg border p-3"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-2 text-sm">
                                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                                    {credential.label || "Passkey"}
                                </span>

                                {pendingRevoke === credential.credentialId ? (
                                    <span className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-xs">
                                            {isLastCredential
                                                ? "This is your only passkey."
                                                : "Remove this passkey?"}
                                        </span>
                                        <Button
                                            data-testid="confirm-revoke-button"
                                            size="sm"
                                            variant="destructive"
                                            disabled={isLastCredential && revokePhrase.length === 0}
                                            onClick={() => handleRevoke(credential.credentialId)}
                                        >
                                            Remove
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCancelRevoke}
                                        >
                                            Cancel
                                        </Button>
                                    </span>
                                ) : (
                                    <Button
                                        data-testid="revoke-passkey-button"
                                        size="sm"
                                        variant="ghost"
                                        aria-label={`Remove passkey ${credential.label || "Passkey"}`}
                                        onClick={() => setPendingRevoke(credential.credentialId)}
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                )}
                            </div>

                            {pendingRevoke === credential.credentialId && isLastCredential && (
                                <div
                                    data-testid="last-passkey-phrase-gate"
                                    className="flex flex-col gap-3 border-t pt-3"
                                >
                                    <p className="text-muted-foreground text-sm">
                                        Removing it deletes the only copy of your wrapped vault key.
                                        Enter your recovery phrase to confirm you can still get back
                                        in without this passkey.
                                    </p>
                                    <SeedPhraseInput
                                        value={revokePhrase}
                                        onChange={setRevokePhrase}
                                        autoFocus={false}
                                    />
                                    {revokePhraseError && (
                                        <p
                                            data-testid="last-passkey-phrase-error"
                                            className="text-destructive text-sm"
                                        >
                                            {revokePhraseError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {error && <ErrorAlert title="Passkey setup failed" message={error.message} />}

            {isAdding ? (
                <div className="flex flex-col gap-3">
                    <p className="text-muted-foreground text-sm">
                        Enter your recovery phrase to confirm it&apos;s you, then approve the
                        passkey prompt.
                    </p>
                    <SeedPhraseInput value={phrase} onChange={setPhrase} disabled={isBusy} />
                    {phraseError && <p className="text-destructive text-sm">{phraseError}</p>}
                    <div className="flex gap-2">
                        <Button
                            data-testid="confirm-add-passkey-button"
                            onClick={handleAdd}
                            disabled={isBusy}
                            className="gap-2"
                        >
                            {isBusy ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Waiting for passkey...
                                </>
                            ) : (
                                "Create passkey"
                            )}
                        </Button>
                        <Button variant="ghost" onClick={() => setIsAdding(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    data-testid="add-passkey-button"
                    variant="outline"
                    className="gap-2 self-start"
                    onClick={() => setIsAdding(true)}
                >
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                    Add a passkey
                </Button>
            )}
        </section>
    );
}
