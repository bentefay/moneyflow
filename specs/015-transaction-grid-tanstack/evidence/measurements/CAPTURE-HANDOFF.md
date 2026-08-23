# Capture campaign handoff

> **STATUS: acted on. Sections 0, 3 and 7 are now out of date and are kept as the record of what was
> handed over, not as current instructions.** The fixture is frozen
> (`../freeze/fixture-composition.md`), the repeat loop is implemented, and the driver no longer
> assigns `scrollTop`. What changed and what it invalidates is in `../freeze/freeze-manifest.md` §
> "Revision 2". Two commands here are also stale: vitest 4 removed `--include`, so use
> `--config tests/perf/vitest.measure.config.ts`; and the run needs `PERF_SESSIONS` /
> `PERF_REPEATS`.
>
> Sections 1, 2, 4, 5, 6 and 8 remain accurate and load-bearing — especially § 5, the five
> instrument defects.

You are running the presented-frame capture campaign for arms A (BEFORE) and C (AFTER). Everything
needed is here; you should not have to re-derive anything.

**Read `../freeze/fixture-composition.md` first. The fixture is NOT FROZEN.** Three enrichment items
are unimplemented and they are your first task — capturing before they land spends the one budgeted
re-capture on an incomplete fixture.

Arm B (deps-only react-virtual bump) was **cut** by the lead. Do not build it unless explicitly told
to.

---

## 0. Your first task: finish and freeze the fixture

In `../freeze/fixture-composition.md`, items 1-3. Summary:

1. Tags + allocations via field rules defined **before** import — `commitImportBatch` calls
   `applyFieldRulesToImport`, so rules enrich every row through a real product path at no per-row
   cost.
2. People holding allocations, so allocation columns actually render. **Verify on the DOM** that the
   columns exist.
3. **Four accounts, 2,500 rows each, via four imports.** `fixtureCsvByAccount()` already emits the
   four CSVs. This is the functionally critical one: it is the only thing exercising the cursor's
   k-way merge across accounts, the arm C path most likely to be wrong.

Then re-hash and re-pin both digests in `tests/perf/fixture/transaction-fixture.test.ts`, and update
the composition doc. **Then** capture. Do not tune the fixture up or down based on how an arm
performs.

---

## 1. Build and serve an arm

Full reproducible recipe, including every TLS shim: **`../freeze/local-production-recipe.md`**. Read
it in full — a misconfigured arm fails in a way that impersonates a total product break.

The four things people miss:

- The production build **rejects tRPC over plain HTTP** and **rejects an `http://` Supabase URL**
  under `NODE_ENV=production`.
- `NEXT_PUBLIC_SUPABASE_URL` is inlined at **build** time, so pointing it at the Supabase TLS proxy
  requires a **rebuild**, not just a different runtime env.
- `SUPABASE_JWT_SECRET` must be passed to `pnpm start`. `playwright.config.ts` injects it for its
  dev server; `pnpm start` gets nothing and identity creation fails.
- `NODE_EXTRA_CA_CERTS` is needed for the server's own Supabase calls.

These are **measurement-harness accommodations only**. No product source is modified; both proxies
are loopback-only byte forwarders; encryption, auth and sync semantics are untouched.

### Ports

| port      | owner                                        |
| --------- | -------------------------------------------- |
| 3000      | free                                         |
| 3100      | arm measurement server                       |
| **3200**  | **HUMAN-OWNED (pid 3914887) — DO NOT TOUCH** |
| **32443** | **HUMAN-OWNED TLS proxy — DO NOT TOUCH**     |
| 32444     | harness HTTPS proxy                          |
| 54321     | Supabase local stack                         |
| 54443     | harness Supabase TLS proxy                   |

The servers may still be running from the previous session on 3100 / 32444 / 54443. **Verify the
listener on 3100 belongs to the arm you think you are measuring** before trusting any number:

```bash
ss -lptn 'sport = :3100'
readlink /proc/<pid>/cwd     # must be the arm's worktree
```

An `EADDRINUSE` restart leaves the **previous** arm's build serving every request and does not look
like a failure.

---

## 2. Run a capture

```bash
PERF_ARM=A-before-cd81290 \
PERF_NOTES_ROWS=500 \
PERF_UPSTREAM_PORT=3100 \
PERF_TLS_PEM=/tmp/mf-perf-probe/tls.pem \
PERF_COMMIT=<full sha> \
PERF_LOCKFILE_SHA256=<sha256 of the arm's pnpm-lock.yaml> \
PERF_REACT_VIRTUAL=<resolved> PERF_VIRTUAL_CORE=<resolved> \
pnpm exec vitest run --config tests/perf/vitest.measure.config.ts
```

Writes `<arm>.json` and `<arm>.txt` into this directory. The run **asserts the product-goal
thresholds**, so a failing grid fails the run — the artifacts are written before the assertion so
numbers survive a failure.

Record for every arm: commit, lockfile SHA-256, and the **resolved** `@tanstack/react-virtual` AND
`@tanstack/virtual-core` versions (the react-virtual version alone does not pin behaviour).

### What the run does, in order

1. Create identity (~1.2s).
2. Import 10,000 rows in one CSV (~2.2s commit).
3. **Preload the loaded prefix** — `transactions/page.tsx` renders `slice(0, displayCount)` with
   `PAGE_SIZE = 50`, growing on a virtualiser-driven load-more. Reaching row 9,999 takes **exactly
   200 steps / ~34-43s**, ending at `scrollHeight` ~507,845px. Without this you measure the
   pagination loader, not the grid.
4. **Apply notes and expand ~480 rows** (~325s). See the constraint below.
5. Run each route under CDP tracing, classify, report.

### The in-session expansion constraint

Writing a note does **not** make a row taller. `notes-row` renders only when `isExpanded`, and
`expandedIds` is local `useState` in `TransactionTable` seeded empty — nothing auto-expands a row
because it has notes. Notes **persist** across reload; **expansion does not**, because it is
component state. So expansion must be re-applied in-session after the preload, on **every arm**, and
you cannot pre-seed it or reuse it across browser sessions.

### Arm C signal to watch for

The port replaces the paginated prefix with a cursor, but progressive loading is still required, so
**the preload step should still be needed**. If arm C's preload assertion stops firing, that means
the port changed the prefix mechanism — **report it, do not adjust the assertion.**

---

## 3. Repeat structure (required — the current numbers do NOT satisfy this)

Setup dominates: ~40s seed + ~325s expansion ≈ 7 min, while all four routes together are only ~30s.
So:

- Within one seeded session, run the **full route set ≥5 times**. Cheap.
- Use **≥2 independent seeded sessions per arm**, so a seeding artefact cannot masquerade as a
  stable result.
- Report **within-session** and **between-session** variance **separately**, plus the per-run table.
- **A route passes only if it passes every run.** If runs disagree, that variance is the finding.

This is not implemented in the runner — `measureArm` currently seeds once and runs each route once.
Adding the repeat loop is straightforward: the seed and notes pass are already separate from
`measureRoute`.

**Why this matters concretely:** two runs of the identical arm, build and fixture gave `ordinary`
**14.449s vs 11.983s** route duration and **99 vs 35** dropped frames. Routes stretch under load
because the driver advances one delta per rAF. Single runs are not evidence.

---

## 4. What the metrics mean

Definitions: `tests/perf/README.md`. Environment evidence: `../env/README.md`.

- **Presented frame** = `PipelineReporter` (cat
  `cc,benchmark,disabled-by-default-devtools.timeline.frame`) with `args.frame_reporter.state`
  beginning `STATE_PRESENTED`, timestamped by its terminating
  `SubmitCompositorFrameToPresentationCompositorFrame` `"e"`. rAF is never used as presentation
  evidence.
- **Two timebases, both reported.** Vsync lattice (`frame_time_us`) is primary and thresholded; wall
  clock is disclosed. The lattice is quantised to multiples of 16.666ms, so `p95 ≤ 17ms` on it
  collapses into "no drop landed in the 95th percentile" and is **not** an independent check — the
  thresholds rest on drop count and fully-presented ratio. Wall-clock noise floor, measured on a
  control page that dropped nothing: p95 17.269ms, p99 17.635ms, max 17.452ms.
- **Cadence is scored over the moving window; blank over every frame.** Routes that deliberately
  hold still (large-movement holds ~57 of every 60 frames) would otherwise divide presented frames
  by wall time they never asked the grid to move in.
- **Environment**: Playwright new headless (`channel: "chromium"`), measured 60.002Hz on a
  `DelayBasedBeginFrameSource` at exactly 16,666µs. `chrome-headless-shell` was rejected — it
  emitted 723 BeginFrame ticks across a span implying 752. Headless renders via `SoftwareRenderer`,
  so "presented" means presentation feedback for a software swap, not photons on a panel.

---

## 5. THE FIVE INSTRUMENT DEFECTS — do not reintroduce these

Every one produced plausible-looking output that was wrong. This is the most important section in
this document.

1. **A single `scrollTop` assignment is reverted on the next frame** and stays reverted — measured:
   setting `0` from `506905` read back `506905` for 90 consecutive frames. Assigning it **every**
   frame does hold. Consequence when missed: every route ran pinned at the bottom of the grid with
   694/720 vsyncs idle, reporting 1.917 FPS. Fix in place: hold the start offset until it settles,
   and drive an **absolute offset trajectory**, never relative `+=` nudges (reading `scrollTop` back
   each frame folds the grid's own scroll restoration into the input).
2. **`highestIndex` read after a failed scroll-to-top gave a spurious pass.** The preload reported
   `highestIndex: 9999` by reading rendered `data-index` values _after_ a scroll-to-top that had
   silently failed, leaving the bottom window rendered. Only rendered rows carry `data-index`. Fix:
   report the highest index seen **while at the bottom**.
3. **A constant viewport bias read as 100% staleness.** `translateY` is relative to the row
   container, which sits below a sticky header, so comparing it to the scroller's rect carried a
   fixed ~header-height offset that exceeded the 2px stale tolerance on every frame —
   `stale = 717/718` with `full = 0`. Fix: reference the row's actual parent.
4. **The sticky header's band scored as uncovered**, because rows can never cover it. Fix: sticky
   descendants of the scroller are collected as portal masks.
5. **A regex silently disabled by template-literal escaping.** In a plain template literal the
   page-side `\(` collapses to `(`, turning a literal paren into a capture group, so
   `translateY(0px)` stopped matching and every row read as unpositioned — the notes pass reported 0
   of 20 rows reachable. **All page-side source strings must use `String.raw`.** `grid-sampler.ts`
   only escaped this by accident because it already did; `measure-grid.ts` did not.

The shared lesson: each of these was found by an assertion or a printed value, not by reading the
code. **Print the value before believing a result**, and when a number looks like a product finding,
first ask whether the instrument could have produced it.

---

## 6. What the runner asserts and aborts on

These exist so a harness failure cannot be mistaken for a product failure:

| assertion                                                  | meaning if it fires                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Import parsed N rows, expected 10000`                     | the CSV or the import mapping changed                                     |
| `Prefix preload reached index N, expected 9999`            | the grid is not showing all rows; **arm C: report, do not adjust**        |
| `expanded row N rendered M ARIA rows, expected 2`          | expansion did not take, or the notes row markup changed                   |
| `note on row N did not persist`                            | the notes write did not reach the CRDT                                    |
| `expanded row is Npx, not taller than a collapsed Mpx row` | variable height is not being exercised                                    |
| `only N of M planned rows were annotated`                  | row targeting is failing (see defect 1/5)                                 |
| `Trace declares multiple BeginFrame intervals`             | refresh rate changed mid-run; all derived stats invalid                   |
| `BeginFrameSource stalled`                                 | observed ticks below what the span implies; denominator would be deflated |
| `route X produced no joinable samples`                     | `performance.mark` marks missing from the trace                           |

**Telling harness from product failure:** a harness failure aborts with one of the messages above,
or every route fails identically at identity creation (that is almost always the TLS/JWT setup — see
the recipe's failure-signature table). A product failure produces complete tables with bad numbers
in them.

Also collected, not filtered: `flushSync` / `ResizeObserver` / `Maximum call stack` / hydration
console warnings. **Arm A had zero.** A warning appearing in arm C that is absent in arm A is a real
signal — report it. Between virtual-core 3.17.4 and 3.17.7, `resizeItem` changed `notify(false)` to
`notify(adjustedSync)`, which the React adapter routes into `flushSync`; with `measureElement` live
this can force a synchronous render from inside a ResizeObserver callback.

---

## 7. What is NOT in the current numbers

State these alongside any result you publish.

- **Fixture is incomplete**: one account only, no tags, no allocations, no allocation columns
  rendered. Notes and the date spread are present. See `../freeze/fixture-composition.md`.
- **Single run per route.** Not stability-qualified. Section 3 is unmet.
- **`scrollTop` driving, not real wheel input.** Main-thread scrolling only; the compositor-threaded
  wheel path is not exercised. This matters most for free-spin, whose premise is a high-velocity
  compositor fling. Implementing it means `page.mouse.wheel()` with a fixed delta sequence; it
  changes the route definitions, so do it **before** capturing, not after.
- **Free-spin is NOT calibrated from real mouse input.** No wheel trace could be captured (no usable
  display, headed browsers forbidden, no reachable pointer device) and none exists in the
  repository. It is an exponential-decay stress profile — 9,000 px/s initial, 0.6s half-life, 4s —
  and its provenance block in `tests/perf/scroll-routes.ts` says so. **Do not let an editing pass
  upgrade that wording to "calibrated".**
- **Content staleness is not detected.** Only transform/scroll desync, index ordering and coverage.
  A row rendering another row's data would pass.
- **A held blank counts once.** A blank that paints and is then held on screen through many idle
  vsyncs counts as 1 blank frame, not N, because an idle vsync is classified `dropped` before
  blankness is evaluated. This understates the _duration_ of visible blanking — read a blank count
  of 1 accordingly.
- **`large-movement`** cadence is scored over its moving sub-windows; its blank count spans the
  whole route.

---

## 8. Files

| path                                        | role                                              |
| ------------------------------------------- | ------------------------------------------------- |
| `tests/perf/README.md`                      | classification definitions                        |
| `tests/perf/browser-environment.ts`         | measured launch config                            |
| `tests/perf/trace-presentation.ts`          | trace → presented frames on the vsync timebase    |
| `tests/perf/frame-report.ts`                | classification, statistics, per-route report      |
| `tests/perf/viewport-coverage.ts`           | uncovered-band geometry                           |
| `tests/perf/grid-sampler.ts`                | page-side sampler, route driver, prefix preload   |
| `tests/perf/measure-grid.ts`                | proxy, seeding, notes pass, per-route measurement |
| `tests/perf/baseline.measure.ts`            | entry point; asserts thresholds, writes artifacts |
| `tests/perf/vitest.measure.config.ts`       | keeps the measurement out of `pnpm test`          |
| `tests/perf/fixture/transaction-fixture.ts` | deterministic fixture + digests                   |
| `../env/README.md`                          | Task A environment measurements                   |
| `../freeze/local-production-recipe.md`      | build + serve recipe                              |
| `../freeze/fixture-composition.md`          | composition, rationale, remaining work            |

54 unit tests cover the pure classification logic, including a passing control and constructed
defects that must go red (10% drops, a **single** blank frame in 600, 2% stale, a stalled
BeginFrameSource, blank during a still sub-window). Keep them green: they are the reason any of
these numbers can be trusted.
