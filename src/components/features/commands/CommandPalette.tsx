"use client";

import { useRef } from "react";

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import {
    type ActionCommand,
    type AppCommand,
    COMMAND_GROUP_ORDER,
    formatBinding,
    paletteCommands
} from "@/lib/commands";

import { useShortcutPlatform } from "./use-shortcut-platform";

export interface CommandPaletteProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly commands: readonly AppCommand[];
}

/** Cmd/Ctrl+K: search and run the global commands and the current page's. */
export function CommandPalette({ open, onOpenChange, commands }: CommandPaletteProps) {
    const platform = useShortcutPlatform();
    // A chosen command runs once the dialog has closed and would otherwise return focus to where it
    // was opened from, so a command that moves focus (Add, Focus search) keeps it.
    const chosen = useRef<ActionCommand | null>(null);
    const available = open ? paletteCommands(commands) : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="overflow-hidden p-0"
                showCloseButton={false}
                data-testid="command-palette"
                onCloseAutoFocus={(event) => {
                    const command = chosen.current;
                    chosen.current = null;
                    if (command == null) return;
                    event.preventDefault();
                    command.run();
                }}
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>Command palette</DialogTitle>
                    <DialogDescription>Search for a command to run</DialogDescription>
                </DialogHeader>
                <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2">
                    <CommandInput placeholder="Type a command or search…" />
                    <CommandList className="max-h-[min(24rem,60vh)]">
                        <CommandEmpty>No matching commands.</CommandEmpty>
                        {COMMAND_GROUP_ORDER.map((group) => {
                            const grouped = available.filter((command) => command.group === group);
                            if (grouped.length === 0) return null;
                            return (
                                <CommandGroup key={group} heading={group}>
                                    {grouped.map((command) => (
                                        <CommandItem
                                            key={command.id}
                                            value={command.id}
                                            keywords={[command.title, ...(command.keywords ?? [])]}
                                            onSelect={() => {
                                                chosen.current = command;
                                                onOpenChange(false);
                                            }}
                                        >
                                            <span>{command.title}</span>
                                            {command.shortcut != null && (
                                                <Kbd className="ml-auto">
                                                    {formatBinding(
                                                        command.shortcut.keys[0],
                                                        platform
                                                    )}
                                                </Kbd>
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            );
                        })}
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
}
