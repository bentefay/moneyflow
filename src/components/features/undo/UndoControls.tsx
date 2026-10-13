"use client";

import { Redo2, Undo2 } from "lucide-react";
import { useMemo } from "react";

import { useCommands, useShortcutPlatform } from "@/components/features/commands";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type AppCommand, formatShortcut, GLOBAL_COMMANDS } from "@/lib/commands";
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
    const platform = useShortcutPlatform();
    const undoKeys = formatShortcut(GLOBAL_COMMANDS.undo.shortcut, platform).join(" or ");
    const redoKeys = formatShortcut(GLOBAL_COMMANDS.redo.shortcut, platform).join(" or ");

    return (
        <div className={cn("flex items-center gap-1", className)} aria-label="History controls">
            <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>Undo ({undoKeys})</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>Redo ({redoKeys})</TooltipContent>
            </Tooltip>
        </div>
    );
}
