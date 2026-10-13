/**
 * The one command registry the palette, the keyboard shortcuts and the cheat sheet all read.
 *
 * Pages and components register commands while they are mounted, so the palette offers exactly what
 * the current page can do and a shortcut can never be bound without also being listed.
 */

import type { CommandShortcut, ShortcutFocus, ShortcutPlatform } from "./shortcut";
import { shortcutAllowed, shortcutBindingsFor } from "./shortcut";

/** Where a command applies: everywhere, on the current page, or only with the grid focused. */
export type CommandScope = "global" | "page" | "grid";

/** The heading a command is listed under, in the palette and the cheat sheet. */
export type CommandGroup = "General" | "Navigation" | "Transactions" | "Grid";

export const COMMAND_GROUP_ORDER: readonly CommandGroup[] = [
    "General",
    "Navigation",
    "Transactions",
    "Grid"
];

interface CommandBase {
    readonly id: string;
    readonly title: string;
    readonly keywords?: readonly string[];
    readonly group: CommandGroup;
    readonly scope: CommandScope;
}

/** A command the palette can run and, given a shortcut, the keyboard can trigger. */
export interface ActionCommand extends CommandBase {
    readonly kind: "action";
    readonly scope: "global" | "page";
    readonly shortcut?: CommandShortcut;
    /** Whether the command can run right now, e.g. "a row is selected". Absent means always. */
    readonly when?: () => boolean;
    readonly run: () => void;
}

/**
 * A key the grid handles itself, listed so the cheat sheet is complete. Never bound by the
 * registry and never offered in the palette.
 */
export interface ReferenceCommand extends CommandBase {
    readonly kind: "reference";
    readonly scope: "grid";
    readonly shortcut: CommandShortcut;
}

export type AppCommand = ActionCommand | ReferenceCommand;

function isAvailable(command: ActionCommand): boolean {
    return command.when?.() ?? true;
}

/** The commands the palette offers: every runnable global and page command, in group order. */
export function paletteCommands(commands: readonly AppCommand[]): readonly ActionCommand[] {
    const runnable = commands.filter(
        (command): command is ActionCommand => command.kind === "action" && isAvailable(command)
    );
    return COMMAND_GROUP_ORDER.flatMap((group) =>
        runnable.filter((command) => command.group === group)
    );
}

export interface CheatSheetSection {
    readonly group: CommandGroup;
    readonly commands: readonly (AppCommand & { readonly shortcut: CommandShortcut })[];
}

function hasShortcut(
    command: AppCommand
): command is AppCommand & { readonly shortcut: CommandShortcut } {
    return command.shortcut != null;
}

/** Every registered shortcut, grouped. Listed whether or not it can run right now. */
export function cheatSheetSections(commands: readonly AppCommand[]): readonly CheatSheetSection[] {
    const withShortcuts = commands.filter(hasShortcut);
    return COMMAND_GROUP_ORDER.flatMap((group) => {
        const grouped = withShortcuts.filter((command) => command.group === group);
        return grouped.length === 0 ? [] : [{ commands: grouped, group }];
    });
}

/**
 * Platform-resolved binding → the action commands bound to it, most recently registered last.
 * Grid references are never bound: the grid handles those keys itself.
 */
export function shortcutBindings(
    commands: readonly AppCommand[],
    platform: ShortcutPlatform
): ReadonlyMap<string, readonly ActionCommand[]> {
    const bindings = new Map<string, ActionCommand[]>();
    for (const command of commands) {
        if (command.kind !== "action" || command.shortcut == null) continue;
        for (const binding of shortcutBindingsFor(command.shortcut, platform)) {
            bindings.set(binding, [...(bindings.get(binding) ?? []), command]);
        }
    }
    return bindings;
}

/**
 * The command a pressed binding runs: the most recently registered one that may fire with focus
 * where it is and can run right now, so a page's command wins over a global one on the same keys.
 */
export function resolveShortcutCommand(
    candidates: readonly ActionCommand[],
    binding: string,
    focus: ShortcutFocus
): ActionCommand | undefined {
    return candidates.findLast(
        (command) =>
            command.shortcut != null &&
            shortcutAllowed(command.shortcut, binding, focus) &&
            isAvailable(command)
    );
}

type RegistryListener = () => void;

/** The mutable registration store, contained behind subscribe/snapshot for `useSyncExternalStore`. */
export interface CommandRegistryStore {
    readonly register: (commands: readonly AppCommand[]) => () => void;
    readonly subscribe: (listener: RegistryListener) => () => void;
    readonly getSnapshot: () => readonly AppCommand[];
}

export function createCommandRegistryStore(): CommandRegistryStore {
    const registrations = new Map<symbol, readonly AppCommand[]>();
    const listeners = new Set<RegistryListener>();
    let snapshot: readonly AppCommand[] = [];

    const publish = () => {
        snapshot = [...registrations.values()].flat();
        for (const listener of listeners) listener();
    };

    return {
        getSnapshot: () => snapshot,
        register: (commands) => {
            const token = Symbol("command-registration");
            registrations.set(token, commands);
            publish();
            return () => {
                if (registrations.delete(token)) publish();
            };
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
}
