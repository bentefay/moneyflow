import { describe, expect, it } from "vitest";

import {
    buildCadenceReport,
    buildRouteReport,
    classifyFrame,
    countClassifications,
    combinedRouteFailures,
    countReasons,
    DEFAULT_CLASSIFICATION_THRESHOLDS,
    intervalStatistics,
    joinSemanticSample,
    formatRouteReport,
    percentile,
    presentedIntervalsMilliseconds,
    type SemanticSample
} from "./frame-report";
import type { ExpectedFrame } from "./trace-presentation";

const VSYNC_MICROSECONDS = 16_666;
const VIEWPORT = { bottom: 900, left: 0, right: 1400, top: 0 } as const;

function frameAt(sequenceNumber: number, overrides: Partial<ExpectedFrame> = {}): ExpectedFrame {
    const frameTimeMicroseconds = sequenceNumber * VSYNC_MICROSECONDS;
    return {
        frameTimeMicroseconds,
        noUpdateDesired: false,
        presentationMicroseconds: frameTimeMicroseconds + 5_000,
        presented: true,
        reporterState: "STATE_PRESENTED_ALL",
        sequenceNumber,
        ...overrides
    };
}

/** Rows that tile the viewport exactly — a healthy frame. */
function coveringRows(
    rowHeight = 45
): readonly { bottom: number; left: number; right: number; top: number }[] {
    return Array.from({ length: Math.ceil(900 / rowHeight) }, (_unused, index) => ({
        bottom: (index + 1) * rowHeight,
        left: 0,
        right: 1400,
        top: index * rowHeight
    }));
}

function sampleAt(
    timestampMicroseconds: number,
    overrides: Partial<SemanticSample> = {}
): SemanticSample {
    const rowRectangles = overrides.rowRectangles ?? coveringRows();
    return {
        hasDuplicateRowId: false,
        portalMasks: [],
        renderedScrollTop: 1000,
        rowIndexesAscending: true,
        rowRectangles,
        scrollTop: 1000,
        timestampMicroseconds,
        viewport: VIEWPORT,
        visibleRowCount: rowRectangles.length,
        ...overrides
    };
}

describe("percentile", () => {
    it("never invents an interval no frame exhibited", () => {
        // 18 frames at 16.666 and two at 33.332. An interpolating percentile
        // would return a value between the two; nearest rank must return one of
        // them, because the distribution is discrete multiples of a vsync.
        const values = [...Array.from({ length: 18 }, () => 16.666), 33.332, 33.332].sort(
            (left, right) => left - right
        );
        expect(percentile(values, 0.95)).toBe(33.332);
        expect(percentile(values, 0.5)).toBe(16.666);
        expect(values).toContain(percentile(values, 0.99));
    });

    it("places p95 at the last good value when exactly 5% are bad", () => {
        // Nearest rank on 20 values takes index ceil(0.95*20)-1 = 18, so a
        // single outlier in 20 sits just above p95. Pinned so a future change
        // of percentile convention is a visible decision, not a silent shift.
        const values = [...Array.from({ length: 19 }, () => 16.666), 33.332];
        expect(percentile(values, 0.95)).toBe(16.666);
    });

    it("returns NaN for an empty distribution rather than 0", () => {
        // 0 would read as a perfect result; NaN cannot be mistaken for a pass.
        expect(percentile([], 0.5)).toBeNaN();
    });
});

describe("presentedIntervalsMilliseconds", () => {
    it("is exactly one vsync per interval when nothing drops", () => {
        const frames = [0, 1, 2, 3, 4].map((index) => frameAt(index));
        expect(presentedIntervalsMilliseconds(frames)).toEqual([16.666, 16.666, 16.666, 16.666]);
    });

    it("doubles across a dropped frame", () => {
        const frames = [
            frameAt(0),
            frameAt(1, { presented: false, reporterState: "STATE_DROPPED" }),
            frameAt(2)
        ];
        expect(presentedIntervalsMilliseconds(frames)).toEqual([33.332]);
    });
});

describe("classifyFrame", () => {
    it("classifies a covered, in-sync, fully presented frame as full", () => {
        const frame = frameAt(10);
        const verdict = classifyFrame(frame, [sampleAt(frame.frameTimeMicroseconds)]);
        expect(verdict.classification).toBe("full");
        expect(verdict.reasons).toEqual([]);
    });

    it("classifies a non-presented frame as dropped", () => {
        const frame = frameAt(10, { presented: false, reporterState: "STATE_DROPPED" });
        expect(classifyFrame(frame, []).classification).toBe("dropped");
    });

    it("classifies an uncovered viewport as blank", () => {
        // Rows stop at 400px of a 900px viewport: the virtualiser has not
        // rendered ahead of the scroll and the user sees empty space.
        const frame = frameAt(10);
        const verdict = classifyFrame(frame, [
            sampleAt(frame.frameTimeMicroseconds, {
                rowRectangles: coveringRows().filter((row) => row.bottom <= 400)
            })
        ]);
        expect(verdict.classification).toBe("blank");
        expect(verdict.reasons).toContain("uncovered-viewport");
        expect(verdict.blankAreaRatio).toBeGreaterThan(0.5);
    });

    it("classifies a rendered-content lag as stale", () => {
        const frame = frameAt(10);
        const verdict = classifyFrame(frame, [
            sampleAt(frame.frameTimeMicroseconds, { renderedScrollTop: 600, scrollTop: 1000 })
        ]);
        expect(verdict.classification).toBe("stale");
        expect(verdict.reasons).toContain("rendered-content-lags-scroll");
    });

    it("reports blank ahead of stale when a frame is both", () => {
        const frame = frameAt(10);
        const verdict = classifyFrame(frame, [
            sampleAt(frame.frameTimeMicroseconds, {
                renderedScrollTop: 600,
                rowRectangles: coveringRows().filter((row) => row.bottom <= 400),
                scrollTop: 1000
            })
        ]);
        expect(verdict.classification).toBe("blank");
        expect(verdict.reasons).toContain("rendered-content-lags-scroll");
    });

    it("classifies a compositor partial update as partial", () => {
        const frame = frameAt(10, { reporterState: "STATE_PRESENTED_PARTIAL_OLD_MAIN" });
        const verdict = classifyFrame(frame, [sampleAt(frame.frameTimeMicroseconds)]);
        expect(verdict.classification).toBe("partial");
    });

    it("does not let a sub-pixel row seam register as blank", () => {
        const frame = frameAt(10);
        const rows = coveringRows().map((row, index) =>
            index === 3 ? { ...row, bottom: row.bottom - 0.3 } : row
        );
        const verdict = classifyFrame(frame, [
            sampleAt(frame.frameTimeMicroseconds, { rowRectangles: rows })
        ]);
        expect(verdict.classification).toBe("full");
    });

    it("treats an unexplained frame as partial rather than full", () => {
        // No semantic sample means we cannot prove the frame was correct. It
        // must not be scored as full.
        expect(classifyFrame(frameAt(10), []).classification).toBe("partial");
    });

    it("does not join a sample that is older than the join age", () => {
        const frame = frameAt(10);
        const stale = sampleAt(
            frame.frameTimeMicroseconds -
                DEFAULT_CLASSIFICATION_THRESHOLDS.maximumJoinAgeMicroseconds -
                1
        );
        expect(
            joinSemanticSample(
                frame,
                [stale],
                DEFAULT_CLASSIFICATION_THRESHOLDS.maximumJoinAgeMicroseconds
            )
        ).toBeNull();
    });

    it("never joins a sample taken after the frame was presented", () => {
        const frame = frameAt(10);
        const future = sampleAt(frame.frameTimeMicroseconds + 100_000);
        expect(joinSemanticSample(frame, [future], 50_000)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// The instrument must be able to go red. Each case below is a defect the
// product goal forbids, constructed so it is known-bad by inspection.
// ---------------------------------------------------------------------------

function runRoute(frames: readonly ExpectedFrame[], samples: readonly SemanticSample[]) {
    const verdicts = frames.map((frame) => classifyFrame(frame, samples));
    return buildRouteReport({
        expectedFrames: frames.length,
        frames,
        movingFrames: frames,
        intervalMicroseconds: VSYNC_MICROSECONDS,
        routeId: "test-route",
        verdicts
    });
}

/** 600 frames of a perfect 10s route at 60Hz, every frame covered and in sync. */
function healthyRun(frameCount = 600) {
    const frames = Array.from({ length: frameCount }, (_unused, index) => frameAt(index));
    const samples = frames.map((frame) => sampleAt(frame.frameTimeMicroseconds));
    return { frames, samples };
}

describe("buildRouteReport can go red", () => {
    it("passes on a clean 60Hz run (the control)", () => {
        const { frames, samples } = healthyRun();
        const report = runRoute(frames, samples);
        expect(report.presentedFramesPerSecond).toBeCloseTo(60.0, 1);
        expect(report.intervals.p95Milliseconds).toBeCloseTo(16.666, 3);
        expect(report.counts.full).toBe(600);
        expect(report.failures).toEqual([]);
        expect(report.passed).toBe(true);
    });

    it("FAILS when 10% of frames are dropped", () => {
        const { samples } = healthyRun();
        const frames = healthyRun().frames.map((frame) =>
            frame.sequenceNumber % 10 === 0
                ? { ...frame, presented: false, reporterState: "STATE_DROPPED" }
                : frame
        );
        const report = runRoute(frames, samples);
        expect(report.passed).toBe(false);
        expect(report.counts.dropped).toBe(60);
        expect(report.presentedFramesPerSecond).toBeLessThan(59);
        expect(report.intervals.p95Milliseconds).toBeGreaterThan(17);
        expect(report.failures.join("|")).toMatch(/presented fps/);
        expect(report.failures.join("|")).toMatch(/p95 interval/);
    });

    it("FAILS on a SINGLE visibly empty frame, because the threshold is zero", () => {
        const { frames } = healthyRun();
        const samples = frames.map((frame) =>
            frame.sequenceNumber === 300
                ? sampleAt(frame.frameTimeMicroseconds, {
                      rowRectangles: coveringRows().filter((row) => row.bottom <= 200)
                  })
                : sampleAt(frame.frameTimeMicroseconds)
        );
        const verdicts = frames.map((frame) =>
            classifyFrame(
                frame,
                samples.filter(
                    (sample) => sample.timestampMicroseconds === frame.frameTimeMicroseconds
                )
            )
        );
        const report = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            movingFrames: frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            routeId: "blank-route",
            verdicts
        });
        expect(report.visiblyEmptyFrames).toBe(1);
        expect(report.passed).toBe(false);
        expect(report.failures.join("|")).toMatch(/visibly empty frames 1 > 0/);
    });

    it("FAILS when more than 1% of frames are not fully presented", () => {
        const { frames } = healthyRun();
        const verdicts = frames.map((frame) =>
            classifyFrame(
                frame,
                // 2% of frames render content lagging the scroller.
                frame.sequenceNumber % 50 === 0
                    ? [
                          sampleAt(frame.frameTimeMicroseconds, {
                              renderedScrollTop: 500,
                              scrollTop: 1000
                          })
                      ]
                    : [sampleAt(frame.frameTimeMicroseconds)]
            )
        );
        const report = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            movingFrames: frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            routeId: "stale-route",
            verdicts
        });
        expect(report.counts.stale).toBe(12);
        expect(report.fullyPresentedRatio).toBeLessThan(0.99);
        expect(report.passed).toBe(false);
        expect(report.failures.join("|")).toMatch(/fully presented/);
    });

    it("FAILS when the BeginFrameSource stalled, instead of silently shrinking the denominator", () => {
        const { frames, samples } = healthyRun(100);
        const verdicts = frames.map((frame) => classifyFrame(frame, samples));
        // The span implies 200 vsyncs but only 100 ticks were observed.
        const report = buildRouteReport({
            expectedFrames: 200,
            frames,
            movingFrames: frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            routeId: "stalled-route",
            verdicts
        });
        expect(report.passed).toBe(false);
        expect(report.failures.join("|")).toMatch(/BeginFrameSource stalled/);
    });

    it("does not penalise idle vsyncs, which are not dropped frames", () => {
        const { samples } = healthyRun();
        const frames = healthyRun().frames.map((frame) =>
            frame.sequenceNumber < 5
                ? {
                      ...frame,
                      noUpdateDesired: true,
                      presented: false,
                      reporterState: "STATE_NO_UPDATE_DESIRED"
                  }
                : frame
        );
        const report = runRoute(frames, samples);
        expect(report.idleFrames).toBe(5);
        expect(report.counts.dropped).toBe(0);
        expect(report.expectedFrames).toBe(595);
        expect(report.passed).toBe(true);
    });
});

describe("countClassifications", () => {
    it("partitions every verdict exactly once", () => {
        const { frames, samples } = healthyRun(50);
        const verdicts = frames.map((frame) => classifyFrame(frame, samples));
        const counts = countClassifications(verdicts);
        const total = counts.blank + counts.dropped + counts.full + counts.partial + counts.stale;
        expect(total).toBe(50);
    });
});

describe("intervalStatistics", () => {
    it("reports NaN rather than a passing-looking zero for no intervals", () => {
        const stats = intervalStatistics([]);
        expect(stats.p95Milliseconds).toBeNaN();
        expect(stats.maxMilliseconds).toBeNaN();
    });
});

describe("moving-window scoping", () => {
    /**
     * 60 moving frames, then 300 frames the route never asked to move.
     *
     * The still frames still PRESENT — the grid keeps producing frames while the
     * route holds position — so they remain eligible for blank scoring. Only the
     * cadence statistics are scoped to the moving window.
     */
    function jumpThenStillness() {
        const frames = Array.from({ length: 360 }, (_unused, index) => frameAt(index));
        return { frames, movingFrames: frames.slice(0, 60) };
    }

    it("computes FPS over the moving window, not the whole route", () => {
        const { frames, movingFrames } = jumpThenStillness();
        const samples = frames.map((frame) => sampleAt(frame.frameTimeMicroseconds));
        const verdicts = frames.map((frame) => classifyFrame(frame, samples));
        const report = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames,
            routeId: "jump",
            verdicts
        });
        // Whole route is 6s; only 1s of it asked the grid to move. Dividing 60
        // presented frames by 6s would report 10 FPS and read as catastrophic.
        expect(report.wholeRouteSeconds).toBeCloseTo(6.0, 1);
        expect(report.durationSeconds).toBeCloseTo(1.0, 1);
        expect(report.presentedFramesPerSecond).toBeCloseTo(60.0, 1);
        expect(report.movingFrames).toBe(60);
        expect(report.passed).toBe(true);
    });

    it("STILL counts a blank frame that occurs during the stillness", () => {
        // The viewport going empty while the grid settles after a jump is the
        // defect the goal forbids outright. Scoping must not hide it.
        const { frames, movingFrames } = jumpThenStillness();
        const verdicts = frames.map((frame) =>
            classifyFrame(frame, [
                frame.sequenceNumber === 200
                    ? sampleAt(frame.frameTimeMicroseconds, {
                          rowRectangles: coveringRows().filter((row) => row.bottom <= 100)
                      })
                    : sampleAt(frame.frameTimeMicroseconds)
            ])
        );
        const report = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames,
            routeId: "jump-blank",
            verdicts
        });
        expect(report.visiblyEmptyFrames).toBe(1);
        expect(report.passed).toBe(false);
        expect(report.failures.join("|")).toMatch(/visibly empty frames 1 > 0/);
    });
});

describe("blank-frame detail", () => {
    it("records where the gap was, not just that there was one", () => {
        // A band at the TOP of the viewport, which is the geometry that would
        // distinguish a header-height coordinate offset from a random gap. Rows
        // are 45px, so dropping every row above y=200 leaves a gap of 0..225 —
        // printed before asserting rather than assumed to be 200.
        const frames = [frameAt(1)];
        const samples = [
            sampleAt(frames[0]!.frameTimeMicroseconds, {
                rowRectangles: coveringRows().filter((row) => row.top >= 200),
                renderedScrollTop: 1234,
                scrollTop: 1300
            })
        ];
        const verdicts = frames.map((frame) => classifyFrame(frame, samples));
        expect(verdicts[0]?.classification).toBe("blank");
        const report = buildRouteReport({
            expectedFrames: 1,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "banded",
            verdicts
        });
        expect(report.blankFrames).toHaveLength(1);
        const detail = report.blankFrames[0]!;
        expect(detail.bandPlacement).toEqual(["top-edge"]);
        expect(detail.bands[0]?.height).toBeCloseTo(225, 5);
        expect(detail.bands[0]?.top).toBeCloseTo(0, 5);
        expect(detail.scrollTop).toBe(1300);
        expect(detail.renderedScrollTop).toBe(1234);
        expect(detail.visibleRowCount).toBeGreaterThan(0);
        expect(detail.routeRelativeMicroseconds).toBe(0);
        // Masks recorded beside the band, so a band abutting a mask edge is
        // distinguishable from a genuine gap.
        expect(detail.masks).toEqual([]);
    });

    it("keeps nothing for a route that never blanked", () => {
        const frames = Array.from({ length: 20 }, (_unused, index) => frameAt(index + 1));
        const samples = frames.map((frame) => sampleAt(frame.frameTimeMicroseconds));
        const report = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "clean",
            verdicts: frames.map((frame) => classifyFrame(frame, samples))
        });
        expect(report.blankFrames).toEqual([]);
    });

    it("times each blank from the route's own origin", () => {
        const frames = Array.from({ length: 5 }, (_unused, index) => frameAt(index + 10));
        const samples = frames.map((frame, index) =>
            sampleAt(frame.frameTimeMicroseconds, index === 3 ? { rowRectangles: [] } : {})
        );
        const report = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "timed",
            verdicts: frames.map((frame) => classifyFrame(frame, samples))
        });
        expect(report.blankFrames).toHaveLength(1);
        // 4th of 5 frames: three vsyncs after the route's first frame.
        expect(report.blankFrames[0]?.routeRelativeMicroseconds).toBe(3 * VSYNC_MICROSECONDS);
    });
});

describe("reason attribution", () => {
    it("separates a partial the instrument caused from one the compositor reported", () => {
        // 20 frames. Half of them have no sample within the join age, which is
        // instrument coverage; two carry a real compositor partial update. Both
        // land in `partial`, and only the histogram can tell them apart.
        const frames = Array.from({ length: 20 }, (_unused, index) =>
            frameAt(index + 1, {
                reporterState:
                    index === 5 || index === 6
                        ? "STATE_PRESENTED_PARTIAL_OLD_MAIN"
                        : "STATE_PRESENTED_ALL"
            })
        );
        // Samples only for the first ten frames, so the rest cannot be joined.
        const samples = frames.slice(0, 10).map((frame) => sampleAt(frame.frameTimeMicroseconds));
        const verdicts = frames.map((frame) =>
            classifyFrame(frame, samples, DEFAULT_CLASSIFICATION_THRESHOLDS)
        );
        const report = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "attribution",
            verdicts
        });

        // Printed before asserting. Frames 11 and 12 still join the frame-10
        // sample (21.7ms and 38.3ms old, inside the 50ms join age); frame 13 is
        // 55.0ms out and is the first that cannot.
        expect(report.counts.partial).toBe(10);
        // The whole point: 8 of those 10 are the harness's own blind spots, not
        // anything the compositor reported.
        expect(report.cadenceReasonCounts["no-semantic-sample"]).toBe(8);
        expect(report.cadenceReasonCounts["compositor-partial-update"]).toBe(2);
        expect(report.fullyPresentedRatio).toBeCloseTo(0.5, 6);
        expect(report.failures.join("|")).toMatch(/fully presented/);
    });

    it("keeps a frame's compositor-partial state even when it has no sample", () => {
        // THE DEFECT THIS PINS. `classifyFrame` returns early for an unsampled
        // frame, and the trace-state reason used to be computed after that return,
        // so a frame that was both compositor-partial AND unsampled recorded only
        // `no-semantic-sample`. The histogram then undercounted compositor-partials
        // and anything re-derived from it flattered the grid.
        const partialUnsampled = frameAt(1, { reporterState: "STATE_PRESENTED_PARTIAL_OLD_MAIN" });
        const verdict = classifyFrame(partialUnsampled, []);
        expect(verdict.classification).toBe("partial");
        expect(verdict.reasons).toEqual(["compositor-partial-update", "no-semantic-sample"]);
    });

    it("reconciles the histogram with the trace-only count over the same frames", () => {
        // 200 frames: 40 compositor-partial, and samples for only the first 100, so
        // 20 of the partials are also unsampled. The two independent measures of
        // "how many frames the compositor did not present in full" must agree.
        const frames = Array.from({ length: 200 }, (_unused, index) =>
            frameAt(
                index + 1,
                index % 5 === 0 ? { reporterState: "STATE_PRESENTED_PARTIAL_OLD_MAIN" } : {}
            )
        );
        const samples = frames.slice(0, 100).map((frame) => sampleAt(frame.frameTimeMicroseconds));
        const semantic = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "reconcile",
            verdicts: frames.map((frame) => classifyFrame(frame, samples))
        });
        const cadence = buildCadenceReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "reconcile"
        });
        expect(cadence.presentedPartialFrames).toBe(40);
        expect(semantic.cadenceReasonCounts["compositor-partial-update"]).toBe(40);
    });

    it("counts every reason a frame met, not just the one it was classified as", () => {
        const reasons = countReasons([
            {
                blankAreaRatio: 0.5,
                classification: "blank",
                frameTimeMicroseconds: 0,
                reasons: ["empty-row-set", "uncovered-viewport", "rendered-content-lags-scroll"],
                sequenceNumber: 1,
                uncoveredBands: []
            },
            {
                blankAreaRatio: 0,
                classification: "stale",
                frameTimeMicroseconds: VSYNC_MICROSECONDS,
                reasons: ["rendered-content-lags-scroll"],
                sequenceNumber: 2,
                uncoveredBands: []
            }
        ]);
        expect(reasons).toEqual({
            "empty-row-set": 1,
            "rendered-content-lags-scroll": 2,
            "uncovered-viewport": 1
        });
    });

    it("reports no reasons for a clean route rather than omitting the line", () => {
        const frames = Array.from({ length: 10 }, (_unused, index) => frameAt(index + 1));
        const samples = frames.map((frame) => sampleAt(frame.frameTimeMicroseconds));
        const verdicts = frames.map((frame) => classifyFrame(frame, samples));
        const report = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "clean",
            verdicts
        });
        expect(report.cadenceReasonCounts).toEqual({});
        expect(formatRouteReport(report)).toContain("none");
    });
});

describe("the clean cadence report, and the split verdict", () => {
    const cleanFrames = (
        count: number,
        overrides: (index: number) => Partial<ExpectedFrame> = () => ({})
    ) => Array.from({ length: count }, (_unused, index) => frameAt(index + 1, overrides(index)));

    it("passes a flawless 60Hz run with no DOM sampling at all", () => {
        const frames = cleanFrames(600);
        const report = buildCadenceReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "control"
        });
        expect(report.presentedFramesPerSecond).toBeCloseTo(60.002, 2);
        expect(report.fullyPresentedRatio).toBe(1);
        expect(report.droppedFrames).toBe(0);
        expect(report.failures).toEqual([]);
        expect(report.passed).toBe(true);
    });

    it("fails on FPS when a tenth of the frames are dropped", () => {
        const frames = cleanFrames(600, (index) =>
            index % 10 === 0 ? { presented: false, reporterState: "STATE_DROPPED" } : {}
        );
        const report = buildCadenceReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "drops"
        });
        expect(report.droppedFrames).toBe(60);
        expect(report.failures.join("|")).toMatch(/presented fps/);
        expect(report.failures.join("|")).toMatch(/p95 interval/);
    });

    it("counts a compositor PARTIAL presentation as not fully presented", () => {
        // 2% partial. No sampler is involved, so this cannot be instrument
        // coverage — it is the compositor's own verdict on its own frame.
        const frames = cleanFrames(600, (index) =>
            index % 50 === 0 ? { reporterState: "STATE_PRESENTED_PARTIAL_OLD_MAIN" } : {}
        );
        const report = buildCadenceReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "partial"
        });
        expect(report.presentedPartialFrames).toBe(12);
        expect(report.presentedFramesPerSecond).toBeCloseTo(60.002, 2);
        expect(report.fullyPresentedRatio).toBeCloseTo(0.98, 6);
        expect(report.failures.join("|")).toMatch(/fully presented 98\.000% < 99/);
    });

    it("detects a stalled BeginFrameSource without deflating the denominator", () => {
        const frames = cleanFrames(500);
        const report = buildCadenceReport({
            expectedFrames: 600,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "stalled"
        });
        expect(report.failures.join("|")).toMatch(/BeginFrameSource stalled: observed 500/);
    });

    it("cannot be reduced by the harness having no sample for a frame", () => {
        // The requirement this encodes: `fully presented` is thresholded and
        // ABSOLUTE, so the instrument must not be able to spend any of it. The
        // clean report takes no verdicts and no samples at all, so a run the
        // semantic classifier would score 0% full (every frame
        // `no-semantic-sample`) is still 100% fully presented here — because every
        // frame WAS presented in full, which is a fact about the compositor.
        const frames = cleanFrames(300);
        const semantic = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "no-samples",
            // No samples: every frame is partial/no-semantic-sample.
            verdicts: frames.map((frame) => classifyFrame(frame, []))
        });
        expect(semantic.fullyPresentedRatio).toBe(0);
        expect(semantic.cadenceReasonCounts["no-semantic-sample"]).toBe(300);

        const cadence = buildCadenceReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "no-samples"
        });
        expect(cadence.fullyPresentedRatio).toBe(1);
        expect(cadence.failures).toEqual([]);

        // The clean pass contributes nothing to the verdict, as intended: no
        // `clean:` line appears. But the combined verdict is NOT empty — with 0%
        // coverage the instrumented pass cannot certify zero blank frames, and
        // saying so is the honest outcome rather than a silent pass.
        const failures = combinedRouteFailures(cadence, semantic);
        expect(failures.some((failure) => failure.startsWith("clean: "))).toBe(false);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toMatch(/semantic coverage 0\.0% < 90%/);
        expect(semantic.lowSemanticCoverage).toBe(true);
        expect(semantic.semanticCoverageRatio).toBe(0);
    });

    it("reports full coverage, and no qualification, when every frame was sampled", () => {
        const frames = cleanFrames(300);
        const samples = frames.map((frame) => sampleAt(frame.frameTimeMicroseconds));
        const semantic = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "covered",
            verdicts: frames.map((frame) => classifyFrame(frame, samples))
        });
        expect(semantic.semanticCoverageRatio).toBe(1);
        expect(semantic.lowSemanticCoverage).toBe(false);
    });

    it("qualifies a zero-blank result taken on partial coverage", () => {
        // 300 frames, samples for the first 200 only. Nothing is blank in what was
        // seen, so a naive read is "zero blank frames, PASS" — on two thirds of the
        // route. The frames that would have carried the defect are the unseen ones.
        const frames = cleanFrames(300);
        const samples = frames.slice(0, 200).map((frame) => sampleAt(frame.frameTimeMicroseconds));
        const semantic = buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "partial-coverage",
            verdicts: frames.map((frame) => classifyFrame(frame, samples))
        });
        expect(semantic.counts.blank).toBe(0);
        expect(semantic.semanticCoverageRatio).toBeLessThan(0.9);
        const cadence = buildCadenceReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "partial-coverage"
        });
        expect(combinedRouteFailures(cadence, semantic).join("|")).toMatch(
            /too few moving frames carried a sample to certify zero blank frames/
        );
    });

    it("excludes idle vsyncs from the scored population", () => {
        const frames = cleanFrames(120, (index) =>
            index >= 60 ? { noUpdateDesired: true, presented: false, reporterState: null } : {}
        );
        const report = buildCadenceReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "idle"
        });
        expect(report.idleFrames).toBe(60);
        expect(report.movingFrames).toBe(60);
        expect(report.droppedFrames).toBe(0);
        expect(report.passed).toBe(true);
    });
});

describe("combinedRouteFailures", () => {
    const perfectCadence = () => {
        const frames = Array.from({ length: 600 }, (_unused, index) => frameAt(index + 1));
        return buildCadenceReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "combined"
        });
    };

    /** A semantic report with `blank` blank frames and `stale` stale frames. */
    const semanticWith = (blank: number, stale: number) => {
        const frames = Array.from({ length: 600 }, (_unused, index) => frameAt(index + 1));
        const samples = frames.map((frame, index) =>
            sampleAt(frame.frameTimeMicroseconds, {
                ...(index < blank ? { rowRectangles: [] } : {}),
                ...(index >= blank && index < blank + stale ? { renderedScrollTop: 500 } : {})
            })
        );
        const verdicts = frames.map((frame) => classifyFrame(frame, samples));
        return buildRouteReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "combined",
            verdicts
        });
    };

    it("passes only when BOTH passes are clean", () => {
        expect(combinedRouteFailures(perfectCadence(), semanticWith(0, 0))).toEqual([]);
    });

    it("fails on a single blank frame the clean pass cannot see", () => {
        // This is the whole point of the split: cadence is perfect, and the route
        // still fails, on evidence only the instrumented pass carries.
        const failures = combinedRouteFailures(perfectCadence(), semanticWith(1, 0));
        expect(failures).toHaveLength(1);
        expect(failures[0]).toBe("instrumented: visibly empty frames 1 > 0");
    });

    it("fails on stale content as well", () => {
        const failures = combinedRouteFailures(perfectCadence(), semanticWith(0, 3));
        expect(failures.join("|")).toMatch(/instrumented: stale frames 3 > 0/);
    });

    it("labels a cadence failure as coming from the clean pass", () => {
        const frames = Array.from({ length: 600 }, (_unused, index) =>
            frameAt(
                index + 1,
                index % 10 === 0 ? { presented: false, reporterState: "STATE_DROPPED" } : {}
            )
        );
        const cadence = buildCadenceReport({
            expectedFrames: frames.length,
            frames,
            intervalMicroseconds: VSYNC_MICROSECONDS,
            movingFrames: frames,
            routeId: "combined"
        });
        const failures = combinedRouteFailures(cadence, semanticWith(0, 0));
        expect(failures.every((failure) => failure.startsWith("clean: "))).toBe(true);
        expect(failures.join("|")).toMatch(/clean: presented fps/);
    });
});
