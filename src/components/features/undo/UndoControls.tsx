"use client";

import { Redo2, Undo2 } from "lucide-react";
import { useMemo } from "react";

import { ShortcutTooltip, useCommands } from "@/components/features/commands";
import { Button } from "@/components/ui/button";
import { type AppCommand, GLOBAL_COMMANDS } from "@/lib/commands";
import { useVaultUndo, useVaultUndoCoordinator } from "@/lib/crdt/undo";
import { cn } from "@/lib/utils";

export interface UndoControlsProps {
    className?: string;
}

/** Registers Undo and Redo as commands, so their shortcuts and palette entries share one source. */
export function UndoCommands() {
    const coordinator = useVaultUndoCoordinator();
    // Availability is read from the coordinator when a key is pressed, not from a rendered snapshot,
    // so an undo pressed straight after an edit is never refused by a stale closure.
    const commands = useMemo(
        (): readonly AppCommand[] => [
            {
                ...GLOBAL_COMMANDS.undo,
                kind: "action",
                run: () => coordinator.undo(),
                when: () => coordinator.getSnapshot().canUndo
            },
            {
                ...GLOBAL_COMMANDS.redo,
                kind: "action",
                run: () => coordinator.redo(),
                when: () => coordinator.getSnapshot().canRedo
            }
        ],
        [coordinator]
    );
    useCommands(commands);
    return null;
}

/** Visible document undo and redo controls. */
export function UndoControls({ className }: UndoControlsProps) {
    const { canRedo, canUndo, redo, undo } = useVaultUndo();

    return (
        <div className={cn("flex items-center gap-1", className)} aria-label="History controls">
            <ShortcutTooltip label="Undo" shortcut={GLOBAL_COMMANDS.undo.shortcut}>
                <span className="inline-flex">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={undo}
                        disabled={!canUndo}
                        aria-label="Undo"
                    >
                        <Undo2 className="h-4 w-4" />
                    </Button>
                </span>
            </ShortcutTooltip>
            <ShortcutTooltip label="Redo" shortcut={GLOBAL_COMMANDS.redo.shortcut}>
                <span className="inline-flex">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={redo}
                        disabled={!canRedo}
                        aria-label="Redo"
                    >
                        <Redo2 className="h-4 w-4" />
                    </Button>
                </span>
            </ShortcutTooltip>
        </div>
    );
}
