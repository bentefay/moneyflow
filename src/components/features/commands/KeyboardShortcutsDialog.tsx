"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
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
            <DialogContent className="sm:max-w-3xl lg:max-w-4xl" data-testid="keyboard-shortcuts">
                <DialogHeader>
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                    <DialogDescription>
                        Shortcuts for this page. Press {platform === "mac" ? "⌘K" : "Ctrl+K"} to
                        search every command.
                    </DialogDescription>
                </DialogHeader>
                {/* Keys wrap rather than widen the grid, so it only ever scrolls vertically. */}
                <div className="grid max-h-[70vh] min-w-0 grid-cols-1 gap-x-8 gap-y-6 overflow-x-hidden overflow-y-auto sm:grid-cols-2">
                    {sections.map((section) => (
                        <section key={section.group} aria-label={section.group} className="min-w-0">
                            <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                                {section.group}
                            </h3>
                            <dl className="space-y-1.5 text-sm">
                                {section.commands.map((command) => (
                                    <div
                                        key={command.id}
                                        className="flex items-start justify-between gap-4"
                                    >
                                        <dt className="min-w-0">{command.title}</dt>
                                        <dd className="flex max-w-[55%] flex-wrap justify-end gap-1">
                                            {formatShortcut(command.shortcut, platform).map(
                                                (label) => (
                                                    <Kbd key={label}>{label}</Kbd>
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
