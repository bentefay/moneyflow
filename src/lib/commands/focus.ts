import type { ShortcutFocus } from "./shortcut";

/** Whether keys pressed at this target type text, so a shortcut must not take them. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    if (target.matches("input, textarea, select")) return true;
    return (
        target.closest(
            '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"], [role="textbox"]'
        ) != null
    );
}

/** Where a key event's target sits, for deciding which shortcuts may fire. */
export function shortcutFocusOf(target: EventTarget | null): ShortcutFocus {
    return {
        inGrid: target instanceof Element && target.closest('[role="grid"]') != null,
        inTextEntry: isTextEntryTarget(target)
    };
}
