/**
 * Tests for the campaign aggregation.
 *
 * Each block below is a case the aggregation MUST be able to fail on. The
 * pattern is deliberate: this project has already caught five instruments that
 * passed while unable to fail, so a summary that cannot distinguish "stable" from
 * "unmeasurable", or "passed every run" from "passed on average", is not
 * evidence of anything.
 */

import { describe, expect, it } from "vitest";

import {
    formatRunTable,
    formatVarianceTable,
    metricValue,
    spread,
    summariseCampaign,
    summariseRoute,
    type RunPoint
} from "./run-statistics";

function point(overrides: Partial<RunPoint> = {}): RunPoint {
    return {
        achievedRouteSeconds: 12.0,
        blankFrames: 0,
        droppedFrames: 0,
        failures: [],
        fullyPresentedRatio: 1,
        instrumentedFullyPresentedRatio: 1,
        instrumentedPresentedFramesPerSecond: 60,
        loadAverageOneMinute: 0.4,
        p95IntervalMilliseconds: 16.666,
        passed: true,
        presentedFramesPerSecond: 60,
        repeatIndex: 1,
        routeId: "ordinary",
        sessionIndex: 1,
        staleFrames: 0,
        ...overrides
    };
}

describe("spread", () => {
    it("reports NaN, not 0, for a single value", () => {
        // A single run has no measurable variance. Reporting 0 would read as
        // "this is stable" from evidence that cannot say so.
        const single = spread([60]);
        expect(single.mean).toBe(60);
        expect(Number.isNaN(single.standardDeviation)).toBe(true);
    });

    it("reports NaN for an empty set rather than a passing-looking 0", () => {
        const empty = spread([]);
        expect(Number.isNaN(empty.mean)).toBe(true);
        expect(Number.isNaN(empty.standardDeviation)).toBe(true);
        expect(empty.count).toBe(0);
    });

    it("computes the sample standard deviation", () => {
        // Sample (n-1) of [2,4,4,4,5,5,7,9] is 2.13809; the population value is 2.
        expect(spread([2, 4, 4, 4, 5, 5, 7, 9]).standardDeviation).toBeCloseTo(2.13809, 4);
    });

    it("tracks min and max", () => {
        const result = spread([59.1, 60.0, 58.2]);
        expect(result.min).toBeCloseTo(58.2, 5);
        expect(result.max).toBeCloseTo(60.0, 5);
        expect(result.count).toBe(3);
    });
});

describe("a route passes only if every run passes", () => {
    it("fails the route when a single run of ten failed", () => {
        const points = [
            ...Array.from({ length: 9 }, (_unused, index) => point({ repeatIndex: index + 1 })),
            point({
                failures: ["visibly empty frames 1 > 0"],
                blankFrames: 1,
                passed: false,
                repeatIndex: 10
            })
        ];
        const summary = summariseRoute("ordinary", points);
        expect(summary.runCount).toBe(10);
        expect(summary.passingRuns).toBe(9);
        expect(summary.passedEveryRun).toBe(false);
        expect(summary.failures).toEqual(["visibly empty frames 1 > 0"]);
    });

    it("does not let nine good runs average away one bad one", () => {
        // The mean of nine 60fps runs and one 20fps run is 56fps, which is a
        // failing number by itself — but the point is that even a mean ABOVE the
        // threshold must not pass the route. 59.9 mean, one failing run.
        const points = [
            ...Array.from({ length: 9 }, (_unused, index) =>
                point({ presentedFramesPerSecond: 60.0, repeatIndex: index + 1 })
            ),
            point({
                failures: ["presented fps 58.900 < 59"],
                passed: false,
                presentedFramesPerSecond: 58.9,
                repeatIndex: 10
            })
        ];
        const summary = summariseRoute("ordinary", points);
        const fps = summary.variance.find((entry) => entry.metric === "presentedFramesPerSecond");
        expect(fps?.pooled.mean).toBeGreaterThan(59);
        expect(summary.passedEveryRun).toBe(false);
    });

    it("reports no pass for a route with no runs", () => {
        expect(summariseRoute("ordinary", []).passedEveryRun).toBe(false);
    });
});

describe("within-session and between-session variance are separated", () => {
    const seedingArtefact: readonly RunPoint[] = [
        ...Array.from({ length: 5 }, (_unused, index) =>
            point({ presentedFramesPerSecond: 60, repeatIndex: index + 1, sessionIndex: 1 })
        ),
        ...Array.from({ length: 5 }, (_unused, index) =>
            point({ presentedFramesPerSecond: 50, repeatIndex: index + 1, sessionIndex: 2 })
        )
    ];

    it("shows zero spread inside each session and a real spread between them", () => {
        // This is the case the second session exists to detect: perfectly
        // repeatable numbers inside a session that disagree between sessions.
        // A pooled-only summary would report sd 5.27 and look like ordinary
        // noise.
        const summary = summariseRoute("ordinary", seedingArtefact);
        const fps = summary.variance.find((entry) => entry.metric === "presentedFramesPerSecond");
        expect(fps).toBeDefined();
        expect(fps?.withinSession).toHaveLength(2);
        expect(fps?.withinSession[0]?.standardDeviation).toBe(0);
        expect(fps?.withinSession[1]?.standardDeviation).toBe(0);
        expect(fps?.withinSession[0]?.mean).toBe(60);
        expect(fps?.withinSession[1]?.mean).toBe(50);
        expect(fps?.betweenSessions.standardDeviation).toBeCloseTo(7.0711, 3);
        expect(fps?.pooled.standardDeviation).toBeCloseTo(5.2705, 3);
    });

    it("keeps per-session spread when the noise is inside a session instead", () => {
        const noisyWithin: readonly RunPoint[] = [
            point({ presentedFramesPerSecond: 45, repeatIndex: 1, sessionIndex: 1 }),
            point({ presentedFramesPerSecond: 60, repeatIndex: 2, sessionIndex: 1 }),
            point({ presentedFramesPerSecond: 45, repeatIndex: 1, sessionIndex: 2 }),
            point({ presentedFramesPerSecond: 60, repeatIndex: 2, sessionIndex: 2 })
        ];
        const fps = summariseRoute("ordinary", noisyWithin).variance.find(
            (entry) => entry.metric === "presentedFramesPerSecond"
        );
        expect(fps?.withinSession[0]?.standardDeviation).toBeCloseTo(10.6066, 3);
        expect(fps?.betweenSessions.standardDeviation).toBe(0);
    });

    it("cannot report a between-session spread from one session", () => {
        const oneSession = Array.from({ length: 5 }, (_unused, index) =>
            point({ repeatIndex: index + 1, sessionIndex: 1 })
        );
        const fps = summariseRoute("ordinary", oneSession).variance.find(
            (entry) => entry.metric === "presentedFramesPerSecond"
        );
        expect(Number.isNaN(fps?.betweenSessions.standardDeviation ?? 0)).toBe(true);
    });
});

describe("metric extraction", () => {
    it("reads every campaign metric off a run point", () => {
        const source = point({
            achievedRouteSeconds: 12.005,
            blankFrames: 3,
            droppedFrames: 99,
            fullyPresentedRatio: 0.827,
            p95IntervalMilliseconds: 66.664,
            presentedFramesPerSecond: 53.151,
            instrumentedPresentedFramesPerSecond: 48.151,
            loadAverageOneMinute: 1.25
        });
        expect(metricValue(source, "achievedRouteSeconds")).toBe(12.005);
        expect(metricValue(source, "blankFrames")).toBe(3);
        expect(metricValue(source, "droppedFrames")).toBe(99);
        expect(metricValue(source, "fullyPresentedRatio")).toBe(0.827);
        expect(metricValue(source, "p95IntervalMilliseconds")).toBe(66.664);
        expect(metricValue(source, "presentedFramesPerSecond")).toBe(53.151);
        expect(metricValue(source, "loadAverageOneMinute")).toBe(1.25);
        // Clean minus instrumented: the sampler's measured cost in FPS.
        expect(metricValue(source, "samplerPerturbationFps")).toBeCloseTo(5, 6);
    });
});

describe("campaign summaries and tables", () => {
    it("summarises each route separately", () => {
        const summaries = summariseCampaign([
            point({ routeId: "ordinary" }),
            point({ routeId: "free-spin", passed: false, failures: ["blank"] })
        ]);
        expect(summaries.map((summary) => summary.routeId)).toEqual(["ordinary", "free-spin"]);
        expect(summaries[0]?.passedEveryRun).toBe(true);
        expect(summaries[1]?.passedEveryRun).toBe(false);
    });

    it("prints one table row per run, not per route", () => {
        const points = [
            point({ repeatIndex: 1, sessionIndex: 1 }),
            point({ repeatIndex: 2, sessionIndex: 1 }),
            point({ repeatIndex: 1, sessionIndex: 2 })
        ];
        const lines = formatRunTable(points).split("\n");
        expect(lines).toHaveLength(4); // header + 3 runs
        expect(lines[0]).toContain("verdict");
    });

    it("marks a route that did not pass every run in the variance table", () => {
        const text = formatVarianceTable(
            summariseCampaign([point(), point({ passed: false, repeatIndex: 2, failures: ["x"] })])
        );
        expect(text).toContain("1/2 runs passed");
        expect(text).toContain("a route passes only if every run passes");
        expect(text).toContain("! x");
    });

    it("prints n/a rather than a number it cannot compute", () => {
        const text = formatVarianceTable(summariseCampaign([point()]));
        expect(text).toContain("n/a");
    });
});
