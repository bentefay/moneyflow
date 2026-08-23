# DevTools-loadable traces, one `ordinary` route per arm

> **READ FIRST: these are single runs, not the figures of record.** Each trace comes from a
> dedicated one-repeat capture, NOT from the 40 scored runs. Their single-run `fully presented`
> figures are 79.07% (A) and 76.75% (C) — BOTH BELOW their ten-run campaign means of 84.92% and
> 92.97%. Comparing those two numbers alone would suggest the port made fully-presented worse; the
> campaign means say it improved by 8 points. Use `../A-before-cd81290-r3.*` and
> `../C-after-1d57eb8.*` for any figure.

> **SCOPE: the arm C trace and every arm C figure here describe commit `1d57eb8`, not HEAD.** HEAD
> is three commits later and `ccac0e6` changed `ROW_HEIGHT` from 44 to 57 in
> `src/components/features/transactions/TransactionTable.tsx`, which is the virtualizer's
> `estimateSize` and therefore sets scroll extent and virtual range. A trace regenerated at HEAD by
> the recipe below will **not** reproduce this one. See `../ARM-C-AND-COMPARISON.md` for the full
> disclosure.

Open in the Chrome DevTools **Performance** panel (Load profile…).

| arm | commit    | raw trace (96MB / 79MB)                                                | in this directory                                 |
| --- | --------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| A   | `cd81290` | `/home/ben-agents/mf-perf-traces/trace-A-before-cd81290-ordinary.json` | `trace-A-before-cd81290-ordinary.json.gz` (9.1MB) |
| C   | `1d57eb8` | `/home/ben-agents/mf-perf-traces/trace-C-after-1d57eb8-ordinary.json`  | `trace-C-after-1d57eb8-ordinary.json.gz` (7.1MB)  |

The raw files are kept OUTSIDE the repository on purpose — 175MB of trace JSON should not enter git
without a deliberate decision. `gunzip -k` on either `.gz` here reproduces the raw file exactly.

## Provenance — read this before comparing them

These traces are **NOT from the 40 scored runs**. The harness parses each trace and discards it, so
a trace cannot be recovered from a completed campaign; producing one requires a run that was told to
save it. Each of these therefore comes from a **dedicated single-session, single-repeat,
`ordinary`-only run** against the same servers, same frozen fixture, same 480 expanded rows,
immediately after the scored campaigns.

Both are the **clean pass** — the one without the semantic sampler's own work in it — so what you
see is the product rather than the harness.

How these single runs compare to their campaign means, so you can judge how representative they are:

| arm | this trace's run    | campaign mean over 10 runs |
| --- | ------------------- | -------------------------- |
| A   | 55.957 FPS, 3 blank | 55.021 FPS, 3.3 blank      |
| C   | 59.330 FPS, 4 blank | 58.981 FPS, 3.2 blank      |

Frame rates sit within the campaign range for both arms. The single-run `fully presented` figures
(79.07% for A, 76.75% for C) are BELOW their campaign means (84.92% / 92.97%) — single runs vary,
and the campaign means are the figures of record.

## Regenerating these, which is why they are not committed

A five-minute opt-in run reproduces either trace exactly, so the repository does not carry 175MB
forever. Both arm servers must be running per `../../freeze/local-production-recipe.md`.

```bash
cd /home/ben-agents/Code/moneyflow
PERF_ARM=A-before-cd81290 PERF_UPSTREAM_PORT=3100 \
PERF_COMMIT=cd812905b68f23cae118c971112df313c0412ccd \
PERF_TLS_PEM=/tmp/mf-perf-probe/tls.pem \
PERF_SESSIONS=1 PERF_REPEATS=1 PERF_NOTES_ROWS=500 \
PERF_ROUTES=ordinary \
PERF_TRACE_OUT=specs/015-transaction-grid-tanstack/evidence/measurements/traces \
PERF_OUT=/tmp/mf-trace-side \
pnpm exec vitest run --config tests/perf/vitest.measure.config.ts
```

For arm C: `PERF_ARM=C-after-1d57eb8`, `PERF_UPSTREAM_PORT=3101`,
`PERF_COMMIT=1d57eb8abf37f07ec564b12f685ff7c98e47be12`.

`PERF_TRACE_OUT` saves only the CLEAN pass, and only for the routes named in `PERF_ROUTES`. Both are
unset during a scored campaign, so it writes nothing there. The run exits non-zero because it
asserts the product thresholds and the grid misses them — the trace is still written.
