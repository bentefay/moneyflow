/**
 * Viewport coverage geometry for the transaction grid.
 *
 * A presented frame is only honest if the rows actually cover the transaction
 * viewport. When row rendering lags scrolling, the virtualiser leaves an
 * uncovered band — the region the user perceives as "the grid went blank".
 *
 * The rectangle algebra here is carried over from the 014 campaign's
 * `scroll-blanking-oracle.ts`, which is unit-tested and sound. It is copied
 * rather than imported because `specs/**` is excluded from `tsconfig.json`,
 * so typechecked code cannot reference it.
 */

/** A CSS-pixel rectangle in viewport coordinates. */
export interface ViewportRectangle {
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
    readonly top: number;
}

/**
 * Where an uncovered band sits relative to the viewport. The distinction
 * matters: a `leading`/`trailing` band is the virtualiser failing to render
 * ahead of the scroll direction, while an `interior` band is a hole between
 * two rendered rows, which is a different defect.
 */
export type BlankBandKind = "interior" | "leading" | "trailing";

export interface BlankBand extends ViewportRectangle {
    /**
     * Fraction of sampled pixels in this band that matched the grid's empty
     * background. 0 when only geometry was evaluated and no pixels were read.
     */
    readonly blankPixelRatio: number;
    readonly kind: BlankBandKind;
}

/**
 * Sub-pixel slack. Row rectangles come from `getBoundingClientRect`, whose
 * values are fractional; adjacent rows routinely differ by ~1e-13 at the seam
 * and must not register as a hole.
 */
const GEOMETRY_EPSILON_CSS_PIXELS = 0.5;

const rectangleWidth = (rectangle: ViewportRectangle): number =>
    Math.max(0, rectangle.right - rectangle.left);

const rectangleHeight = (rectangle: ViewportRectangle): number =>
    Math.max(0, rectangle.bottom - rectangle.top);

/** True when a rectangle is larger than the sub-pixel seam tolerance. */
export function hasArea(rectangle: ViewportRectangle): boolean {
    return (
        rectangleWidth(rectangle) > GEOMETRY_EPSILON_CSS_PIXELS &&
        rectangleHeight(rectangle) > GEOMETRY_EPSILON_CSS_PIXELS
    );
}

export function intersectRectangles(
    left: ViewportRectangle,
    right: ViewportRectangle
): ViewportRectangle | null {
    const intersection: ViewportRectangle = {
        bottom: Math.min(left.bottom, right.bottom),
        left: Math.max(left.left, right.left),
        right: Math.min(left.right, right.right),
        top: Math.max(left.top, right.top)
    };
    return hasArea(intersection) ? intersection : null;
}

/** Subtract `mask` from `subject`, returning the surviving fragments. */
export function subtractRectangle(
    subject: ViewportRectangle,
    mask: ViewportRectangle
): readonly ViewportRectangle[] {
    const overlap = intersectRectangles(subject, mask);
    if (overlap == null) return [subject];
    const fragments: readonly ViewportRectangle[] = [
        { bottom: overlap.top, left: subject.left, right: subject.right, top: subject.top },
        { bottom: subject.bottom, left: subject.left, right: subject.right, top: overlap.bottom },
        { bottom: overlap.bottom, left: subject.left, right: overlap.left, top: overlap.top },
        { bottom: overlap.bottom, left: overlap.right, right: subject.right, top: overlap.top }
    ];
    return fragments.filter(hasArea);
}

export function subtractRectangles(
    subjects: readonly ViewportRectangle[],
    masks: readonly ViewportRectangle[]
): readonly ViewportRectangle[] {
    return masks.reduce<readonly ViewportRectangle[]>(
        (remaining, mask) => remaining.flatMap((rectangle) => subtractRectangle(rectangle, mask)),
        subjects
    );
}

function bandKind(band: ViewportRectangle, viewport: ViewportRectangle): BlankBandKind {
    if (band.top <= viewport.top + GEOMETRY_EPSILON_CSS_PIXELS) return "leading";
    if (band.bottom >= viewport.bottom - GEOMETRY_EPSILON_CSS_PIXELS) return "trailing";
    return "interior";
}

/**
 * Vertical bands of the transaction viewport that no row rectangle covers.
 *
 * `portalMasks` are rectangles that legitimately cover the viewport without
 * being rows — an open dropdown, a sticky header overlay. Without them a
 * correctly-painted frame reads as blank underneath the overlay.
 */
export function findUncoveredBands(
    viewport: ViewportRectangle,
    rowRectangles: readonly ViewportRectangle[],
    portalMasks: readonly ViewportRectangle[] = []
): readonly BlankBand[] {
    const clippedRows = rowRectangles
        .map((rectangle) => intersectRectangles(viewport, rectangle))
        .filter((rectangle): rectangle is ViewportRectangle => rectangle != null)
        .sort((left, right) => left.top - right.top || left.bottom - right.bottom);

    const gaps: ViewportRectangle[] = [];
    const coveredUntil = clippedRows.reduce((covered, row) => {
        if (row.top > covered + GEOMETRY_EPSILON_CSS_PIXELS) {
            gaps.push({
                bottom: row.top,
                left: viewport.left,
                right: viewport.right,
                top: covered
            });
        }
        return Math.max(covered, row.bottom);
    }, viewport.top);

    if (coveredUntil < viewport.bottom - GEOMETRY_EPSILON_CSS_PIXELS) {
        gaps.push({
            bottom: viewport.bottom,
            left: viewport.left,
            right: viewport.right,
            top: coveredUntil
        });
    }

    return subtractRectangles(gaps, portalMasks).map((rectangle) => ({
        ...rectangle,
        blankPixelRatio: 0,
        kind: bandKind(rectangle, viewport)
    }));
}

/**
 * Total uncovered area as a fraction of the viewport. This is the quantity the
 * "visibly empty viewport" count thresholds against — a 2px seam is not a
 * blank viewport, half the grid missing is.
 */
export function uncoveredAreaRatio(
    viewport: ViewportRectangle,
    bands: readonly BlankBand[]
): number {
    const viewportArea = rectangleWidth(viewport) * rectangleHeight(viewport);
    if (viewportArea <= 0) return 0;
    const blankArea = bands.reduce(
        (total, band) => total + rectangleWidth(band) * rectangleHeight(band),
        0
    );
    return Math.min(1, blankArea / viewportArea);
}
