/**
 * Every command's identity, title and shortcut, in one place.
 *
 * Components attach behaviour with {@link actionCommand} when they register, so the shortcut table is
 * reviewable here and a unit test can prove no two commands claim the same keys.
 *
 * Inside the grid, plain letters start an edit and `?` and `/` are typable, so any shortcut that must
 * work with the grid focused carries Cmd/Ctrl or Alt. Cmd+N/T/W belong to the browser and plain
 * Cmd+F is the browser's find, so none of them is taken.
 */

import type { ActionCommand, ReferenceCommand } from "./registry";

/** A command's static identity: everything but its behaviour. */
export type ActionCommandDefinition = Omit<ActionCommand, "kind" | "run" | "when">;

export const GLOBAL_COMMANDS = {
    commandPalette: {
        group: "General",
        id: "command-palette",
        keywords: ["commands", "search", "actions"],
        scope: "global",
        shortcut: { inTextEntry: true, keys: ["$mod+KeyK"] },
        title: "Command palette"
    },
    keyboardShortcuts: {
        group: "General",
        id: "keyboard-shortcuts",
        keywords: ["help", "keys", "cheat sheet", "hotkeys"],
        scope: "global",
        shortcut: { keys: ["[Shift]+?"] },
        title: "Keyboard shortcuts"
    },
    undo: {
        group: "General",
        id: "undo",
        keywords: ["history", "revert"],
        scope: "global",
        // Ctrl or Cmd on every platform, as before the registry existed.
        shortcut: { alsoKeys: ["Control+KeyZ", "Meta+KeyZ"], keys: ["$mod+KeyZ"] },
        title: "Undo"
    },
    redo: {
        group: "General",
        id: "redo",
        keywords: ["history"],
        scope: "global",
        shortcut: {
            alsoKeys: ["Control+Shift+KeyZ", "Meta+Shift+KeyZ", "Control+KeyY", "Meta+KeyY"],
            keys: ["$mod+Shift+KeyZ", "$mod+KeyY"]
        },
        title: "Redo"
    }
} as const satisfies Record<string, ActionCommandDefinition>;

export interface NavigationDestination {
    readonly href: string;
    readonly title: string;
    /** The letter typed after G. */
    readonly letter: string;
    readonly keywords?: readonly string[];
}

/** The top-level pages, each reachable with G then a letter. */
export const NAVIGATION_DESTINATIONS: readonly NavigationDestination[] = [
    { href: "/transactions", letter: "t", title: "Transactions" },
    { href: "/accounts", letter: "a", title: "Accounts" },
    { href: "/people", letter: "p", title: "People" },
    { href: "/tags", keywords: ["labels"], letter: "l", title: "Tags" },
    { href: "/tx-descriptions", keywords: ["aliases"], letter: "d", title: "Tx Descriptions" },
    { href: "/statuses", letter: "u", title: "Statuses" },
    { href: "/automations", keywords: ["rules"], letter: "r", title: "Automations" },
    { href: "/imports", letter: "i", title: "Imports" },
    { href: "/settings", keywords: ["vault", "preferences"], letter: "s", title: "Vault Settings" }
];

export function navigationCommandDefinition(
    destination: NavigationDestination
): ActionCommandDefinition {
    return {
        group: "Navigation",
        id: `go-to:${destination.href}`,
        keywords: ["go", "navigate", "page", ...(destination.keywords ?? [])],
        scope: "global",
        shortcut: { keys: [`g ${destination.letter}`] },
        title: `Go to ${destination.title}`
    };
}

export const TRANSACTION_COMMANDS = {
    addTransaction: {
        group: "Transactions",
        id: "transactions:add",
        keywords: ["new", "create", "row"],
        scope: "page",
        shortcut: { keys: ["Alt+KeyN"] },
        title: "Add transaction"
    },
    toggleInspector: {
        group: "Transactions",
        id: "transactions:toggle-inspector",
        keywords: ["details", "panel", "sidebar", "notes"],
        scope: "page",
        shortcut: { inTextEntry: true, keys: ["$mod+KeyI"] },
        title: "Toggle inspector"
    },
    focusSearch: {
        group: "Transactions",
        id: "transactions:focus-search",
        keywords: ["find", "filter"],
        scope: "page",
        shortcut: { inTextEntry: true, keys: ["$mod+Shift+KeyF"] },
        title: "Focus search"
    },
    deleteSelected: {
        group: "Transactions",
        id: "transactions:delete-selected",
        keywords: ["remove", "rows", "trash"],
        scope: "page",
        shortcut: { keys: ["$mod+Backspace"] },
        title: "Delete selected transactions"
    },
    keepDuplicate: {
        group: "Transactions",
        id: "transactions:keep-duplicate",
        keywords: ["resolve", "duplicate", "not a duplicate"],
        scope: "page",
        title: "Resolve duplicate (keep)"
    }
} as const satisfies Record<string, ActionCommandDefinition>;

/** Attaches behaviour to a definition. */
export function actionCommand(
    definition: ActionCommandDefinition,
    run: () => void,
    when?: () => boolean
): ActionCommand {
    return when == null
        ? { ...definition, kind: "action", run }
        : { ...definition, kind: "action", run, when };
}

function gridReference(
    id: string,
    title: string,
    keys: readonly [string, ...string[]]
): ReferenceCommand {
    return {
        group: "Grid",
        id: `grid:${id}`,
        kind: "reference",
        scope: "grid",
        shortcut: { keys },
        title
    };
}

/** The keys the transaction grid handles itself, for the cheat sheet. */
export const GRID_REFERENCE_COMMANDS: readonly ReferenceCommand[] = [
    gridReference("move", "Move between cells", [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight"
    ]),
    gridReference("extend", "Extend the selection", [
        "Shift+ArrowUp",
        "Shift+ArrowDown",
        "Shift+ArrowLeft",
        "Shift+ArrowRight"
    ]),
    gridReference("edit", "Edit the cell, or save and move down", ["Enter"]),
    gridReference("escape", "Cancel the edit, then leave the grid", ["Escape"]),
    gridReference("tab", "Save and move to the next or previous cell", ["Tab", "Shift+Tab"]),
    gridReference("alt-move", "Save and move while editing", [
        "Alt+ArrowUp",
        "Alt+ArrowDown",
        "Alt+ArrowLeft",
        "Alt+ArrowRight"
    ]),
    gridReference("row-ends", "First or last cell in the row", ["Home", "End"]),
    gridReference("grid-ends", "First or last row", ["$mod+Home", "$mod+End"]),
    gridReference("page", "Move a page up or down", ["PageUp", "PageDown"]),
    gridReference("copy", "Copy the selected cells", ["$mod+KeyC"]),
    gridReference("clear", "Clear the selected cells", ["Delete", "Backspace"])
];
