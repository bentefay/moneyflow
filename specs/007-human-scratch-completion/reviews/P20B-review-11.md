# P20B revision 11 — remediating F10-1 and F10-2 of `reviews/P20B-review-10.md` — Independent Review

- **Reviewer:** `p20b-reviewer-11` — distinct from `p20b-implementer-11` and from
  `p20b-reviewer-01`, `-02`, `-03`, `-06`, `-07`, `-08`, `-09`, `-10`. I wrote none of this code.
- **Package / revision:** P20B, revision 11.
- **Evidence reviewed:** `evidence/P20B/implementation-12.md`, uncommitted on disk by design
  (`PROCESS.md:58`), md5 **`82dfe88606c1bab5a46df6b5a5fc005c`** — MEASURED, identical to the value
  root recorded after the mid-review §3.2 amendment, so I read the current text.
- **Date:** 2026-08-03.

**Reading convention.** Every claim is tagged **MEASURED** (I ran the command in this session, in
the message that quotes its output) or **INFERRED** (read from source with no discriminating
execution of my own). **A bare `§` points at a section of THIS file; every reference to another
document names that document first.** I re-derived every literal I was given rather than relaying
it, including every figure in the dispatch. My logs are under `/tmp/p20b-rev11-review/`; my worktree
is `/tmp/mf-p20b-rev11-review`, outside the repository. I committed nothing and wrote exactly one
file: this one.

---

# VERDICT

# FAIL

**One MEDIUM finding. Everything the dispatch required is remediated, and I reproduced each
remediation independently, in both directions.** The finding is a sentence this revision newly
committed, not a defect in what it was asked to fix. The remedy is one comment line.

- **F10-1 is fixed, and the guard is demonstrably able to fail.** MEASURED by mutation in my own
  worktree: gate present → **8 passed**; gate line deleted → **1 failed / 7 passed**, the failure
  being the named new test; restored → **8 passed**; gate inverted `===` → `!==` → **7 failed / 1
  passed**, including `"installs outside a production build"`; restored → **8 passed** (§2).
  MEASURED on three builds of my own: gated → **0** files under `.next/static`; gate line alone
  removed → **1**, the same chunk `reviews/P20B-review-10.md` §2 named; regated → **0** (§3).
- **F10-2's record is corrected, and the correction is honest.** I re-derived **every** number in
  `evidence/P20B/implementation-12.md` §3.1 and they are all exact (§4). It issues no fifth count,
  labels its quantity as call sites rather than in-vault teardowns, and leaves the ledger's bound
  untouched. **No sentence in it drifts back into a completeness claim.**
- **The four optional barriers landed at exactly the four measured sites, and none of the four
  measured-unsafe sites was touched** — MEASURED independently from the literal diff and from both
  trees (§5).
- **D-025's two conditions hold** (§10). `git diff --name-only BASE..HEAD -- src` is empty; no
  assertion was deleted, weakened or given a longer timeout; frozen step 9's reload is intact.

The finding is:

- **F11-1 (Medium).** The comment this revision committed at `tests/e2e/passkey.spec.ts:60-61`
  states a **universal** — _"Every caller arrives from a settings page whose vault is still
  mounted"_ — that measurement contradicts. **MEASURED by my own runtime instrumentation at that
  exact line: of 12 entries, only 6 observed a mounted vault**; 2 observed the seam installed and
  `awaitLocalPersistence()` → `no-active-vault`, and 4 observed an absent seam. This reproduces and
  strengthens `reviews/P20B-review-10.md` §4.4's independent reading of the same site (`persisted`
  ×2, `no-active-vault` ×1, absent ×1). It is the same class of defect as
  `reviews/P20B-review-09.md`'s F-3, which this package was failed for, now in a new file (§6, §11).

**What I am explicitly not doing.** I am not reopening the gate design, the barrier helper, the
route-segment guard, the twelve pre-existing barrier calls, or the breadth judgement — all settled
by `reviews/P20B-review-10.md` and confirmed here. I make no crash-safety claim and found none to
reject. I make **no cross-campaign rate comparison** anywhere in this file.

---

## 0. Range, ancestry and tree integrity — MEASURED

| Item                    | Value                                                             |
| ----------------------- | ----------------------------------------------------------------- |
| **BASE**                | `2284945f86f81b10438ac15326b02d63a1fd91c8`                        |
| **HEAD**                | `19160af72b1edaf6c0c0de1c159b1b767a4d1a6a`                        |
| Commits in range        | `5ebe933fe86915cdfaf496a7f7f6e0954a4eab47`, `19160af…`            |
| Shared-checkout HEAD    | `ad0391f60172813e7ab25d14834acd80dabcde88` at the time of writing |
| **Tree digest at HEAD** | **`6ff7e1198a9fb5f0563a149fe17cef68`**                            |
| Seam file md5           | `50cc87bb90b7bc781e01b7b4104b2455`                                |

**Ancestry, re-derived rather than carried.** MEASURED, `git merge-base --is-ancestor` returns exit
0 for **both** `5ebe933` and `19160af` against the live HEAD. Neither is an orphan of an amend. I
re-derived both full hashes with `git rev-parse` before reading any diff, as the dispatch requires.

**HEAD moved twice while I worked and it disturbs nothing.** MEASURED: HEAD was `5f85b8a` when I
started, then `ad0391f`. `git diff --name-only 19160af..HEAD` is **one file,
`specs/007-human-scratch-completion/PROGRESS.md`**, and
`git diff --name-only 19160af..HEAD -- src tests` is **empty**. My worktree is pinned at `19160af`
by `git worktree add --detach`, so the campaign cannot have drifted with it.

**Digest constancy.** MEASURED, the digest command
`find src tests/e2e -type f \( -name '*.ts' -o -name '*.tsx' \) | sort | xargs md5sum | awk '{print $1}' | md5sum`
returns `6ff7e1198a9fb5f0563a149fe17cef68` in my worktree, **identical to the value
`evidence/P20B/implementation-12.md` §0 records**, so pooling green executions across the two
campaigns is legitimate. All **eight** START/END lines of my campaign carry it
(`/tmp/p20b-rev11-review/campaign-index.log`), and it returned to that value after **every**
experiment below — the five-step mutation, the three builds, the two instrumented runs and the probe
re-run.

**Worktree hygiene.** `git worktree add --detach /tmp/mf-p20b-rev11-review 19160af`; untracked
`.env.local` copied in; `pnpm install --frozen-lockfile` (`/tmp/p20b-rev11-review/pnpm-install.log`)
— **never `cp -a node_modules`**. In the shared checkout I ran only read-only commands.

**Range contents, MEASURED from the literal diff:**

| Commit    | Files                                                                  | Change                           |
| --------- | ---------------------------------------------------------------------- | -------------------------------- |
| `5ebe933` | `tests/unit/sync/local-persistence-seam.test.ts`                       | +26 lines — the F10-1 guard      |
| `19160af` | `tests/e2e/passkey.spec.ts` (+5), `tests/e2e/identity.spec.ts` (+5/−1) | the four optional F10-2 barriers |

Three files, 35 insertions, 1 deletion. **The single deleted line is the `identity.spec.ts` import
line, replaced by the same line plus `awaitVaultPersistence`.** MEASURED,
`git diff BASE..HEAD | grep -c '^-.*expect('` is **0**. All three paths are inside the dispatch's
authorized set (`dispatches/P20B-rev11-fix.md:85-89`), and the evidence file is **untracked** —
MEASURED, `git log -1 -- …/implementation-12.md` is empty, so it was written and not committed, per
`PROCESS.md:58`.

## 1. Verification gates — MEASURED, run strictly serially in my worktree

Nothing else was running during either unit run; `tests/unit/import/duplicates.test.ts` asserts on a
wall-clock ratio and fails beside load. **No unit test was run beside my E2E campaign.**

| Gate                                         | Result                                                                                                 | Log                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `pnpm typecheck`                             | **exit 0**, no output                                                                                  | `/tmp/p20b-rev11-review/gate-typecheck.log` |
| `pnpm lint`                                  | **exit 0** — 0 errors, **1 warning**, the pre-existing `react-hooks` one at `TransactionTable.tsx:459` | `/tmp/p20b-rev11-review/gate-lint.log`      |
| `pnpm exec oxfmt --check` on the three files | **exit 0** — scoped to the changed files, never `specs/**`, never bare `pnpm format`                   | `/tmp/p20b-rev11-review/gate-format.log`    |
| `pnpm test` run 1                            | 132 files; **2491 passed / 1 failed / 2 skipped (2494)**                                               | `/tmp/p20b-rev11-review/unit1.log`          |
| `pnpm test` run 2                            | 132 files; **2491 passed / 1 failed / 2 skipped (2494)**                                               | `/tmp/p20b-rev11-review/unit2.log`          |

**The two failures are the two pre-classified ones, one each, and neither is this revision's.** Run
1 failed `tests/unit/import/duplicates.test.ts` › "scales linearly with input size"; run 2 failed
`tests/integration/realtime-origin-controls.test.ts` › "reads only its own vault's ops even when the
request claims a hostile origin". I report counts only and make no rate claim.

**A consistency check the counts pass, and it is the one that matters here.**
`reviews/P20B-review-10.md` §1 measured **132 files and 2492 tests** at that revision's HEAD. I
measure **132 files and 2494 tests** — **exactly +2 tests and +0 files**, which is the two new gate
cases and nothing else. No test was removed, renamed away or skipped.

## 2. F10-1 — the gate is now guarded, and I reproduced the proof in both directions

Log `/tmp/p20b-rev11-review/mutation-proof.log`. Run in my worktree, never in the shared checkout.
Command each step: `env -u CI pnpm exec vitest run tests/unit/sync/local-persistence-seam.test.ts`.
The mutated line is the one the finding names, `src/lib/sync/local-persistence-seam.ts:60`.

| Step | Mutation                                              | Result                   |
| ---- | ----------------------------------------------------- | ------------------------ |
| A    | none — gate present                                   | **8 passed**             |
| B    | **gate line deleted** (`git diff --stat`: 1 deletion) | **1 failed \| 7 passed** |
| C    | gate restored                                         | **8 passed**             |
| D    | gate **inverted**, `===` → `!==`                      | **7 failed \| 1 passed** |
| E    | restored; digest back to `6ff7e119…`, md5 `50cc87bb…` | **8 passed**             |

**Step B's single failure is the named new test, and it fails on the right assertion** — MEASURED
from the log:

```
× installs nothing in a production build 4ms
FAIL  tests/unit/sync/local-persistence-seam.test.ts > installLocalPersistenceSeam > installs nothing in a production build
AssertionError: expected { …(1) } to be undefined
```

**Step D's seven failures include `"installs outside a production build"`** — MEASURED, the log
lists it by name. That is the case the production test alone cannot distinguish, and it is why the
pair is not redundant. Deletion and inversion are genuinely different mutations here: deletion turns
**one** test red, inversion turns **seven**.

**One thing worth recording so 7-of-8 is not read as exhaustive.** MEASURED, the single test that
survives inversion is `"leaves a newer installation's seam alone when an older one tears down"`, and
it survives **vacuously**: with the gate inverted, both installs return early, so `secondSeam` is
`undefined` and `expect(window.__moneyflowLocalPersistence).toBe(secondSeam)` compares `undefined`
to `undefined`. That is a property of that pre-existing test, not of this revision's work, and it is
not a finding — I record it only so nobody later reads "7 of 8" as meaning the eighth was checked.

**This is the direction the finding demanded.** Before this revision the same deletion left
typecheck, lint, format and the whole unit suite green — MEASURED by `p20b-reviewer-10` and recorded
in `reviews/P20B-review-10.md` §8 F10-1. It now turns a named test red, and I did not take that on
trust.

## 3. The production bundle — MEASURED on three builds of my own, and the grep discriminates

A grep returning zero proves nothing unless the instrument can find the property when it is there,
so I built all three trees rather than only the gated one. `rm -rf .next` before each. Log
`/tmp/p20b-rev11-review/build-proof.log`.

| Tree                                     | `grep -rl "__moneyflowLocalPersistence" .next/static` | Build  |
| ---------------------------------------- | ----------------------------------------------------- | ------ |
| HEAD, gated                              | **0 files**                                           | exit 0 |
| HEAD with **only** the gate line removed | **1 file — `.next/static/chunks/2kti1-ybxn-5f.js`**   | exit 0 |
| gate restored, rebuilt                   | **0 files**                                           | exit 0 |

The middle row is the whole point, and it is **the same chunk** `reviews/P20B-review-10.md` §2 named
— so the gate is what removes the property, not a change of bundler layout. Afterwards the seam md5
was `50cc87bb90b7bc781e01b7b4104b2455` and the tree digest `6ff7e1198a9fb5f0563a149fe17cef68`.

**The residual is unchanged and remains the one `reviews/P20B-review-10.md` §2.1 measured as
unserved.** MEASURED at HEAD: the string appears **once anywhere under `.next`**, in
`.next/server/chunks/ssr/src_app_(app)_layout_tsx_1yu5hom._.js.map`, and `.next/static` contains
**0** source maps. `src/` is byte-identical to that revision's, so I reproduce that reading rather
than extending it; I did not re-run the six-URL HTTP probe.

**Why the build ran in my worktree:** a production build in the shared checkout would overwrite the
`.next` the human's dev server is serving from. I did not touch it.

## 4. F10-2 — every number in the corrected statement re-derived, and the framing is honest

MEASURED at HEAD, in my worktree, by grep:

| Quantity in `evidence/P20B/implementation-12.md` §3.1             | My re-derivation | Agrees |
| ----------------------------------------------------------------- | ---------------- | ------ |
| lines matching `\.(goto\|reload)\(` under `tests/e2e`             | **58**           | yes    |
| …of which in `*.spec.ts`                                          | **53**           | yes    |
| …of which in `helpers/`                                           | **5**            | yes    |
| …of the helper five, comment lines (`helpers/persistence.ts:101`) | **1**            | yes    |
| ⇒ **real call sites**                                             | **57**           | yes    |
| `awaitVaultPersistence(` call sites in `tests/e2e/**/*.spec.ts`   | **16**           | yes    |
| raw `.reload(` in spec files                                      | **0**            | —      |

**The claim that the helpers barrier internally is true, and I checked it rather than accepting
it.** MEASURED by reading: every `nav.ts` navigator routes through `gotoAfterPersistence`
(`tests/e2e/helpers/nav.ts:18-21`), which calls `awaitVaultPersistence` before `page.goto`; and
`reloadPage` (`tests/e2e/helpers/persistence.ts:102-105`) does the same before `page.reload`. The
two remaining raw helper call sites are `helpers/auth.ts:14` (`/new-user`, outside `(app)`) and
`helpers/presence.ts:77` (a `context.newPage()` that has never had a vault), so neither is a
teardown of a live document. **INFERRED, from reading those two call sites; I did not instrument
them.**

**The framing is honest, sentence by sentence.** §3.1 of that document opens _"I did not instrument
the suite, so I issue no count of my own. I make no fifth exact number."_; labels its quantity _"a
count of call sites, not of in-vault teardowns"_; says plainly _"How many of those raw sites tear
down a document with a live vault mounted is still not established"_; and closes _"The bound stands
as the ledger already records it: at least fifteen, and the sweep is not complete. I extend it in no
direction."_ **I found no sentence anywhere in the document that drifts back into a completeness
claim**, which is what F10-2 was raised against. It also names, correctly, the four sites it did not
barrier and why.

**The retry branch is untouched.** MEASURED, `git diff --stat BASE..HEAD -- tests/e2e/helpers/` is
empty and `git diff BASE..HEAD -- tests/e2e/helpers/ | wc -l` is **0**. Nothing was simplified to
"absent on an app route ⇒ throw immediately", which `reviews/P20B-review-10.md` §4.4 refuted by
measurement. §6 below adds a fresh, independent measurement that the branch is load-bearing.

## 5. The four barriers landed where measured, and the four excluded sites are untouched

MEASURED, from both trees.

| `reviews/P20B-review-10.md` §4.4 site at BASE | Barrier at HEAD        | Teardown it guards, on the next line |
| --------------------------------------------- | ---------------------- | ------------------------------------ |
| `passkey.spec.ts:60`                          | `passkey.spec.ts:62`   | `page.goto("/unlock")` at `:63`      |
| `passkey.spec.ts:177`                         | `passkey.spec.ts:180`  | `page.goto("/unlock")` at `:181`     |
| `passkey.spec.ts:232`                         | `passkey.spec.ts:236`  | `page.goto("/unlock")` at `:237`     |
| `identity.spec.ts:173`                        | `identity.spec.ts:175` | `page.goto("/new-user")` at `:176`   |

At all four the barrier's argument is the ambient `page`, which is the receiver of the teardown it
guards, and each sits **immediately before** the `.goto(` — the instant `reviews/P20B-review-10.md`
§4.4's probe sampled, including its position _after_ the `sessionStorage.clear()` in the two
`test.step` cases. The 16 sites are the 12 that existed at BASE plus these 4 — MEASURED,
`git grep -c "awaitVaultPersistence(" 2284945 -- 'tests/e2e/*.spec.ts'` is **12**.

**The four measured-unsafe sites appear in no hunk.** MEASURED two ways: the diff's hunk headers are
`@@ -7,7 +7,7 @@` and `@@ -170,6 +170,9 @@` for `identity.spec.ts` and `@@ -57,6 +57,9 @@`,
`@@ -174,6 +177,7 @@`, `@@ -229,6 +233,7 @@` for `passkey.spec.ts` — none of which covers BASE
`passkey.spec.ts:406`/`:468` or `identity.spec.ts:339`/`:614`; and at HEAD those four lines, now
shifted to `passkey.spec.ts:411`/`:473` and `identity.spec.ts:342`/`:617`, are still bare
`page.goto("/unlock")` with no preceding barrier. **The prohibition in `reviews/P20B-review-10.md`
§8 F10-2 was followed exactly.**

**Placing the barrier inside `unlockWithPasskey()` rather than at its four call sites is the right
call and matches the file.** MEASURED, `addPasskeyFromSettings()` already barriers internally at
`passkey.spec.ts:79`. It also removes the internal inconsistency F10-2 named.

## 6. My own instrumented measurement — where the finding comes from

In my worktree only, I inserted a **non-asserting** probe at the top of `awaitVaultPersistence` that
records, at the instant the real barrier starts, the document's pathname, whether the seam is
installed, what `awaitLocalPersistence()` returns, and the caller's stack frame. Instrumented digest
`4d19198949a56f47796776f10073eb84`; restored afterwards to `6ff7e1198a9fb5f0563a149fe17cef68` with
`git status --porcelain -- src tests` empty. Logs `/tmp/p20b-rev11-review/instrumented-passkey.log`
and `/tmp/p20b-rev11-review/instrumented-identity.log`.

Runs: `tests/e2e/passkey.spec.ts --retries=0 --repeat-each=3` → **36 passed**;
`tests/e2e/identity.spec.ts --retries=0 --repeat-each=3` → **27 passed**. Entry counts match the
call-graph exactly — 12 entries at `passkey.spec.ts:62` is 4 callers × 3 repeats — which is what
confirms the frame attribution is right.

| Barrier site                     | present + `persisted` | present + `no-active-vault` | seam absent | entries |
| -------------------------------- | --------------------- | --------------------------- | ----------- | ------- |
| `passkey.spec.ts:62` **(new)**   | **6**                 | **2**                       | **4**       | **12**  |
| `passkey.spec.ts:180` **(new)**  | 0                     | **3**                       | 0           | 3       |
| `passkey.spec.ts:236` **(new)**  | 3                     | 0                           | 0           | 3       |
| `identity.spec.ts:175` **(new)** | 3                     | 0                           | 0           | 3       |
| `passkey.spec.ts:79` (rev 10)    | 3                     | 8                           | 1           | 12      |
| `passkey.spec.ts:434` (rev 10)   | 0                     | 0                           | **3**       | 3       |
| `reloadPage` (identity run)      | 3                     | 0                           | 0           | 3       |

Every entry resolved on the path the classification assumed — all `passkey.spec.ts:62` entries were
on `/settings`, all `:180` entries on `/transactions`.

**Three consequences, in order of weight.**

1. **The universal in the committed comment is false.** `no-active-vault` means the seam is
   installed but `readActiveManager()` returned `null` — MEASURED from source,
   `vault-provider.tsx:95` passes `() => syncManagerRef.current` and `local-persistence-seam.ts:66`
   returns `"no-active-vault"` when that is null, i.e. **provider mounted, no live `SyncManager`**.
   That is exactly the reading `reviews/P20B-review-10.md` §4.4 used to classify
   `passkey.spec.ts:406`/`:468` as **not** in-vault. So at `passkey.spec.ts:62` only **6 of 12**
   entries had a mounted vault. This is F11-1 (§11).
2. **The retry-on-absence branch is load-bearing at the newly barriered sites too, and this is a
   fresh measurement rather than a restatement.** **4 of 12** entries at the new
   `passkey.spec.ts:62` and **3 of 3** at rev 10's `passkey.spec.ts:434` observed an absent seam on
   an `(app)` route and every one recovered — all 63 executions passed, zero hangs, zero throws.
   That independently confirms `reviews/P20B-review-10.md` §4.4's 3-of-137 at a much higher rate,
   and it directly refutes the "throw immediately" simplification the dispatch warned against.
3. **The in-vault predicate is not a stable property of a call site.** At `passkey.spec.ts:180` I
   measured **3/3 `no-active-vault`** where `reviews/P20B-review-10.md` §4.4's single sample of the
   pre-barrier site measured `persisted`. I do not claim that review was wrong — I claim the
   quantity varies with path and load. **This is decision-relevant for root and is the basis of the
   question proposal in §14.** It is **not** a defect in this revision: the implementer barriered
   exactly the sites it was authorised to, and a `no-active-vault` barrier is a no-op that costs one
   `evaluate` and asserts nothing.

## 7. My own E2E campaign — MEASURED, on the repo's unmodified config on `:3000`

`env -u CI`, `--retries=0`, `--reporter=line` (the repository's own convention,
`.claude/skills/e2e/SKILL.md:20-23`), **no port override**, no `--debug`/`--ui`/`--headed`/`show`.
Run from my worktree, because Next 16's dev lock is project-directory-scoped — I did not attempt a
run from the shared checkout. Index `/tmp/p20b-rev11-review/campaign-index.log`.

| Run                                         | Result                      | Failure markers | Log              |
| ------------------------------------------- | --------------------------- | --------------- | ---------------- |
| full suite 1                                | **195 / 195 passed** (4.6m) | **0**           | `full-run1.log`  |
| full suite 2                                | **195 / 195 passed** (4.5m) | **0**           | `full-run2.log`  |
| full suite 3                                | **195 / 195 passed** (4.5m) | **0**           | `full-run3.log`  |
| `passkey.spec.ts` + `identity.spec.ts` `×5` | **105 / 105 passed** (3.4m) | **0**           | `changed-5x.log` |

**690 executions on the repo's own config, zero failures.** "Markers" counts Playwright's own
failure markers, `grep -cE '^ +[0-9]+\) '`, rather than the word "failed", which matches WebServer
noise and test names. **The suite total is 195, unchanged from BASE** — barrier calls were added,
not tests.

**The hang risk at the newly barriered `passkey.spec.ts:62` is bounded further, not argued away.**
MEASURED, `passkey.spec.ts` ran **96** times in this clean campaign (12 tests × (3 + 5)), of which
the four tests calling `unlockWithPasskey` contribute **32** entries at that barrier, plus the 12
instrumented entries in §6. Zero hangs, zero barrier-attributable failures. Pooling with the
implementer's 168 executions is legitimate because the tree digest is identical (§0) — but this is a
**count, not a clearance**, and I make no rate claim from it.

**Three green full-suite runs are a count, not a clearance.** The 10-green bar is untouched by this
campaign. `transactions.spec.ts:573` did not fail for me at all.

## 8. The preserved probe — re-run independently, and the control still bites

I re-ran it rather than relying on transcription. Artifacts copied into my worktree and removed
afterwards; MEASURED md5s **identical to those `evidence/P20B/implementation-12.md` §4.1 and
`reviews/P20B-review-09.md` §2.1 record**: probe-plus-arm-C2 `dc3c6abad2ee8dfa7502c1a7e2977eff`,
config `dc309f989d5c759d7416f3801d8839aa` (and that config is byte-identical to the committed
`evidence/P21/diagnostic-Q-P20B-26-config.ts.artifact`). Port **3100**, its own config,
`--repeat-each=70`, `-g "Q26 arm (C|C2|D):"`, `--retries=0`. Log
`/tmp/p20b-rev11-review/probe-70.log`.

| Arm   | Path through the harness                    | Losses on this tree |
| ----- | ------------------------------------------- | ------------------- |
| **C** | raw `page.reload()` — **untouched control** | **15 / 70 lost**    |
| C2    | reload through `reloadPage()`               | **0 / 70**          |
| D     | `goToTransactions()` then reload            | **0 / 70**          |

**210 executions, 210 passed, 0 failure markers, 5.6m.** Arm C still losing is what makes the two
zeros mean anything: the instrument can still fail, so the gate has not quietly disabled the seam in
dev. **The op-count discriminator holds 210/210 with no counterexample** — every `bobLost=true` is
`opsAfterReload=6` and every `bobLost=false` is `opsAfterReload=7`.

**I make no cross-campaign rate comparison.** My 15 and the 13 in
`evidence/P20B/implementation-12.md` §4.1 are counts from two campaigns; this goal has measured a
large between-campaign spread on a fixed tree, so the pair licenses nothing and I draw nothing from
it. The digest was `35fe9945bc89e67c51d05f56b8bb7ca9` with the probe files present and returned to
`6ff7e1198a9fb5f0563a149fe17cef68` after removing them.

## 9. Manual browser verification — PERFORMED

The dispatch pre-authorised this and I completed it. **Ordering respected:** the campaign finished
and `ss -ltn` showed `:3000` released before the dev server started; they never overlapped. Session
`p20b11rev`, unique and disposable, driven with the repository-installed `pnpm exec playwright-cli`
— no MCP, no `npx`, no ad-hoc script, no temporary spec or config, no headed mode. Server:
`pnpm dev -p 3000` from my own worktree, `SUPABASE_JWT_SECRET` derived from the running Realtime
container by the same routine `playwright.config.ts:5-47` uses, held only in a shell variable and
never printed. Server log `/tmp/p20b-rev11-review/devserver.log`.

**The route invariant the barrier depends on, measured in my own hands:**

| State                                             | `window.__moneyflowLocalPersistence` | `awaitLocalPersistence()` |
| ------------------------------------------------- | ------------------------------------ | ------------------------- |
| `/` (landing)                                     | **absent**                           | —                         |
| `/settings` after vault creation                  | **present**                          | `"persisted"`, 0 ms       |
| `/unlock` after reload with the session cleared   | **absent**                           | —                         |
| second tab requesting `/transactions`, no session | **absent** (redirected to `/unlock`) | —                         |

`Object.getOwnPropertyNames(seam)` is exactly `["awaitLocalPersistence"]` — the surface reaches no
key, document or manager. **I record no CVE-shaped finding; there is no vulnerability here.**

**The measurement that bears on §6.** On `/settings` I ran `sessionStorage.clear()` — the exact
pattern that immediately precedes the new barriers at `passkey.spec.ts:180` and `:236` — and then
sampled the seam seven times over about 4.75 s. **All seven reported seam present, `"persisted"`,
with `sessionKeys: 0`.** So in a quiet single-tab browser, clearing the session does not by itself
unmount the vault, corroborating `reviews/P20B-review-10.md` §6. Read together with §6's
`no-active-vault` observations under four-worker parallel load, **the honest conclusion is that the
state at these sites is timing-dependent, not that either measurement is wrong** — which is
precisely why the committed universal cannot stand.

**Console and network.** `console` reports **2 messages, 0 errors, 0 warnings** (React DevTools
notice and `[HMR] connected`). Every request returned **200 or 304**; there were no failed requests
and no unhandled rejection in this session.

**Clauses that are vacuous rather than skipped.** Deterministic accessible role/name/state snapshots
of _changed_ controls, contrast ratios, zoom/reflow, dark/reduced-motion and responsive sizes
(`PROCESS.md:172-176`): MEASURED, the diff touches **three test files only** — no component markup,
no styling, no rendered control, and `git diff --name-only BASE..HEAD -- src` is empty — so there is
no changed control to snapshot and no changed colour to measure. The checkpoint qualifies these as
_task-relevant_. I covered the two that are: refresh/persistence and multiple tabs (table above),
plus isolated users implicitly through the suite's own contexts.

**Cleanup verified by state, not by exit code.** `close` then `delete-data`; the `.playwright-cli`
artifact directory was removed; the browser process (pid 935349) is gone. The dev server was killed
**by pid** after `readlink /proc/<pid>/cwd` confirmed all three pids had cwd
`/tmp/mf-p20b-rev11-review`, and `ss -ltn` then showed `:3000` released.

## 10. D-025's two conditions — both hold, MEASURED

**Condition 1 — not a suppression.** MEASURED from the literal diff:

- **Zero** removed `expect(` lines. The **only** removed line in the entire range is the
  `identity.spec.ts` import line, replaced by the same import plus one specifier.
- **Zero** added lines under `tests/e2e/` contain `timeout`. No assertion was given a longer budget.
- `reloadPage` still has **22** call sites in `tests/e2e/*.spec.ts`, unchanged.
- **Frozen step 9 is intact:** `people-settlement.spec.ts:345` is
  `await test.step("9. reload and verify allocations and settlement persist", …)` with
  `await reloadPage(page);` at `:346`.

**Condition 2 — no allocation product-behaviour change.** MEASURED,
`git diff --name-only 2284945..19160af -- src` is **empty** and the range touches exactly three test
files. `src/lib/sync/local-persistence-seam.ts` is byte-identical at BASE and HEAD, md5
`50cc87bb90b7bc781e01b7b4104b2455`. **No ownership flip to P16A–E arises**, and I explicitly reach
that conclusion rather than assuming it.

## 11. Finding

### F11-1 — MEDIUM — Requirements / accuracy — the comment this revision committed states a universal that measurement contradicts

- **Where:** `tests/e2e/passkey.spec.ts:60-61`, added by `19160af`:

    ```
    // Every caller arrives from a settings page whose vault is still mounted, so this navigation is
    // a teardown of a live document.
    ```

- **Finding.** The second clause is a **universal over the four callers**, and it is false.
  **MEASURED by my own runtime instrumentation at that exact line (§6,
  `/tmp/p20b-rev11-review/instrumented-passkey.log`): of 12 entries — 4 callers × 3 repeats — only 6
  observed a mounted vault.** Two observed the seam **installed** with `awaitLocalPersistence()` →
  **`no-active-vault`**, which by this package's own established reading
  (`reviews/P20B-review-10.md` §4.4, which used it to classify `passkey.spec.ts:406`/`:468` as _not_
  in-vault) means **provider mounted, no live `SyncManager`** — MEASURED from source at
  `vault-provider.tsx:95` and `local-persistence-seam.ts:66`. Four more observed an **absent** seam,
  which that review's convention treats as not established. `reviews/P20B-review-10.md` §4.4 reached
  the same conclusion independently at the same site before the barrier existed: `persisted` ×2,
  `no-active-vault` ×1, **absent ×1**. **Two independent instrumentations, months of samples apart
  in method, both contradict "Every caller."** The first clause — _"arrives from a settings page"_ —
  **is** true: MEASURED, all 12 entries resolved on `/settings`.
- **Why this is Medium and not a nit.** First, this is the defect class this package has already
  been failed for by name: `reviews/P20B-review-09.md`'s **F-3** was a false universal in a
  committed comment, and `reviews/P20B-review-10.md` §4.1 verified its removal as a remediation
  criterion (_"The universal is gone"_). Passing a newly committed universal about the **same
  predicate** would apply two standards to one package — the exact reasoning that made F10-1 Medium.
  Second, the comment is load-bearing for a future author: it is the stated justification for
  barriering inside a shared helper, so the next person adding a caller to `unlockWithPasskey()`
  will read it as establishing that every path is in-vault, when half the measured entries are not.
  Third, the in-vault enumeration is the one quantity this goal is actively trying to state as a
  **bound**, and the code now carries an **unbounded** claim about one of the very sites in it.
- **This is not concealment, and I want that on the record.** `evidence/P20B/implementation-12.md`
  §3.2 states the mixed measurement plainly — _"`passkey.spec.ts:60` is the one site whose
  measurement was mixed — `persisted` ×2, `no-active-vault` ×1 and absent ×1 across its four call
  paths"_. **The committed comment is stronger than the evidence written to justify it**, and it is
  the comment that survives into the repository with no qualification beside it.
- **Reproduction.** In a throwaway worktree at HEAD, add a non-asserting probe at the top of
  `awaitVaultPersistence` in `tests/e2e/helpers/persistence.ts` that records `location.pathname`,
  whether `window.__moneyflowLocalPersistence` is present, the awaited result, and
  `new Error().stack`'s caller frame; then
  `env -u CI pnpm exec playwright test tests/e2e/passkey.spec.ts --retries=0 --repeat-each=3` and
  group the emitted lines by caller. My log is `/tmp/p20b-rev11-review/instrumented-passkey.log`;
  `grep PROBE11` it.
- **Fix — one line, and deliberately not "remove the barrier".** Rewrite the comment so it claims
  only what is measured: that these callers navigate away from `/settings`, that **some** of them
  have a live vault at that instant, and that the barrier is therefore placed in the helper to cover
  all four — resolving immediately where no vault is mounted. **Do not** move the barrier to the
  call sites, **do not** drop it from any of the four, and **do not** substitute another universal.
  A sentence that names the measurement (`reviews/P20B-review-10.md` §4.4 and §6 of this file)
  rather than quantifying over callers is what makes it durable.

## 12. Things I checked and am deliberately not reporting as findings

Recorded so nobody re-litigates them, and so it is clear they were examined rather than missed.

- **Component 2 / crash safety.** OUT-OF-GOAL by `DECISIONS.md#D-025`. I searched the diff, the
  commit messages and the evidence and found **no sentence claiming crash safety**, so I reject none
  because none exists. I make no claim about it myself.
- **`tests/integration/realtime-origin-controls.test.ts`.** Intermittent; failed my run 2 and passed
  my run 1 on one tree (§1). No import path to anything changed. Root has directed that the revision
  not be failed for it and I am not doing so.
- **`tests/unit/import/duplicates.test.ts`.** Wall-clock ratio assertion; failed my run 1, passed
  run 2. No rate claim. I ran no unit tests beside my E2E campaign.
- **`format:check` under `specs/**`** and the **one lint warning** at `TransactionTable.tsx:459` —
  both pre-existing, both untouched by this range.
- **`transactions.spec.ts:573`.** Zero failure markers across my three full-suite runs; absent from
  this review, consistent with `reviews/P20B-review-10.md` §5 measuring it as **not** a lost write.
- **The 15 s budget and the retry-on-absence branch.** Not a hidden retry under
  `PROCESS.md:167-168`: it converges a documented race and fails loudly at the budget. §6 measures
  it doing real work at 7 of 63 barrier entries, which is the strongest evidence yet that it is not
  padding.
- **`passkey.spec.ts:180` being 3/3 `no-active-vault` in my instrumentation.** Not a defect in this
  revision (§6, consequence 3): the implementer barriered a site it was explicitly authorised to
  barrier, and a barrier there is a no-op, not a hazard. It is transcription material (§13) and a
  question proposal (§14), not a finding.
- **The `identity.spec.ts:173-174` comment**, the other one this revision added. MEASURED, **3/3
  present + `persisted`** at that site (§6), and the comment is site-specific rather than universal.
  It is accurate and I am not reporting it.
- **Authorized paths.** All three changed files fall inside `dispatches/P20B-rev11-fix.md:85-89`; no
  ledger, QUESTIONS, DECISIONS, RISKS, review or frozen source was touched; the evidence file is
  written and uncommitted.
- **`0/70` per probe arm and `0/690` for my campaign** are **bounds** with a 95% rule-of-three upper
  limit of 4.3% per fixed arm, not clearances. Nothing in this file drifts past that.

## 13. Corrections for root, below the severity of a finding but worth transcribing

1. **`evidence/P20B/implementation-12.md` §3.1's phrase "the twelve revision 10 added" is off by
   one.** MEASURED: `git grep -c "awaitVaultPersistence(" 46b2727 -- 'tests/e2e/*.spec.ts'` — that
   is rev 10's BASE, per `reviews/P20B-review-10.md` §4.3 — returns **1**, at
   `people-settlement.spec.ts:790`, and `67ea7a2` returns **12**. So **revision 10 added eleven, not
   twelve**; the twelfth predates it, introduced by `0a94be8`, which `git merge-base --is-ancestor`
   confirms is an ancestor of `46b2727`. The load-bearing figure — **16** sites at HEAD, of which
   **4** are this revision's — is correct and unaffected, and the sentence root is asked to
   transcribe (that document's §6 item 2) does not contain the error. I record it because it is a
   sub-claim carried inside a **MEASURED**-tagged sentence whose grep establishes the 16 but not the
   decomposition, and because eleven is also the rev-10 implementer's own number.
2. **The in-vault status of a raw teardown is not stable across instrumentations** (§6). At
   `passkey.spec.ts:180` I measured 3/3 `no-active-vault` where `reviews/P20B-review-10.md` §4.4
   measured `persisted`; at `passkey.spec.ts:62` I measured 6/12 in-vault where it measured 2/4.
   **The ledger's bound — "at least fifteen; the sweep is not complete" — should be understood as a
   bound on a quantity that is partly load-dependent, not merely partly unmeasured.**
3. **A review-process hazard, not a product defect.** MEASURED: a bare
   `pnpm exec playwright-cli -s=<s> snapshot` on `/new-user` after generating a phrase prints the
   **recovery phrase in cleartext**, because the password-manager credential field carries it as its
   accessible value even though the visual display renders `•••••`. I did **not** click "Click to
   reveal". Future reviewers should avoid unfiltered snapshots on that page. The vault involved was
   disposable, created through the normal UI as the suite does, and its browser state is deleted
   (§9, §16).

## 14. Question proposals

### Q-PROPOSAL-P20B-11-1 — should the harness stop classifying teardown sites as "in-vault" and barrier unconditionally instead?

- **Raised by/package/revision:** `p20b-reviewer-11`, P20B, revision 11.
- **Context and evidence:** the goal has spent four revisions trying to enumerate which raw
  teardowns fire with a vault mounted, and the number has taken five values (44, 52/five, eleven,
  "at least fifteen"). **MEASURED (§6) that the predicate is not a property of a call site at all:**
  at `passkey.spec.ts:62`, twelve entries on one tree split 6 in-vault / 2 `no-active-vault` / 4
  absent-seam; at `passkey.spec.ts:180` I measured 3/3 `no-active-vault` where
  `reviews/P20B-review-10.md` §4.4 measured `persisted`. An enumeration of a value that varies with
  path and parallel load cannot converge, which is why each successive count has been "corrected"
  rather than confirmed. **MEASURED that the cost of barriering a non-in-vault site is one
  `evaluate` that asserts nothing**: `awaitLocalPersistence()` returns `"no-active-vault"` and the
  helper returns immediately (`tests/e2e/helpers/persistence.ts:79-89`). **MEASURED that an absent
  seam on an `(app)` route is routinely a pre-hydration transient rather than the hang case**: 7 of
  63 barrier entries in §6 started absent and all recovered, alongside `reviews/P20B-review-10.md`
  §4.4's 3 of 137.
- **Why existing authority does not decide it:** `DECISIONS.md#D-025` names the mechanism and two
  conditions, not the harness's enumeration strategy. `Q-P20B-30` already asks whether to barrier
  the remaining sites or forbid raw teardowns by lint rule, but it frames the choice as _which
  sites_; this proposal is the prior question — whether "which sites" is answerable at all. **Root
  should consider folding this into `Q-P20B-30` as new measured context rather than opening a new
  canonical ID**, per `PROCESS.md:223-224`.
- **Options considered:** (a) keep per-site classification and keep refining the count; (b) barrier
  every raw teardown in specs unconditionally, accepting a no-op cost where no vault is mounted, and
  enforce it with the `Q-P20B-30` lint rule; (c) route all teardowns through helpers so the question
  never arises; (d) leave the residual sites bare and record the class as accepted risk.
- **Reversible default selected to continue:** (a) — no change in this revision. The four measured
  sites are barriered, the four measured-unsafe ones are not, and nothing here is blocked on the
  answer.
- **Decision-hierarchy basis:** 2 (repository convention — the helpers already barrier
  unconditionally) then 4 (smallest reversible change: this is a question, not an edit).
- **Impact and risk:** medium-low. (b) trades a small, measured per-call cost for the end of a
  four-revision counting exercise; its one real risk is the 15 s hang at a site whose seam is
  genuinely, persistently absent on an `(app)` route — which **no measurement in this goal has yet
  exhibited**, only transients that recovered. That risk should be measured, not assumed, before (b)
  is adopted.
- **Reversal or migration path:** barriers are additive and individually removable; a lint rule is a
  config line.
- **Human review still useful after completion:** yes — whether a test harness should barrier
  unconditionally or classify is a repository-convention call with a real cost/clarity trade-off.

## 15. What root must transcribe

1. **The verdict and F11-1** (§11), **including that F10-1 and F10-2 are both genuinely remediated**
   and reproduced independently in both directions. The remaining work is **one comment line**.
2. **F10-1's guard is proved able to fail, in both directions and by me** (§2): deletion → one named
   test red; inversion → seven red including `"installs outside a production build"`; restored →
   green. Plus (§3) three builds of my own: 0 / 1 / 0 files under `.next/static`, the middle one the
   same chunk prior reviews named.
3. **Every number in `evidence/P20B/implementation-12.md` §3.1 re-derives exactly** (§4): 58 / 53 /
   5 / 1-comment / **57 real call sites** / **16** barrier sites / 0 raw `.reload(`. **No sentence
   drifts into a completeness claim.** The bound stays _"at least fifteen; the sweep is not
   complete"_ — **do not record a fifth number.**
4. **The four barriers are at the four measured sites and the four measured-unsafe sites appear in
   no hunk** (§5), verified from both trees, not from the evidence.
5. **The retry-on-absence branch is load-bearing, with a fresh independent measurement** (§6): 7 of
   63 barrier entries observed an absent seam on an `(app)` route and every one recovered. The
   "throw immediately" simplification stays refuted.
6. **The in-vault predicate is partly load-dependent, not merely partly unmeasured** (§13 item 2).
   This is new and it bears on `Q-P20B-30`.
7. **`evidence/P20B/implementation-12.md` §3.1's "the twelve revision 10 added" is eleven** (§13
   item 1). The load-bearing 16 is correct.
8. **D-025's two conditions hold** (§10), so **no ownership flip to P16A–E arises**; I reached that
   by measurement rather than assumption.
9. **My campaign: 690 executions, zero failure markers, digest constant on all eight START/END
   lines** (§7); **probe re-run: arm C 15/70 lost — the control still bites — C2 0/70, D 0/70,
   discriminator 210/210** (§8). **These are bounds, not clearances, and I make no cross-campaign
   rate comparison.**
10. **The snapshot hazard on `/new-user`** (§13 item 3), for future reviewer dispatches.
11. **The question proposal** in §14, which root may prefer to fold into `Q-P20B-30`.

## 16. Secret safety and hygiene

No vault master key, recovery phrase, `crypto_box` secret, `SUPABASE_JWT_SECRET`, presence key,
invite bearer secret or vault plaintext appears in this file. **I did not click "Click to reveal"**;
the visual display rendered `•••••` throughout. I record in §13 item 3 that the page's
password-manager credential field nonetheless carries the phrase as its accessible value, so an
unfiltered CLI snapshot exposes it — the one vault I created in §9 was disposable, made through the
normal UI as the suite does, and its browser state was deleted with `close`, `delete-data` and
removal of `.playwright-cli`.

**No database command of any kind was run** — no `db:reset`, no migration, nothing destructive.

**`:3001` was never touched** — MEASURED before and after every phase: pid 818182, cwd
`/home/ben-agents/Code/moneyflow`, alive throughout. My ports were **`:3000`** (campaign, then the
manual dev server, never both — the campaign released it first, confirmed from `ss -ltn` state
rather than from a kill's exit code) and **`:3100`** (the probe's own config). Every process I
stopped was killed **by pid** after `readlink /proc/<pid>/cwd` confirmed it was mine; never a bare
`pkill -f`. Every run used `env -u CI` and `--retries=0`; no `--debug`, `--ui`, `--headed` or
`show`; no port override on the repository config.

In the shared checkout I ran only read-only commands. I never used `git stash`, `git checkout --` or
`git add`. **All mutation — the five gate mutations, the three builds, the two instrumented runs and
the probe files — was confined to `/tmp/mf-p20b-rev11-review` and reverted.** MEASURED, its digest
is back to `6ff7e1198a9fb5f0563a149fe17cef68` and `git status --porcelain -- src tests` is empty;
the only dirty path is `next-env.d.ts`, which Next rewrites on every dev-server start and which the
digest command does not cover. The worktree can be removed with
`git worktree remove /tmp/mf-p20b-rev11-review --force`.
