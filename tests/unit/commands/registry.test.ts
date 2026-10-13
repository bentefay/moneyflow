import { describe, expect, it, vi } from "vitest";

import {
    type ActionCommand,
    type AppCommand,
    cheatSheetSections,
    createCommandRegistryStore,
    GLOBAL_COMMANDS,
    GRID_REFERENCE_COMMANDS,
    isPlainBinding,
    NAVIGATION_DESTINATIONS,
    navigationCommandDefinition,
    paletteCommands,
    resolveShortcutCommand,
    shortcutBindings,
    TRANSACTION_COMMANDS
} from "@/lib/commands";

function action(id: string, overrides: Partial<Omit<ActionCommand, "kind">> = {}): ActionCommand {
    return {
        group: "General",
        id,
        kind: "action",
        run: vi.fn(),
        scope: "global",
        title: id,
        ...overrides
    };
}

const NOWHERE = { inGrid: false, inTextEntry: false };

describe("command registry", () => {
    it("offers runnable action commands in group order and never grid references", () => {
        const commands: readonly AppCommand[] = [
            action("add", { group: "Transactions", scope: "page" }),
            action("palette"),
            action("hidden", { when: () => false }),
            ...GRID_REFERENCE_COMMANDS,
            action("go", { group: "Navigation" })
        ];

        expect(paletteCommands(commands).map((command) => command.id)).toEqual([
            "palette",
            "go",
            "add"
        ]);
    });

    it("lists every shortcut in the cheat sheet, including references and unavailable commands", () => {
        const commands: readonly AppCommand[] = [
            action("no-shortcut"),
            action("busy", { shortcut: { keys: ["$mod+KeyB"] }, when: () => false }),
            ...GRID_REFERENCE_COMMANDS
        ];

        const sections = cheatSheetSections(commands);
        expect(sections.map((section) => section.group)).toEqual(["General", "Grid"]);
        expect(sections[0]?.commands.map((command) => command.id)).toEqual(["busy"]);
        expect(sections[1]?.commands).toHaveLength(GRID_REFERENCE_COMMANDS.length);
    });

    it("binds only action commands, once per alternative", () => {
        const redo = action("redo", { shortcut: { keys: ["$mod+Shift+KeyZ", "$mod+KeyY"] } });
        const bindings = shortcutBindings([redo, ...GRID_REFERENCE_COMMANDS]);

        expect([...bindings.keys()]).toEqual(["$mod+Shift+KeyZ", "$mod+KeyY"]);
    });

    it("runs the most recently registered command that may fire and can run", () => {
        const global = action("global", { shortcut: { keys: ["$mod+KeyJ"] } });
        const page = action("page", { scope: "page", shortcut: { keys: ["$mod+KeyJ"] } });
        const unavailable = action("unavailable", {
            shortcut: { keys: ["$mod+KeyJ"] },
            when: () => false
        });

        expect(resolveShortcutCommand([global, page, unavailable], "$mod+KeyJ", NOWHERE)).toBe(
            page
        );
        expect(
            resolveShortcutCommand([global, page], "$mod+KeyJ", {
                inGrid: false,
                inTextEntry: true
            })
        ).toBeUndefined();
    });

    it("publishes registrations and withdraws them on unmount", () => {
        const store = createCommandRegistryStore();
        const listener = vi.fn();
        store.subscribe(listener);
        const first = action("first");
        const second = action("second");

        const unregisterFirst = store.register([first]);
        store.register([second]);
        expect(store.getSnapshot()).toEqual([first, second]);

        unregisterFirst();
        unregisterFirst();
        expect(store.getSnapshot()).toEqual([second]);
        expect(listener).toHaveBeenCalledTimes(3);
    });
});

describe("command catalog", () => {
    const definitions = [
        ...Object.values(GLOBAL_COMMANDS),
        ...NAVIGATION_DESTINATIONS.map(navigationCommandDefinition),
        ...Object.values(TRANSACTION_COMMANDS),
        ...GRID_REFERENCE_COMMANDS
    ];

    it("gives every command a unique id", () => {
        const ids = definitions.map((definition) => definition.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("never binds the same keys twice", () => {
        const bindings = definitions.flatMap((definition) =>
            "shortcut" in definition && definition.shortcut != null ? definition.shortcut.keys : []
        );
        expect(new Set(bindings).size).toBe(bindings.length);
    });

    it("gives every page shortcut usable with the grid focused a Cmd, Ctrl or Alt", () => {
        for (const definition of Object.values(TRANSACTION_COMMANDS)) {
            if (!("shortcut" in definition)) continue;
            for (const binding of definition.shortcut.keys) {
                expect(isPlainBinding(binding), binding).toBe(false);
            }
        }
    });

    it("takes no browser-reserved shortcut", () => {
        const reserved = ["$mod+KeyN", "$mod+KeyT", "$mod+KeyW", "$mod+KeyF"];
        const bindings = definitions.flatMap((definition) =>
            "shortcut" in definition && definition.shortcut != null ? definition.shortcut.keys : []
        );
        for (const binding of reserved) expect(bindings).not.toContain(binding);
    });

    it("reaches every top-level page with its own letter", () => {
        const letters = NAVIGATION_DESTINATIONS.map((destination) => destination.letter);
        expect(new Set(letters).size).toBe(letters.length);
    });
});
