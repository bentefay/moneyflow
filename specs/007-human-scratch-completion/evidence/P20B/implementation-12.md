# P20B revision 11 — remediating F10-1 and F10-2 of `reviews/P20B-review-10.md` — Implementation evidence

- **Implementer:** `p20b-implementer-11`, distinct from `p20b-implementer-07/-08/-09/-10` and from
  every reviewer of this package.
- **Package / revision:** P20B, revision 11.
- **Date:** 2026-08-03.
- **Filename skew:** this file is `implementation-12.md` for revision 11, the known one-ahead skew
  the dispatch names.

**Reading convention.** Every claim is tagged **MEASURED** — I ran the command in this session and
quote its output — or **INFERRED**, read from source with no discriminating execution of my own. A
bare `§` points at a section of **this** file; every reference to another document names that
document first. Logs are under `/tmp/p20b-rev11/`; my throwaway worktree is
`/tmp/mf-p20b-rev11-mut`, outside the repository. **This file is written, not committed**, per
`PROCESS.md:58`.

---

## 0. Range, tree identity and drift

| Item                    | Value                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **BASE**                | `2284945f86f81b10438ac15326b02d63a1fd91c8` — MEASURED with `git rev-parse HEAD`, not carried                           |
| **HEAD**                | `19160af72b1edaf6c0c0de1c159b1b767a4d1a6a`                                                                             |
| Commits in range        | `5ebe933`, `19160af` — both mine, both ancestors of HEAD, neither amended                                              |
| Tree digest at BASE     | `850ac6d239fc7b19240f6750fda01b63`                                                                                     |
| **Tree digest at HEAD** | **`6ff7e1198a9fb5f0563a149fe17cef68`**                                                                                 |
| Digest command          | `find src tests/e2e -type f \( -name '*.ts' -o -name '*.tsx' \) \| sort \| xargs md5sum \| awk '{print $1}' \| md5sum` |

**HEAD moved once before I started work and not afterwards.** MEASURED: my first
`git rev-parse HEAD` returned `a4bf9df` (the dispatch commit); by the time I created my worktree it
was `2284945`. MEASURED, `git diff --stat a4bf9df..2284945` is **one file, `PROGRESS.md`, +46
lines**, and `git diff --name-only a4bf9df..2284945 -- src tests` is **empty**. I took `2284945` as
BASE.

**MEASURED, no drift during the campaign.** Every campaign run recorded the digest at START and at
END. **All twelve START/END lines carry `6ff7e1198a9fb5f0563a149fe17cef68`** (`probe-70.log`,
`people-10x.log`, `changed-specs-5x.log`, `full-suite-index.log`). MEASURED after the last run,
`git rev-parse HEAD` is still `19160af` and `git status --short -- src tests` is empty. **All code
was committed before the first campaign run started.**

---

## 1. What changed

Two commits, each a single logical change, files listed explicitly rather than swept:

| Commit    | Files                                                                  | Change                           |
| --------- | ---------------------------------------------------------------------- | -------------------------------- |
| `5ebe933` | `tests/unit/sync/local-persistence-seam.test.ts`                       | +26 lines — the F10-1 guard      |
| `19160af` | `tests/e2e/passkey.spec.ts` (+5), `tests/e2e/identity.spec.ts` (+5/−1) | the four optional F10-2 barriers |

**`src/` is untouched by this revision.** MEASURED, `git diff --name-only 2284945..HEAD -- src` is
empty, and `src/lib/sync/local-persistence-seam.ts` md5 `50cc87bb90b7bc781e01b7b4104b2455` is
identical at BASE and HEAD. Nothing in the seam, the gate, `tests/e2e/helpers/persistence.ts` or the
twelve pre-existing barrier calls was redesigned.

---

## 2. F10-1 — the gate is now guarded, proved by mutation

**The guard** is in `tests/unit/sync/local-persistence-seam.test.ts`, beside the seam's existing
tests, and is two cases plus an `afterEach` that unstubs:

- `"installs nothing in a production build"` — `vi.stubEnv("NODE_ENV", "production")`, then asserts
  `window.__moneyflowLocalPersistence` is `undefined` **and** that the returned teardown is still
  callable, so a caller's cleanup path is identical in both builds.
- `"installs outside a production build"` — `vi.stubEnv("NODE_ENV", "development")`, then asserts
  the seam is defined. This one catches an **inverted** gate, which the production case alone does
  not distinguish from a gate that never installs at all.

### 2.1 The mutation proof — MEASURED, log `/tmp/p20b-rev11/mutation-proof.log`

Run in the throwaway worktree `/tmp/mf-p20b-rev11-mut` (BASE checkout + my three files), never in
the shared checkout. Command each time:
`env -u CI pnpm exec vitest run tests/unit/sync/local-persistence-seam.test.ts`.

| Step | Mutation to `src/lib/sync/local-persistence-seam.ts:60` | Result                   |
| ---- | ------------------------------------------------------- | ------------------------ |
| A    | none — gate present                                     | **8 passed**             |
| B    | **gate line deleted** (`git diff --stat`: 1 deletion)   | **1 failed \| 7 passed** |
| C    | gate restored                                           | **8 passed**             |
| D    | gate **inverted** — `===` → `!==`                       | **7 failed \| 1 passed** |
| E    | restored; `git diff` clean, md5 `50cc87bb…`             | **8 passed**             |

**Step B's single failure is the new test, and it fails on the right assertion:**

```
FAIL  tests/unit/sync/local-persistence-seam.test.ts > installLocalPersistenceSeam > installs nothing in a production build
AssertionError: expected { …(1) } to be undefined
```

**Step D turns seven of the eight red, including `"installs outside a production build"`**, which is
the case the production test cannot cover on its own.

This is the direction the finding demanded: before this revision the same deletion left typecheck,
lint, format and the whole unit suite green (MEASURED by the reviewer, `reviews/P20B-review-10.md`
§8 F10-1). It now turns a named test red.

### 2.2 The production bundle is still clean — MEASURED

`env -u CI pnpm build` in the worktree, exit 0, log `/tmp/p20b-rev11/build.log`. Then
`grep -rl "__moneyflowLocalPersistence" .next/static` → **0 files**. `src/` is byte-identical to
BASE (md5 above), so this reproduces `reviews/P20B-review-10.md` §2's gated reading rather than
extending it.

**Why the build ran in the worktree and not the shared checkout:** a `next dev` server belonging to
the human is live on `:3001` from `/home/ben-agents/Code/moneyflow` (pid 818182). A production build
in that directory would overwrite the `.next` it is serving from. I did not touch it. See §5.1.

---

## 3. F10-2 — the bounded statement, and the four optional barriers

### 3.1 The statement, written to be transcribed

**I did not instrument the suite, so I issue no count of my own.** I make no fifth exact number.

**What is swept — MEASURED, by grep at HEAD:** there are **16** `awaitVaultPersistence(` call sites
in `tests/e2e/**/*.spec.ts` — the twelve revision 10 added plus the four below — alongside every
teardown routed through `reloadPage()` or a `nav.ts` helper, which barrier internally.

**What is not swept, and this is the load-bearing half.** The **population** of raw teardowns is
larger than the barriered set. MEASURED by grep at HEAD: `tests/e2e` contains **58 lines** matching
`\.(goto|reload)\(` — **53 in `*.spec.ts`**, 5 in `helpers/`, of which **one is a comment line**
(`helpers/persistence.ts:101`), so **57 real call sites, 53 of them in spec files**. That is a count
of _call sites_, not of _in-vault teardowns_; the two are different quantities and only the first is
grep-decidable.

**How many of those raw sites tear down a document with a live vault mounted is still not
established.** The only measurements that exist are the rev-10 implementer's eleven (by reading) and
`reviews/P20B-review-10.md` §4.4's runtime instrumentation of **nine specs**, which found four more.
**The bound stands as the ledger already records it: at least fifteen, and the sweep is not
complete.** I extend it in no direction. Specifically:

- I did **not** instrument the whole suite. The specs `reviews/P20B-review-10.md` §4.4 did not
  instrument are entirely unclassified by measurement.
- Four sites are MEASURED (by that review, not by me) as **not** meeting the criterion or not
  established: `passkey.spec.ts:406`/`:468` observed `no-active-vault`, and
  `identity.spec.ts:339`/`:614` observed an **absent seam** at the teardown instant. **I barriered
  none of them.**
- The durable answer remains the lint rule tracked as `Q-P20B-30`, out of scope here.

**INFERRED, not measured:** that a barrier at a site whose seam can be genuinely absent on an
`(app)` route would spend the helper's 15s budget and then throw. I did not reproduce that hang; I
am relying on `tests/e2e/helpers/persistence.ts:23,96-98` and on
`evidence/P20B/implementation-11.md` §4.3, which reasons the same way.

**The retry-on-absence branch is load-bearing and I left it exactly as it was.** MEASURED by the
reviewer, `reviews/P20B-review-10.md` §4.4: of 137 instrumented barrier entries, **three observed an
absent seam on an `(app)` route and succeeded anyway** because the helper retried. Absence there is
sometimes a pre-hydration transient, not a defect, so the tempting simplification — throw
immediately when the seam is missing on an `(app)` route — is refuted by measurement and would have
turned three real executions red. F10-1 asked me to make the **gate** detectable, which is a unit
test (§2), not a tightening of the helper's absence handling. MEASURED,
`git diff --stat 2284945..HEAD -- tests/e2e/helpers/` is **empty**.

### 3.2 The four barriers I did add — the optional half

Each is at a site `reviews/P20B-review-10.md` §4.4 MEASURED as observing a **present seam** and
`awaitLocalPersistence()` → `"persisted"`, i.e. a live `SyncManager` at the teardown. I placed each
call **exactly where that review's probe sampled** — immediately before the `.goto(` — so the
justification and the placement measure the same instant.

| Site at BASE           | Barrier at HEAD        | Context                                                                      |
| ---------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `passkey.spec.ts:60`   | `passkey.spec.ts:62`   | inside `unlockWithPasskey()`; all four callers arrive from `/settings`       |
| `passkey.spec.ts:177`  | `passkey.spec.ts:180`  | "the recovery phrase still unlocks the same identity too"                    |
| `passkey.spec.ts:232`  | `passkey.spec.ts:236`  | "passkey unlock fails visibly rather than hanging"                           |
| `identity.spec.ts:173` | `identity.spec.ts:175` | "creating another account in the same tab does not reuse the previous vault" |

`identity.spec.ts` gained the import; `passkey.spec.ts` already had it. Barriering inside
`unlockWithPasskey()` rather than at its four call sites matches the file's own existing treatment
of `addPasskeyFromSettings()` (`passkey.spec.ts:79`), and removes the internal inconsistency
`reviews/P20B-review-10.md` §8 F10-2 named: `passkey.spec.ts` no longer barriers two sites while
leaving three of identical shape bare.

**The risk this takes, stated rather than smoothed.** `passkey.spec.ts:60` is the one site whose
measurement was mixed — `reviews/P20B-review-10.md` §4.4 records `persisted` ×2, `no-active-vault`
×1 and **absent ×1** across its four call paths. A genuinely absent seam on an `(app)` route is the
hang case. **MEASURED, it did not occur in 168 executions of the two changed specs on this tree**
(§4): 105 at `--repeat-each=5`, plus 21 apiece in each of three full-suite runs. That is evidence,
not proof — `0/168` bounds it, it does not clear it.

**No assertion was deleted, weakened or given a longer timeout**, and no `page.reload()` was removed
— MEASURED, the whole diff is 9 added lines and 1 replaced import line (§1), which D-025 condition 1
requires.

---

## 4. Validation — every run on tree `6ff7e1198a9fb5f0563a149fe17cef68`

`env -u CI`, `--retries=0`, no `--debug`/`--ui`/`--headed`/`show`, never `CI=true`. No unit test was
run beside a campaign.

### 4.1 The preserved probe — the control still bites

Probe `evidence/P21/diagnostic-Q-P20B-26-probe.spec.ts.artifact` plus arm C2, i.e.
`/tmp/p20b09-logs/zz-q26-idb.spec.ts.postfix-artifact`, md5 **`dc3c6abad2ee8dfa7502c1a7e2977eff`** —
MEASURED, identical to the md5 `evidence/P20B/implementation-11.md` §5.1 and
`reviews/P20B-review-09.md` §2.1 record. Config `/tmp/p20b09-logs/playwright.q26.config.ts.artifact`
md5 **`dc309f989d5c759d7416f3801d8839aa`**, MEASURED byte-identical to the copy in
`evidence/P21/diagnostic-Q-P20B-26-config.ts.artifact`. Port 3100, `--repeat-each=70`,
`-g "Q26 arm (C|C2|D):"`, log `/tmp/p20b-rev11/probe-70.log`.

| Arm   | Path through the harness                    | Losses on this tree |
| ----- | ------------------------------------------- | ------------------- |
| **C** | raw `page.reload()` — **untouched control** | **13 / 70 lost**    |
| C2    | reload through `reloadPage()`               | **0 / 70**          |
| D     | `goToTransactions()` then reload            | **0 / 70**          |

**210 executions, all passed, exit 0, 5.9m.** Arm C still losing is what makes the two zeros mean
anything: the instrument can still fail, and the gate has not quietly disabled the seam in dev.

**The op-count discriminator holds, MEASURED over this campaign's own verdict lines.** Arm C:
`57 bobLost=false opsAfterReload=7` and `13 bobLost=true opsAfterReload=6`. Arm C2:
`70 bobLost=false opsAfterReload=7`. Arm D: `70 bobLost=false opsAfterReload=7`. **210/210 with no
counterexample** — every loss is an op row that was never written.

**I make no cross-campaign rate comparison.** The 13 here and the 11 in
`evidence/P20B/implementation-11.md` §5.1 are counts from two campaigns; this goal has measured a
large between-campaign spread on a fixed tree, so the pair licenses nothing.

### 4.2 Suite, changed specs and frozen journey

Repo's **unmodified** `playwright.config.ts`, on **`:3000`** — not a custom port.

| Run                                                      | Result                      | Markers | Log                                    |
| -------------------------------------------------------- | --------------------------- | ------- | -------------------------------------- |
| `people-settlement.spec.ts --repeat-each=10`             | **190 / 190 passed** (5.3m) | **0**   | `/tmp/p20b-rev11/people-10x.log`       |
| `passkey.spec.ts` + `identity.spec.ts` `--repeat-each=5` | **105 / 105 passed** (3.3m) | **0**   | `/tmp/p20b-rev11/changed-specs-5x.log` |
| full suite 1                                             | **195 / 195 passed** (4.7m) | **0**   | `/tmp/p20b-rev11/full-run1.log`        |
| full suite 2                                             | **195 / 195 passed** (4.6m) | **0**   | `/tmp/p20b-rev11/full-run2.log`        |
| full suite 3                                             | **195 / 195 passed** (4.5m) | **0**   | `/tmp/p20b-rev11/full-run3.log`        |

"Markers" counts Playwright's own failure markers, `grep -cE '^ +[0-9]+\) '`, rather than the word
"failed", which matches WebServer noise and test names. **880 executions on the repo's own config on
this tree — 190 + 105 + 3 × 195 — zero failures**, plus §4.1's 210 probe executions on the probe's
own config. The suite total is **195**, unchanged from BASE — I added barrier calls, not tests, and
nothing was skipped away.

**Three green runs are a count, not a clearance.** `0/70` per fixed probe arm is a bound with a 95%
rule-of-three upper limit of **4.3%**, not a clearance. The 10-green bar, crash safety and the
residual class at unenumerated raw teardowns all remain open.

### 4.3 Cheap gates — MEASURED at HEAD `19160af`

| Gate                                        | Result                                                                                                                                          | Log                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `pnpm typecheck`                            | **exit 0**, no output                                                                                                                           | `/tmp/p20b-rev11/gate-typecheck.log`  |
| `pnpm lint`                                 | **exit 0** — 0 errors, **1 warning**: the pre-existing `react-hooks/incompatible-library` at `TransactionTable.tsx:459`, a file I did not touch | `/tmp/p20b-rev11/gate-lint.log`       |
| `pnpm exec oxfmt --check` on my three files | **exit 0** — scoped to my own files, never `specs/**`                                                                                           | `/tmp/p20b-rev11/gate-format.log`     |
| `pnpm build` (worktree, identical `src/`)   | **exit 0**; `.next/static` grep → **0 files**                                                                                                   | `/tmp/p20b-rev11/build.log`           |
| `pnpm test` run 1 (18:02)                   | **132 files passed; 2492 passed \| 2 skipped**                                                                                                  | `/tmp/p20b-rev11/unit-full.log`       |
| `pnpm test` run 2 (18:36)                   | **131 passed / 1 failed; 2491 passed \| 1 failed \| 2 skipped**                                                                                 | `/tmp/p20b-rev11/gate-unit-final.log` |

**The one unit failure, reported rather than smoothed.** Run 2's failure is
`tests/integration/realtime-origin-controls.test.ts` › "reads only its own vault's ops even when the
request claims a hostile origin" — `Error: Test timed out in 5000ms` at `:126`. **The same test
passed in run 1 on the same tree, 34 minutes earlier**, so it is intermittent here as elsewhere. It
is the out-of-scope failure the dispatch names: it fails at BASE, has no import path to this work,
and needs an owner outside P20B. I did not touch it. `duplicates.test.ts` passed in both runs; both
runs were in a quiet window with no campaign in flight.

---

## 5. Things that went differently than planned, and what I did not establish

### 5.1 The E2E campaign ran from a worktree, because a `next dev` lock blocks the shared checkout

MEASURED. My first `people-settlement` attempt from `/home/ben-agents/Code/moneyflow` died in 3
seconds with Playwright's webServer refusing to start:

```
[WebServer] ⨯ Another next dev server is already running.
[WebServer] - Local:  http://localhost:3001
[WebServer] - PID:    818182
[WebServer] - Dir:    /home/ben-agents/Code/moneyflow
```

`:3000` was free at that moment — MEASURED, `ss -ltn` showed only `:3001`. The lock is per project
directory, not per port. **That server is the human's and I did not touch it**, per the standing
`:3001` constraint. I re-ran from `/tmp/mf-p20b-rev11-mut`, which has its own `.next`, using **the
repository's own `playwright.config.ts` on `:3000`** — MEASURED, the worktree's tree digest is
`6ff7e1198a9fb5f0563a149fe17cef68`, identical to the shared checkout at HEAD. The probe run, which
started before this and uses its own `:3100` config, was unaffected. `.env.local` was copied into
the worktree; `node_modules` was installed with `pnpm install`, never copied.

### 5.2 What this revision does not establish

- **No crash-safety claim is made or implied anywhere in this revision.** Component 2 is OUT-OF-GOAL
  by `DECISIONS.md#D-025`, whose ID note also records the renumbering from the duplicated `D-021`.
- **The in-vault sweep is still incomplete** (§3.1). The bound is "at least fifteen; the sweep is
  not complete", unchanged by this revision.
- **`0/880` E2E and `0/70` per probe arm are bounds, not clearances.** The 10-green full-suite bar
  is untouched by three runs.
- **The hang risk at `passkey.spec.ts:62` is bounded by execution, not by argument** (§3.2).
- I ran **no manual browser session**; the dispatch scopes this revision to one test and one
  corrected sentence, and nothing in the diff is user-visible.

---

## 6. For root to transcribe

1. **F10-1 is remediated and proved by mutation in both directions** — gate deleted → the named new
   test red; restored → green; inverted → seven red. Log `/tmp/p20b-rev11/mutation-proof.log`.
2. **F10-2's record is corrected as a bound, not a fifth number.** The ledger's "at least fifteen;
   the sweep is not complete" stands unchanged. I did not instrument the suite and issue no count of
   in-vault teardowns. The grep-decidable population is **57 raw `.goto(`/`.reload(` call sites in
   `tests/e2e`, 53 of them in spec files**, against **16** `awaitVaultPersistence(` call sites — a
   count of call sites, not of in-vault teardowns.
3. **The four measured sites are barriered; the four measured-unsafe ones are not.**
   `passkey.spec.ts:406`/`:468` and `identity.spec.ts:339`/`:614` were deliberately left alone.
4. **A `next dev` lock in the repo directory blocks Playwright's webServer even when `:3000` is
   free** (§5.1) — worth recording for the next agent, who will otherwise read the 3-second failure
   as a port collision.
5. **`realtime-origin-controls.test.ts` is intermittent, not deterministic** — it passed and failed
   on the same tree 34 minutes apart (§4.3). It still needs an owner outside P20B.
