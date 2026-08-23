/**
 * Aggregation across a capture campaign: many repeats inside a session, many
 * independent sessions per arm.
 *
 * WHY THE TWO VARIANCES ARE REPORTED SEPARATELY. Repeats inside one session
 * share a seeded vault, a browser process and a warmed JIT, so their spread
 * measures run-to-run noise only. Sessions differ in all of those, so the spread
 * BETWEEN session means is the only thing that can expose a seeding artefact
 * masquerading as a stable result. Pooling them would hide exactly the effect
 * the second session exists to detect.
 *
 * A single run's standard deviation is `NaN`, never `0`. Zero reads as "no
 * variance observed" when the truth is "variance not measurable".
 */

export interface Spread {
    readonly count: number;
    readonly max: number;
    readonly mean: number;
    readonly min: number;
    /** Sample standard deviation (n-1). `NaN` for fewer than two values. */
    readonly standardDeviation: number;
}

export function spread(values: readonly number[]): Spread {
    if (values.length === 0) {
        return {
            count: 0,
            max: Number.NaN,
            mean: Number.NaN,
            min: Number.NaN,
            standardDeviation: Number.NaN
        };
    }
    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    const variance =
        values.length < 2
            ? Number.NaN
            : values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1);
    return {
        count: values.length,
        max: Math.max(...values),
        mean,
        min: Math.min(...values),
        standardDeviation: Number.isNaN(variance) ? Number.NaN : Math.sqrt(variance)
    };
}

/**
 * One route measured once, flattened to the numbers a campaign compares.
 *
 * Cadence fields come from the CLEAN pass; `blankFrames` and `staleFrames` from the
 * INSTRUMENTED pass. The `instrumented*` fields are the same cadence metrics taken
 * from the instrumented pass, kept solely so the instrument's own perturbation is a
 * measured number rather than an assertion.
 */
export interface RunPoint {
    readonly achievedRouteSeconds: number;
    readonly blankFrames: number;
    readonly droppedFrames: number;
    readonly failures: readonly string[];
    readonly fullyPresentedRatio: number;
    readonly instrumentedFullyPresentedRatio: number;
    readonly instrumentedPresentedFramesPerSecond: number;
    /** 1-minute host load average when this run started. */
    readonly loadAverageOneMinute: number;
    readonly p95IntervalMilliseconds: number;
    readonly passed: boolean;
    readonly presentedFramesPerSecond: number;
    readonly repeatIndex: number;
    readonly routeId: string;
    readonly sessionIndex: number;
    readonly staleFrames: number;
}

export const CAMPAIGN_METRICS = [
    "presentedFramesPerSecond",
    "p95IntervalMilliseconds",
    "fullyPresentedRatio",
    "blankFrames",
    "droppedFrames",
    "achievedRouteSeconds",
    "loadAverageOneMinute",
    "samplerPerturbationFps"
] as const;

export type CampaignMetric = (typeof CAMPAIGN_METRICS)[number];

export function metricValue(point: RunPoint, metric: CampaignMetric): number {
    switch (metric) {
        case "loadAverageOneMinute":
            return point.loadAverageOneMinute;
        // Clean minus instrumented FPS on the same route and repeat: how much the
        // semantic sampler costs the grid, measured rather than asserted.
        case "samplerPerturbationFps":
            return point.presentedFramesPerSecond - point.instrumentedPresentedFramesPerSecond;
        case "achievedRouteSeconds":
            return point.achievedRouteSeconds;
        case "blankFrames":
            return point.blankFrames;
        case "droppedFrames":
            return point.droppedFrames;
        case "fullyPresentedRatio":
            return point.fullyPresentedRatio;
        case "p95IntervalMilliseconds":
            return point.p95IntervalMilliseconds;
        case "presentedFramesPerSecond":
            return point.presentedFramesPerSecond;
    }
}

export interface MetricVariance {
    /** Spread of the per-session means. Two sessions give one degree of freedom. */
    readonly betweenSessions: Spread;
    readonly metric: CampaignMetric;
    /** Spread over every run of every session, for reference only. */
    readonly pooled: Spread;
    /** One spread per session, over that session's repeats. */
    readonly withinSession: readonly Spread[];
}

export interface RouteCampaignSummary {
    /** Every distinct failure string seen on this route, across all runs. */
    readonly failures: readonly string[];
    /** True only when EVERY run of this route passed. */
    readonly passedEveryRun: boolean;
    readonly passingRuns: number;
    readonly routeId: string;
    readonly runCount: number;
    readonly variance: readonly MetricVariance[];
}

/** Session indexes present in the points, ascending. */
function sessionIndexes(points: readonly RunPoint[]): readonly number[] {
    return [...new Set(points.map((point) => point.sessionIndex))].sort(
        (left, right) => left - right
    );
}

export function summariseRoute(routeId: string, points: readonly RunPoint[]): RouteCampaignSummary {
    const routePoints = points.filter((point) => point.routeId === routeId);
    const sessions = sessionIndexes(routePoints);
    const variance = CAMPAIGN_METRICS.map((metric): MetricVariance => {
        const withinSession = sessions.map((sessionIndex) =>
            spread(
                routePoints
                    .filter((point) => point.sessionIndex === sessionIndex)
                    .map((point) => metricValue(point, metric))
            )
        );
        return {
            betweenSessions: spread(withinSession.map((sessionSpread) => sessionSpread.mean)),
            metric,
            pooled: spread(routePoints.map((point) => metricValue(point, metric))),
            withinSession
        };
    });
    return {
        failures: [...new Set(routePoints.flatMap((point) => point.failures))],
        passedEveryRun: routePoints.length > 0 && routePoints.every((point) => point.passed),
        passingRuns: routePoints.filter((point) => point.passed).length,
        routeId,
        runCount: routePoints.length,
        variance
    };
}

export function summariseCampaign(points: readonly RunPoint[]): readonly RouteCampaignSummary[] {
    return [...new Set(points.map((point) => point.routeId))].map((routeId) =>
        summariseRoute(routeId, points)
    );
}

const format = (value: number, digits: number): string =>
    Number.isNaN(value) ? "n/a" : value.toFixed(digits);

/** The per-run table. Every row is one route in one repeat of one session. */
export function formatRunTable(points: readonly RunPoint[]): string {
    const header = [
        "session",
        "run",
        "route",
        "fps",
        "p95ms",
        "full%",
        "blank",
        "stale",
        "dropped",
        "route s",
        "smplr dfps",
        "load",
        "verdict"
    ];
    const rows = points.map((point) => [
        String(point.sessionIndex),
        String(point.repeatIndex),
        point.routeId,
        format(point.presentedFramesPerSecond, 3),
        format(point.p95IntervalMilliseconds, 3),
        format(point.fullyPresentedRatio * 100, 3),
        String(point.blankFrames),
        String(point.staleFrames),
        String(point.droppedFrames),
        format(point.achievedRouteSeconds, 3),
        format(point.presentedFramesPerSecond - point.instrumentedPresentedFramesPerSecond, 3),
        format(point.loadAverageOneMinute, 2),
        point.passed ? "PASS" : "FAIL"
    ]);
    const widths = header.map((label, column) =>
        Math.max(label.length, ...rows.map((row) => (row[column] ?? "").length))
    );
    const line = (cells: readonly string[]): string =>
        cells.map((cell, column) => cell.padEnd(widths[column] ?? cell.length)).join("  ");
    return [line(header), ...rows.map(line)].join("\n");
}

/** Within-session vs between-session spread, per route and metric. */
export function formatVarianceTable(summaries: readonly RouteCampaignSummary[]): string {
    const digitsFor = (metric: CampaignMetric): number =>
        metric === "blankFrames" || metric === "droppedFrames" ? 1 : 3;
    const lines: string[] = [];
    for (const summary of summaries) {
        lines.push(
            `route ${summary.routeId} — ${String(summary.passingRuns)}/${String(summary.runCount)} runs passed${summary.passedEveryRun ? "" : "  (FAILS: a route passes only if every run passes)"}`
        );
        for (const entry of summary.variance) {
            const digits = digitsFor(entry.metric);
            const within = entry.withinSession
                .map(
                    (sessionSpread, index) =>
                        `s${String(index + 1)} mean ${format(sessionSpread.mean, digits)} sd ${format(sessionSpread.standardDeviation, digits)} [${format(sessionSpread.min, digits)}..${format(sessionSpread.max, digits)}]`
                )
                .join("   ");
            lines.push(`    ${entry.metric.padEnd(24)} within: ${within}`);
            lines.push(
                `    ${"".padEnd(24)} between sessions: mean ${format(entry.betweenSessions.mean, digits)} sd ${format(entry.betweenSessions.standardDeviation, digits)} [${format(entry.betweenSessions.min, digits)}..${format(entry.betweenSessions.max, digits)}]`
            );
        }
        if (summary.failures.length > 0) {
            for (const failure of summary.failures) lines.push(`    ! ${failure}`);
        }
    }
    return lines.join("\n");
}
