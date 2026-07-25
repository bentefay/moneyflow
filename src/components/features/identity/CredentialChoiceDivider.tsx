/**
 * CredentialChoiceDivider Component
 *
 * The "OR" between the two ways to create or unlock a vault.
 *
 * It is a real `separator` with an accessible name rather than a decorative rule with loose text:
 * the choice between a passkey and a recovery phrase is meaningful, so a screen reader user must
 * hear that these are alternatives, not a sequence of steps.
 */

import { cn } from "@/lib/utils";

export interface CredentialChoiceDividerProps {
    className?: string;
}

export function CredentialChoiceDivider({ className }: CredentialChoiceDividerProps) {
    return (
        <div
            data-testid="credential-choice-divider"
            role="separator"
            aria-label="or"
            className={cn("flex w-full items-center gap-4", className)}
        >
            <span aria-hidden="true" className="bg-border h-px flex-1" />
            <span aria-hidden="true" className="text-muted-foreground text-xs font-medium">
                OR
            </span>
            <span aria-hidden="true" className="bg-border h-px flex-1" />
        </div>
    );
}
