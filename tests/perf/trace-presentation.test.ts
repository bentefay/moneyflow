import { describe, expect, it } from "vitest";

import {
    buildExpectedFrames,
    declaredVsyncIntervalMicroseconds,
    expectedFrameCountFromSpan,
    extractBeginFrameTicks,
    extractPipelineReporters
} from "./trace-presentation";

const VSYNC_MICROSECONDS = 16_666;
const ORIGIN_MICROSECONDS = 6_814_378_097_306;

/** A `Scheduler::BeginFrame` shaped exactly like the real Chrome trace. */
function beginFrame(sequenceNumber: number): unknown {
    const frameTime = ORIGIN_MICROSECONDS + sequenceNumber * VSYNC_MICROSECONDS;
    return {
        args: {
            args: {
                deadline_us: frameTime + VSYNC_MICROSECONDS,
                frame_time_us: frameTime,
                interval_us: VSYNC_MICROSECONDS,
                sequence_number: sequenceNumber,
                source_id: 0,
                subtype: "NORMAL",
                type: "BeginFrameArgs"
            }
        },
        cat: "cc,benchmark",
        dur: 5,
        name: "Scheduler::BeginFrame",
        ph: "X",
        pid: 100,
        tid: 200,
        ts: frameTime
    };
}

/**
 * A `PipelineReporter` async pair plus its terminating presentation sub-slice,
 * reusing `id2.local` across instances exactly as Chrome does.
 */
function pipelineReporter(
    sequenceNumber: number,
    state: string,
    options: { readonly frameType?: string; readonly asyncId?: string } = {}
): readonly unknown[] {
    const asyncId = options.asyncId ?? "0x1";
    const begin = ORIGIN_MICROSECONDS + sequenceNumber * VSYNC_MICROSECONDS;
    const end = begin + 22_000;
    const common = {
        cat: "cc,benchmark,disabled-by-default-devtools.timeline.frame",
        pid: 100,
        tid: 201
    };
    const frameReporter: Record<string, unknown> = {
        frame_sequence: sequenceNumber,
        layer_tree_host_id: 1,
        state,
        ...(options.frameType == null ? {} : { frame_type: options.frameType })
    };
    return [
        {
            ...common,
            args: { frame_reporter: frameReporter },
            id2: { local: asyncId },
            name: "PipelineReporter",
            ph: "b",
            ts: begin
        },
        {
            ...common,
            args: {},
            id2: { local: asyncId },
            name: "SubmitCompositorFrameToPresentationCompositorFrame",
            ph: "b",
            ts: end - 3_000
        },
        {
            ...common,
            args: {},
            id2: { local: asyncId },
            name: "SubmitCompositorFrameToPresentationCompositorFrame",
            ph: "e",
            ts: end
        },
        { ...common, args: {}, id2: { local: asyncId }, name: "PipelineReporter", ph: "e", ts: end }
    ];
}

/** A clean run: every vsync presented. */
export function cleanTrace(frameCount: number): readonly unknown[] {
    return Array.from({ length: frameCount }, (_unused, index) => index).flatMap((index) => [
        beginFrame(index),
        ...pipelineReporter(index, "STATE_PRESENTED_ALL")
    ]);
}

const windowFor = (frameCount: number) =>
    [ORIGIN_MICROSECONDS, ORIGIN_MICROSECONDS + frameCount * VSYNC_MICROSECONDS] as const;

describe("extractBeginFrameTicks", () => {
    it("reads the vsync timebase out of the nested BeginFrameArgs", () => {
        const ticks = extractBeginFrameTicks(cleanTrace(3));
        expect(ticks.map((tick) => tick.sequenceNumber)).toEqual([0, 1, 2]);
        expect(ticks[1]?.frameTimeMicroseconds).toBe(ORIGIN_MICROSECONDS + VSYNC_MICROSECONDS);
        expect(ticks[1]?.intervalMicroseconds).toBe(VSYNC_MICROSECONDS);
    });

    it("keeps the first announcement when a sequence is re-announced as MISSED", () => {
        const first = beginFrame(7);
        const missed = beginFrame(7);
        const ticks = extractBeginFrameTicks([first, missed]);
        expect(ticks).toHaveLength(1);
    });
});

describe("extractPipelineReporters", () => {
    it("pairs each reporter with the presentation sub-slice inside its own window", () => {
        // Both instances reuse id2.local="0x1"; a global id->timestamp map would
        // collapse them onto one presentation timestamp.
        const events = [
            ...pipelineReporter(0, "STATE_PRESENTED_ALL"),
            ...pipelineReporter(1, "STATE_PRESENTED_ALL")
        ];
        const reporters = extractPipelineReporters(events);
        expect(reporters).toHaveLength(2);
        const [first, second] = reporters;
        expect(first?.presentationMicroseconds).not.toBe(second?.presentationMicroseconds);
        expect(second?.presentationMicroseconds).toBe(
            ORIGIN_MICROSECONDS + VSYNC_MICROSECONDS + 22_000
        );
    });

    it("reports no presentation timestamp for a reporter that never presented", () => {
        // A non-presenting reporter emits no presentation sub-slice at all.
        const [begin, , , end] = pipelineReporter(0, "STATE_NO_UPDATE_DESIRED");
        const reporters = extractPipelineReporters([begin, end]);
        expect(reporters[0]?.presentationMicroseconds).toBeNull();
    });

    it("preserves the frame type so FORKED mirrors can be excluded", () => {
        const reporters = extractPipelineReporters(
            pipelineReporter(0, "STATE_PRESENTED_PARTIAL", { frameType: "FORKED" })
        );
        expect(reporters[0]?.frameType).toBe("FORKED");
    });
});

describe("buildExpectedFrames", () => {
    it("marks every vsync presented on a clean run", () => {
        const [start, end] = windowFor(10);
        const frames = buildExpectedFrames(cleanTrace(10), start, end);
        expect(frames).toHaveLength(10);
        expect(frames.every((frame) => frame.presented)).toBe(true);
    });

    it("treats an explicit STATE_DROPPED as not presented", () => {
        const events = [beginFrame(0), ...pipelineReporter(0, "STATE_DROPPED")];
        const [start, end] = windowFor(1);
        const frames = buildExpectedFrames(events, start, end);
        expect(frames[0]?.presented).toBe(false);
        expect(frames[0]?.reporterState).toBe("STATE_DROPPED");
    });

    it("treats a vsync with no reporter at all as not presented", () => {
        const [start, end] = windowFor(1);
        const frames = buildExpectedFrames([beginFrame(0)], start, end);
        expect(frames[0]?.presented).toBe(false);
        expect(frames[0]?.reporterState).toBeNull();
    });

    it("ignores FORKED reporters so a mirrored drop cannot mask a real presentation", () => {
        const events = [
            beginFrame(0),
            ...pipelineReporter(0, "STATE_PRESENTED_ALL", { asyncId: "0x1" }),
            ...pipelineReporter(0, "STATE_DROPPED", { asyncId: "0x6", frameType: "FORKED" })
        ];
        const [start, end] = windowFor(1);
        expect(buildExpectedFrames(events, start, end)[0]?.presented).toBe(true);
    });

    it("excludes frames outside the scenario window", () => {
        const frames = buildExpectedFrames(
            cleanTrace(10),
            ORIGIN_MICROSECONDS + 3 * VSYNC_MICROSECONDS,
            ORIGIN_MICROSECONDS + 5 * VSYNC_MICROSECONDS
        );
        expect(frames.map((frame) => frame.sequenceNumber)).toEqual([3, 4, 5]);
    });

    it("rejects a non-increasing window rather than reporting on nothing", () => {
        expect(() => buildExpectedFrames(cleanTrace(3), 10, 10)).toThrow(/increasing/);
    });
});

describe("declaredVsyncIntervalMicroseconds", () => {
    it("reads the single declared interval", () => {
        expect(declaredVsyncIntervalMicroseconds(cleanTrace(5))).toBe(VSYNC_MICROSECONDS);
    });

    it("refuses to report when the cadence changed mid-run", () => {
        const mixed = [
            beginFrame(0),
            {
                args: { args: { frame_time_us: 1, interval_us: 8_333, sequence_number: 99 } },
                cat: "cc,benchmark",
                name: "Scheduler::BeginFrame",
                ph: "X",
                pid: 100,
                tid: 200,
                ts: 1
            }
        ];
        expect(() => declaredVsyncIntervalMicroseconds(mixed)).toThrow(/multiple/);
    });
});

describe("expectedFrameCountFromSpan", () => {
    it("derives the count the span implies, independent of observed ticks", () => {
        const [start, end] = windowFor(10);
        const frames = buildExpectedFrames(cleanTrace(10), start, end);
        expect(expectedFrameCountFromSpan(frames, VSYNC_MICROSECONDS)).toBe(10);
    });

    it("exceeds the observed tick count when the BeginFrameSource stalled", () => {
        // Ticks 0-2 then a gap to 20: a stalled source, as measured on
        // chrome-headless-shell (723 observed ticks across a 752-tick span).
        const events = [0, 1, 2, 20].flatMap((index) => [
            beginFrame(index),
            ...pipelineReporter(index, "STATE_PRESENTED_ALL")
        ]);
        const [start, end] = windowFor(25);
        const frames = buildExpectedFrames(events, start, end);
        expect(frames).toHaveLength(4);
        expect(expectedFrameCountFromSpan(frames, VSYNC_MICROSECONDS)).toBe(21);
    });
});
