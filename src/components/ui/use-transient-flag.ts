"use client";

/**
 * Transient Flag Hook
 *
 * A boolean that lowers itself on a timer. Backs the two-click delete confirmations and the
 * "Copied!" feedback that appear throughout the app.
 *
 * The single timer is owned by the hook and cleared on unmount, so a row that disappears
 * mid-countdown — a deleted transaction, a collapsed panel — never schedules a state update against
 * an unmounted tree.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseTransientFlagReturn {
    /** Whether the flag is currently raised */
    readonly isActive: boolean;
    /** Raise the flag; it lowers itself after `resetMs` */
    readonly activate: () => void;
    /** Raise the flag and leave it up until something lowers it */
    readonly hold: () => void;
    /** Lower the flag now, cancelling any pending reset */
    readonly reset: () => void;
    /** Lower the flag after `resetMs`, e.g. from a blur handler */
    readonly resetSoon: () => void;
}

/**
 * Creates a self-lowering boolean flag.
 *
 * @param resetMs How long the flag stays raised, in milliseconds.
 */
export function useTransientFlag(resetMs: number): UseTransientFlagReturn {
    const [isActive, setIsActive] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = useCallback(() => {
        if (timerRef.current != null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => clearTimer, [clearTimer]);

    const resetSoon = useCallback(() => {
        clearTimer();
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            setIsActive(false);
        }, resetMs);
    }, [clearTimer, resetMs]);

    const activate = useCallback(() => {
        setIsActive(true);
        resetSoon();
    }, [resetSoon]);

    const hold = useCallback(() => {
        clearTimer();
        setIsActive(true);
    }, [clearTimer]);

    const reset = useCallback(() => {
        clearTimer();
        setIsActive(false);
    }, [clearTimer]);

    return { isActive, activate, hold, reset, resetSoon };
}
