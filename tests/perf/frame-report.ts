/**
 * Classification of presented frames and the per-route report.
 *
 * Every classification is defined in `tests/perf/README.md`; keep the two in
 * step. The precedence order below is deliberate and load-bearing: a frame that
 * is both blank and stale is reported as blank, because a blank viewport is the
 * defect the product goal forbids outright.
 */

import type { ExpectedFrame, PresentedFrameClassification } from "./trace-presentation";
import {
    findUncoveredBands,
    uncoveredAreaRatio,
    type BlankBand,
    type ViewportRectangle
} from "./viewport-coverage";

/**
 * A sample of what the grid actually contained, taken inside the page and
 * timestamped on the same clock as the trace.
 */
export interface SemanticSample {
    /** The scroll container's real viewport height, for the blank diagnostic. */
    readonly clientHeight?: number;
    readonly totalSizePx?: number | null;
    readonly scrollHeightPx?: number;
    /** True when two rendered rows claimed the same transaction id. */
    readonly hasDuplicateRowId: boolean;
    /** Per-row virtualiser offset against real rendered height. */
    readonly rowGeometry?: readonly {
        readonly index: number;
        readonly offsetHeight: number;
        readonly translateY: number | null;
    }[];
    /** Rectangles that legitimately cover the viewport without being rows. */
    readonly portalMasks: readonly ViewportRectangle[];
    /** Scroll offset the rendered rows correspond to, from the topmost row's index. */
    readonly renderedScrollTop: number;
    readonly rowIndexesAscending: boolean;
    readonly rowRectangles: readonly ViewportRectangle[];
    /** Scroll offset the scroller had actually reached at sample time. */
    readonly scrollTop: number;
    readonly timestampMicroseconds: number;
    readonly viewport: ViewportRectangle;
    readonly visibleRowCount: number;
}

export interface ClassificationThresholds {
    /**
     * Uncovered fraction of the transaction viewport at or above which the
     * frame counts as visibly empty. Default 0.02 — a 2% band on a 900px
     * viewport is ~18px, well beyond any sub-pixel seam but far below anything
     * a user would fail to notice.
     */
    readonly blankAreaRatio: number;
    /** Oldest a semantic sample may be and still describe a frame. */
    readonly maximumJoinAgeMicroseconds: number;
    /**
     * How far rendered content may lag the scroller before the frame counts as
     * stale, in CSS pixels. Default 2 — one frame of drift at 60Hz during a
     * slow scroll is sub-pixel, so anything above a couple of pixels means the
     * rows on screen belong to a scroll offset the user has already left.
     */
    readonly staleToleranceCssPixels: number;
}

export const DEFAULT_CLASSIFICATION_THRESHOLDS: ClassificationThresholds = {
    blankAreaRatio: 0.02,
    maximumJoinAgeMicroseconds: 50_000,
    staleToleranceCssPixels: 2
};

/**
 * Everything needed to say WHERE a blank was, kept only for frames actually
 * classified blank — a handful per run, so serialising it costs nothing.
 *
 * The aggregate report could say a route blanked 3.2 times and nothing else: not
 * where the gap sat, not how big it was, not whether two arms blanked in the same
 * place. All of that was computed and discarded.
 */
export interface BlankFrameDetail {
    readonly areaRatio: number;
    /** The scroll container's real viewport height at this frame. */
    readonly clientHeight: number | null;
    /** `getTotalSize()` as painted — a proxy for the virtualiser's `count`. */
    readonly totalSizePx: number | null;
    readonly scrollHeightPx: number | null;
    /**
     * Every mounted row: the virtualiser's own offset (`translateY`, which is
     * `measurements[i].start`) against the height the row actually rendered.
     * Consecutive translateY deltas give the virtualiser's `measurements[i].size`.
     */
    readonly rowGeometry: readonly {
        readonly index: number;
        readonly offsetHeight: number;
        readonly translateY: number | null;
    }[];
    /** Uncovered bands in viewport coordinates. */
    readonly bands: readonly {
        readonly bottom: number;
        readonly height: number;
        readonly kind: string;
        readonly top: number;
    }[];
    /** Band position relative to the viewport, so an edge gap is obvious. */
    readonly bandPlacement: readonly ("bottom-edge" | "middle" | "top-edge")[];
    readonly frameTimeMicroseconds: number;
    /**
     * The mask rectangles the detector subtracted at this frame.
     *
     * THE WHOLE ARTIFACT-VERSUS-DEFECT QUESTION. Sticky overlays are masked out of
     * the coverage calculation, so a mask whose geometry is wrong invents an
     * uncovered band. If a band abuts a mask edge, that is the artifact; if it sits
     * clear of every mask, the gap is real. Recording the masks beside the bands is
     * what makes the two distinguishable at all.
     */
    readonly masks: readonly {
        readonly bottom: number;
        readonly height: number;
        readonly top: number;
    }[];
    readonly renderedScrollTop: number;
    /** Microseconds from the route's first scored frame. */
    readonly routeRelativeMicroseconds: number;
    readonly scrollTop: number;
    readonly sequenceNumber: number;
    readonly viewportHeight: number;
    readonly visibleRowCount: number;
}

export interface FrameVerdict {
    readonly blankAreaRatio: number;
    /** Present only when `classification` is `blank`. */
    readonly blankDetail?: BlankFrameDetail;
    readonly classification: PresentedFrameClassification;
    readonly frameTimeMicroseconds: number;
    /** Every condition that held, in detection order. Never empty for a non-`full` frame. */
    readonly reasons: readonly string[];
    readonly sequenceNumber: number;
    readonly uncoveredBands: readonly BlankBand[];
}

/** Latest sample at or before the frame, within the join age. */
export function joinSemanticSample(
    frame: ExpectedFrame,
    samples: readonly SemanticSample[],
    maximumJoinAgeMicroseconds: number
): SemanticSample | null {
    const reference = frame.presentationMicroseconds ?? frame.frameTimeMicroseconds;
    return samples.reduce<SemanticSample | null>((best, sample) => {
        const age = reference - sample.timestampMicroseconds;
        if (age < 0 || age > maximumJoinAgeMicroseconds) return best;
        if (best == null) return sample;
        return sample.timestampMicroseconds > best.timestampMicroseconds ? sample : best;
    }, null);
}

export function classifyFrame(
    frame: ExpectedFrame,
    samples: readonly SemanticSample[],
    thresholds: ClassificationThresholds = DEFAULT_CLASSIFICATION_THRESHOLDS
): FrameVerdict {
    const base = {
        frameTimeMicroseconds: frame.frameTimeMicroseconds,
        sequenceNumber: frame.sequenceNumber
    };

    // Trace-state reasons are recorded on EVERY path, including the early returns.
    //
    // MEASURED DEFECT THIS FIXES: these used to be computed only after the
    // `no-semantic-sample` early return, so a frame that was BOTH compositor-partial
    // and unsampled recorded only `no-semantic-sample` and its partial state vanished
    // from the histogram. On one route the histogram reported 2 compositor-partials
    // where the trace held 13, and on another 5 where it held 25 — so any figure
    // re-derived from the histogram overstated how many frames the compositor had
    // presented in full, by up to 8 points.
    const traceReasons =
        frame.reporterState != null && frame.reporterState.startsWith("STATE_PRESENTED_PARTIAL")
            ? ["compositor-partial-update"]
            : [];

    if (!frame.presented) {
        return {
            ...base,
            blankAreaRatio: 0,
            classification: "dropped",
            reasons: [frame.reporterState == null ? "no-reporter" : `state:${frame.reporterState}`],
            uncoveredBands: []
        };
    }
    // A presented frame always carries a presentation timestamp; its absence
    // means the reporter closed without reaching the presentation sub-slice and
    // the frame cannot be trusted as evidence of anything reaching the screen.
    if (frame.presentationMicroseconds == null) {
        return {
            ...base,
            blankAreaRatio: 0,
            classification: "partial",
            reasons: [...traceReasons, "presented-without-presentation-timestamp"],
            uncoveredBands: []
        };
    }

    const sample = joinSemanticSample(frame, samples, thresholds.maximumJoinAgeMicroseconds);
    if (sample == null) {
        return {
            ...base,
            blankAreaRatio: 0,
            classification: "partial",
            reasons: [...traceReasons, "no-semantic-sample"],
            uncoveredBands: []
        };
    }

    const uncoveredBands = findUncoveredBands(
        sample.viewport,
        sample.rowRectangles,
        sample.portalMasks
    );
    const blankAreaRatio = uncoveredAreaRatio(sample.viewport, uncoveredBands);
    const scrollLag = Math.abs(sample.scrollTop - sample.renderedScrollTop);

    // Detection order defines reason order; precedence is applied after.
    const reasons = [
        ...(sample.visibleRowCount === 0 ? ["empty-row-set"] : []),
        ...(blankAreaRatio >= thresholds.blankAreaRatio ? ["uncovered-viewport"] : []),
        ...(scrollLag > thresholds.staleToleranceCssPixels ? ["rendered-content-lags-scroll"] : []),
        ...(sample.hasDuplicateRowId ? ["duplicate-row-id"] : []),
        ...(sample.rowIndexesAscending ? [] : ["nonascending-row-index"]),
        ...traceReasons,
        ...(uncoveredBands.length > 0 && blankAreaRatio < thresholds.blankAreaRatio
            ? ["minor-uncovered-band"]
            : [])
    ];

    const blank = reasons.includes("empty-row-set") || reasons.includes("uncovered-viewport");
    const stale =
        reasons.includes("rendered-content-lags-scroll") ||
        reasons.includes("duplicate-row-id") ||
        reasons.includes("nonascending-row-index");
    const partial =
        reasons.includes("compositor-partial-update") || reasons.includes("minor-uncovered-band");

    const classification: PresentedFrameClassification = blank
        ? "blank"
        : stale
          ? "stale"
          : partial
            ? "partial"
            : "full";

    const blankDetail: BlankFrameDetail | undefined =
        classification === "blank"
            ? {
                  areaRatio: blankAreaRatio,
                  clientHeight: sample.clientHeight ?? null,
                  scrollHeightPx: sample.scrollHeightPx ?? null,
                  totalSizePx: sample.totalSizePx ?? null,
                  rowGeometry: sample.rowGeometry ?? [],
                  bandPlacement: uncoveredBands.map((band) =>
                      band.top <= sample.viewport.top + 1
                          ? "top-edge"
                          : band.bottom >= sample.viewport.bottom - 1
                            ? "bottom-edge"
                            : "middle"
                  ),
                  bands: uncoveredBands.map((band) => ({
                      bottom: band.bottom,
                      height: band.bottom - band.top,
                      kind: band.kind,
                      top: band.top
                  })),
                  frameTimeMicroseconds: frame.frameTimeMicroseconds,
                  masks: sample.portalMasks.map((mask) => ({
                      bottom: mask.bottom,
                      height: mask.bottom - mask.top,
                      top: mask.top
                  })),
                  renderedScrollTop: sample.renderedScrollTop,
                  // Filled in by buildRouteReport, which knows the route's origin.
                  routeRelativeMicroseconds: 0,
                  scrollTop: sample.scrollTop,
                  sequenceNumber: frame.sequenceNumber,
                  viewportHeight: sample.viewport.bottom - sample.viewport.top,
                  visibleRowCount: sample.visibleRowCount
              }
            : undefined;

    return {
        ...base,
        blankAreaRatio,
        ...(blankDetail == null ? {} : { blankDetail }),
        classification,
        reasons,
        uncoveredBands
    };
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface IntervalStatistics {
    readonly maxMilliseconds: number;
    readonly p50Milliseconds: number;
    readonly p95Milliseconds: number;
    readonly p99Milliseconds: number;
}

/**
 * Nearest-rank percentile. Chosen over interpolation because the interval
 * distribution is discrete multiples of the vsync interval: interpolating
 * invents values (25ms) that no frame can ever exhibit.
 */
export function percentile(sortedAscending: readonly number[], fraction: number): number {
    if (sortedAscending.length === 0) return Number.NaN;
    const rank = Math.ceil(fraction * sortedAscending.length);
    const index = Math.min(sortedAscending.length - 1, Math.max(0, rank - 1));
    return sortedAscending[index] ?? Number.NaN;
}

/**
 * Intervals between consecutive PRESENTED frames.
 *
 * `timebase: "vsync"` uses `frame_time_us`, the compositor's exact BeginFrame
 * lattice. This is the PRIMARY metric.
 *
 * `timebase: "wall-clock"` uses the presentation-feedback timestamp.
 *
 * Both are reported, and neither replaces the other, because each hides
 * something the other shows. The vsync lattice is quantised to multiples of the
 * 16.666ms interval, so a p95 threshold of 17ms on it collapses into "no drop
 * fell in the 95th percentile" and is NOT an independent check — the thresholds
 * then rest on drop count and fully-presented ratio. The wall clock is
 * continuous and so remains a real distribution, but it carries
 * trace-emission jitter whose measured noise floor on a control page that
 * dropped nothing was p95 16.983-17.269ms, p99 17.173-17.635ms, max 17.452ms.
 * A wall-clock p95 near 17ms is therefore at the instrument's noise floor and
 * is not by itself evidence of jank.
 */
export function presentedIntervalsMilliseconds(
    frames: readonly ExpectedFrame[],
    timebase: "vsync" | "wall-clock" = "vsync"
): readonly number[] {
    const presentedTimes = frames
        .filter((frame) => frame.presented)
        .flatMap((frame) => {
            const time =
                timebase === "vsync" ? frame.frameTimeMicroseconds : frame.presentationMicroseconds;
            return time == null ? [] : [time];
        })
        .sort((left, right) => left - right);
    return presentedTimes
        .slice(1)
        .map((time, index) => (time - (presentedTimes[index] ?? time)) / 1000);
}

/**
 * Measured noise floor of the wall-clock timebase, from the Task A control page
 * (a trivial scroll that dropped zero frames). Quoted in reports so a
 * wall-clock p95 at this level is not mistaken for a product defect.
 */
export const WALL_CLOCK_NOISE_FLOOR = {
    maxMilliseconds: 17.452,
    p50Milliseconds: 16.663,
    p95Milliseconds: 17.269,
    p99Milliseconds: 17.635
} as const;

export function intervalStatistics(intervalsMilliseconds: readonly number[]): IntervalStatistics {
    const sorted = [...intervalsMilliseconds].sort((left, right) => left - right);
    return {
        maxMilliseconds: sorted.at(-1) ?? Number.NaN,
        p50Milliseconds: percentile(sorted, 0.5),
        p95Milliseconds: percentile(sorted, 0.95),
        p99Milliseconds: percentile(sorted, 0.99)
    };
}

export interface FrameCounts {
    readonly blank: number;
    readonly dropped: number;
    readonly full: number;
    readonly partial: number;
    readonly stale: number;
}

/**
 * How many frames each detection reason applied to.
 *
 * WHY THIS IS REPORTED. `partial` mixes two very different things: a compositor
 * `STATE_PRESENTED_PARTIAL*`, and a frame the harness could not join a semantic
 * sample to. The second is instrument coverage — the sampler runs once per
 * animation frame, so a grid slow enough to starve rAF produces fewer samples and
 * more `no-semantic-sample` frames. Without this histogram a
 * `fully presented < 99%` failure cannot be attributed between the grid and the
 * instrument, and "absence of evidence is not evidence of correctness" (which is
 * why such a frame is never counted `full`) would quietly become the reason a
 * threshold failed.
 *
 * A frame contributes to EVERY reason it met, so these do not sum to the frame
 * count.
 */
export function countReasons(verdicts: readonly FrameVerdict[]): Readonly<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const verdict of verdicts) {
        for (const reason of verdict.reasons) {
            counts[reason] = (counts[reason] ?? 0) + 1;
        }
    }
    return counts;
}

export function countClassifications(verdicts: readonly FrameVerdict[]): FrameCounts {
    return verdicts.reduce<FrameCounts>(
        (counts, verdict) => ({
            blank: counts.blank + (verdict.classification === "blank" ? 1 : 0),
            dropped: counts.dropped + (verdict.classification === "dropped" ? 1 : 0),
            full: counts.full + (verdict.classification === "full" ? 1 : 0),
            partial: counts.partial + (verdict.classification === "partial" ? 1 : 0),
            stale: counts.stale + (verdict.classification === "stale" ? 1 : 0)
        }),
        { blank: 0, dropped: 0, full: 0, partial: 0, stale: 0 }
    );
}

export interface RouteThresholds {
    readonly minimumFullyPresentedRatio: number;
    readonly minimumPresentedFramesPerSecond: number;
    readonly maximumBlankFrames: number;
    readonly maximumP95IntervalMilliseconds: number;
}

export const PRODUCT_GOAL_THRESHOLDS: RouteThresholds = {
    maximumBlankFrames: 0,
    maximumP95IntervalMilliseconds: 17,
    minimumFullyPresentedRatio: 0.99,
    minimumPresentedFramesPerSecond: 59
};

/**
 * Fraction of moving frames the semantic sampler must have covered for its
 * classifications to be reportable.
 *
 * JUSTIFICATION. The semantic figures are fractions of the moving frames, so if X%
 * of them carry no sample, the reported `full%` is understated by up to X points and
 * — the part that matters more — a blank frame inside that gap is INVISIBLE. A zero
 * blank count is therefore only as strong as the coverage behind it.
 *
 * 90% is chosen so the worst distortion a reportable pass can carry is 10 points,
 * which is smaller than any difference between arms worth acting on. It is not a
 * vacuous bar: measured on arm A, coverage was 97.2% (ordinary), 97.0%
 * (fast-reversal), 91.2% (free-spin) and **84.2% (large-movement)** — so it fires on
 * real data, on the route whose long stalls starve the sampler most.
 */
export const MINIMUM_SEMANTIC_COVERAGE_RATIO = 0.9;

export interface RouteReport {
    readonly counts: FrameCounts;
    readonly durationSeconds: number;
    readonly expectedFrames: number;
    /** Vsyncs the compositor declared idle; excluded from `expectedFrames`. */
    readonly idleFrames: number;
    readonly failures: readonly string[];
    readonly fullyPresentedRatio: number;
    /** PRIMARY, thresholded. Quantised to multiples of the vsync interval. */
    readonly intervals: IntervalStatistics;
    /** SECONDARY, disclosed not thresholded. Includes trace-emission jitter. */
    readonly intervalsWallClock: IntervalStatistics;
    /** Measured jitter floor of the wall-clock timebase, for comparison. */
    readonly wallClockNoiseFloor: IntervalStatistics;
    readonly movingFrames: number;
    readonly observedBeginFrames: number;
    /** Every blank frame, with where the gap was. Empty when none blanked. */
    readonly blankFrames: readonly BlankFrameDetail[];
    /** Reason histogram over the moving subset — the population behind the ratio. */
    readonly cadenceReasonCounts: Readonly<Record<string, number>>;
    /**
     * True when too few moving frames carried a semantic sample for the blank,
     * stale and `full` figures to be reportable. An unmeasured frame is
     * unmeasured: neither a pass nor a failure.
     */
    readonly lowSemanticCoverage: boolean;
    /** Fraction of moving frames the sampler actually observed. */
    readonly semanticCoverageRatio: number;
    /** Reason histogram over every scored frame, including still sub-windows. */
    readonly reasonCounts: Readonly<Record<string, number>>;
    readonly passed: boolean;
    /** Whole-route span including any deliberate stillness. */
    readonly wholeRouteSeconds: number;
    readonly presentedFramesPerSecond: number;
    readonly routeId: string;
    readonly visiblyEmptyFrames: number;
}

export interface RouteReportInput {
    /**
     * Frames the span implies, from `expectedFrameCountFromSpan`. Passed in
     * rather than derived from `verdicts.length` so a stalled BeginFrameSource
     * cannot silently deflate the denominator.
     */
    readonly expectedFrames: number;
    readonly frames: readonly ExpectedFrame[];
    /** Declared vsync interval, from `declaredVsyncIntervalMicroseconds`. */
    readonly intervalMicroseconds: number;
    /**
     * Subset of `frames` during which the route was actually moving the grid.
     *
     * Cadence statistics (FPS, intervals, fully-presented ratio) are computed
     * over THIS subset, because a route that deliberately holds still — the
     * large-movement route holds for ~57 of every 60 frames — otherwise divides
     * its presented frames by wall time it never asked the grid to do anything
     * in, which produced a meaningless 10.3 FPS.
     *
     * Blank frames are counted over ALL frames regardless: a viewport that goes
     * empty while the grid is settling after a jump is exactly the defect the
     * goal forbids, and must not be excluded by scoping.
     */
    readonly movingFrames: readonly ExpectedFrame[];
    readonly routeId: string;
    readonly thresholds?: RouteThresholds;
    readonly verdicts: readonly FrameVerdict[];
}

/** Build the per-route report and evaluate it against the thresholds. */
export function buildRouteReport(input: RouteReportInput): RouteReport {
    const {
        expectedFrames,
        frames,
        intervalMicroseconds,
        movingFrames,
        routeId,
        thresholds = PRODUCT_GOAL_THRESHOLDS,
        verdicts
    } = input;
    const idleFrames = frames.filter((frame) => frame.noUpdateDesired).length;
    // An idle vsync is neither a drop nor a presentation, so it is removed from
    // both the classified population and the denominator.
    const idleSequences = new Set(
        frames.filter((frame) => frame.noUpdateDesired).map((frame) => frame.sequenceNumber)
    );
    const scoredVerdicts = verdicts.filter((verdict) => !idleSequences.has(verdict.sequenceNumber));
    const scoredExpected = Math.max(0, expectedFrames - idleFrames);

    // Blank is counted over every frame; cadence only over the moving subset.
    const counts = countClassifications(scoredVerdicts);
    const movingSequences = new Set(movingFrames.map((frame) => frame.sequenceNumber));
    const cadenceFrames = movingFrames.filter((frame) => !frame.noUpdateDesired);
    const cadenceVerdicts = scoredVerdicts.filter((verdict) =>
        movingSequences.has(verdict.sequenceNumber)
    );
    const intervals = intervalStatistics(presentedIntervalsMilliseconds(cadenceFrames, "vsync"));
    const intervalsWallClock = intervalStatistics(
        presentedIntervalsMilliseconds(cadenceFrames, "wall-clock")
    );

    // N frames span N-1 intervals between their timestamps, but occupy N
    // intervals of wall time. Using the bare first-to-last span would divide N
    // frames by N-1 intervals' worth of seconds and report 60.10 FPS for a
    // flawless 60.00Hz run, quietly flattering every result.
    // Duration of the SCORED window, not of the whole route.
    const durationSeconds = (cadenceFrames.length * intervalMicroseconds) / 1_000_000;
    const wholeRouteSeconds = (() => {
        const first = frames[0];
        const last = frames.at(-1);
        return first == null || last == null
            ? 0
            : (last.frameTimeMicroseconds - first.frameTimeMicroseconds + intervalMicroseconds) /
                  1_000_000;
    })();

    const presentedCount = cadenceFrames.filter((frame) => frame.presented).length;
    const presentedFramesPerSecond = durationSeconds > 0 ? presentedCount / durationSeconds : 0;
    const cadenceCounts = countClassifications(cadenceVerdicts);
    const scoredCadence = cadenceFrames.length;
    const fullyPresentedRatio = scoredCadence > 0 ? cadenceCounts.full / scoredCadence : 0;

    const failures = [
        ...(presentedFramesPerSecond < thresholds.minimumPresentedFramesPerSecond
            ? [
                  `presented fps ${presentedFramesPerSecond.toFixed(3)} < ${String(thresholds.minimumPresentedFramesPerSecond)}`
              ]
            : []),
        ...(intervals.p95Milliseconds > thresholds.maximumP95IntervalMilliseconds
            ? [
                  `p95 interval ${intervals.p95Milliseconds.toFixed(3)}ms > ${String(thresholds.maximumP95IntervalMilliseconds)}ms`
              ]
            : []),
        ...(fullyPresentedRatio < thresholds.minimumFullyPresentedRatio
            ? [
                  `fully presented ${(fullyPresentedRatio * 100).toFixed(3)}% < ${String(thresholds.minimumFullyPresentedRatio * 100)}%`
              ]
            : []),
        ...(counts.blank > thresholds.maximumBlankFrames
            ? [
                  `visibly empty frames ${String(counts.blank)} > ${String(thresholds.maximumBlankFrames)}`
              ]
            : []),
        ...(frames.length < expectedFrames
            ? [
                  `BeginFrameSource stalled: observed ${String(frames.length)} ticks, span implies ${String(expectedFrames)}`
              ]
            : [])
    ];

    const cadenceReasons = countReasons(cadenceVerdicts);
    const semanticCoverageRatio =
        scoredCadence > 0
            ? 1 - (cadenceReasons["no-semantic-sample"] ?? 0) / scoredCadence
            : Number.NaN;

    const routeOriginMicroseconds = frames[0]?.frameTimeMicroseconds ?? 0;
    const blankFrames = scoredVerdicts.flatMap((verdict) =>
        verdict.blankDetail == null
            ? []
            : [
                  {
                      ...verdict.blankDetail,
                      routeRelativeMicroseconds:
                          verdict.blankDetail.frameTimeMicroseconds - routeOriginMicroseconds
                  }
              ]
    );

    return {
        blankFrames,
        cadenceReasonCounts: cadenceReasons,
        counts,
        lowSemanticCoverage: !(semanticCoverageRatio >= MINIMUM_SEMANTIC_COVERAGE_RATIO),
        semanticCoverageRatio,
        durationSeconds,
        expectedFrames: scoredExpected,
        reasonCounts: countReasons(scoredVerdicts),
        idleFrames,
        failures,
        fullyPresentedRatio,
        intervals,
        intervalsWallClock,
        movingFrames: scoredCadence,
        observedBeginFrames: frames.length,
        wholeRouteSeconds,
        wallClockNoiseFloor: WALL_CLOCK_NOISE_FLOOR,
        passed: failures.length === 0,
        presentedFramesPerSecond,
        routeId,
        visiblyEmptyFrames: counts.blank
    };
}

// ---------------------------------------------------------------------------
// The CLEAN report: cadence from the trace alone, no DOM sampling
// ---------------------------------------------------------------------------

/**
 * Cadence measured WITHOUT the semantic sampler.
 *
 * WHY THIS EXISTS. The semantic sampler reads rectangles and computed styles
 * inside the frame it measures, at a measured p50 of 0.2-1.1ms and a max of up to
 * 31.5ms — against a 16.666ms frame budget. Three of the four product thresholds
 * are ABSOLUTE rather than comparative (>= 59 FPS, p95 <= 17ms, >= 99% fully
 * presented), so in its worst frames the instrument could fail one of them on the
 * grid's behalf, and a result near the line would be unattributable.
 *
 * So each route runs twice per repeat. This report comes from the run with the
 * sampler off, and it is the one the cadence thresholds are evaluated against.
 * Everything here is derived from Chrome trace presentation events; the only
 * page-side work in a clean run is one `performance.mark` and one `scrollTop`
 * read per frame, whose cost is measured and reported alongside.
 *
 * `fullyPresentedRatio` here is the COMPOSITOR's own notion: the fraction of
 * scored frames whose `PipelineReporter` state was `STATE_PRESENTED_ALL` rather
 * than `STATE_PRESENTED_PARTIAL*` or dropped. The instrumented run's stricter
 * semantic `full` (presented AND covered AND in sync) is reported beside it, and
 * the blank threshold is evaluated there — so nothing is dropped from the goal,
 * each part is just evaluated on the run that can legitimately speak to it.
 */
export interface CadenceReport {
    readonly droppedFrames: number;
    readonly durationSeconds: number;
    readonly expectedFrames: number;
    readonly failures: readonly string[];
    readonly fullyPresentedRatio: number;
    readonly idleFrames: number;
    readonly intervals: IntervalStatistics;
    readonly intervalsWallClock: IntervalStatistics;
    readonly movingFrames: number;
    readonly observedBeginFrames: number;
    readonly passed: boolean;
    readonly presentedAllFrames: number;
    readonly presentedFramesPerSecond: number;
    readonly presentedPartialFrames: number;
    readonly routeId: string;
    readonly wallClockNoiseFloor: IntervalStatistics;
    readonly wholeRouteSeconds: number;
}

export interface CadenceReportInput {
    readonly expectedFrames: number;
    readonly frames: readonly ExpectedFrame[];
    readonly intervalMicroseconds: number;
    readonly movingFrames: readonly ExpectedFrame[];
    readonly routeId: string;
    readonly thresholds?: RouteThresholds;
}

/** True when the compositor said the frame was presented in full. */
function isPresentedInFull(frame: ExpectedFrame): boolean {
    return (
        frame.presented &&
        frame.reporterState != null &&
        !frame.reporterState.startsWith("STATE_PRESENTED_PARTIAL")
    );
}

export function buildCadenceReport(input: CadenceReportInput): CadenceReport {
    const {
        expectedFrames,
        frames,
        intervalMicroseconds,
        movingFrames,
        routeId,
        thresholds = PRODUCT_GOAL_THRESHOLDS
    } = input;
    const idleFrames = frames.filter((frame) => frame.noUpdateDesired).length;
    const cadenceFrames = movingFrames.filter((frame) => !frame.noUpdateDesired);

    const intervals = intervalStatistics(presentedIntervalsMilliseconds(cadenceFrames, "vsync"));
    const intervalsWallClock = intervalStatistics(
        presentedIntervalsMilliseconds(cadenceFrames, "wall-clock")
    );
    // N frames span N-1 intervals but occupy N intervals of wall time; using the
    // bare span would report 60.10 FPS for a flawless 60.00Hz run.
    const durationSeconds = (cadenceFrames.length * intervalMicroseconds) / 1_000_000;
    const wholeRouteSeconds = (() => {
        const first = frames[0];
        const last = frames.at(-1);
        return first == null || last == null
            ? 0
            : (last.frameTimeMicroseconds - first.frameTimeMicroseconds + intervalMicroseconds) /
                  1_000_000;
    })();

    const presentedCount = cadenceFrames.filter((frame) => frame.presented).length;
    const presentedAllFrames = cadenceFrames.filter(isPresentedInFull).length;
    const presentedPartialFrames = presentedCount - presentedAllFrames;
    const droppedFrames = cadenceFrames.length - presentedCount;
    const presentedFramesPerSecond = durationSeconds > 0 ? presentedCount / durationSeconds : 0;
    const fullyPresentedRatio =
        cadenceFrames.length > 0 ? presentedAllFrames / cadenceFrames.length : 0;

    const failures = [
        ...(presentedFramesPerSecond < thresholds.minimumPresentedFramesPerSecond
            ? [
                  `presented fps ${presentedFramesPerSecond.toFixed(3)} < ${String(thresholds.minimumPresentedFramesPerSecond)}`
              ]
            : []),
        ...(intervals.p95Milliseconds > thresholds.maximumP95IntervalMilliseconds
            ? [
                  `p95 interval ${intervals.p95Milliseconds.toFixed(3)}ms > ${String(thresholds.maximumP95IntervalMilliseconds)}ms`
              ]
            : []),
        ...(fullyPresentedRatio < thresholds.minimumFullyPresentedRatio
            ? [
                  `fully presented ${(fullyPresentedRatio * 100).toFixed(3)}% < ${String(thresholds.minimumFullyPresentedRatio * 100)}%`
              ]
            : []),
        ...(frames.length < expectedFrames
            ? [
                  `BeginFrameSource stalled: observed ${String(frames.length)} ticks, span implies ${String(expectedFrames)}`
              ]
            : [])
    ];

    return {
        droppedFrames,
        durationSeconds,
        expectedFrames: Math.max(0, expectedFrames - idleFrames),
        failures,
        fullyPresentedRatio,
        idleFrames,
        intervals,
        intervalsWallClock,
        movingFrames: cadenceFrames.length,
        observedBeginFrames: frames.length,
        passed: failures.length === 0,
        presentedAllFrames,
        presentedFramesPerSecond,
        presentedPartialFrames,
        routeId,
        wallClockNoiseFloor: WALL_CLOCK_NOISE_FLOOR,
        wholeRouteSeconds
    };
}

/**
 * The route's verdict, taking each threshold from the run that can speak to it.
 *
 * Cadence (FPS, p95 interval, fully presented, BeginFrame stall) comes from the
 * CLEAN run, so the sampler cannot fail an absolute threshold on the grid's
 * behalf. Visibly-empty frames come from the INSTRUMENTED run, which is the only
 * one that can see them — and a sampler-induced drop cannot manufacture a false
 * blank, because blankness is a property of what was painted, not of timing.
 *
 * Nothing is weakened: every threshold in the goal is still applied, and each
 * failure says which run produced it.
 */
export function combinedRouteFailures(
    cadence: CadenceReport,
    semantic: RouteReport,
    thresholds: RouteThresholds = PRODUCT_GOAL_THRESHOLDS
): readonly string[] {
    return [
        ...cadence.failures.map((failure) => `clean: ${failure}`),
        ...(semantic.counts.blank > thresholds.maximumBlankFrames
            ? [
                  `instrumented: visibly empty frames ${String(semantic.counts.blank)} > ${String(thresholds.maximumBlankFrames)}`
              ]
            : []),
        ...(semantic.counts.stale > 0
            ? [`instrumented: stale frames ${String(semantic.counts.stale)} > 0`]
            : []),
        // A zero blank count cannot certify "no visibly empty frame" when the
        // sampler did not see enough of the route. This is a COVERAGE
        // qualification, not a statement that the grid did anything wrong — but it
        // must not read as a clean pass either, because the frames that would have
        // carried the defect are the unmeasured ones.
        ...(semantic.lowSemanticCoverage
            ? [
                  `instrumented: semantic coverage ${(semantic.semanticCoverageRatio * 100).toFixed(1)}% < ${String(MINIMUM_SEMANTIC_COVERAGE_RATIO * 100)}% — too few moving frames carried a sample to certify zero blank frames`
              ]
            : [])
    ];
}

export function formatCadenceReport(report: CadenceReport): string {
    const rows: readonly (readonly [string, string])[] = [
        ["route (clean)", report.routeId],
        ["scored duration (s)", report.durationSeconds.toFixed(3)],
        ["whole route (s)", report.wholeRouteSeconds.toFixed(3)],
        ["moving frames scored", String(report.movingFrames)],
        ["expected frames", String(report.expectedFrames)],
        ["observed BeginFrames", String(report.observedBeginFrames)],
        ["idle vsyncs (excluded)", String(report.idleFrames)],
        ["presented FPS", report.presentedFramesPerSecond.toFixed(3)],
        ["p50 vsync (ms)", report.intervals.p50Milliseconds.toFixed(3)],
        ["p95 vsync (ms) *", report.intervals.p95Milliseconds.toFixed(3)],
        ["p99 vsync (ms)", report.intervals.p99Milliseconds.toFixed(3)],
        ["max vsync (ms)", report.intervals.maxMilliseconds.toFixed(3)],
        ["p50 wall-clock (ms)", report.intervalsWallClock.p50Milliseconds.toFixed(3)],
        ["p95 wall-clock (ms)", report.intervalsWallClock.p95Milliseconds.toFixed(3)],
        ["p99 wall-clock (ms)", report.intervalsWallClock.p99Milliseconds.toFixed(3)],
        ["max wall-clock (ms)", report.intervalsWallClock.maxMilliseconds.toFixed(3)],
        ["wall-clock noise floor p95", report.wallClockNoiseFloor.p95Milliseconds.toFixed(3)],
        ["presented in full", String(report.presentedAllFrames)],
        ["presented partial", String(report.presentedPartialFrames)],
        ["dropped", String(report.droppedFrames)],
        ["fully presented", `${(report.fullyPresentedRatio * 100).toFixed(3)}%`],
        ["verdict", report.passed ? "PASS" : "FAIL"]
    ];
    const width = Math.max(...rows.map(([label]) => label.length));
    const body = rows.map(([label, value]) => `  ${label.padEnd(width)}  ${value}`).join("\n");
    const failureLines = report.failures.map((failure) => `  ! ${failure}`).join("\n");
    return report.failures.length === 0 ? body : `${body}\n${failureLines}`;
}

export function formatRouteReport(report: RouteReport): string {
    const rows: readonly (readonly [string, string])[] = [
        ["route", report.routeId],
        ["scored duration (s)", report.durationSeconds.toFixed(3)],
        ["whole route (s)", report.wholeRouteSeconds.toFixed(3)],
        ["moving frames scored", String(report.movingFrames)],
        ["expected frames", String(report.expectedFrames)],
        ["observed BeginFrames", String(report.observedBeginFrames)],
        ["idle vsyncs (excluded)", String(report.idleFrames)],
        ["presented FPS", report.presentedFramesPerSecond.toFixed(3)],
        ["p50 vsync (ms)", report.intervals.p50Milliseconds.toFixed(3)],
        ["p95 vsync (ms) *", report.intervals.p95Milliseconds.toFixed(3)],
        ["p99 vsync (ms)", report.intervals.p99Milliseconds.toFixed(3)],
        ["max vsync (ms)", report.intervals.maxMilliseconds.toFixed(3)],
        ["p50 wall-clock (ms)", report.intervalsWallClock.p50Milliseconds.toFixed(3)],
        ["p95 wall-clock (ms)", report.intervalsWallClock.p95Milliseconds.toFixed(3)],
        ["p99 wall-clock (ms)", report.intervalsWallClock.p99Milliseconds.toFixed(3)],
        ["max wall-clock (ms)", report.intervalsWallClock.maxMilliseconds.toFixed(3)],
        ["wall-clock noise floor p95", report.wallClockNoiseFloor.p95Milliseconds.toFixed(3)],
        ["full", String(report.counts.full)],
        ["blank (visibly empty)", String(report.counts.blank)],
        ["partial", String(report.counts.partial)],
        ["stale", String(report.counts.stale)],
        ["dropped", String(report.counts.dropped)],
        ["fully presented (semantic)", `${(report.fullyPresentedRatio * 100).toFixed(3)}%`],
        [
            "semantic coverage",
            `${(report.semanticCoverageRatio * 100).toFixed(1)}%${report.lowSemanticCoverage ? "  LOW COVERAGE" : ""}`
        ],
        ["verdict", report.passed ? "PASS" : "FAIL"]
    ];
    const width = Math.max(...rows.map(([label]) => label.length));
    const body = rows.map(([label, value]) => `  ${label.padEnd(width)}  ${value}`).join("\n");
    // Reasons, so a `fully presented` shortfall can be attributed rather than
    // guessed at. `no-semantic-sample` is instrument coverage, not a grid defect.
    const reasonLines = Object.entries(report.cadenceReasonCounts)
        .sort(([, left], [, right]) => right - left)
        .map(([reason, count]) => `    ${reason.padEnd(width - 2)}  ${String(count)}`);
    const reasonBlock =
        reasonLines.length === 0
            ? `  ${"reasons (moving frames)".padEnd(width)}  none`
            : [`  ${"reasons (moving frames)".padEnd(width)}`, ...reasonLines].join("\n");
    const failureLines = report.failures.map((failure) => `  ! ${failure}`).join("\n");
    return report.failures.length === 0
        ? `${body}\n${reasonBlock}`
        : `${body}\n${reasonBlock}\n${failureLines}`;
}
