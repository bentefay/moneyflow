import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    dragEdgeScrollVelocity,
    GRID_DRAG_EDGE_PX,
    GRID_DRAG_MAX_SPEED_PX,
    type GridRect,
    revealScrollDelta
} from "@/components/features/transactions/table-model/grid-viewport";

const VIEWPORT: GridRect = { top: 100, bottom: 500, left: 0, right: 800 };
const STICKY_TOP = 37;
const GRID_VIEWPORT_SEED = 0x67726964;

function rect(top: number, left: number, height = 57, width = 120): GridRect {
    return { top, bottom: top + height, left, right: left + width };
}

describe("revealScrollDelta", () => {
    it.each([
        ["already visible", rect(200, 100), { top: 0, left: 0 }],
        ["below the viewport", rect(480, 100), { top: 37, left: 0 }],
        ["above the viewport", rect(20, 100), { top: -117, left: 0 }],
        ["hidden under the sticky header", rect(110, 100), { top: -27, left: 0 }],
        ["exactly below the sticky header", rect(137, 100), { top: 0, left: 0 }],
        ["right of the viewport", rect(200, 750), { top: 0, left: 70 }],
        ["left of the viewport", rect(200, -40), { top: 0, left: -40 }],
        ["taller than the visible span aligns its top", rect(200, 100, 500), { top: 63, left: 0 }]
    ])("%s", (_name, target, expected) => {
        expect(revealScrollDelta(VIEWPORT, target, STICKY_TOP)).toEqual(expected);
    });

    it("always leaves a target that fits fully visible below the sticky header", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -2_000, max: 2_000 }),
                fc.integer({ min: -2_000, max: 2_000 }),
                fc.integer({ min: 1, max: 300 }),
                fc.integer({ min: 1, max: 700 }),
                (top, left, height, width) => {
                    const target = rect(top, left, height, width);
                    const delta = revealScrollDelta(VIEWPORT, target, STICKY_TOP);
                    expect(target.top - delta.top).toBeGreaterThanOrEqual(
                        VIEWPORT.top + STICKY_TOP
                    );
                    expect(target.bottom - delta.top).toBeLessThanOrEqual(VIEWPORT.bottom);
                    expect(target.left - delta.left).toBeGreaterThanOrEqual(VIEWPORT.left);
                    expect(target.right - delta.left).toBeLessThanOrEqual(VIEWPORT.right);
                }
            ),
            { seed: GRID_VIEWPORT_SEED }
        );
    });
});

describe("dragEdgeScrollVelocity", () => {
    it.each([
        ["centre of the viewport", { x: 400, y: 300 }, { top: 0, left: 0 }],
        ["at the bottom edge", { x: 400, y: 500 }, { top: GRID_DRAG_MAX_SPEED_PX, left: 0 }],
        ["past the bottom edge", { x: 400, y: 900 }, { top: GRID_DRAG_MAX_SPEED_PX, left: 0 }],
        [
            "just inside the bottom band",
            { x: 400, y: 500 - GRID_DRAG_EDGE_PX + 1 },
            { top: 1, left: 0 }
        ],
        ["under the sticky header", { x: 400, y: 120 }, { top: -GRID_DRAG_MAX_SPEED_PX, left: 0 }],
        ["past the right edge", { x: 900, y: 300 }, { top: 0, left: GRID_DRAG_MAX_SPEED_PX }],
        ["at the left edge", { x: 0, y: 300 }, { top: 0, left: -GRID_DRAG_MAX_SPEED_PX }]
    ])("%s", (_name, pointer, expected) => {
        expect(dragEdgeScrollVelocity(VIEWPORT, pointer, STICKY_TOP)).toEqual(expected);
    });

    it("never exceeds the maximum speed and only scrolls toward the nearer edge", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1_000, max: 2_000 }),
                fc.integer({ min: -1_000, max: 2_000 }),
                (x, y) => {
                    const velocity = dragEdgeScrollVelocity(VIEWPORT, { x, y }, STICKY_TOP);
                    expect(Math.abs(velocity.top)).toBeLessThanOrEqual(GRID_DRAG_MAX_SPEED_PX);
                    expect(Math.abs(velocity.left)).toBeLessThanOrEqual(GRID_DRAG_MAX_SPEED_PX);
                    if (velocity.top < 0)
                        expect(y).toBeLessThan(VIEWPORT.top + STICKY_TOP + GRID_DRAG_EDGE_PX);
                    if (velocity.top > 0)
                        expect(y).toBeGreaterThan(VIEWPORT.bottom - GRID_DRAG_EDGE_PX);
                }
            ),
            { seed: GRID_VIEWPORT_SEED }
        );
    });
});
