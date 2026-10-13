import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    type CommandShortcut,
    detectShortcutPlatform,
    formatBinding,
    isPlainBinding,
    resolveBinding,
    shortcutAllowed,
    shortcutBindingsFor
} from "@/lib/commands";

describe("shortcut formatting", () => {
    it.each([
        { binding: "$mod+KeyK", mac: "⌘K", other: "Ctrl+K" },
        { binding: "$mod+Shift+KeyF", mac: "⌘⇧F", other: "Ctrl+Shift+F" },
        { binding: "$mod+Shift+KeyZ", mac: "⌘⇧Z", other: "Ctrl+Shift+Z" },
        { binding: "Alt+KeyN", mac: "⌥N", other: "Alt+N" },
        { binding: "$mod+Backspace", mac: "⌘⌫", other: "Ctrl+Backspace" },
        { binding: "[Shift]+?", mac: "?", other: "?" },
        { binding: "g t", mac: "G then T", other: "G then T" },
        { binding: "Shift+ArrowUp", mac: "⇧↑", other: "Shift+↑" },
        { binding: "Alt+ArrowLeft", mac: "⌥←", other: "Alt+←" },
        { binding: "$mod+Home", mac: "⌘Home", other: "Ctrl+Home" },
        { binding: "PageDown", mac: "Page Down", other: "Page Down" },
        { binding: "Enter", mac: "↩", other: "Enter" },
        { binding: "Escape", mac: "Esc", other: "Esc" },
        { binding: "Delete", mac: "⌦", other: "Delete" },
        { binding: "Digit1", mac: "1", other: "1" }
    ])("writes $binding as $mac on a Mac and $other elsewhere", ({ binding, mac, other }) => {
        expect(formatBinding(binding, "mac")).toBe(mac);
        expect(formatBinding(binding, "other")).toBe(other);
    });

    it.each([
        { expected: "mac", platform: "MacIntel" },
        { expected: "mac", platform: "iPhone" },
        { expected: "mac", platform: "iPad" },
        { expected: "other", platform: "Win32" },
        { expected: "other", platform: "Linux x86_64" },
        { expected: "other", platform: undefined }
    ] as const)("treats $platform as $expected", ({ platform, expected }) => {
        expect(detectShortcutPlatform(platform)).toBe(expected);
    });

    it("never writes a modifier token literally", () => {
        const modifier = fc.constantFrom("$mod", "Alt", "Shift", "Control", "Meta");
        const key = fc.constantFrom("KeyA", "KeyZ", "Digit3", "Backspace", "ArrowUp", "?");
        fc.assert(
            fc.property(
                fc.uniqueArray(modifier, { maxLength: 3 }),
                key,
                fc.constantFrom("mac", "other") satisfies fc.Arbitrary<"mac" | "other">,
                (modifiers, pressed, platform) => {
                    const text = formatBinding([...modifiers, pressed].join("+"), platform);
                    expect(text).not.toMatch(/\$mod|Key[A-Z]|Digit/);
                }
            )
        );
    });
});

describe("where a shortcut may fire", () => {
    const MODIFIED: CommandShortcut = { keys: ["$mod+KeyI"] };
    const MODIFIED_IN_TEXT: CommandShortcut = { inTextEntry: true, keys: ["$mod+KeyK"] };
    const PLAIN: CommandShortcut = { keys: ["g t"] };

    it.each([
        { binding: "g t", plain: true },
        { binding: "[Shift]+?", plain: true },
        { binding: "Shift+ArrowUp", plain: true },
        { binding: "$mod+KeyK", plain: false },
        { binding: "Alt+KeyN", plain: false },
        { binding: "Control+KeyZ", plain: false }
    ])("classifies $binding as plain: $plain", ({ binding, plain }) => {
        expect(isPlainBinding(binding)).toBe(plain);
    });

    it.each([
        { allowed: true, focus: { inGrid: false, inTextEntry: false }, shortcut: PLAIN },
        { allowed: false, focus: { inGrid: true, inTextEntry: false }, shortcut: PLAIN },
        { allowed: false, focus: { inGrid: false, inTextEntry: true }, shortcut: PLAIN },
        { allowed: true, focus: { inGrid: true, inTextEntry: false }, shortcut: MODIFIED },
        { allowed: false, focus: { inGrid: true, inTextEntry: true }, shortcut: MODIFIED },
        { allowed: true, focus: { inGrid: true, inTextEntry: true }, shortcut: MODIFIED_IN_TEXT }
    ])("$shortcut.keys with focus $focus fires: $allowed", ({ shortcut, focus, allowed }) => {
        expect(shortcutAllowed(shortcut, shortcut.keys[0], focus)).toBe(allowed);
    });

    it("never lets a plain key fire in the grid or a text field, whatever it declares", () => {
        fc.assert(
            fc.property(fc.boolean(), fc.boolean(), fc.boolean(), (inGrid, inText, declared) => {
                fc.pre(inGrid || inText);
                const shortcut: CommandShortcut = { inTextEntry: declared, keys: ["?"] };
                expect(shortcutAllowed(shortcut, "?", { inGrid, inTextEntry: inText })).toBe(false);
            })
        );
    });
});

describe("binding resolution", () => {
    it.each([
        { binding: "$mod+KeyK", mac: "Meta+KeyK", other: "Control+KeyK" },
        { binding: "$mod+Shift+KeyZ", mac: "Meta+Shift+KeyZ", other: "Control+Shift+KeyZ" },
        { binding: "Alt+KeyN", mac: "Alt+KeyN", other: "Alt+KeyN" },
        { binding: "[Shift]+?", mac: "[Shift]+?", other: "[Shift]+?" },
        { binding: "g t", mac: "g t", other: "g t" }
    ])("resolves $binding per platform", ({ binding, mac, other }) => {
        expect(resolveBinding(binding, "mac")).toBe(mac);
        expect(resolveBinding(binding, "other")).toBe(other);
    });

    it("collapses an unlisted equivalent onto the listed binding so it fires once", () => {
        const undo: CommandShortcut = {
            alsoKeys: ["Control+KeyZ", "Meta+KeyZ"],
            keys: ["$mod+KeyZ"]
        };
        expect(shortcutBindingsFor(undo, "other")).toEqual(["Control+KeyZ", "Meta+KeyZ"]);
        expect(shortcutBindingsFor(undo, "mac")).toEqual(["Meta+KeyZ", "Control+KeyZ"]);
    });
});
