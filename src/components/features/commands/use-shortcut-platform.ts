"use client";

import { useSyncExternalStore } from "react";

import { detectShortcutPlatform, type ShortcutPlatform } from "@/lib/commands";

const subscribeToNothing = () => () => {};

/** The platform shortcuts are shown for; `other` while rendering on the server. */
export function useShortcutPlatform(): ShortcutPlatform {
    return useSyncExternalStore(
        subscribeToNothing,
        () => detectShortcutPlatform(navigator.platform),
        () => "other"
    );
}
