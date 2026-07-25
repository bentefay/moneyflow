/**
 * PasskeyBackupPhrase Component
 *
 * The recovery phrase behind a passkey-only vault, shown once at creation.
 *
 * This step exists because BIP39 derivation runs one way. The vault stores the 64-byte master
 * seed, and the twelve words are the input that produced it through PBKDF2 - there is no way to
 * recover them afterwards, and retaining them would mean persisting a secret in plaintext. So the
 * only honest moment to show the phrase is while it is still in memory during creation.
 *
 * It is shown AFTER the passkey exists rather than before: a failed ceremony leaves no identity
 * and no vault, so there would be nothing for a phrase to recover, and the friction would fall on
 * users who never got an account.
 */

"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { SeedPhraseDisplay } from "./SeedPhraseDisplay";

// ============================================================================
// Types
// ============================================================================

export interface PasskeyBackupPhraseProps {
    /** The phrase behind the identity the passkey just wrapped. */
    mnemonic: string;

    /** Called once the user acknowledges they have saved it. */
    onContinue: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function PasskeyBackupPhrase({ mnemonic, onContinue }: PasskeyBackupPhraseProps) {
    const [isConfirmed, setIsConfirmed] = useState(false);

    return (
        <div
            data-testid="passkey-backup-phrase"
            className="flex flex-col items-center gap-6 text-center"
        >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <ShieldCheck className="h-8 w-8 text-green-500" />
            </div>

            <div>
                <h1 className="text-2xl font-bold">Your passkey is ready</h1>
                <p
                    data-testid="passkey-phrase-rationale"
                    className="text-muted-foreground mt-2 max-w-md"
                >
                    Save these 12 words somewhere safe. They&apos;re the only way back into your
                    vault if you ever lose access to this device, and they can&apos;t be shown
                    again.
                </p>
            </div>

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

            <div className="bg-card flex items-start gap-3 rounded-lg border p-4 text-left">
                <Checkbox
                    id="passkey-phrase-confirm"
                    data-testid="passkey-phrase-confirm-checkbox"
                    checked={isConfirmed}
                    onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                />
                <Label htmlFor="passkey-phrase-confirm" className="cursor-pointer text-sm">
                    I have saved my recovery phrase somewhere safe.
                </Label>
            </div>

            <Button
                data-testid="passkey-phrase-continue-button"
                size="lg"
                disabled={!isConfirmed}
                onClick={onContinue}
                className="gap-2"
            >
                Continue
                <ArrowRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
