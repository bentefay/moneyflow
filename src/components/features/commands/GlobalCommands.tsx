"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import {
    actionCommand,
    GLOBAL_COMMANDS,
    NAVIGATION_DESTINATIONS,
    navigationCommandDefinition
} from "@/lib/commands";

import { useCommands, useCommandSurfaces } from "./CommandRegistryProvider";

/** The commands every page of the authenticated shell offers. */
export function GlobalCommands() {
    const router = useRouter();
    const { openShortcuts, togglePalette } = useCommandSurfaces();

    const commands = useMemo(
        () => [
            actionCommand(GLOBAL_COMMANDS.commandPalette, togglePalette),
            actionCommand(GLOBAL_COMMANDS.keyboardShortcuts, openShortcuts),
            ...NAVIGATION_DESTINATIONS.map((destination) =>
                actionCommand(navigationCommandDefinition(destination), () =>
                    router.push(destination.href)
                )
            )
        ],
        [openShortcuts, router, togglePalette]
    );
    useCommands(commands);
    return null;
}
