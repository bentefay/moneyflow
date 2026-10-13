"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { type AppCommand, cheatSheetSections, formatShortcut } from "@/lib/commands";

import { useShortcutPlatform } from "./use-shortcut-platform";

export interface KeyboardShortcutsDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly commands: readonly AppCommand[];
}

/** The cheat sheet: every registered shortcut, generated from the same registry the keys use. */
export function KeyboardShortcutsDialog({
    open,
    onOpenChange,
    commands
}: KeyboardShortcutsDialogProps) {
    const platform = useShortcutPlatform();
    const sections = open ? cheatSheetSections(commands) : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl" data-testid="keyboard-shortcuts">
                <DialogHeader>
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                    <DialogDescription>
                        Shortcuts for this page. Press {platform === "mac" ? "⌘K" : "Ctrl+K"} to
                        search every command.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid max-h-[70vh] gap-6 overflow-y-auto sm:grid-cols-2">
                    {sections.map((section) => (
                        <section key={section.group} aria-label={section.group}>
                            <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                                {section.group}
                            </h3>
                            <dl className="space-y-1.5 text-sm">
                                {section.commands.map((command) => (
                                    <div
                                        key={command.id}
                                        className="flex items-start justify-between gap-4"
                                    >
                                        <dt>{command.title}</dt>
                                        <dd className="flex shrink-0 flex-wrap justify-end gap-1">
                                            {formatShortcut(command.shortcut, platform).map(
                                                (label) => (
                                                    <kbd
                                                        key={label}
                                                        className="bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-xs"
                                                    >
                                                        {label}
                                                    </kbd>
                                                )
                                            )}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
