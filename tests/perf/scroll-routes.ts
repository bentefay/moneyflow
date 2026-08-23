/**
 * The four scroll routes, defined as data.
 *
 * A route is a list of wheel deltas plus a WALL-CLOCK tick interval. Tick `i` is
 * dispatched at `routeStart + i * tickIntervalMilliseconds` regardless of how
 * many frames the page managed to present in between.
 *
 * WHY WALL CLOCK RATHER THAN ONE DELTA PER FRAME. An earlier version advanced
 * one delta per `requestAnimationFrame`, which coupled the INPUT rate to the
 * RENDER rate: a slow grid received slower input, so the route stretched in wall
 * time and the stimulus was not held constant across arms. Measured on the
 * identical arm, build and fixture, the `ordinary` route occupied 14.449s in one
 * run and 11.983s in the run immediately before it, with dropped frames going
 * 35 -> 99. That is a confound, not noise. A real mouse wheel emits on its own
 * clock, not on the compositor's, so a wall-clock schedule is also the more
 * faithful stimulus.
 *
 * MEASURED PROPERTIES OF THE WHEEL PATH that make this work (probe 2,
 * `/tmp/mf-perf-probe/wheel-probe2.mjs`, production build, 600-row grid):
 *   - `Input.dispatchMouseEvent {type: "mouseWheel"}` moves the scroller 1:1 in
 *     CSS pixels with NO smooth-scroll animation: one wheel of 100 moved
 *     scrollTop 0 -> 100 in a single frame.
 *   - Single deltas apply in full at least up to 20,000px, so the large-movement
 *     jumps do not need a different mechanism.
 *   - TOTAL DISTANCE IS CONSERVED WHEN THE MAIN THREAD IS JANKED. 60 wheels of
 *     10px delivered over 983ms reached exactly 600px both on an idle main
 *     thread and with the main thread blocked in 9 x 100ms chunks. Chromium
 *     coalesced 60 events into 54 (idle) and 36 (janked) dispatches, but the
 *     observed deltas summed to exactly 600 in both. So a slow grid receives the
 *     same total input as a fast one — which is the property the arms need.
 *   - Reversals conserve distance exactly (+2,000 then -2,000 returned to the
 *     starting offset), and input beyond a scroll bound is discarded.
 *
 * STATED LIMITATION: whether each scroll was handled on the compositor thread or
 * the main thread was NOT determined. The events traverse Chromium's real input
 * pipeline (browser process -> renderer) rather than being an assignment to
 * `scrollTop`, and the harness's own wheel listener is registered
 * `{passive: true}` so it does not force main-thread handling — but no trace
 * evidence was collected either way, so this is not a claim that the routes
 * exercise compositor-threaded scrolling.
 *
 * Deltas are CSS pixels, positive = scroll down (content moves up), matching
 * `WheelEvent.deltaY`.
 */

export type ScrollRouteId = "fast-reversal" | "free-spin" | "large-movement" | "ordinary";

/**
 * How the route's deltas reach the page.
 *
 * `wheel` — real wheel events through Chromium's input pipeline.
 * `scroll-top` — direct assignment to `scroller.scrollTop`, main-thread only.
 *
 * Every route currently uses `wheel`; the variant exists so that a route which
 * cannot be expressed as wheel input is labelled in the output rather than
 * silently driven differently.
 */
export type ScrollInputMode = "scroll-top" | "wheel";

export interface ScrollRoute {
    /** One wheel delta per wall-clock tick. Length x tick interval = duration. */
    readonly deltasPerTick: readonly number[];
    /** Human-readable statement of what this route is meant to stress. */
    readonly description: string;
    readonly id: ScrollRouteId;
    readonly inputMode: ScrollInputMode;
    /**
     * How the profile was derived. `measured` means it came from captured
     * input; `specified` means it was chosen to exercise a stated condition.
     * Nothing in this file is currently `measured` — see `free-spin`.
     */
    readonly provenance: "measured" | "specified";
    /**
     * Offset the grid is held at before the route starts.
     *
     * Not cosmetic: input past a scroll bound is discarded, so a route whose
     * deltas would leave the scrollable range delivers less distance than it
     * specifies and stops being the same stimulus. Measured on the previous
     * capture, `large-movement` started at 0 and its upward jumps were clamped
     * on 3 ticks, confining a route designed to jump ±20,000px to the top 4% of
     * a 507,845px range.
     */
    readonly startOffsetPixels: number;
    /** Wall-clock spacing between deltas. */
    readonly tickIntervalMilliseconds: number;
}

/**
 * 60 ticks per second.
 *
 * CHOSEN, NOT MEASURED FROM A DEVICE. It matches the 60Hz presentation cadence
 * of the measurement environment, so one tick per frame is the finest input
 * granularity the display can distinguish. Real mice emit at their own rates
 * (notched wheels far slower, free-spin wheels faster), and no wheel trace from
 * a physical device was available here — see `freeSpin`.
 */
const TICKS_PER_SECOND = 60;
const TICK_INTERVAL_MILLISECONDS = 1000 / TICKS_PER_SECOND;

const constantVelocity = (pixelsPerSecond: number, seconds: number): readonly number[] =>
    Array.from(
        { length: Math.round(seconds * TICKS_PER_SECOND) },
        () => pixelsPerSecond / TICKS_PER_SECOND
    );

/**
 * Ramp linearly between two velocities, so a reversal does not step
 * discontinuously through zero — a real hand decelerates before reversing.
 */
const ramp = (
    fromPixelsPerSecond: number,
    toPixelsPerSecond: number,
    seconds: number
): readonly number[] => {
    const ticks = Math.round(seconds * TICKS_PER_SECOND);
    return Array.from({ length: ticks }, (_unused, index) => {
        const progress = ticks <= 1 ? 1 : index / (ticks - 1);
        const velocity = fromPixelsPerSecond + (toPixelsPerSecond - fromPixelsPerSecond) * progress;
        return velocity / TICKS_PER_SECOND;
    });
};

/**
 * Exponential velocity decay, the standard model for a free-spinning wheel
 * whose flywheel is no longer driven.
 *
 * `halfLifeSeconds` is the time for velocity to halve.
 */
export function exponentialDecay(
    initialPixelsPerSecond: number,
    halfLifeSeconds: number,
    seconds: number
): readonly number[] {
    const ticks = Math.round(seconds * TICKS_PER_SECOND);
    const decayPerTick = Math.pow(0.5, 1 / (halfLifeSeconds * TICKS_PER_SECOND));
    return Array.from(
        { length: ticks },
        (_unused, index) =>
            (initialPixelsPerSecond * Math.pow(decayPerTick, index)) / TICKS_PER_SECOND
    );
}

/**
 * Route 1 — ordinary scrolling. A steady, unhurried read-through at roughly
 * three 45px rows per second, held long enough to expose sustained cost rather
 * than a warm-up transient.
 */
const ordinary: ScrollRoute = {
    deltasPerTick: constantVelocity(600, 12),
    description: "Steady 600 px/s downward scroll for 12s.",
    id: "ordinary",
    inputMode: "wheel",
    provenance: "specified",
    // Travels 7,200px down from the top of a ~507,000px range: no clamping.
    startOffsetPixels: 0,
    tickIntervalMilliseconds: TICK_INTERVAL_MILLISECONDS
};

/**
 * Route 2 — fast scrolling with reversals. The virtualiser must discard and
 * re-render its overscan in the opposite direction four times, which is where
 * a windowing bug shows up as a blank band.
 */
const fastReversal: ScrollRoute = {
    deltasPerTick: [
        ...ramp(0, 4000, 0.25),
        ...constantVelocity(4000, 1.25),
        ...ramp(4000, -4000, 0.4),
        ...constantVelocity(-4000, 1.25),
        ...ramp(-4000, 4000, 0.4),
        ...constantVelocity(4000, 1.25),
        ...ramp(4000, -4000, 0.4),
        ...constantVelocity(-4000, 1.25),
        ...ramp(-4000, 0, 0.25)
    ],
    description: "Four ±4000 px/s reversals with ramped turnarounds, ~6.7s.",
    id: "fast-reversal",
    inputMode: "wheel",
    provenance: "specified",
    // Each leg travels ~5,000px; 100,000 leaves headroom in both directions.
    startOffsetPixels: 100_000,
    tickIntervalMilliseconds: TICK_INTERVAL_MILLISECONDS
};

/**
 * Route 3 — large movement. Six jumps of ~20,000px, each far beyond the
 * overscan window, so every jump forces a cold render of a region the
 * virtualiser holds nothing for. This is the route most likely to expose a
 * visibly empty viewport.
 */
const largeMovement: ScrollRoute = {
    deltasPerTick: Array.from({ length: 6 }, (_unused, jump) => [
        ...Array.from({ length: 3 }, () => (jump % 2 === 0 ? 20_000 / 3 : -20_000 / 3)),
        ...Array.from({ length: 57 }, () => 0)
    ]).flat(),
    description: "Six alternating ~20,000px jumps, each followed by ~1s of stillness, 6s.",
    id: "large-movement",
    inputMode: "wheel",
    provenance: "specified",
    // Mid-range, so neither the downward nor the upward jumps clamp.
    startOffsetPixels: 250_000,
    tickIntervalMilliseconds: TICK_INTERVAL_MILLISECONDS
};

/**
 * Route 4 — free spin.
 *
 * PROVENANCE WARNING. This profile is NOT calibrated from real mouse input.
 * No free-spin wheel trace could be captured in this environment: there is no
 * usable X display (the user's :0 reports `current 0 x 0` with no connected
 * output), the project forbids running a headed browser, and no physical
 * pointer device can be driven into a headless Chromium. No previously captured
 * trace exists in the repository either — `specs/014-**` was searched and
 * contains only synthetic `wheelSteps` counts.
 *
 * What it IS derived from, stated plainly:
 *   - an exponential velocity decay, the standard flywheel model;
 *   - an initial 9,000 px/s, chosen as the fastest velocity the other routes
 *     do not already cover;
 *   - a 0.6s half-life and a 4s tail, CHOSEN to span roughly one full flywheel
 *     coast rather than measured from a device.
 *
 * To make this real, capture a trace on a machine with a physical free-spin
 * mouse, replace `deltasPerTick` with the captured deltas and their real
 * inter-event times, and set `provenance` to `"measured"`. Until then this route
 * is a stress profile, not a fidelity claim, and any report citing it must say
 * so.
 */
const freeSpin: ScrollRoute = {
    deltasPerTick: exponentialDecay(9_000, 0.6, 4),
    description:
        "Exponential decay from 9,000 px/s, 0.6s half-life, 4s. NOT calibrated from real input.",
    id: "free-spin",
    inputMode: "wheel",
    provenance: "specified",
    // Travels ~7,900px downward; a fling from the top of the list is a real
    // user state and leaves no room to clamp.
    startOffsetPixels: 0,
    tickIntervalMilliseconds: TICK_INTERVAL_MILLISECONDS
};

export const SCROLL_ROUTES: readonly ScrollRoute[] = [
    ordinary,
    fastReversal,
    largeMovement,
    freeSpin
];

export function scrollRoute(id: ScrollRouteId): ScrollRoute {
    const route = SCROLL_ROUTES.find((candidate) => candidate.id === id);
    if (route == null) throw new Error(`Unknown scroll route: ${id}`);
    return route;
}

/** Total signed distance a route travels, in CSS pixels. */
export function routeDistance(route: ScrollRoute): number {
    return route.deltasPerTick.reduce((total, delta) => total + delta, 0);
}

/**
 * Wall-clock duration of the route's input schedule.
 *
 * With the wall-clock driver this is now a property of the route rather than an
 * outcome of the run, and the runner reports the ACHIEVED duration beside it so
 * a drifting schedule is visible instead of silent.
 */
export function routeDurationSeconds(route: ScrollRoute): number {
    return (route.deltasPerTick.length * route.tickIntervalMilliseconds) / 1000;
}

/** Peak absolute velocity in px/s, for reporting alongside the results. */
export function routePeakVelocity(route: ScrollRoute): number {
    return (
        (Math.max(...route.deltasPerTick.map((delta) => Math.abs(delta))) * 1000) /
        route.tickIntervalMilliseconds
    );
}

/**
 * Absolute offset trajectory the route implies from its start offset, clamped to
 * `[0, maximumOffset]`.
 *
 * Used only to check a route stays inside the scrollable range — the driver
 * itself never assigns these offsets, it dispatches the deltas.
 */
export function routeOffsetTrajectory(
    route: ScrollRoute,
    maximumOffset: number
): { readonly clampedTicks: number; readonly offsets: readonly number[] } {
    let offset = route.startOffsetPixels;
    let clampedTicks = 0;
    const offsets: number[] = [];
    for (const delta of route.deltasPerTick) {
        const unclamped = offset + delta;
        offset = Math.min(maximumOffset, Math.max(0, unclamped));
        if (unclamped !== offset) clampedTicks += 1;
        offsets.push(offset);
    }
    return { clampedTicks, offsets };
}
