// @vitest-environment node
/**
 * Measurement entry point. NOT part of `pnpm test` — it needs a running
 * production server and takes tens of minutes. Run it explicitly:
 *
 *   PERF_ARM=A-before-cd81290 \
 *   PERF_UPSTREAM_PORT=3100 \
 *   PERF_TLS_PEM=/tmp/mf-perf-probe/tls.pem \
 *   PERF_SESSIONS=2 PERF_REPEATS=5 \
 *   pnpm exec vitest run --config tests/perf/vitest.measure.config.ts
 *
 * It asserts the product-goal thresholds ON EVERY RUN, so a route that passes
 * four times and fails once fails the campaign. Artifacts are rewritten after
 * every repeat, before any assertion, so numbers survive a failure, a crash, or a
 * kill — a 25-minute campaign that only wrote at the end lost everything once.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, it } from "vitest";

import {
    enrichmentPlan,
    FIXTURE_ACCOUNTS,
    FIXTURE_FIELD_RULES,
    FIXTURE_PEOPLE,
    FIXTURE_TAGS,
    FIXTURE_TRANSACTION_COUNT,
    fixtureCsvDigest,
    fixtureDigest,
    fixtureEnrichmentCounts,
    fixtureEnrichmentDigest
} from "./fixture/transaction-fixture";
import { formatCadenceReport, formatRouteReport } from "./frame-report";
import { harnessDigests } from "./harness-digest";
import {
    DEFAULT_MAXIMUM_LOAD_AVERAGE,
    measureArm,
    startHttpsProxy,
    type ArmMeasurement
} from "./measure-grid";
import {
    formatRunTable,
    formatVarianceTable,
    summariseCampaign,
    type RunPoint
} from "./run-statistics";
import { routeDurationSeconds, routePeakVelocity, SCROLL_ROUTES } from "./scroll-routes";

const arm = process.env.PERF_ARM ?? "unlabelled";
const upstreamPort = Number(process.env.PERF_UPSTREAM_PORT ?? "3100");
const tlsPemPath = process.env.PERF_TLS_PEM ?? "";
const sessionCount = Number(process.env.PERF_SESSIONS ?? "2");
const repeatCount = Number(process.env.PERF_REPEATS ?? "5");
const notesCap = Number(process.env.PERF_NOTES_ROWS ?? "500");
/**
 * Optional route filter, for a side run that exists to produce one artifact
 * rather than to score anything. A scored campaign leaves this unset and runs the
 * whole set.
 */
/**
 * DIAGNOSTIC ONLY. Overrides every selected route's start offset.
 *
 * Exists for one question the frozen route set cannot answer: the two routes that
 * blank are also the only two that start at 0, and also the slowest-moving pair.
 * Running an unchanged route from a deep offset separates position from velocity.
 * A scored campaign leaves this unset; when it is set the artifact is a
 * discriminator, not a threshold result.
 */
const startOffsetOverride =
    process.env.PERF_START_OFFSET == null || process.env.PERF_START_OFFSET === ""
        ? null
        : Number(process.env.PERF_START_OFFSET);

const routeFilter = (process.env.PERF_ROUTES ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

const maximumLoadAverage = Number(
    process.env.PERF_MAX_LOADAVG ?? String(DEFAULT_MAXIMUM_LOAD_AVERAGE)
);

/**
 * Digested ONCE, at module load, not at write time.
 *
 * MEASURED MISTAKE THIS PREVENTS: artifacts are rewritten after every repeat, and
 * an earlier version called `harnessDigests()` inside that writer. Editing the
 * harness while a campaign was running therefore changed the digest RECORDED for a
 * campaign that was still executing the older code — the results stayed valid (a
 * running vitest process does not re-read its modules) but the provenance stamped
 * on them silently became someone else's. A digest taken at the start describes
 * the bytes that ran.
 */
const HARNESS_DIGESTS = harnessDigests(import.meta.dirname);
const outputDirectory =
    process.env.PERF_OUT ??
    join(process.cwd(), "specs/015-transaction-grid-tanstack/evidence/measurements");

/**
 * One row per route per repeat.
 *
 * Cadence comes from the CLEAN pass (the sampler cannot fail an absolute threshold
 * on the grid's behalf there); blank and stale come from the INSTRUMENTED pass,
 * which is the only one that can see them. `failures` is the combined verdict, and
 * each line says which pass produced it.
 */
function runPointsFor(sessionIndex: number, measurement: ArmMeasurement): readonly RunPoint[] {
    return measurement.runs.flatMap((run, repeatIndex) =>
        run.map((route): RunPoint => {
            const semantic = route.instrumented.semantic;
            return {
                achievedRouteSeconds: route.clean.schedule.achievedDurationMilliseconds / 1000,
                blankFrames: semantic?.counts.blank ?? Number.NaN,
                droppedFrames: route.clean.cadence.droppedFrames,
                failures: route.failures,
                fullyPresentedRatio: route.clean.cadence.fullyPresentedRatio,
                instrumentedFullyPresentedRatio: route.instrumented.cadence.fullyPresentedRatio,
                instrumentedPresentedFramesPerSecond:
                    route.instrumented.cadence.presentedFramesPerSecond,
                loadAverageOneMinute: route.clean.loadAverageOneMinute,
                p95IntervalMilliseconds: route.clean.cadence.intervals.p95Milliseconds,
                passed: route.passed,
                presentedFramesPerSecond: route.clean.cadence.presentedFramesPerSecond,
                repeatIndex: repeatIndex + 1,
                routeId: route.routeId,
                sessionIndex,
                staleFrames: semantic?.counts.stale ?? Number.NaN
            };
        })
    );
}

/** One pass over a route, flattened for the JSON artifact. */
function serialiseRun(
    run: ArmMeasurement["runs"][number][number]["clean"]
): Record<string, unknown> {
    return {
        cadence: run.cadence,
        droppedSampleCount: run.droppedSampleCount,
        inputMode: run.inputMode,
        loadAverageOneMinute: run.loadAverageOneMinute,
        maxScrollTop: run.maxScrollTop,
        minScrollTop: run.minScrollTop,
        mode: run.mode,
        sampleCostMaxMilliseconds: run.sampleCostMaxMilliseconds,
        sampleCostP50Milliseconds: run.sampleCostP50Milliseconds,
        sampleCount: run.sampleCount,
        schedule: run.schedule,
        semantic: run.semantic,
        stickyMaskDrift: run.stickyMaskDrift,
        stimulus: run.stimulus
    };
}

/** Everything that identifies WHAT was measured, so a number is never orphaned. */
function provenance(): Record<string, unknown> {
    return {
        arm,
        commit: process.env.PERF_COMMIT ?? null,
        fixture: {
            accounts: FIXTURE_ACCOUNTS.map((account) => `${account.name} (${account.currency})`),
            csvDigest: fixtureCsvDigest(),
            definitionDigest: fixtureDigest(),
            enrichmentDigest: fixtureEnrichmentDigest(),
            expectedEnrichment: fixtureEnrichmentCounts(),
            fieldRules: FIXTURE_FIELD_RULES.length,
            notesPlanned: Math.min(notesCap, enrichmentPlan().notedRows.length),
            people: FIXTURE_PEOPLE,
            tags: FIXTURE_TAGS,
            transactionCount: FIXTURE_TRANSACTION_COUNT
        },
        diagnosticStartOffsetOverride: startOffsetOverride,
        harnessDigest: process.env.PERF_HARNESS_DIGEST ?? null,
        // Split so "the arms differ in the product, not in how they were
        // measured" is checkable. The seeding digests are EXPECTED to differ
        // between a paginating grid and a cursor-sized one; the measurement
        // digests must not.
        harnessDigests: HARNESS_DIGESTS,
        maximumLoadAverage: maximumLoadAverage,
        lockfileSha256: process.env.PERF_LOCKFILE_SHA256 ?? null,
        reactVirtual: process.env.PERF_REACT_VIRTUAL ?? null,
        repeatsPerSession: repeatCount,
        routes: SCROLL_ROUTES.map((route) => ({
            durationSeconds: routeDurationSeconds(route),
            id: route.id,
            inputMode: route.inputMode,
            peakVelocityPixelsPerSecond: routePeakVelocity(route),
            provenance: route.provenance,
            startOffsetPixels: route.startOffsetPixels,
            ticks: route.deltasPerTick.length
        })),
        sessions: sessionCount,
        virtualCore: process.env.PERF_VIRTUAL_CORE ?? null
    };
}

/**
 * A session placeholder, so a session appears in the artifacts the moment it
 * starts rather than only once it finishes.
 */
function emptyMeasurement(): ArmMeasurement {
    return {
        consoleWarnings: [],
        notes: {
            annotatedRows: 0,
            expandedAriaRows: 0,
            expandedHeight: 0,
            seconds: 0,
            unexpandedHeight: 0
        },
        hostLoad: { atEnd: Number.NaN, atStart: Number.NaN, maximumAllowed: maximumLoadAverage },
        runs: [],
        seed: {
            accountsCreated: [],
            domEvidence: {
                accountsSeen: [],
                allocatedExample: null,
                allocationColumnCount: 0,
                allocationColumnLabels: [],
                rowsSampled: 0,
                rowsWithAllocations: 0,
                rowsWithRulePercentage: 0,
                rowsWithTags: 0,
                taggedExample: null
            },
            geometry: {
                clientHeight: 0,
                height: 0,
                left: 0,
                maxOffset: 0,
                scrollHeight: 0,
                scrollTop: 0,
                top: 0,
                width: 0
            },
            identitySeconds: 0,
            importLedger: { note: null, perImport: [], total: 0, trusted: false },
            imports: [],
            peopleCreated: [],
            preload: { gridRowCount: null, highestIndex: -1, iterations: 0, scrollHeight: 0 },
            preloadSeconds: 0,
            rowsImported: 0,
            rulesCreated: 0,
            seedSeconds: 0,
            tagsCreated: []
        }
    };
}

/**
 * Guards against a SILENT EXIT, which this campaign has now done once.
 *
 * MEASURED: a run terminated after ~16 minutes having printed only vitest's banner
 * and exited **0**, with no test summary, no error, no OOM and 39GB free. A Node
 * process exits 0 when its event loop empties, so an `await` on a promise that can
 * never settle — a page-side evaluate whose target vanished, say — ends the process
 * cleanly and looks like success to any wrapper reading `$?`. An exit code is not a
 * result.
 *
 * These handlers make that impossible to miss: `beforeExit` fires exactly in the
 * loop-emptied case, and strict unhandled rejections turn a swallowed one into a
 * stack rather than a shrug.
 */
let campaignCompleted = false;

process.on("beforeExit", (code) => {
    if (campaignCompleted) return;
    console.error(
        `\n*** CAMPAIGN EXITED SILENTLY with code ${String(code)} before completing. The event loop emptied while the campaign was still awaiting something, so this is NOT a pass and NOT a threshold result. Artifacts hold whatever repeats had already been written. ***\n`
    );
});

process.on("unhandledRejection", (reason) => {
    console.error("*** UNHANDLED REJECTION in the campaign ***", reason);
});

it("measures every scroll route on the production build, repeatedly", async () => {
    if (tlsPemPath === "") throw new Error("PERF_TLS_PEM must point at a cert+key PEM");
    if (!(sessionCount >= 1) || !(repeatCount >= 1)) {
        throw new Error("PERF_SESSIONS and PERF_REPEATS must both be at least 1");
    }
    mkdirSync(outputDirectory, { recursive: true });
    const proxy = await startHttpsProxy(upstreamPort, readFileSync(tlsPemPath));
    const sessions: { measurement: ArmMeasurement; readonly sessionIndex: number }[] = [];
    const points: RunPoint[] = [];
    // Index in `points` where the current session's runs start, so a progress
    // callback replaces this session's rows instead of appending duplicates.
    let pointsBeforeSession = 0;

    /** Write everything captured so far. Called after every repeat. */
    const writeArtifacts = (): void => {
        const record = {
            ...provenance(),
            sessionsCaptured: sessions.map(({ measurement, sessionIndex }) => ({
                consoleWarnings: measurement.consoleWarnings,
                notes: measurement.notes,
                hostLoad: measurement.hostLoad,
                runs: measurement.runs.map((run) =>
                    run.map((route) => ({
                        clean: serialiseRun(route.clean),
                        cleanMinusInstrumented: route.cleanMinusInstrumented,
                        failures: route.failures,
                        instrumented: serialiseRun(route.instrumented),
                        passed: route.passed,
                        routeId: route.routeId
                    }))
                ),
                seed: measurement.seed,
                sessionIndex
            })),
            summary: summariseCampaign(points)
        };
        writeFileSync(join(outputDirectory, `${arm}.json`), `${JSON.stringify(record, null, 2)}\n`);

        const seedLines = sessions.map(({ measurement, sessionIndex }) =>
            [
                `session ${String(sessionIndex)}: seed ${measurement.seed.seedSeconds.toFixed(1)}s ` +
                    `(identity ${measurement.seed.identitySeconds.toFixed(1)}s, ` +
                    `${String(measurement.seed.imports.length)} imports ` +
                    `${measurement.seed.imports.map((i) => i.commitSeconds.toFixed(1)).join("/")}s, ` +
                    `row access ${measurement.seed.preloadSeconds.toFixed(1)}s in ${String(measurement.seed.preload.iterations)} paging steps (0 = no pagination to work around), ` +
                    `scrollHeight ${String(measurement.seed.preload.scrollHeight)}px)`,
                `  notes: ${String(measurement.notes.annotatedRows)} rows annotated+expanded in ${measurement.notes.seconds.toFixed(1)}s; ` +
                    `collapsed ${String(measurement.notes.unexpandedHeight)}px vs expanded ${String(measurement.notes.expandedHeight)}px, ` +
                    `${String(measurement.notes.expandedAriaRows)} ARIA rows`,
                `  imports ledger: ${measurement.seed.importLedger.perImport.join("/")} = ${String(measurement.seed.importLedger.total)} rows in the vault${measurement.seed.importLedger.trusted ? "" : " (NOT TRUSTED: " + (measurement.seed.importLedger.note ?? "") + ")"}; grid shows ${String(measurement.seed.preload.gridRowCount ?? -1)}; duplicates flagged per import ${measurement.seed.imports.map((i) => String(i.duplicatesFlagged ?? -1)).join("/")}; grid count after each import ${measurement.seed.imports.map((i) => String(i.gridRowCountAfter ?? -1)).join("/")}`,
                `  fixture on the DOM: ${String(measurement.seed.domEvidence.allocationColumnCount)} allocation columns ` +
                    `(${measurement.seed.domEvidence.allocationColumnLabels.join(", ")}); ` +
                    `accounts seen ${measurement.seed.domEvidence.accountsSeen.join(", ")}; ` +
                    `${String(measurement.seed.domEvidence.rowsWithTags)}/${String(measurement.seed.domEvidence.rowsSampled)} sampled rows tagged, ` +
                    `${String(measurement.seed.domEvidence.rowsWithAllocations)} allocated`,
                `  console warnings: ${measurement.consoleWarnings.length === 0 ? "none" : String(measurement.consoleWarnings.length)}`
            ].join("\n")
        );

        const header = [
            `arm: ${arm}`,
            `commit: ${process.env.PERF_COMMIT ?? "(unset)"}`,
            `react-virtual: ${process.env.PERF_REACT_VIRTUAL ?? "(unset)"}  virtual-core: ${process.env.PERF_VIRTUAL_CORE ?? "(unset)"}`,
            `lockfile sha256: ${process.env.PERF_LOCKFILE_SHA256 ?? "(unset)"}`,
            `harness digest: ${process.env.PERF_HARNESS_DIGEST ?? "(unset)"}`,
            `  measurement core: ${HARNESS_DIGESTS.measurementCore}  (must match across arms)`,
            `  orchestration:    ${HARNESS_DIGESTS.orchestration}`,
            `  seeding path:     ${HARNESS_DIGESTS.seedingPath}  (arms may differ)`,
            `fixture: transactions ${fixtureDigest()}`,
            `         enrichment   ${fixtureEnrichmentDigest()}`,
            `campaign: ${String(sessions.length)} of ${String(sessionCount)} sessions x ${String(repeatCount)} repeats`,
            "",
            ...seedLines,
            "",
            "per-run table",
            formatRunTable(points),
            "",
            "variance (within session = repeats; between sessions = per-session means)",
            formatVarianceTable(summariseCampaign(points))
        ].join("\n");

        // The full per-route table of the LAST run of each session, so the
        // classification detail behind the summary is visible.
        const detail = sessions
            .map(({ measurement, sessionIndex }) => {
                const finalRun = measurement.runs.at(-1) ?? [];
                return [
                    `session ${String(sessionIndex)} — final repeat detail (clean pass then instrumented pass)`,
                    ...finalRun.flatMap((route) => [
                        formatCadenceReport(route.clean.cadence),
                        route.instrumented.semantic == null
                            ? "  (no semantic report)"
                            : formatRouteReport(route.instrumented.semantic)
                    ])
                ].join("\n\n");
            })
            .join("\n\n");

        writeFileSync(join(outputDirectory, `${arm}.txt`), `${header}\n\n${detail}\n`);
        console.log(`\n${header}\n`);
    };

    try {
        for (let sessionIndex = 1; sessionIndex <= sessionCount; sessionIndex += 1) {
            // Artifacts are rewritten after EVERY repeat, not every session. A
            // campaign killed mid-session must not throw away the repeats it
            // already measured — one already was, at a 10-minute process cap.
            const record = { measurement: emptyMeasurement(), sessionIndex };
            sessions.push(record);
            const measurement = await measureArm(proxy.baseUrl, {
                maximumLoadAverage,
                notesCap,
                ...(routeFilter.length > 0 || startOffsetOverride != null
                    ? {
                          routes: SCROLL_ROUTES.filter(
                              (route) => routeFilter.length === 0 || routeFilter.includes(route.id)
                          ).map((route) =>
                              startOffsetOverride == null
                                  ? route
                                  : { ...route, startOffsetPixels: startOffsetOverride }
                          )
                      }
                    : {}),
                onProgress: (partial) => {
                    record.measurement = partial;
                    points.length = pointsBeforeSession;
                    points.push(...runPointsFor(sessionIndex, partial));
                    writeArtifacts();
                },
                repeats: repeatCount
            });
            record.measurement = measurement;
            points.length = pointsBeforeSession;
            points.push(...runPointsFor(sessionIndex, measurement));
            pointsBeforeSession = points.length;
            writeArtifacts();
        }
    } finally {
        if (sessions.length > 0) writeArtifacts();
        await proxy.close();
    }

    campaignCompleted = true;
    // Reported first, asserted second, so the numbers are always written.
    for (const summary of summariseCampaign(points)) {
        expect(
            summary.failures,
            `route ${summary.routeId}: ${String(summary.passingRuns)}/${String(summary.runCount)} runs passed`
        ).toEqual([]);
        expect(summary.runCount, `route ${summary.routeId} run count`).toBe(
            sessionCount * repeatCount
        );
    }
}, 7_200_000);
