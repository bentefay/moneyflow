/**
 * The four frozen automation "apply" modes (HS-007 / P17D).
 *
 * Frozen `specs/human-scratch.md:255` numbers them 1 updating all, 2 updating new, 3 update all,
 * 4 update new. The "updating…" prefix means the change applies AUTOMATICALLY when the edited row
 * loses focus; "update…" means it applies only on an explicit tick / Apply click. The "…All" modes
 * target every existing and new transaction; the "…New" modes target only newer ones.
 *
 * This type lives in the domain (not the editor component) so the per-user preference chain
 * (`preferences.ts`) can remember the user's last SELECT choice (frozen `:270`) WITHOUT a
 * component→domain import inversion. The shared editor re-exports it, so there is a single
 * four-mode type across the whole feature, never a parallel one.
 */

/** Compile-time exhaustiveness guard (ts-pattern is not a dependency of this package). */
function assertNever(value: never): never {
    throw new Error(`Unexpected apply mode: ${JSON.stringify(value)}`);
}

export type ApplyMode = "updatingAll" | "updatingNew" | "updateAll" | "updateNew";

export const APPLY_MODES: readonly ApplyMode[] = [
    "updatingAll",
    "updatingNew",
    "updateAll",
    "updateNew"
];

/**
 * Session default when nothing is remembered. "update new" is the most conservative choice: an
 * explicit (never automatic) action that touches only newer transactions, so an absent remembered
 * preference can never retroactively rewrite existing rows.
 */
export const DEFAULT_APPLY_MODE: ApplyMode = "updateNew";

const APPLY_MODE_SET: ReadonlySet<string> = new Set(APPLY_MODES);

/** Type guard narrowing an arbitrary string to a known {@link ApplyMode}. */
export function isApplyMode(value: string): value is ApplyMode {
    return APPLY_MODE_SET.has(value);
}

/** True when the mode targets only newer transactions (vs all existing + new). */
export function applyModeTargetsNewOnly(mode: ApplyMode): boolean {
    switch (mode) {
        case "updatingNew":
        case "updateNew":
            return true;
        case "updatingAll":
        case "updateAll":
            return false;
        default:
            return assertNever(mode);
    }
}

/** True when the mode applies automatically on blur ("updating…") rather than on an explicit tick. */
export function applyModeIsAutomatic(mode: ApplyMode): boolean {
    switch (mode) {
        case "updatingAll":
        case "updatingNew":
            return true;
        case "updateAll":
        case "updateNew":
            return false;
        default:
            return assertNever(mode);
    }
}
