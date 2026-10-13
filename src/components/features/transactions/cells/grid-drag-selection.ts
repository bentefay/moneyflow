/**
 * Pointer adapter for rectangular drag selection in the transaction grid.
 *
 * TanStack's cell selection only extends on per-cell `mouseenter`, which never fires while the grid
 * scrolls under a stationary pointer and cannot see rows the virtualizer mounts mid-drag. This
 * adapter instead hit-tests the point under the pointer on every move and every edge-scroll frame,
 * and hands whatever cell it finds to the controller, which owns the canonical selection.
 */

import {
    dragEdgeScrollVelocity,
    type GridPoint,
    scrollViewportRect,
    stickyHeaderHeight
} from "../table-model/grid-viewport";

export interface GridDragSelectionOptions {
    readonly ownerDocument: Document;
    readonly pointerId: number;
    readonly start: GridPoint;
    /** The grid's own scroll container; edge scrolling never touches any ancestor. */
    readonly scrollElement: HTMLElement | null;
    /** Extends the latest range to the registered cell containing `target`, if any. */
    readonly extendTo: (target: EventTarget | null) => void;
}

function clampInto(point: GridPoint, scrollElement: HTMLElement): GridPoint {
    const viewport = scrollViewportRect(scrollElement);
    const top = viewport.top + stickyHeaderHeight(scrollElement);
    // Hit-testing just inside the edge finds the row the scroll has brought under the pointer.
    return {
        x: Math.min(Math.max(point.x, viewport.left + 1), viewport.right - 1),
        y: Math.min(Math.max(point.y, top + 1), viewport.bottom - 1)
    };
}

/** Starts one drag gesture and returns its cleanup. The gesture ends on release or cancel. */
export function startGridDragSelection({
    extendTo,
    ownerDocument,
    pointerId,
    scrollElement,
    start
}: GridDragSelectionOptions): () => void {
    const view = ownerDocument.defaultView;
    const gesture = { frame: 0, moved: false, point: start };

    const extendAt = (point: GridPoint): void => {
        const hitPoint = scrollElement == null ? point : clampInto(point, scrollElement);
        const stack = ownerDocument.elementsFromPoint(hitPoint.x, hitPoint.y);
        // Floating chrome such as the bulk-edit toolbar can overlay the grid's edge; look beneath it.
        extendTo(
            stack.find((element) => scrollElement == null || scrollElement.contains(element)) ??
                null
        );
    };

    const scrollFrame = (): void => {
        gesture.frame = 0;
        if (scrollElement == null || view == null || !gesture.moved) return;
        const velocity = dragEdgeScrollVelocity(
            scrollViewportRect(scrollElement),
            gesture.point,
            stickyHeaderHeight(scrollElement)
        );
        if (velocity.top === 0 && velocity.left === 0) return;
        const before = { left: scrollElement.scrollLeft, top: scrollElement.scrollTop };
        scrollElement.scrollTop += velocity.top;
        scrollElement.scrollLeft += velocity.left;
        if (scrollElement.scrollTop === before.top && scrollElement.scrollLeft === before.left) {
            return;
        }
        extendAt(gesture.point);
        gesture.frame = view.requestAnimationFrame(scrollFrame);
    };

    const handleMove = (event: PointerEvent): void => {
        if (event.pointerId !== pointerId) return;
        if ((event.buttons & 1) === 0) {
            cleanup();
            return;
        }
        gesture.moved = true;
        gesture.point = { x: event.clientX, y: event.clientY };
        extendAt(gesture.point);
        if (gesture.frame === 0 && view != null) {
            gesture.frame = view.requestAnimationFrame(scrollFrame);
        }
    };

    const handleEnd = (event: PointerEvent): void => {
        if (event.pointerId === pointerId) cleanup();
    };

    function cleanup(): void {
        if (gesture.frame !== 0) view?.cancelAnimationFrame(gesture.frame);
        gesture.frame = 0;
        ownerDocument.removeEventListener("pointermove", handleMove);
        ownerDocument.removeEventListener("pointerup", handleEnd);
        ownerDocument.removeEventListener("pointercancel", handleEnd);
    }

    ownerDocument.addEventListener("pointermove", handleMove);
    ownerDocument.addEventListener("pointerup", handleEnd);
    ownerDocument.addEventListener("pointercancel", handleEnd);
    return cleanup;
}
