/**
 * Keyboard shortcuts as data: one notation for matching and for display.
 *
 * Bindings use tinykeys' grammar, which is what matches them at runtime: `$mod+KeyK`, `Alt+KeyN`,
 * `[Shift]+?` (an optional modifier) and `g t` (a sequence of presses). Physical `Key*` codes keep
 * Option combinations working on macOS, where Option changes the character a key produces.
 *
 * Display is derived from the same strings, so a shortcut can never be shown differently from how
 * it is bound.
 */

export type ShortcutPlatform = "mac" | "other";

/**
 * One command's shortcut. `keys` are alternatives; the cheat sheet shows them all.
 *
 * A shortcut fires while typing in a text field only when `inTextEntry` says so. A shortcut with no
 * Ctrl, Cmd or Alt never fires in a text field or the grid, where plain keys type or start an edit.
 */
export interface CommandShortcut {
    readonly keys: readonly [string, ...string[]];
    readonly inTextEntry?: boolean;
}

/** Where keyboard focus is when a shortcut is pressed. */
export interface ShortcutFocus {
    readonly inTextEntry: boolean;
    readonly inGrid: boolean;
}

/** The platform tinykeys resolves `$mod` against, read the same way it reads it. */
export function detectShortcutPlatform(platform: string | undefined): ShortcutPlatform {
    return platform != null && /Mac|iPod|iPhone|iPad/.test(platform) ? "mac" : "other";
}

const PRIMARY_MODIFIERS = new Set(["$mod", "Control", "Meta", "Alt"]);

function pressModifiers(press: string): readonly string[] {
    return press.split(/(?<=\w|\])\+/).slice(0, -1);
}

/** Whether a binding has no Ctrl, Cmd or Alt in any press, so it would otherwise be typed text. */
export function isPlainBinding(binding: string): boolean {
    return binding
        .trim()
        .split(" ")
        .every(
            (press) => !pressModifiers(press).some((modifier) => PRIMARY_MODIFIERS.has(modifier))
        );
}

/** Whether a shortcut may fire with focus where it is. */
export function shortcutAllowed(
    shortcut: CommandShortcut,
    binding: string,
    focus: ShortcutFocus
): boolean {
    if (isPlainBinding(binding)) return !focus.inTextEntry && !focus.inGrid;
    return !focus.inTextEntry || shortcut.inTextEntry === true;
}

const MAC_MODIFIER_LABELS: Readonly<Record<string, string>> = {
    $mod: "⌘",
    Alt: "⌥",
    Control: "⌃",
    Meta: "⌘",
    Shift: "⇧"
};

const OTHER_MODIFIER_LABELS: Readonly<Record<string, string>> = {
    $mod: "Ctrl",
    Alt: "Alt",
    Control: "Ctrl",
    Meta: "Win",
    Shift: "Shift"
};

const SHARED_KEY_LABELS: Readonly<Record<string, string>> = {
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    End: "End",
    Escape: "Esc",
    Home: "Home",
    PageDown: "Page Down",
    PageUp: "Page Up",
    Tab: "Tab"
};

const MAC_KEY_LABELS: Readonly<Record<string, string>> = {
    ...SHARED_KEY_LABELS,
    Backspace: "⌫",
    Delete: "⌦",
    Enter: "↩"
};

const OTHER_KEY_LABELS: Readonly<Record<string, string>> = {
    ...SHARED_KEY_LABELS,
    Backspace: "Backspace",
    Delete: "Delete",
    Enter: "Enter"
};

function keyLabel(key: string, platform: ShortcutPlatform): string {
    const named = (platform === "mac" ? MAC_KEY_LABELS : OTHER_KEY_LABELS)[key];
    if (named != null) return named;
    const code = /^(?:Key|Digit)(.)$/.exec(key);
    if (code?.[1] != null) return code[1];
    return key.length === 1 ? key.toUpperCase() : key;
}

function formatPress(press: string, platform: ShortcutPlatform): string {
    const parts = press.split(/(?<=\w|\])\+/);
    const key = parts.at(-1) ?? press;
    const labels = platform === "mac" ? MAC_MODIFIER_LABELS : OTHER_MODIFIER_LABELS;
    // Optional modifiers such as `[Shift]` are how a key is reached, not part of the shortcut.
    const modifiers = parts
        .slice(0, -1)
        .filter((modifier) => !modifier.startsWith("["))
        .map((modifier) => labels[modifier] ?? modifier);
    const keyText = keyLabel(key, platform);
    return platform === "mac"
        ? [...modifiers, keyText].join("")
        : [...modifiers, keyText].join("+");
}

/** One binding as the platform writes it: `⌘K` on a Mac, `Ctrl+K` elsewhere, `G then T`. */
export function formatBinding(binding: string, platform: ShortcutPlatform): string {
    return binding
        .trim()
        .split(" ")
        .map((press) => formatPress(press, platform))
        .join(" then ");
}

/** Every alternative of a shortcut, formatted. */
export function formatShortcut(
    shortcut: CommandShortcut,
    platform: ShortcutPlatform
): readonly string[] {
    return shortcut.keys.map((binding) => formatBinding(binding, platform));
}
