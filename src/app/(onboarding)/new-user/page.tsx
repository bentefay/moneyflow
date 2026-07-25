/**
 * New User Page
 *
 * Onboarding flow for creating a new identity:
 * 1. Generate seed phrase (no server call)
 * 2. Display seed phrase with warning
 * 3. User confirms they've written it down
 * 4. Register with server (only after consent)
 * 5. Redirect to dashboard
 */

"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, KeyRound, Loader2, Sparkles } from "lucide-react";
import { type FormEvent, useCallback, useRef, useState } from "react";

import {
    AuroraBackground,
    CredentialChoiceDivider,
    PasskeyBackupPhrase,
    SeedPhraseDisplay
} from "@/components/features/identity";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Label } from "@/components/ui/label";
import { useIdentity } from "@/hooks";
import { usePasskey } from "@/hooks/use-passkey";
import { type NewIdentity, storeIdentitySession } from "@/lib/crypto/identity";
import { zeroize } from "@/lib/crypto/passkeyWrap";
import { mnemonicToMasterSeed } from "@/lib/crypto/seed";
import { clearSession } from "@/lib/crypto/session";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type Step = "intro" | "generate" | "confirm" | "passkey-phrase" | "complete";

// ============================================================================
// Component
// ============================================================================

export default function NewUserPage() {
    const { generateNew, registerIdentity, error } = useIdentity();
    const {
        capability,
        isBusy: isPasskeyBusy,
        error: passkeyError,
        registerPasskey
    } = usePasskey();
    const revokeCredentialMutation = trpc.passkey.revokeCredential.useMutation();

    const [step, setStep] = useState<Step>("intro");
    const [mnemonic, setMnemonic] = useState<string | null>(null);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    // Store the generated identity so we can register it later
    const pendingIdentity = useRef<NewIdentity | null>(null);

    // -------------------------------------------------------------------------
    // Generate seed phrase (no server call yet)
    // -------------------------------------------------------------------------

    const handleGenerate = useCallback(async () => {
        setIsCreating(true);
        try {
            const identity = await generateNew();
            pendingIdentity.current = identity;
            setMnemonic(identity.mnemonic);
            setStep("generate");
        } catch {
            // Error is handled by useIdentity hook
        } finally {
            setIsCreating(false);
        }
    }, [generateNew]);

    // -------------------------------------------------------------------------
    // Create with a passkey
    // -------------------------------------------------------------------------

    // A passkey-created account still has a full-entropy recovery phrase behind it: the passkey
    // wraps that same master secret rather than replacing it.
    //
    // Ordering here is load-bearing. The ceremony can fail - dismissed, timed out, or an
    // authenticator that cannot do PRF - and every server write is permanent, so nothing may be
    // registered until the credential exists. The session install that the protected registration
    // procedures require is the one exception, and it is client-only and reversible.
    const handleCreateWithPasskey = useCallback(async () => {
        let masterSecret: Uint8Array | null = null;
        let credentialId: string | null = null;
        let attempted: NewIdentity | null = null;

        try {
            attempted = await generateNew();

            // Signs the passkey ceremony requests. No server state yet - `clearSession()` below
            // undoes this completely if anything fails.
            storeIdentitySession(attempted);
            masterSecret = await mnemonicToMasterSeed(attempted.mnemonic);

            credentialId = await registerPasskey(masterSecret, "This device");

            // First irreversible commit, and only now that an unlock factor demonstrably exists.
            await registerIdentity(attempted);

            setMnemonic(attempted.mnemonic);
            setStep("passkey-phrase");
        } catch {
            // The credential is the only residue worth undoing. Revoking it is a signed request,
            // and a failing `registerIdentity` tears the session down on its way out, so the
            // identity is re-installed for the attempt. Best effort: even if the revoke fails no
            // user data is at risk, because no vault was ever created.
            if (credentialId && attempted) {
                storeIdentitySession(attempted);
                await revokeCredentialMutation.mutateAsync({ credentialId }).catch(() => undefined);
            }
            clearSession();
            // Errors surface through the useIdentity and usePasskey hooks.
        } finally {
            if (masterSecret) zeroize(masterSecret);
        }
    }, [generateNew, registerIdentity, registerPasskey, revokeCredentialMutation]);

    // The phrase is held only for this step and never persisted; navigating away discards it.
    const handlePasskeyPhraseAcknowledged = useCallback(() => {
        setMnemonic(null);
        // Changing identity invalidates all in-memory authenticated state, so a full navigation
        // is used for the same reason as the recovery-phrase branch below.
        window.location.assign("/settings");
    }, []);

    // -------------------------------------------------------------------------
    // Complete registration (only after user consents)
    // -------------------------------------------------------------------------

    // Submitting the credential form is what lets a password manager recognise the generated
    // phrase as a credential worth saving, so registration runs from the submit event.
    const handleComplete = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!pendingIdentity.current || !isConfirmed || isRegistering) return;

            setIsRegistering(true);
            try {
                // Register with server only after user confirms they saved the phrase
                await registerIdentity(pendingIdentity.current);
                setStep("complete");
                // Changing identity invalidates all in-memory authenticated state. Use a full
                // navigation so React Query and the app providers cannot reuse the prior identity's
                // cached vault list or active VaultProvider tree.
                window.location.assign("/settings");
            } catch {
                // Error is handled by useIdentity hook
                setIsRegistering(false);
            }
        },
        [registerIdentity, isConfirmed, isRegistering]
    );

    // -------------------------------------------------------------------------
    // Render step content
    // -------------------------------------------------------------------------

    const renderContent = () => {
        switch (step) {
            case "intro":
                return (
                    <div className="flex flex-col items-center gap-8 text-center">
                        {/* Icon */}
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-bl from-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/20">
                            <Sparkles className="h-10 w-10 text-violet-50" />
                        </div>

                        {/* Title */}
                        <div>
                            <h1 className="text-3xl font-bold">Get Started</h1>
                            <p className="text-muted-foreground mt-2 max-w-md">
                                Choose how you&apos;ll unlock your vault. Either way you hold the
                                only key - there&apos;s no password reset.
                            </p>
                        </div>

                        {/* Info cards */}
                        <div className="grid w-full max-w-lg gap-4">
                            <div className="bg-card flex items-start gap-3 rounded-lg border p-4 text-left">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                                <div>
                                    <p className="font-medium">Your data is private and secure</p>
                                    <p className="text-muted-foreground text-sm">
                                        All data is encrypted on your device so not even we can see
                                        it.
                                    </p>
                                </div>
                            </div>
                            <div className="bg-card flex items-start gap-3 rounded-lg border p-4 text-left">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                                <div>
                                    <p className="font-medium">
                                        You must save your recovery phrase
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        You&apos;ll need it to unlock your account on new devices or
                                        after closing your browser.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <ErrorAlert
                                title="Unable to create identity"
                                message={error.message}
                                details={error.details}
                                className="w-full max-w-lg"
                            />
                        )}

                        {/* Two ways in, presented as equals */}
                        <div className="flex w-full max-w-lg flex-col items-center gap-6">
                            {capability === "supported" && (
                                <>
                                    <div className="flex w-full flex-col items-center gap-3">
                                        {passkeyError && (
                                            <div data-testid="passkey-error" className="w-full">
                                                <ErrorAlert
                                                    title="Passkey setup failed"
                                                    message={passkeyError.message}
                                                />
                                            </div>
                                        )}
                                        <Button
                                            data-testid="passkey-create-button"
                                            size="lg"
                                            onClick={handleCreateWithPasskey}
                                            disabled={isPasskeyBusy || isCreating}
                                            className="w-full gap-2"
                                        >
                                            {isPasskeyBusy ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Waiting for passkey...
                                                </>
                                            ) : (
                                                <>
                                                    <KeyRound className="h-4 w-4" />
                                                    Create with a passkey
                                                </>
                                            )}
                                        </Button>
                                        <p
                                            data-testid="passkey-loss-warning"
                                            className="text-muted-foreground text-center text-sm"
                                        >
                                            Your device unlocks your vault. If you lose access to it
                                            and haven&apos;t saved your recovery phrase, your data
                                            cannot be recovered by anyone, including us.
                                        </p>
                                    </div>

                                    <CredentialChoiceDivider />
                                </>
                            )}

                            <Button
                                data-testid="generate-button"
                                size="lg"
                                variant={capability === "supported" ? "outline" : "default"}
                                onClick={handleGenerate}
                                disabled={isCreating || isPasskeyBusy}
                                className="w-full gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        Generate Recovery Phrase
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Back link */}
                        <p className="text-muted-foreground text-sm">
                            Already have an account?{" "}
                            <a
                                href="/unlock"
                                className="text-primary font-medium underline-offset-4 hover:underline"
                            >
                                Unlock it
                            </a>
                        </p>
                    </div>
                );

            case "generate":
                return (
                    /*
                     * A real credential form: the generated phrase, a stable account identifier and
                     * a submit control in one place. Password managers use form submission as the
                     * signal to offer to save, so this must stay a genuine submit, and `post` keeps
                     * a manager-automated click from ever putting the phrase in a query string.
                     */
                    <form
                        method="post"
                        action="/new-user"
                        onSubmit={handleComplete}
                        className="flex flex-col items-center gap-6"
                    >
                        {/* Title */}
                        <div className="text-center">
                            <h1 className="text-2xl font-bold">Your Recovery Phrase</h1>
                            <p className="text-muted-foreground mt-1">
                                Save the 12 words below somewhere safe. We recommend a password
                                manager.
                            </p>
                        </div>

                        {/* Seed phrase display */}
                        {mnemonic && (
                            <div className="w-full">
                                <SeedPhraseDisplay
                                    mnemonic={mnemonic}
                                    initiallyRevealed={false}
                                    layout="3x4"
                                    showCopyButton={true}
                                    showRevealToggle={true}
                                    showWarning={true}
                                />
                            </div>
                        )}

                        {/* Confirmation checkbox */}
                        <div className="bg-card flex items-start gap-3 rounded-lg border p-4">
                            <Checkbox
                                id="confirm"
                                data-testid="confirm-checkbox"
                                checked={isConfirmed}
                                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                            />
                            <Label htmlFor="confirm" className="cursor-pointer text-sm">
                                I have saved down my recovery phrase and understand that losing it
                                means losing access to my account.
                            </Label>
                        </div>

                        {/* Error message */}
                        {error && (
                            <ErrorAlert
                                title="Unable to create account"
                                message={error.message}
                                details={error.details}
                                className="w-full max-w-lg"
                            />
                        )}

                        {/* Continue button */}
                        <Button
                            data-testid="continue-button"
                            type="submit"
                            size="lg"
                            disabled={!isConfirmed || isRegistering}
                            className="gap-2"
                        >
                            {isRegistering ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                );

            case "passkey-phrase":
                return mnemonic ? (
                    <PasskeyBackupPhrase
                        mnemonic={mnemonic}
                        onContinue={handlePasskeyPhraseAcknowledged}
                    />
                ) : null;

            case "complete":
                return (
                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
                            <p className="text-muted-foreground mt-1">
                                Redirecting to your dashboard...
                            </p>
                        </div>
                        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                    </div>
                );

            default:
                return null;
        }
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    return (
        <AuroraBackground intensity={0.5} variant="default">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className={cn(
                        "bg-background/90 w-full max-w-2xl rounded-2xl border p-8 shadow-xl backdrop-blur-sm",
                        "transition-all duration-300"
                    )}
                >
                    {renderContent()}
                </div>
            </div>
        </AuroraBackground>
    );
}
