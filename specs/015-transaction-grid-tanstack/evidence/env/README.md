# Task A — presentation environment, settled by measurement

Question: is there a reproducible browser configuration on this host whose presentation cadence is
60±1Hz, and what exactly is a "presented frame"?

Answer: **yes — Playwright's new headless Chromium (`channel: "chromium"`, `headless: true`)**,
measured at **60.002 Hz** with an exactly regular 16.666ms vsync timebase and zero dropped frames on
a control page.

Everything below was executed, not estimated. Raw traces were written to
`/tmp/mf-perf-probe/out/<mode>/trace.json` (not committed — each is ~100MB).

## Method

Control page: a 400,000px tall gradient inside a `overflow-y: scroll` div, scrolled continuously
from inside the page for 12 seconds. A trivial page is deliberate: this measures the _environment's_
ceiling, not the app's cost.

Chrome trace captured over CDP with categories `benchmark`, `viz`, `cc`, `gpu`,
`disabled-by-default-devtools.timeline.frame`, `devtools.timeline`, `toplevel`.

Two independent presentation sources were extracted and cross-checked:

1. `PipelineReporter` (cat `cc,benchmark,disabled-by-default-devtools.timeline.frame`) with
   `args.frame_reporter.state` beginning `STATE_PRESENTED`, timestamped by its terminating
   `SubmitCompositorFrameToPresentationCompositorFrame` `"e"`.
2. `Display::FrameDisplayed` (cat `benchmark,viz,disabled-by-default-display.framedisplayed`), an
   instant event on the viz display thread.

**Cross-check result: 720 of 721 frames agreed within 1ms**, and the derived statistics were
identical to three decimal places. The definition is therefore not an artefact of one event's
semantics.

`requestAnimationFrame` was not used as evidence anywhere.

## Candidates measured

Presentation wall-clock timestamps, 12s continuous scroll:

| candidate                           | frames | presented FPS | p50    | p95    | p99    | max    |
| ----------------------------------- | ------ | ------------- | ------ | ------ | ------ | ------ |
| new headless (`channel: chromium`)  | 721    | 60.024        | 16.663 | 16.983 | 17.173 | 17.452 |
| `chrome-headless-shell`             | 721    | 60.040        | 16.670 | 17.121 | 17.670 | 26.288 |
| Xvfb `:99` + `--ozone-platform=x11` | 720    | 60.005        | 16.500 | 17.556 | 18.088 | 19.775 |
| new headless + Vulkan/GPU raster    | 719    | 60.005        | 16.668 | 17.177 | 17.498 | 18.420 |

Repeat runs of the chosen candidate (stability):

| run | frames | presented FPS | p50    | p95    | p99    | max    |
| --- | ------ | ------------- | ------ | ------ | ------ | ------ |
| r1  | 720    | 60.003        | 16.661 | 17.202 | 17.494 | 18.181 |
| r2  | 721    | 60.058        | 16.657 | 17.269 | 17.489 | 17.875 |
| r3  | 721    | 60.058        | 16.653 | 17.254 | 17.635 | 20.145 |

FPS is stable to ±0.06 across every configuration and repeat.

## The finding that shaped the metric design

Every candidate drives a **`DelayBasedBeginFrameSource` with a declared `interval_us` of exactly
16666** — none of them has a hardware vsync, so the cadence is a software timer at 60.002Hz. That is
good for reproducibility.

Re-computing the same runs on the **`frame_time_us` vsync timebase** instead of the wall clock:

| candidate               | presented FPS | p50    | p95    | p99    | max    | fully presented |
| ----------------------- | ------------- | ------ | ------ | ------ | ------ | --------------- |
| new headless            | 60.002        | 16.666 | 16.666 | 16.666 | 16.666 | 100.000% (r1)   |
| new headless r2/r3      | 60.002        | 16.666 | 16.666 | 16.666 | 16.666 | 100.000%        |
| `chrome-headless-shell` | 60.002        | 16.666 | 16.666 | 16.666 | 16.666 | 96.011%         |
| Xvfb `:99`              | 60.002        | 16.666 | 16.666 | 16.666 | 16.666 | 99.861%         |

So the 17.0–17.3ms p95 in the first table is **trace-emission jitter, not jank**: on the vsync
timebase a clean run is exactly 16.666ms for every single interval, with zero drops. The harness
therefore measures intervals on `frame_time_us`. Had it used wall-clock timestamps, the
environment's own noise floor would have sat at the 17ms threshold and the instrument could not have
distinguished a perfect grid from a marginal one.

## Why new headless over the others

`chrome-headless-shell` emitted **723 BeginFrame ticks across a span implying 752** — a ~0.5s stall
of the BeginFrameSource itself. That is disqualifying for measurement: a stalled source shrinks the
expected-frame denominator and inflates the pass rate. New headless matched its own span exactly
(722/722, 721/721, 722/722 across runs). The harness now asserts this invariant on every run so the
failure mode cannot recur silently.

GPU rasterisation (Vulkan) was measured and offers no cadence advantage on the control page.
Software rendering is more deterministic, so it is kept — with the caveat that if the real grid
turns out to be raster-bound rather than main-thread-bound, this choice should be revisited with
measurements.

## Xvfb: works, but carries a hazard

Xvfb `:99` reaches the same 60.002Hz. It is **not** the default because getting there requires
disarming a real trap:

Chromium prefers the **Ozone Wayland** backend whenever `WAYLAND_DISPLAY` is set. This host runs
`XDG_SESSION_TYPE=wayland` with `WAYLAND_DISPLAY=wayland-0`, so a `headless: false` launch **ignores
`DISPLAY=:99` entirely and connects to the user's real desktop session**. The first attempt did
exactly that and hung for 180s in `browserType.launch`. Only `--ozone-platform=x11` plus removing
`WAYLAND_DISPLAY` from the environment confines the window to Xvfb.

`xvfbLaunchOptions()` in `tests/perf/browser-environment.ts` bakes in both, and refuses `:0`
outright.

The user's `:0` was confirmed unusable independently: `DISPLAY=:0 xrandr` reports `current 0 x 0`
with no connected output.

## Honest limits

- Headless Chromium renders through `SoftwareRenderer`. "Presented" means the compositor's
  presentation feedback fired for a software swap. It is the right signal for dropped and janked
  frames, and it is what the thresholds are measured against — but it is not photons on a physical
  60Hz panel, and no claim here should be read that way.
- The cadence is a software timer, not hardware vsync. This makes runs more reproducible than a real
  display would, and means these results do not characterise behaviour on a 120Hz or
  variable-refresh monitor.
- All figures above come from the **control page**, not the transaction grid. They establish the
  instrument's noise floor. They say nothing about whether the grid meets the goal.

## Reproducing

The probe scripts live in `/tmp/mf-perf-probe/` (`discover.mjs`, `analyze.mjs`, `timebase2.mjs`) and
are scratch, not deliverables — the extraction logic they validated is now in
`tests/perf/trace-presentation.ts`, which was re-run against the same real trace and reproduced the
numbers above (722 BeginFrames, 720 presented, 722 expected, all intervals 16.666ms).
