/**
 * Pure viewport geometry for the transaction grid's own scroll container.
 *
 * Keyboard movement focuses cells with `preventScroll` so that focus never scrolls an ancestor, and
 * a pointer drag must keep scrolling while the pointer rests near an edge. Both decisions are made
 * here from plain rectangles so they can be tested without layout, and applied by a thin DOM
 * adapter to the grid's scroll element only.
 */

/** A rectangle in viewport coordinates, as `getBoundingClientRect` reports. */
export interface GridRect {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
}

export interface GridScrollDelta {
    readonly top: number;
    readonly left: number;
}

export interface GridPoint {
    readonly x: number;
    readonly y: number;
}

/** Distance from a viewport edge, in pixels, inside which a drag starts scrolling. */
export const GRID_DRAG_EDGE_PX = 32;
/** Scroll speed, in pixels per animation frame, when the pointer is at or past an edge. */
export const GRID_DRAG_MAX_SPEED_PX = 24;

function axisDelta(start: number, end: number, visibleStart: number, visibleEnd: number): number {
    // A target larger than the visible span aligns its start, so its leading edge stays readable.
    if (start < visibleStart || end - start > visibleEnd - visibleStart)
        return start - visibleStart;
    if (end > visibleEnd) return end - visibleEnd;
    return 0;
}

/**
 * The smallest scroll that brings `target` fully inside the visible part of `viewport`, where the
 * top `stickyTop` pixels are covered by the sticky header row. Zero when already visible.
 */
export function revealScrollDelta(
    viewport: GridRect,
    target: GridRect,
    stickyTop: number
): GridScrollDelta {
    return {
        top: axisDelta(target.top, target.bottom, viewport.top + stickyTop, viewport.bottom),
        left: axisDelta(target.left, target.right, viewport.left, viewport.right)
    };
}

function edgeSpeed(position: number, start: number, end: number): number {
    const fromStart = position - start;
    const fromEnd = end - position;
    if (fromStart < GRID_DRAG_EDGE_PX) {
        const depth = Math.min(1, (GRID_DRAG_EDGE_PX - fromStart) / GRID_DRAG_EDGE_PX);
        return -Math.ceil(depth * GRID_DRAG_MAX_SPEED_PX);
    }
    if (fromEnd < GRID_DRAG_EDGE_PX) {
        const depth = Math.min(1, (GRID_DRAG_EDGE_PX - fromEnd) / GRID_DRAG_EDGE_PX);
        return Math.ceil(depth * GRID_DRAG_MAX_SPEED_PX);
    }
    return 0;
}

/**
 * Per-frame scroll velocity for a drag whose pointer is at `pointer`. Speed grows linearly as the
 * pointer moves into the edge band below the sticky header or along the other edges, and is capped
 * once the pointer reaches or passes the edge.
 */
export function dragEdgeScrollVelocity(
    viewport: GridRect,
    pointer: GridPoint,
    stickyTop: number
): GridScrollDelta {
    return {
        top: edgeSpeed(pointer.y, viewport.top + stickyTop, viewport.bottom),
        left: edgeSpeed(pointer.x, viewport.left, viewport.right)
    };
}

/** The visible client box of a scroll container, excluding its borders and scrollbars. */
export function scrollViewportRect(element: HTMLElement): GridRect {
    const box = element.getBoundingClientRect();
    const top = box.top + element.clientTop;
    const left = box.left + element.clientLeft;
    return {
        top,
        bottom: top + element.clientHeight,
        left,
        right: left + element.clientWidth
    };
}

/** The height of the sticky header row inside a grid scroll container, or zero without one. */
export function stickyHeaderHeight(scrollElement: HTMLElement): number {
    const header = scrollElement.querySelector<HTMLElement>(
        '[role="grid"] [role="row"][aria-rowindex="1"]'
    );
    return header?.getBoundingClientRect().height ?? 0;
}

/** Scrolls only `scrollElement` so that `target` is fully visible below the sticky header. */
export function revealInGridViewport(scrollElement: HTMLElement, target: HTMLElement): void {
    const delta = revealScrollDelta(
        scrollViewportRect(scrollElement),
        target.getBoundingClientRect(),
        stickyHeaderHeight(scrollElement)
    );
    if (delta.top !== 0) scrollElement.scrollTop += delta.top;
    if (delta.left !== 0) scrollElement.scrollLeft += delta.left;
}
