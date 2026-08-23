/**
 * Presented-frame extraction from a Chrome trace.
 *
 * WHAT COUNTS AS A PRESENTED FRAME (measured, not assumed — see
 * `specs/015-transaction-grid-tanstack/evidence/env/README.md`):
 *
 *   Expected frame  `Scheduler::BeginFrame` (cat `cc,benchmark`). Its
 *                   `args.args` is a `BeginFrameArgs` record carrying
 *                   `sequence_number`, `frame_time_us` and `interval_us`.
 *                   `frame_time_us` is the compositor's exact vsync timebase.
 *
 *   Presented frame `PipelineReporter` (cat
 *                   `cc,benchmark,disabled-by-default-devtools.timeline.frame`),
 *                   an async event whose opening `args.frame_reporter` carries
 *                   `state` and `frame_sequence`. A frame is presented when
 *                   `state` begins with `STATE_PRESENTED`.
 *
 *   Presentation    the `ts` of the reporter's terminating
 *   timestamp       `SubmitCompositorFrameToPresentationCompositorFrame` "e"
 *                   sub-slice. Verified against the independent
 *                   `Display::FrameDisplayed` instant event emitted on the viz
 *                   display thread: 720 of 721 frames agreed within 1ms.
 *
 * rAF callbacks are NOT presentation and are not used anywhere in this module.
 *
 * TIMEBASE. Interval statistics are computed on `frame_time_us`, not on the
 * wall-clock presentation timestamp. This is a measured decision: on a trivial
 * page that drops no frames, presentation timestamps show p95 17.0-17.3ms of
 * trace-emission jitter, while `frame_time_us` shows exactly 16.666ms for every
 * interval. Using wall-clock timestamps would spend the entire 17ms budget on
 * instrument noise. Dropped frames still show up, because a dropped frame's
 * sequence is simply absent, so the gap between surviving presented frames
 * becomes an exact multiple of the vsync interval.
 */

export type PresentedFrameClassification = "blank" | "dropped" | "full" | "partial" | "stale";

export interface BeginFrameTick {
    readonly frameTimeMicroseconds: number;
    readonly intervalMicroseconds: number;
    readonly sequenceNumber: number;
}

export interface PipelineReporterRecord {
    /** `FORKED` reporters mirror another reporter and must not be counted. */
    readonly frameType: string;
    readonly presentationMicroseconds: number | null;
    readonly sequenceNumber: number;
    readonly state: string;
}

/** One expected vsync, joined to whatever the compositor did with it. */
export interface ExpectedFrame {
    readonly frameTimeMicroseconds: number;
    /**
     * The compositor declared it had nothing new to draw for this vsync
     * (`STATE_NO_UPDATE_DESIRED`). This is NOT a dropped frame — nothing was
     * lost — so such vsyncs are excluded from the expected-frame denominator.
     * During a scroll route the count should be zero; a non-zero count means
     * the page went idle mid-route and is surfaced in the report.
     */
    readonly noUpdateDesired: boolean;
    readonly presentationMicroseconds: number | null;
    readonly presented: boolean;
    readonly reporterState: string | null;
    readonly sequenceNumber: number;
}

const NO_UPDATE_DESIRED_STATE = "STATE_NO_UPDATE_DESIRED";

// ---------------------------------------------------------------------------
// Untyped trace-JSON boundary. Everything below narrows before use.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

function eventName(event: unknown): string | null {
    return isRecord(event) ? text(event.name) : null;
}

function eventPhase(event: unknown): string | null {
    return isRecord(event) ? text(event.ph) : null;
}

function eventTimestamp(event: unknown): number | null {
    return isRecord(event) ? finiteNumber(event.ts) : null;
}

/**
 * Async-event identity. Chrome scopes `id2.local` per process AND reuses the
 * same value for later instances, so this key alone never identifies a single
 * async instance — callers must also bound it by the instance's time window.
 */
function asyncKey(event: unknown): string | null {
    if (!isRecord(event)) return null;
    const local = isRecord(event.id2) ? text(event.id2.local) : text(event.id);
    const pid = finiteNumber(event.pid);
    return local == null || pid == null ? null : `${String(pid)}:${local}`;
}

/**
 * `Scheduler::BeginFrame` nests the args one level deep (`args.args`) while the
 * sibling `Scheduler::BeginImplFrame` puts them flat in `args`. Accept either.
 */
function beginFrameArgs(event: unknown): Record<string, unknown> | null {
    if (!isRecord(event) || !isRecord(event.args)) return null;
    return isRecord(event.args.args) ? event.args.args : event.args;
}

/**
 * `performance.mark(name)` timestamps, on the trace clock.
 *
 * This is how page-side samples are pinned to the same clock as the compositor
 * events. Verified against a real trace: each mark appears once as an instant
 * event in category `blink.user_timing`, named exactly as the mark, with `ts`
 * on the trace's monotonic microsecond clock.
 */
export function extractUserTimingMarks(
    events: readonly unknown[],
    namePrefix: string
): ReadonlyMap<string, number> {
    const marks = new Map<string, number>();
    for (const event of events) {
        const name = eventName(event);
        const timestamp = eventTimestamp(event);
        if (name == null || timestamp == null || !name.startsWith(namePrefix)) continue;
        if (!isRecord(event) || typeof event.cat !== "string") continue;
        if (!event.cat.includes("blink.user_timing")) continue;
        // First occurrence wins; a duplicated mark name would otherwise let a
        // later sample silently retime an earlier one.
        if (!marks.has(name)) marks.set(name, timestamp);
    }
    return marks;
}

export function extractBeginFrameTicks(events: readonly unknown[]): readonly BeginFrameTick[] {
    const bySequence = new Map<number, BeginFrameTick>();
    for (const event of events) {
        if (eventName(event) !== "Scheduler::BeginFrame") continue;
        const args = beginFrameArgs(event);
        if (args == null) continue;
        const sequenceNumber = finiteNumber(args.sequence_number);
        const frameTimeMicroseconds = finiteNumber(args.frame_time_us);
        const intervalMicroseconds = finiteNumber(args.interval_us);
        if (sequenceNumber == null || frameTimeMicroseconds == null) continue;
        // A sequence can be re-announced as MISSED; the first announcement
        // carries the authoritative frame time.
        if (bySequence.has(sequenceNumber)) continue;
        bySequence.set(sequenceNumber, {
            frameTimeMicroseconds,
            intervalMicroseconds: intervalMicroseconds ?? 0,
            sequenceNumber
        });
    }
    return [...bySequence.values()].sort(
        (left, right) => left.sequenceNumber - right.sequenceNumber
    );
}

export function extractPipelineReporters(
    events: readonly unknown[]
): readonly PipelineReporterRecord[] {
    // A reporter's presentation sub-slice closes at exactly the same timestamp
    // as the reporter itself, so the pair is matched on equality rather than on
    // a time window: reporters last ~22ms while vsyncs are ~16.7ms apart, so
    // consecutive instances overlap and a window match claims the wrong one.
    // Measured on a real 12s trace: 1440 of 1443 reporters had a sub-slice at
    // exactly their end timestamp, and the 3 without were precisely the
    // reporters that never presented (STATE_NO_UPDATE_DESIRED, FORKED drop).
    const submitEnds = new Map<string, Set<number>>();
    for (const event of events) {
        if (eventName(event) !== "SubmitCompositorFrameToPresentationCompositorFrame") continue;
        if (eventPhase(event) !== "e") continue;
        const key = asyncKey(event);
        const timestamp = eventTimestamp(event);
        if (key == null || timestamp == null) continue;
        const existing = submitEnds.get(key);
        if (existing == null) submitEnds.set(key, new Set([timestamp]));
        else existing.add(timestamp);
    }

    const open = new Map<string, { readonly args: Record<string, unknown>; readonly ts: number }>();
    const records: PipelineReporterRecord[] = [];

    for (const event of events) {
        if (eventName(event) !== "PipelineReporter") continue;
        const key = asyncKey(event);
        const timestamp = eventTimestamp(event);
        if (key == null || timestamp == null || !isRecord(event)) continue;
        const phase = eventPhase(event);

        if (phase === "b") {
            const args =
                isRecord(event.args) && isRecord(event.args.frame_reporter)
                    ? event.args.frame_reporter
                    : {};
            open.set(key, { args, ts: timestamp });
            continue;
        }
        if (phase !== "e") continue;

        const begun = open.get(key);
        if (begun == null) continue;
        open.delete(key);

        const sequenceNumber = finiteNumber(begun.args.frame_sequence);
        const state = text(begun.args.state);
        if (sequenceNumber == null || state == null) continue;

        const presentationMicroseconds =
            submitEnds.get(key)?.has(timestamp) === true ? timestamp : null;

        records.push({
            frameType: text(begun.args.frame_type) ?? "NORMAL",
            presentationMicroseconds,
            sequenceNumber,
            state
        });
    }
    return records;
}

const isPresentedState = (state: string): boolean => state.startsWith("STATE_PRESENTED");

/**
 * Join expected vsyncs to compositor outcomes over `[startMicroseconds,
 * endMicroseconds]` on the BeginFrame timebase.
 *
 * A sequence with no reporter at all is `presented: false` exactly like an
 * explicit `STATE_DROPPED` — from the user's point of view both are a frame
 * that never reached the screen.
 */
export function buildExpectedFrames(
    events: readonly unknown[],
    startMicroseconds: number,
    endMicroseconds: number
): readonly ExpectedFrame[] {
    if (!(endMicroseconds > startMicroseconds)) {
        throw new Error("Scenario window must be increasing");
    }
    const reporters = extractPipelineReporters(events).filter(
        (reporter) => reporter.frameType !== "FORKED"
    );
    const bySequence = new Map<number, PipelineReporterRecord>();
    for (const reporter of reporters) {
        const existing = bySequence.get(reporter.sequenceNumber);
        // A presented reporter always wins over a non-presented one for the
        // same sequence: the frame did reach the screen.
        if (
            existing == null ||
            (!isPresentedState(existing.state) && isPresentedState(reporter.state))
        ) {
            bySequence.set(reporter.sequenceNumber, reporter);
        }
    }

    return extractBeginFrameTicks(events)
        .filter(
            (tick) =>
                tick.frameTimeMicroseconds >= startMicroseconds &&
                tick.frameTimeMicroseconds <= endMicroseconds
        )
        .map((tick) => {
            const reporter = bySequence.get(tick.sequenceNumber);
            const presented = reporter != null && isPresentedState(reporter.state);
            return {
                frameTimeMicroseconds: tick.frameTimeMicroseconds,
                noUpdateDesired: reporter?.state === NO_UPDATE_DESIRED_STATE,
                presentationMicroseconds: presented ? reporter.presentationMicroseconds : null,
                presented,
                reporterState: reporter?.state ?? null,
                sequenceNumber: tick.sequenceNumber
            };
        });
}

/**
 * The compositor's declared vsync interval, in microseconds.
 *
 * Throws when the trace shows more than one interval: every derived statistic
 * (expected-frame count, dropped count) assumes a single stable cadence, so a
 * mid-run refresh-rate change must abort rather than silently skew the report.
 */
export function declaredVsyncIntervalMicroseconds(events: readonly unknown[]): number {
    const intervals = new Set(
        extractBeginFrameTicks(events)
            .map((tick) => tick.intervalMicroseconds)
            .filter((interval) => interval > 0)
    );
    if (intervals.size === 0) throw new Error("Trace declares no BeginFrame interval");
    if (intervals.size > 1) {
        throw new Error(
            `Trace declares multiple BeginFrame intervals: ${[...intervals].join(", ")}us`
        );
    }
    const [interval] = [...intervals];
    if (interval == null) throw new Error("Trace declares no BeginFrame interval");
    return interval;
}

/**
 * Number of vsyncs the compositor should have produced across the observed
 * span. Compared against the observed BeginFrame count this detects a stalled
 * BeginFrameSource — chrome-headless-shell was measured emitting 723 ticks
 * across a span that should have carried 752, which would silently deflate the
 * denominator of "expected frames fully presented".
 */
export function expectedFrameCountFromSpan(
    frames: readonly ExpectedFrame[],
    intervalMicroseconds: number
): number {
    const first = frames[0];
    const last = frames.at(-1);
    if (first == null || last == null || intervalMicroseconds <= 0) return frames.length;
    const span = last.frameTimeMicroseconds - first.frameTimeMicroseconds;
    return Math.round(span / intervalMicroseconds) + 1;
}
