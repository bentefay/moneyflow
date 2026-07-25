/**
 * PasskeyUnlockButton Component
 *
 * The passkey branch of the unlock screen.
 *
 * When the browser cannot do WebAuthn this renders an explanation instead of a dead control. The
 * recovery-phrase route always remains available alongside it, so an unsupported browser is never
 * a dead end.
 */

"use client";

import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import type { PasskeyCapability, PasskeyError } from "@/hooks/use-passkey";

export interface PasskeyUnlockButtonProps {
    capability: PasskeyCapability;
    isBusy: boolean;
    error: PasskeyError | null;
    onUnlock: () => void;
    className?: string;
}

export function PasskeyUnlockButton({
    capability,
    isBusy,
    error,
    onUnlock,
    className
}: PasskeyUnlockButtonProps) {
    if (capability === "checking") {
        return null;
    }

    if (capability === "unsupported") {
        return (
            <p
                data-testid="passkey-unsupported-notice"
                className="text-muted-foreground text-center text-sm"
            >
                This browser doesn&apos;t support passkeys. Use your recovery phrase below.
            </p>
        );
    }

    return (
        <div className={className}>
            {error && (
                <div data-testid="passkey-error">
                    <ErrorAlert
                        title="Passkey unlock failed"
                        message={error.message}
                        className="mb-4 w-full"
                    />
                </div>
            )}
            <Button
                data-testid="passkey-unlock-button"
                type="button"
                size="lg"
                variant="outline"
                className="w-full gap-2"
                disabled={isBusy}
                onClick={onUnlock}
            >
                {isBusy ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Waiting for passkey...
                    </>
                ) : (
                    <>
                        <KeyRound className="h-4 w-4" />
                        Use a passkey
                    </>
                )}
            </Button>
        </div>
    );
}
