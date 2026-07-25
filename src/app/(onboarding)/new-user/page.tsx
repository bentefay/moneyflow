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

import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { type FormEvent, useCallback, useRef, useState } from "react";

import { AuroraBackground, SeedPhraseDisplay } from "@/components/features/identity";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Label } from "@/components/ui/label";
import { useIdentity } from "@/hooks";
import type { NewIdentity } from "@/lib/crypto/identity";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type Step = "intro" | "generate" | "confirm" | "complete";

// ============================================================================
// Component
// ============================================================================

export default function NewUserPage() {
    const { generateNew, registerIdentity, error } = useIdentity();

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
                                We're going to create a recovery phrase for you. It is the only way
                                to access your data - there&apos;s no password reset.
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

                        {/* Action button */}
                        <Button
                            data-testid="generate-button"
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isCreating}
                            className="gap-2"
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
