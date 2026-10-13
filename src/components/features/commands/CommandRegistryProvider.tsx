"use client";

/**
 * Command registry provider: the palette, the keyboard shortcuts and the cheat sheet, all reading one
 * registry.
 *
 * Pages register commands with {@link useCommands} while they are mounted. Shortcuts are matched by
 * tinykeys against the registered bindings, so a shortcut exists only as a registered command and
 * the palette and cheat sheet list exactly what the keyboard does.
 */

import { usePathname } from "next/navigation";
import {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    useSyncExternalStore
} from "react";
import { tinykeys, type KeybindingsMap } from "tinykeys";

import {
    type AppCommand,
    type CommandRegistryStore,
    createCommandRegistryStore,
    resolveShortcutCommand,
    shortcutBindings,
    shortcutFocusOf
} from "@/lib/commands";

import { CommandPalette } from "./CommandPalette";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";

interface CommandRegistryContextValue {
    readonly store: CommandRegistryStore;
    readonly openPalette: () => void;
    readonly togglePalette: () => void;
    readonly openShortcuts: () => void;
}

const CommandRegistryContext = createContext<CommandRegistryContextValue | null>(null);

function useCommandRegistryContext(): CommandRegistryContextValue {
    const context = useContext(CommandRegistryContext);
    if (context == null) {
        throw new Error("Command registry hooks must be used within a CommandRegistryProvider");
    }
    return context;
}

/**
 * Registers commands for as long as the caller is mounted. Pass a memoised array.
 *
 * Outside a provider this registers nothing, so a page or component can be rendered on its own.
 */
export function useCommands(commands: readonly AppCommand[]): void {
    const store = useContext(CommandRegistryContext)?.store;
    useLayoutEffect(() => store?.register(commands), [commands, store]);
}

/** Opens the palette or the cheat sheet from a command or a control. */
export function useCommandSurfaces(): Pick<
    CommandRegistryContextValue,
    "openPalette" | "togglePalette" | "openShortcuts"
> {
    const { openPalette, openShortcuts, togglePalette } = useCommandRegistryContext();
    return { openPalette, openShortcuts, togglePalette };
}

/** The registered commands, live. */
export function useRegisteredCommands(): readonly AppCommand[] {
    const { store } = useCommandRegistryContext();
    return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** Binds every registered shortcut through tinykeys, rebinding when registrations change. */
function useShortcutKeybindings(commands: readonly AppCommand[]): void {
    useEffect(() => {
        const keybindings: KeybindingsMap = {};
        for (const [binding, candidates] of shortcutBindings(commands)) {
            keybindings[binding] = (event) => {
                // The grid and editors claim their keys first; a key they handled is not a shortcut.
                if (event.defaultPrevented) return;
                const command = resolveShortcutCommand(
                    candidates,
                    binding,
                    shortcutFocusOf(event.target)
                );
                if (command == null) return;
                event.preventDefault();
                command.run();
            };
        }
        return tinykeys(window, keybindings, {
            ignore: (event) => event.isComposing || event.keyCode === 229
        });
    }, [commands]);
}

export function CommandRegistryProvider({ children }: { readonly children: React.ReactNode }) {
    const [store] = useState(createCommandRegistryStore);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const commands = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const pathname = usePathname();
    useShortcutKeybindings(commands);

    // A palette or cheat sheet left open across navigation would list the previous page's commands.
    const [shownPathname, setShownPathname] = useState(pathname);
    if (shownPathname !== pathname) {
        setShownPathname(pathname);
        setPaletteOpen(false);
        setShortcutsOpen(false);
    }

    const value = useMemo<CommandRegistryContextValue>(
        () => ({
            openPalette: () => {
                setShortcutsOpen(false);
                setPaletteOpen(true);
            },
            openShortcuts: () => {
                setPaletteOpen(false);
                setShortcutsOpen(true);
            },
            store,
            togglePalette: () => {
                setShortcutsOpen(false);
                setPaletteOpen((open) => !open);
            }
        }),
        [store]
    );

    return (
        <CommandRegistryContext.Provider value={value}>
            {children}
            <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />
            <KeyboardShortcutsDialog
                open={shortcutsOpen}
                onOpenChange={setShortcutsOpen}
                commands={commands}
            />
        </CommandRegistryContext.Provider>
    );
}
