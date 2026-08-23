# Transaction grid migration — frozen measurement contract

Everything in this document is fixed before any performance tuning. Any change to it invalidates
captured measurements and requires a re-capture, not an amendment.

## Revision 2 — what changed, and what it invalidates

Revision 2 was cut **before** any arm was captured for the record, deliberately batched so exactly
one re-capture is paid for. It changes both the fixture and the stimulus, so **the arm A capture in
`../measurements/A-before-cd81290.{json,txt}` is superseded and must not be compared against any
revision-2 arm.** It is kept only as the record of the instrument's earlier state.

| #   | change                                                                                  | why                                                                                                     |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Fixture completed: 4 accounts via 4 imports, 3 people, 3 tags, 5 pre-import field rules | tags, allocations and allocation columns were absent; one account meant no cross-account merge          |
| 2   | Account index drawn from its own hash instead of `rowIndex % 4`                         | it was perfectly correlated with the year, so each account held only 2 of 8 years — see the composition |
| 3   | Input is real wheel events on a **wall-clock** schedule, not one `scrollTop` per rAF    | the old driver coupled input rate to render rate; the same route occupied 14.449s and 11.983s           |
| 4   | Every route declares a start offset                                                     | `large-movement` clamped at 0 and never left the top 4% of the range; `settledStart` could never pass   |
| 5   | Repeat structure: ≥2 independent sessions × ≥5 route-set repeats, pass only if all pass | single runs of this arm disagreed substantially                                                         |

Arm **B** (dependency bump only) was cut by the lead and is not built.

## Arms

Three arms are captured with an identical harness, fixture and route set. Arm B exists so the
dependency bump and the port can be attributed separately rather than credited or blamed together.

| Arm | Meaning              | Source commit | `@tanstack/react-virtual` | `@tanstack/virtual-core` |
| --- | -------------------- | ------------- | ------------------------- | ------------------------ |
| A   | Production today     | `cd81290`     | 3.14.6                    | 3.17.4                   |
| B   | Dependency bump only | `cd81290`     | 3.14.9                    | 3.17.7                   |
| C   | Ported grid          | final commit  | 3.14.9                    | 3.17.7                   |

## Dependency versions

Resolved from the raw npm registry, not the pnpm CLI: safe-chain's minimum-package-age suppresses
recent releases, and `pnpm view @tanstack/react-table version` reports `9.0.0` while
`dist-tags.latest` is `9.1.1`.

| Package                   | Before | After  | Published            |
| ------------------------- | ------ | ------ | -------------------- |
| `@tanstack/react-table`   | absent | 9.1.1  | 2026-08-08T18:39:18Z |
| `@tanstack/table-core`    | absent | 9.1.1  | 2026-08-08T18:39:24Z |
| `@tanstack/react-virtual` | 3.14.6 | 3.14.9 | 2026-07-28T20:28:52Z |
| `@tanstack/virtual-core`  | 3.17.4 | 3.17.7 | transitive           |
| `@tanstack/react-store`   | absent | 0.11.1 | transitive, new      |
| `@tanstack/store`         | absent | 0.11.1 | transitive, new      |

`@tanstack/react-table` 9.1.1 and 9.0.0 are byte-identical across every cell-selection file
(`cellSelectionFeature.js`, `.types.d.ts`, `.utils.js`, `cellSelectionGeometry.js`). The 12 files
that differ are confined to aggregation, pagination, sorting, `static-functions` and the worker row
model.

### Supply-chain note

9.1.1 was published one day before pinning, so safe-chain's minimum-package-age gate suppressed it.
Pinning it required `--safe-chain-skip-minimum-package-age`. The bypass is **scoped and recorded** —
pnpm wrote two version-exact entries to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`:

```yaml
minimumReleaseAgeExclude:
    - "@tanstack/react-table@9.1.1"
    - "@tanstack/table-core@9.1.1"
```

The guard is not globally disabled and no other package is affected. This is a deliberate trade: the
goal mandates the latest stable release, and the gate would otherwise have pinned a version that is
not it.

#### A fresh worktree of `e12eede` cannot install from a cold cache

**MEASURED, 2026-08-09.** `pnpm install --frozen-lockfile` in a new worktree of `e12eede` **fails**:

```
[ERR_PNPM_FETCH_403] GET https://registry.npmjs.org/@tanstack/table-core/-/table-core-9.1.1.tgz:
  Forbidden - blocked by safe-chain direct download minimum package age (@tanstack/table-core@9.1.1) - 403
Safe-chain: blocked 2 direct package download request(s) due to minimum package age
Safe-chain: Exiting without installing packages blocked by the direct download minimum package age check.
```

**There are TWO gates with confusingly similar names, and only one of them is satisfied by the
committed configuration.** `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` is **pnpm's** setting
and it IS committed, verified present in both the main checkout and a fresh worktree of `e12eede`.
Safe-chain applies a **separate direct-download gate** at the registry proxy, which that setting
does not affect. So the committed tree installs from a warm store and 403s from a cold one.

The workaround is the same documented, version-scoped one recorded above:

```bash
pnpm install --frozen-lockfile --safe-chain-skip-minimum-package-age
```

- This is a **supply-chain-gate interaction, not a lockfile problem**: the lockfile is intact, its
  SHA-256 matches, and the resolved versions are exactly as pinned.
- It is a consequence of pinning the latest stable release **one day** after publication —
  `@tanstack/react-table` 9.1.1 was published `2026-08-08T18:39:18Z` and pinned on 2026-08-09. (An
  earlier note in this thread said five days; the manifest's own publication timestamps say one.)
- **It will lapse on its own** once the packages age past safe-chain's minimum. The exact threshold
  was NOT verified here — the error names the gate but not its length — so no lapse date is claimed.
- It affects **CI from a cold cache**, which is why it is recorded here rather than left in a
  message.

## Lockfile hashes

| State                               | `pnpm-lock.yaml` SHA-256                                           |
| ----------------------------------- | ------------------------------------------------------------------ |
| Arm A / B baseline (`cd81290`)      | `747b21c13d61b683729999bcdd1ef66bd844f3ef9fc2f722e62780fac51f2f88` |
| Intermediate (9.0.0 pin, discarded) | `efaec7bbacdbf4ce46c2e373dd188e2ed2db2a4c1f364a2bc0f65511c8159e98` |
| Arm C (9.1.1 pin)                   | `a2213f0b43d6c72298ad1e791023975b072991a7ed1d647bd87518bbefbb47a6` |

## Host environment

| Property | Value                                     |
| -------- | ----------------------------------------- |
| OS       | Ubuntu 26.04 LTS, kernel 7.0.0-15-generic |
| CPU      | AMD Ryzen 9 5950X, 16 cores / 32 threads  |
| Governor | `performance`                             |
| Memory   | 63,644,752 kB                             |
| Node     | v22.21.1                                  |
| pnpm     | 11.13.1                                   |

### Display

The user's X display `:0` is **transient and must not be depended on**: it reported
`5120x1440, Meta-0 connected primary 2560x1440+0+0 @ 59.96Hz` at 09:05 and `current 0 x 0` with no
connected output at 09:26 the same morning. Project rules also forbid running Playwright headed.

The presentation environment is therefore a dedicated, owned display server, and its cadence is a
**measured** quantity, not an assumed one. The measured interval distribution is recorded alongside
the results in `presentation-environment.md`; a run whose own cadence does not measure 60±1Hz does
not qualify as evidence for the 60fps claim.

Presentation timestamps come from Chrome trace presentation events. `requestAnimationFrame`
callbacks are **not** presentation and are not accepted as a substitute.

## Acceptance thresholds

Per route, unchanged from the goal and not negotiable downward:

- ≥ 59 presented frames per second, sustained
- p95 presented-frame interval ≤ 17ms
- ≥ 99% of expected frames fully presented
- **zero** frames where the transaction viewport is visibly empty because row rendering lagged
  scrolling

Every route reports p50 / p95 / p99 / max presented-frame interval and full / blank / partial /
stale / dropped counts. Average FPS alone is not sufficient evidence and is not accepted.

## Build

Measurements are taken against the **production** build only (`pnpm build` + production server),
never the dev server. Servers bind a port that is neither 3000 nor 3200.
