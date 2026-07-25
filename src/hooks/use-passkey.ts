/**
 * usePasskey Hook
 *
 * Client orchestration for WebAuthn PRF passkeys.
 *
 * The invariant this hook exists to uphold: a passkey wraps the SAME master identity secret the
 * recovery phrase produces. Registering a passkey requires the caller to supply that secret, and
 * unlocking with one reproduces the identical Ed25519/X25519 identity. A passkey never mints an
 * identity of its own.
 */

"use client";

import {
    bufferToBase64URLString,
    startAuthentication,
    startRegistration
} from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";

import { computePubkeyHash, storeIdentitySession } from "@/lib/crypto/identity";
import { deriveKeysFromSeed, initCrypto } from "@/lib/crypto/keypair";
import {
    browserSupportsPasskeys,
    extractPrfOutput,
    isPasskeySupportedResult,
    stripPrfResults
} from "@/lib/crypto/passkeyCeremony";
import {
    PASSKEY_PRF_SALT,
    unwrapMasterSecret,
    wrapMasterSecret,
    zeroize
} from "@/lib/crypto/passkeyWrap";
import { trpc } from "@/lib/trpc";

/** Whether this browser can be offered the passkey branch at all. */
export type PasskeyCapability = "checking" | "supported" | "unsupported";

export interface PasskeyError {
    message: string;
}

/**
 * Translates a ceremony failure into something a user can act on.
 *
 * A cancelled prompt is not an error worth alarming anyone about, and an authenticator that
 * cannot do PRF needs to be told apart from one that simply was not present.
 */
function describeCeremonyFailure(error: unknown): PasskeyError {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : String(error);

    if (name === "NotAllowedError" || message.includes("ceremony")) {
        return { message: "Passkey prompt was dismissed. You can try again." };
    }
    if (name === "InvalidStateError") {
        return { message: "This device already has a passkey for your account." };
    }
    if (message.includes("PRF")) {
        return {
            message:
                "This device's passkey cannot protect your vault key. Use your recovery phrase instead."
        };
    }
    return { message: "Passkey could not be used. Please try again or use your recovery phrase." };
}

export interface UsePasskeyReturn {
    capability: PasskeyCapability;
    isBusy: boolean;
    error: PasskeyError | null;
    clearError: () => void;
    /** Registers a new passkey that wraps the supplied existing master secret. */
    registerPasskey: (masterSecret: Uint8Array, label?: string) => Promise<void>;
    /** Unlocks by passkey, installing a session for the identity the credential wraps. */
    unlockWithPasskey: () => Promise<{ pubkeyHash: string }>;
}

export function usePasskey(): UsePasskeyReturn {
    const [capability, setCapability] = useState<PasskeyCapability>("checking");
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<PasskeyError | null>(null);

    const startRegistrationMutation = trpc.passkey.startRegistration.useMutation();
    const finishRegistrationMutation = trpc.passkey.finishRegistration.useMutation();
    const startAuthenticationMutation = trpc.passkey.startAuthentication.useMutation();
    const finishAuthenticationMutation = trpc.passkey.finishAuthentication.useMutation();

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration pattern
        setCapability(browserSupportsPasskeys() ? "supported" : "unsupported");
    }, []);

    const clearError = useCallback(() => setError(null), []);

    /**
     * Obtains a newly registered credential's PRF output via an assertion.
     *
     * Always an assertion, never the registration response: create-time PRF results are optional
     * per spec and, on some authenticators, are derived from a different key than assertions use.
     *
     * The challenge is generated locally rather than requested from the server. This assertion is
     * never sent anywhere and no authentication decision is made from it - only the PRF output is
     * kept - so a server challenge would add no security while leaving an unusable row behind.
     * The unlock path, where an assertion IS verified, uses a server challenge.
     */
    const evaluatePrfLocally = useCallback(async (credentialId: string): Promise<Uint8Array> => {
        const assertion = await startAuthentication({
            optionsJSON: {
                // `challenge` is the one field the browser package decodes from base64url;
                // extension inputs pass through to the DOM API as raw bytes.
                challenge: bufferToBase64URLString(
                    crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer
                ),
                rpId: window.location.hostname,
                userVerification: "required",
                allowCredentials: [{ id: credentialId, type: "public-key" }],
                extensions: { prf: { eval: { first: PASSKEY_PRF_SALT } } }
            }
        });

        const prfOutput = extractPrfOutput(assertion);
        if (!prfOutput) {
            throw new Error("Authenticator returned no PRF output");
        }

        return prfOutput;
    }, []);

    const registerPasskey = useCallback(
        async (masterSecret: Uint8Array, label = "Passkey"): Promise<void> => {
            setIsBusy(true);
            setError(null);
            let prfOutput: Uint8Array | null = null;

            try {
                await initCrypto();
                const { challengeId, options } = await startRegistrationMutation.mutateAsync({});
                const registration = await startRegistration({ optionsJSON: options });

                // No silent downgrade: a credential that cannot do PRF cannot protect the vault
                // key, so nothing is stored and the user keeps their existing unlock factors.
                if (!isPasskeySupportedResult(registration)) {
                    throw new Error("Authenticator does not support the PRF extension");
                }

                prfOutput = await evaluatePrfLocally(registration.id);
                const wrappedSecret = await wrapMasterSecret(masterSecret, prfOutput);

                await finishRegistrationMutation.mutateAsync({
                    challengeId,
                    // The PRF output is stripped here. It is the key to the envelope; sending it
                    // would hand the server everything it needs to decrypt the identity.
                    response: stripPrfResults(registration),
                    wrappedSecret,
                    label
                });
            } catch (caught) {
                setError(describeCeremonyFailure(caught));
                throw caught;
            } finally {
                if (prfOutput) zeroize(prfOutput);
                setIsBusy(false);
            }
        },
        [startRegistrationMutation, finishRegistrationMutation, evaluatePrfLocally]
    );

    const unlockWithPasskey = useCallback(async (): Promise<{ pubkeyHash: string }> => {
        setIsBusy(true);
        setError(null);
        let prfOutput: Uint8Array | null = null;
        let masterSecret: Uint8Array | null = null;

        try {
            await initCrypto();
            const { challengeId, options } = await startAuthenticationMutation.mutateAsync({});
            const assertion = await startAuthentication({ optionsJSON: options });

            prfOutput = extractPrfOutput(assertion);
            if (!prfOutput) {
                throw new Error("Authenticator returned no PRF output");
            }

            const released = await finishAuthenticationMutation.mutateAsync({
                challengeId,
                response: stripPrfResults(assertion)
            });

            masterSecret = await unwrapMasterSecret(released.wrappedSecret, prfOutput);
            const keys = deriveKeysFromSeed(masterSecret);
            const pubkeyHash = computePubkeyHash(keys.signing.publicKey);

            // The server told us which identity this credential belongs to; verify that claim
            // against the key material we just recovered rather than trusting it.
            if (pubkeyHash !== released.pubkeyHash) {
                throw new Error("Recovered identity did not match the credential");
            }

            storeIdentitySession({ keys, pubkeyHash });
            return { pubkeyHash };
        } catch (caught) {
            setError(describeCeremonyFailure(caught));
            throw caught;
        } finally {
            if (prfOutput) zeroize(prfOutput);
            if (masterSecret) zeroize(masterSecret);
            setIsBusy(false);
        }
    }, [startAuthenticationMutation, finishAuthenticationMutation]);

    return { capability, isBusy, error, clearError, registerPasskey, unlockWithPasskey };
}
