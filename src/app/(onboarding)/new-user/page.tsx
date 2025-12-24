/**
 * New User Page
 *
 * Onboarding flow for creating a new identity:
 * 1. Generate seed phrase
 * 2. Display seed phrase with warning
 * 3. User confirms they've written it down
 * 4. Register with server
 * 5. Redirect to dashboard
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AuroraBackground, SeedPhraseDisplay } from "@/components/features/identity";
import { useIdentity } from "@/hooks";
import { Sparkles, ArrowRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type Step = "intro" | "generate" | "confirm" | "complete";

// ============================================================================
// Component
// ============================================================================

export default function NewUserPage() {
  const router = useRouter();
  const { createNew, error } = useIdentity();

  const [step, setStep] = useState<Step>("intro");
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // -------------------------------------------------------------------------
  // Generate seed phrase
  // -------------------------------------------------------------------------

  const handleGenerate = useCallback(async () => {
    setIsCreating(true);
    try {
      const identity = await createNew();
      setMnemonic(identity.mnemonic);
      setStep("generate");
    } catch {
      // Error is handled by useIdentity hook
    } finally {
      setIsCreating(false);
    }
  }, [createNew]);

  // -------------------------------------------------------------------------
  // Complete registration
  // -------------------------------------------------------------------------

  const handleComplete = useCallback(() => {
    setStep("complete");
    // Small delay before redirect for visual feedback
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  }, [router]);

  // -------------------------------------------------------------------------
  // Render step content
  // -------------------------------------------------------------------------

  const renderContent = () => {
    switch (step) {
      case "intro":
        return (
          <div className="flex flex-col items-center gap-8 text-center">
            {/* Icon */}
            <div className="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
              <Sparkles className="text-primary h-10 w-10" />
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold">Create Your Identity</h1>
              <p className="text-muted-foreground mt-2 max-w-md">
                MoneyFlow uses a recovery phrase to secure your account. This is the only way to
                access your vaults - there&apos;s no password reset.
              </p>
            </div>

            {/* Info cards */}
            <div className="grid w-full max-w-lg gap-4">
              <div className="bg-card flex items-start gap-3 rounded-lg border p-4 text-left">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="font-medium">Your data stays yours</p>
                  <p className="text-muted-foreground text-sm">
                    All data is encrypted on your device. We can&apos;t see your finances.
                  </p>
                </div>
              </div>
              <div className="bg-card flex items-start gap-3 rounded-lg border p-4 text-left">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                <div>
                  <p className="font-medium">Write down your phrase</p>
                  <p className="text-muted-foreground text-sm">
                    You&apos;ll need it to unlock your account on new devices or after closing your
                    browser.
                  </p>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="w-full max-w-lg rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Action button */}
            <Button size="lg" onClick={handleGenerate} disabled={isCreating} className="gap-2">
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
          <div className="flex flex-col items-center gap-6">
            {/* Title */}
            <div className="text-center">
              <h1 className="text-2xl font-bold">Your Recovery Phrase</h1>
              <p className="text-muted-foreground mt-1">
                Write these 12 words down in order. Store them somewhere safe.
              </p>
            </div>

            {/* Seed phrase display */}
            {mnemonic && (
              <div className="w-full max-w-xl">
                <SeedPhraseDisplay
                  mnemonic={mnemonic}
                  initiallyRevealed={true}
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
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
              />
              <Label htmlFor="confirm" className="cursor-pointer text-sm">
                I have written down my recovery phrase and understand that losing it means losing
                access to my account.
              </Label>
            </div>

            {/* Continue button */}
            <Button size="lg" onClick={handleComplete} disabled={!isConfirmed} className="gap-2">
              Continue to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        );

      case "complete":
        return (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
              <p className="text-muted-foreground mt-1">Redirecting to your dashboard...</p>
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
            "bg-background/80 w-full max-w-2xl rounded-2xl border p-8 shadow-xl backdrop-blur-sm",
            "transition-all duration-300"
          )}
        >
          {renderContent()}
        </div>
      </div>
    </AuroraBackground>
  );
}
