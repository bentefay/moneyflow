/**
 * The measured browser configuration for presentation-cadence measurement.
 *
 * This is not a preference. Three candidates were launched and their real
 * presented-frame cadence measured over a 12s continuous scroll; the numbers
 * are in `specs/015-transaction-grid-tanstack/evidence/env/README.md`.
 *
 *   candidate            presented FPS   BeginFrame ticks vs span   verdict
 *   new headless         60.002          722 / 722                  CHOSEN
 *   chrome-headless-shell 60.002         723 / 752  (stalled)       rejected
 *   Xvfb :99 + X11 ozone 60.002          722 / 722                  viable, not needed
 *
 * All three drive a `DelayBasedBeginFrameSource` at a declared 16,666us
 * interval — exactly 60.002Hz — because none has a hardware vsync. New headless
 * is chosen because it was the only candidate whose observed BeginFrame count
 * matched the count its own span implies on every run: chrome-headless-shell
 * emitted 723 ticks across a span implying 752, a ~0.5s stall that would
 * silently deflate the denominator of "expected frames fully presented".
 *
 * Xvfb was measured and works, but requires forcing the X11 Ozone backend.
 * Chromium prefers Wayland whenever `WAYLAND_DISPLAY` is set and then ignores
 * `DISPLAY` entirely — a headed launch would open a real window on the user's
 * desktop. Since headless matches Xvfb's cadence, that hazard is simply
 * avoided. `xvfbLaunchOptions` is kept for the case where a future test needs a
 * real window, with the guard baked in.
 *
 * CAVEAT, stated plainly: headless Chromium renders through SoftwareRenderer
 * and there is no physical display. "Presented" means the compositor's
 * presentation feedback fired for a software swap, not photons on a panel. That
 * is the correct signal for detecting dropped and janked frames, and it is what
 * every number in this harness measures — but it is not a claim about a
 * physical 60Hz monitor.
 */

export interface BrowserLaunchOptions {
    readonly args: readonly string[];
    readonly channel: string;
    readonly env?: Readonly<Record<string, string>>;
    readonly headless: boolean;
}

/** Declared vsync interval of the delay-based BeginFrameSource, in microseconds. */
export const MEASURED_VSYNC_INTERVAL_MICROSECONDS = 16_666;

/** Viewport used for every measurement; fixed so row counts are comparable. */
export const MEASUREMENT_VIEWPORT = { height: 900, width: 1400 } as const;

/**
 * Trace categories required by `trace-presentation.ts`.
 *
 * `disabled-by-default-devtools.timeline.frame` is the one that actually
 * carries `PipelineReporter`; without it the trace still looks busy but
 * contains no presentation evidence at all.
 */
export const PRESENTATION_TRACE_CATEGORIES: readonly string[] = [
    "benchmark",
    "cc",
    "disabled-by-default-devtools.timeline.frame",
    "viz"
];

const STABILITY_ARGS: readonly string[] = [
    // Headless still applies occlusion and background heuristics; a throttled
    // renderer would read as dropped frames.
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling"
];

/** The chosen configuration. */
export const measurementLaunchOptions: BrowserLaunchOptions = {
    args: STABILITY_ARGS,
    channel: "chromium",
    headless: true
};

/**
 * Headed Chromium on a private Xvfb display. Not used by default.
 *
 * `--ozone-platform=x11` and dropping `WAYLAND_DISPLAY` are both mandatory:
 * without them Chromium connects to the user's Wayland session and opens a
 * visible window, which the project rules forbid.
 */
export function xvfbLaunchOptions(
    display: string,
    environment: Readonly<Record<string, string | undefined>>
): BrowserLaunchOptions {
    const safeEnvironment: Record<string, string> = {};
    for (const [key, value] of Object.entries(environment)) {
        if (key === "WAYLAND_DISPLAY" || value == null) continue;
        safeEnvironment[key] = value;
    }
    if (!display.startsWith(":") || display === ":0") {
        throw new Error(
            `Refusing to use display ${display}: measurements must run on a private Xvfb server, never the user's desktop`
        );
    }
    return {
        args: [...STABILITY_ARGS, "--ozone-platform=x11"],
        channel: "chromium",
        env: { ...safeEnvironment, DISPLAY: display, XDG_SESSION_TYPE: "x11" },
        headless: false
    };
}
