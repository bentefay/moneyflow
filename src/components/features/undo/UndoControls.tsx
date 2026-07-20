"use client";

import { Redo2, Undo2 } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVaultUndo } from "@/lib/crdt/undo";
import { cn } from "@/lib/utils";

export interface UndoControlsProps {
    className?: string;
}

type UndoKeyboardAction = "redo" | "undo";

interface UndoKeyboardEvent {
    altKey: boolean;
    ctrlKey: boolean;
    defaultPrevented: boolean;
    key: string;
    metaKey: boolean;
    shiftKey: boolean;
    target: EventTarget | null;
}

export function isEditableUndoTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    if (target.matches("input, textarea, select")) return true;
    return (
        target.closest(
            '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"], [role="textbox"]'
        ) != null
    );
}

export function getUndoKeyboardAction(event: UndoKeyboardEvent): UndoKeyboardAction | null {
    if (
        event.defaultPrevented ||
        event.altKey ||
        (!event.ctrlKey && !event.metaKey) ||
        isEditableUndoTarget(event.target)
    ) {
        return null;
    }

    const key = event.key.toLowerCase();
    if (key === "z") return event.shiftKey ? "redo" : "undo";
    if (key === "y") return "redo";
    return null;
}

/** Installs one document-level shortcut listener for the authenticated vault shell. */
export function UndoKeyboardShortcuts() {
    const { redo, undo } = useVaultUndo();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const action = getUndoKeyboardAction(event);
            if (!action) return;

            const changed = action === "undo" ? undo() : redo();
            if (changed) event.preventDefault();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [redo, undo]);

    return null;
}

/** Visible document undo and redo controls. */
export function UndoControls({ className }: UndoControlsProps) {
    const { canRedo, canUndo, redo, undo } = useVaultUndo();

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
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
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
                <TooltipContent>Redo (Ctrl+Shift+Z or Ctrl+Y)</TooltipContent>
            </Tooltip>
        </div>
    );
}
