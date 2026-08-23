# Transaction-grid presentation harness

Measures whether the transaction grid sustains 60fps while scrolling 10,000 rows, on the
**production build only**.

Nothing here uses `requestAnimationFrame` as evidence of presentation. A rAF callback tells you the
main thread ran; it says nothing about whether a frame reached the compositor's presentation
feedback, and a page can run rAF at 60Hz while presenting 20fps.

## What counts as a presented frame

All three definitions below were confirmed against a real 12-second Chrome trace rather than taken
from documentation.

| Concept                | Trace source                                                                                     | Field                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Expected frame (vsync) | `Scheduler::BeginFrame`, cat `cc,benchmark`                                                      | `args.args.sequence_number`, `args.args.frame_time_us` |
| Presented frame        | `PipelineReporter`, cat `cc,benchmark,disabled-by-default-devtools.timeline.frame`               | `args.frame_reporter.state` begins `STATE_PRESENTED`   |
| Presentation timestamp | that reporter's terminating `SubmitCompositorFrameToPresentationCompositorFrame` `"e"` sub-slice | `ts`                                                   |

Two properties of this data are easy to get wrong and are handled explicitly:

- **`id2.local` is reused.** Chrome recycles async ids, so a global id→timestamp map collapses every
  reporter onto one timestamp. Reporters also last ~22ms while vsyncs are 16.7ms apart, so
  consecutive instances _overlap_ and a "first match inside my window" rule claims the previous
  instance's sub-slice. The pair is matched on exact timestamp equality instead: measured, 1440 of
  1443 reporters had a sub-slice at exactly their own end timestamp, and the 3 without were
  precisely the reporters that never presented.
- **`FORKED` reporters mirror another reporter** and must be excluded, or a mirrored drop masks a
  real presentation.

### Why intervals use the vsync timebase, not the wall clock

Interval statistics are computed from `frame_time_us`, not from the presentation timestamp. This is
a measured decision. On a trivial page that drops no frames:

| timebase                | p50    | p95    | p99    | max    |
| ----------------------- | ------ | ------ | ------ | ------ |
| presentation wall clock | 16.663 | 16.983 | 17.173 | 17.452 |
| `frame_time_us`         | 16.666 | 16.666 | 16.666 | 16.666 |

The wall-clock spread is jitter in when the trace event is _emitted_, not jank — the frame count
over the window is exactly 60.00/s with zero drops. Using it would spend the entire 17ms p95 budget
on instrument noise before the grid renders anything. Dropped frames still register on the vsync
timebase, because a dropped frame's sequence is simply absent and the gap between surviving frames
becomes an exact multiple of 16.666ms.

## Frame classifications

Applied in this precedence order. A frame that satisfies several is reported as the first one that
matches, and every condition it met is listed in `reasons`.

| Class     | Meaning                                                                    | Condition                                                                                                                                   |
| --------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `dropped` | Never reached the screen.                                                  | No `PipelineReporter`, or state `STATE_DROPPED`.                                                                                            |
| `blank`   | **The viewport was visibly empty because row rendering lagged scrolling.** | Rendered rows left ≥2% of the transaction viewport uncovered, or no rows were rendered at all.                                              |
| `stale`   | Presented, but showing content the user had already scrolled past.         | Rendered rows correspond to a scroll offset >2px from the scroller's actual offset, or duplicate/non-ascending row indexes.                 |
| `partial` | Presented, but not provably correct.                                       | Compositor reported `STATE_PRESENTED_PARTIAL*`; or a minor uncovered band below the blank threshold; or no semantic sample could be joined. |
| `full`    | Presented, covered, in sync.                                               | None of the above.                                                                                                                          |

`blank` is the count the product goal thresholds at **zero**. It takes precedence over `stale`
because a blank viewport is the more severe defect.

Two categories are deliberately _not_ failures:

- **Idle vsyncs** (`STATE_NO_UPDATE_DESIRED`) are excluded from both the classified population and
  the denominator. The compositor had nothing new to draw; nothing was lost. They are reported
  separately as `idleFrames`, and a non-zero count during a scroll route means the page went idle
  mid-route.
- A frame with **no semantic sample** is `partial`, never `full`. Absence of evidence is not
  evidence of correctness.

## Two passes per route: clean and instrumented

Each route runs **twice per repeat**, because the semantic sampler costs measured time inside the
very frames it measures — p50 0.2-1.1ms and up to 31.5ms max against a 16.666ms budget — and three
of the four product thresholds are ABSOLUTE rather than comparative. In its worst frames the
instrument could fail `>= 59 FPS`, `p95 <= 17ms` or `>= 99% fully presented` on the grid's behalf,
and a result near the line would be unattributable.

| pass             | page-side work per frame                                    | supplies                                            |
| ---------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| **clean**        | one `performance.mark`, one `scrollTop` read, two counters  | FPS, interval percentiles, dropped, fully presented |
| **instrumented** | the above plus row rects, sticky masks, transforms, indexes | blank, stale, partial, `full`, reason histogram     |

The verdict draws each threshold from the pass entitled to it (`combinedRouteFailures`): cadence
from the clean pass, visibly-empty and stale from the instrumented pass. **Nothing is weakened** —
every threshold in the goal is still applied, and each failure line is prefixed `clean:` or
`instrumented:`. A sampler-induced drop cannot manufacture a false blank, because blankness is a
property of what was painted, not of timing.

`fully presented` means something slightly different in each pass, and both are reported:

- clean — the **compositor's own** verdict: `STATE_PRESENTED_ALL` rather than
  `STATE_PRESENTED_PARTIAL*` or dropped. This is the thresholded one.
- instrumented — the **stricter semantic** `full`: presented AND covering the viewport AND in sync
  with the scroll offset. Reported, and its shortfall is attributed by the reason histogram.

The difference between the two passes on the same route and repeat is recorded as
`samplerPerturbationFps`, so how much the instrument perturbs is a measured number rather than an
assertion.

`tests/perf/grid-sampler.test.ts` asserts the clean loop contains no `getBoundingClientRect`,
`getComputedStyle` or `querySelectorAll`, and that the instrumented loop does — so the split cannot
quietly erode. It also parses every page-side source string, which is how the escaping defect below
would now be caught without launching a browser.

### A zero blank count is only as strong as the coverage behind it

The semantic sampler runs once per animation frame, so a stall removes exactly the frames a blank is
most likely to occur in — the coverage gap sits where the defect lives. **An unmeasured frame is
neither a pass nor a failure.** So when fewer than `MINIMUM_SEMANTIC_COVERAGE_RATIO` (90%) of a
route's moving frames carried a sample, the pass is marked LOW COVERAGE and the route reports:

```
instrumented: semantic coverage 84.2% < 90% — too few moving frames carried a sample to certify zero blank frames
```

That is a coverage qualification, not a claim the grid blanked, and the remedy is more coverage —
never a lower threshold. Measured on arm A, where the rule is not vacuous: coverage was 97.2%
(ordinary), 97.0% (fast-reversal), 91.2% (free-spin) and **84.2% (large-movement, below the bar in
all 10 runs)**. `fast-reversal` and `large-movement` both reported zero blank frames and only one of
those zeros is evidence.

**A route that fails on coverage alone is inconclusive, not passing and not a product failure.** It
needs a higher sampling rate or a longer route.

## Which frames are scored for cadence

FPS, intervals and the fully-presented ratio are computed over the frames during which the route was
**moving** the grid; blank frames are counted over **every** frame. A route that deliberately holds
still — `large-movement` holds ~57 of every 60 ticks — would otherwise divide its presented frames
by wall time it never asked the grid to do anything in, which produced a meaningless 10.3 FPS.

Moving is decided from the samples, not from the route definition. A sample's interval counts when:

1. wheel input arrived in it, or
2. the scroller moved in it, or
3. **wheel input arrived in the NEXT sample.**

Clause 3 is the important one. No sample can be taken while the main thread is blocked, so the
frames inside a block belong to the interval that ENDS at the first sample afterwards. Without it, a
grid that janked hard enough to starve the sampler would have its worst frames excluded from the
cadence denominator and would score better for being worse.

## Thresholds

From the product goal, in `PRODUCT_GOAL_THRESHOLDS`:

- presented FPS ≥ 59
- p95 presented-frame interval ≤ 17ms
- ≥ 99% of expected frames fully presented
- **zero** visibly empty frames

A run also fails if the BeginFrameSource stalled — observed tick count below what the span implies.
Without that check a stalled source shrinks the denominator and inflates the pass rate.

## Proving the instrument can fail

`frame-report.test.ts` contains a passing control (600 clean 60Hz frames) and five constructed
defects that must go red:

| Case                                 | Expected failure                      |
| ------------------------------------ | ------------------------------------- |
| 10% of frames dropped                | presented FPS < 59 **and** p95 > 17ms |
| One single blank frame in 600        | visibly empty frames 1 > 0            |
| 2% of frames rendering stale content | fully presented < 99%                 |
| BeginFrameSource stalled             | stall detected, denominator preserved |
| Empty interval distribution          | `NaN`, not a passing-looking `0`      |

Percentiles use **nearest rank**, not interpolation: the interval distribution is discrete multiples
of a vsync, and interpolating invents values (25ms) that no frame can exhibit.

Reason attribution has its own case: 20 frames where 8 cannot be joined to a sample and 2 carry a
real `STATE_PRESENTED_PARTIAL_OLD_MAIN`. Both land in `partial`, and the test asserts the histogram
separates them (8 vs 2) — the numbers were **printed before being asserted**, which is how the join
age's real reach was established (frames 11 and 12 still join a 21.7ms and 38.3ms old sample; frame
13 at 55.0ms is the first that cannot). Mutating `countReasons` to record only a frame's first
reason turns that suite red.

### The two stimulus defects: numbers taken before them are VOID, not superseded

Anyone reading a pre-revision-2 measurement needs to know these two, because they mean the older
numbers do not describe the route they are labelled with.

6. **`settledStart` could never be true.** `measureRoute` called a three-argument driver with two
   arguments, so `startFrom` was `undefined` and the check was
   `Math.abs(scrollTop - undefined) <= 1` — `NaN <= 1`, which is `false` on every run. It reported
   `settledStart: false` for all four routes of the baseline capture and no one could tell whether
   the grid had been positioned at all. This is the seventh can't-fail instrument found in this
   project; it failed safe (it could never claim success) but it also carried no information.
7. **`large-movement` never made a large movement.** It started at offset 0 and its jumps alternate
   ±20,000px, so every upward jump was clipped by the scroll bound — measured, 3 clamped ticks — and
   a route designed to force cold renders across a 507,845px range spent the whole time inside the
   top 4% of it. **Every `large-movement` number produced before revision 2 describes a route that
   did not do what its name says.** Routes now declare a start offset and the run aborts if the grid
   will not hold it.

### 8. A campaign that failed by EXITING ZERO

The worst failure shape in this project so far, because it is indistinguishable from success to
anything that reads an exit code — and exit codes had been treated as authoritative all along.

MEASURED: a capture ran for ~16 minutes, printed only vitest's banner, wrote two repeats, and exited
**0**. No test summary, no error, no OOM, 39GB free. Node exits 0 when its event loop empties, so an
`await` that can never settle — a page-side evaluate whose target has gone, for instance — ends the
process cleanly. A wrapper checking `$?` sees success.

Three guards now make it loud rather than silent:

- a `beforeExit` handler that prints
  `CAMPAIGN EXITED SILENTLY … this is NOT a pass and NOT a threshold result`, which fires in exactly
  the loop-emptied case;
- `NODE_OPTIONS=--unhandled-rejections=strict`, so a swallowed rejection is a stack rather than a
  shrug;
- `browser.on("disconnected")`, `page.on("crash")` and `page.on("close")` handlers, since a vanished
  target is the likeliest way an await never settles.

**And the liveness rule that follows from it: the ARTIFACT'S MTIME ADVANCING is the only signal that
cannot lie.** A process query answers "is something running", which is not the question. The
question is "is the campaign making progress", and only the artifact answers that. Two separate
agents drew a wrong conclusion from `pgrep`/`ps` during this work — once reading a genuinely empty
result and inferring a cause that was not theirs.

### 9. A provenance stamp that described the wrong bytes

Artifacts are rewritten after every repeat, and the harness digest was computed inside that writer,
reading from disk. Editing the harness while a campaign was running therefore stamped the NEW digest
onto a campaign still executing the OLD code. The results were unaffected — a running vitest process
does not re-read its modules — but the metadata quietly became someone else's, which is worse than a
wrong number because it is the thing a reviewer uses to decide whether numbers are comparable.

Digests are now taken **once, at module load**. The general rule: a provenance value must be
captured when the run starts, never when the report is written.

### Two instrument defects found in THIS revision, both while it was being built

1. **A fixture check that could not fail.** It counted a row as tagged whenever the tags cell held
   any text, and as allocated whenever an allocation cell held a digit. Both are true of every row —
   the empty tags cell renders `Add tags...`, and an unallocated cell carries an sr-only
   `Explicit: not stored. Effective: 0%. Owner remainder: 100%.` It reported **915 of 915 rows
   tagged and allocated**. It now requires the fixture's own tag names and `Explicit: <n>%`, and
   checks the RATE in both directions, so 100% fails as loudly as 0%. Measured after the fix:
   227/913 tagged (24.9%) against 25.1% implied.
2. **A stimulus check that compared the wrong quantity.** It compared the SIGNED sum of observed
   wheel deltas against the route's ABSOLUTE requested distance, so `fast-reversal` — whose four
   reversals net to ~0px — aborted the run reporting "0px of a requested 23,504px". The check was
   right to be loud; the quantity was wrong.

`run-statistics.test.ts` does the same for the campaign aggregation. Three mutations were applied to
the implementation and each was confirmed to go red before being reverted:

| mutation                                        | tests that failed                                           |
| ----------------------------------------------- | ----------------------------------------------------------- |
| single-run standard deviation returns `0`       | 3, incl. "reports NaN, not 0, for a single value"           |
| `passedEveryRun` uses `some` instead of `every` | 3, incl. "does not let nine good runs average away one bad" |
| between-session spread pooled over all runs     | 3, incl. the perfectly-repeatable-but-disagreeing case      |

## The repeat structure, and why it is shaped this way

Setup dominates: minutes of seeding and note-typing against ~30s of routes, and expansion is
component state that cannot survive into another browser session. So:

- **Repeats live inside a session** — the full route set runs `PERF_REPEATS` times against one
  seeded vault.
- **Sessions are independent** — `PERF_SESSIONS` fresh identities, each seeded from scratch, because
  a seeding artefact would otherwise be indistinguishable from a stable result.
- **Within-session and between-session variance are reported separately.** Pooling them hides
  exactly the effect the second session exists to detect: five perfectly repeatable runs at 60fps in
  one session and five at 50fps in another pool to a plausible-looking sd of 5.27 while the real
  signal is that the two sessions disagree.
- **A route passes only if every run passes.** A single standard deviation is `NaN`, never `0` —
  zero reads as "no variance observed" when the truth is "variance not measurable".

## How the routes are driven

Input is **real wheel events on a wall clock**, dispatched from Node, not `scrollTop` assignments
inside `requestAnimationFrame`.

The previous driver advanced one delta per rAF, which coupled the input rate to the render rate: a
slow grid received slower input, so the route stretched in wall time and the stimulus was not held
constant across arms. Measured on the identical arm, build and fixture, the `ordinary` route
occupied **14.449s** in one run and **11.983s** in the run before it, with dropped frames going **35
→ 99**. That is a confound, not noise.

Four measured properties of the wheel path make the replacement sound (probe:
`/tmp/mf-perf-probe/wheel-probe2.mjs`, production build):

| property                             | measurement                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| response is 1:1, no smooth-scrolling | one wheel of 100 moved `scrollTop` 0 → 100 in a single frame                                    |
| large deltas apply in full           | single wheels of 1,000 / 6,666 / 20,000px each applied entirely                                 |
| **distance survives jank**           | 60 × 10px over 983ms reached exactly 600px both idle AND with the main thread blocked 9 × 100ms |
| the schedule is exact                | absolute tick error p50 0.00ms, max 0.53ms; max 0.42ms with the main thread blocked             |

Under jank Chromium coalesced 60 events into 36 dispatches whose deltas still summed to exactly
600px — so a slow grid receives the same total input as a fast one, which is the property the arms
need. `page.mouse.wheel()` is **not** used: it awaits the renderer, measured at 17ms for one event.

Each run therefore checks its own stimulus. A `{passive: true}` wheel listener counts what arrived,
and the run **aborts** if the page observed under 98% of the requested absolute distance — that is a
harness failure (wrong hit target, an overlay swallowing input), not a slow grid.

Every route also declares a `startOffsetPixels`. Input past a scroll bound is discarded, so a route
that would leave the scrollable range stops being the same stimulus: measured on the previous
baseline, `large-movement` started at 0 and clamped on 3 ticks, confining a route designed to jump
±20,000px to the top 4% of a 507,845px range.

**Not determined:** whether each scroll was handled on the compositor thread or the main thread. The
events traverse Chromium's real input pipeline rather than being an assignment, and the harness's
own listener is passive so it does not force main-thread handling — but no trace evidence was
collected either way.

## Files

| File                             | Role                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| `browser-environment.ts`         | The measured launch configuration and why.                  |
| `trace-presentation.ts`          | Trace → expected/presented frames on the vsync timebase.    |
| `frame-report.ts`                | Classification, statistics, per-route report and table.     |
| `viewport-coverage.ts`           | Rectangle algebra for uncovered-band detection.             |
| `scroll-routes.ts`               | The four routes: wheel deltas on a wall-clock tick.         |
| `grid-sampler.ts`                | Page-side sampler, scroll positioner, prefix preload.       |
| `measure-grid.ts`                | Proxy, seeding, notes pass, wheel dispatch, per-route runs. |
| `run-statistics.ts`              | Within-session vs between-session variance, per-run table.  |
| `fixture/transaction-fixture.ts` | The deterministic 10,000-transaction fixture and digests.   |
| `fixture/vault-setup.ts`         | Seeds accounts, people, tags, rules and the four imports.   |

## Known gaps

- **The free-spin route is not calibrated from real mouse input.** No wheel trace could be captured
  here and none exists in the repository. Its exponential decay — 9,000 px/s initial, 0.6s half-life
  — was **chosen**, not measured from a device. See the provenance block on `freeSpin` in
  `scroll-routes.ts`.
- **Whether a scroll was compositor- or main-thread-handled is unknown**; see above.
- **The sampler costs time inside the frame it measures**: p50 0.4-1.5ms, max up to 15.7ms observed.
  It is the same instrument in every arm, so it does not bias a comparison, but it does inflate
  absolute jank slightly. Reported per route as `sampleCostP50Milliseconds` / `…Max…`.
- **A held blank counts once**, at the frame that painted it, because the idle vsyncs that follow
  are classified before blankness is evaluated. This understates the _duration_ of visible blanking.
- **Content staleness is not detected** — only transform/scroll desync, index ordering and coverage.
  A row rendering another row's data would pass.
- Headless Chromium renders through `SoftwareRenderer`; "presented" means presentation feedback for
  a software swap, not photons on a physical panel.

## The host must be quiet, and the runner enforces it

A capture refuses to start when `/proc/loadavg`'s 1-minute average exceeds `PERF_MAX_LOADAVG`
(default **2.5**), checked before the browser launches; the observed value is recorded at each
session boundary and against **every route run**, so a contended run is self-evident in its own
artifact.

The threshold is a judgement with two measurements behind it: this host has 16 cores / 32 threads
and measures **0.54** idle, while a concurrent typecheck, lint, build and 32-thread unit suite took
the 1-minute average to **9.14** during a real capture's setup. 2.5 sits far above ambient and far
below that. The direction of the risk is what makes this worth enforcing rather than remembering:
contention on the BEFORE arm makes production look slow, which **flatters** the port.
