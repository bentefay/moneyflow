/**
 * Tests for the page-side source strings, WITHOUT a browser.
 *
 * These strings are evaluated inside the page, so nothing in the normal
 * type-check or lint pass looks inside them. Two defects in this harness's history
 * lived in exactly that blind spot:
 *
 *  - a plain template literal collapsed the page-side `\(` to `(`, turning a
 *    literal paren into a regex capture group, so `translateY(0px)` stopped
 *    matching and the notes pass reported 0 of 20 rows reachable;
 *  - a backtick inside a comment in one of these strings terminated the template
 *    literal, which at least failed loudly at parse time.
 *
 * So: every source is parsed here, and the escapes that must survive are asserted
 * character by character.
 */

import { describe, expect, it } from "vitest";

import {
    GRID_CLEAN_SAMPLE_LOOP_SOURCE,
    GRID_SAMPLE_LOOP_SOURCE,
    HOLD_SCROLL_OFFSET_SOURCE,
    INSTALL_GRID_OBSERVER_SOURCE,
    PREFIX_PRELOAD_SOURCE
} from "./grid-sampler";

const SOURCES: readonly (readonly [string, string])[] = [
    ["INSTALL_GRID_OBSERVER_SOURCE", INSTALL_GRID_OBSERVER_SOURCE],
    ["HOLD_SCROLL_OFFSET_SOURCE", HOLD_SCROLL_OFFSET_SOURCE],
    ["GRID_SAMPLE_LOOP_SOURCE", GRID_SAMPLE_LOOP_SOURCE],
    ["GRID_CLEAN_SAMPLE_LOOP_SOURCE", GRID_CLEAN_SAMPLE_LOOP_SOURCE],
    ["PREFIX_PRELOAD_SOURCE", PREFIX_PRELOAD_SOURCE]
];

describe("page-side sources", () => {
    for (const [name, source] of SOURCES) {
        it(`${name} parses as JavaScript`, () => {
            // The runner evaluates `${SOURCE}(args)`, so the string must be a
            // complete expression. Parsing it here is the cheapest way to catch a
            // stray backtick or an unbalanced brace without launching a browser.
            expect(() => new Function(`return ${source}`)).not.toThrow();
        });

        it(`${name} contains no backtick, which would terminate its template`, () => {
            expect(source).not.toContain("`");
        });
    }

    it("keeps the escaped paren in the translateY matcher, which String.raw is for", () => {
        // Two characters: a backslash then a paren. If the template literal ever
        // stops being String.raw, this collapses to a capture group and every row
        // silently reads as unpositioned.
        expect(GRID_SAMPLE_LOOP_SOURCE).toContain(String.raw`translateY\(`);
        expect(GRID_SAMPLE_LOOP_SOURCE.includes("translateY(\\s*")).toBe(false);
    });

    it("gives the clean loop no geometry access at all", () => {
        // The clean pass exists so the sampler cannot consume the frame budget it
        // is measuring. If any of these appear in it, it is not clean any more.
        for (const forbidden of [
            "getBoundingClientRect",
            "getComputedStyle",
            "querySelectorAll",
            "rowRectangles"
        ]) {
            expect(GRID_CLEAN_SAMPLE_LOOP_SOURCE, forbidden).not.toContain(forbidden);
        }
    });

    it("has the instrumented loop read the geometry the clean loop must not", () => {
        // The mirror image of the check above: if this ever stops holding, the
        // instrumented pass has stopped being able to see a blank frame.
        for (const required of ["getBoundingClientRect", "getComputedStyle", "rowRectangles"]) {
            expect(GRID_SAMPLE_LOOP_SOURCE, required).toContain(required);
        }
    });

    it("has both loops report their own per-sample cost", () => {
        for (const [name, source] of SOURCES.filter(([label]) => label.includes("SAMPLE_LOOP"))) {
            expect(source, name).toContain("sampleCostMilliseconds");
        }
    });

    it("resets the wheel witness at the start of every route", () => {
        // Counters that carried over would attribute one route's input to the next
        // and defeat the stimulus-fidelity check.
        for (const source of [GRID_SAMPLE_LOOP_SOURCE, GRID_CLEAN_SAMPLE_LOOP_SOURCE]) {
            expect(source).toContain("observer.events = 0");
            expect(source).toContain("observer.absoluteDeltaSum = 0");
        }
    });

    it("registers the wheel listener passively, so it cannot force main-thread scrolling", () => {
        expect(INSTALL_GRID_OBSERVER_SOURCE).toContain("passive: true");
    });
});
