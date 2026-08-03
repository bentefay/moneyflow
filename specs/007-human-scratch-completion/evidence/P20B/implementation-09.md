# P20B rev 08 — remediate F-A, F-B, F-C from `reviews/P20B-review-07.md` — Implementation Evidence

- **Implementer:** `p20b-implementer-08`. Distinct from `p20b-implementer-07`, and I am not the
  reviewer of this or any prior P20B revision.
- **Package:** P20B, revision 08 (evidence file `implementation-09.md` — the filename runs one ahead
  of the revision number; that is the known P20B evidence skew, not an error).
- **Date:** 2026-08-03.
- **BASE, re-derived with `git rev-parse HEAD` at the start of my session, not carried from any
  document:** `ee01213ae836724bc7913c74219cc9a400a052e4`.
- **HEAD at handback:** `205ca156f3164d5b78125f0bfb5f7bab48da8ec2`.
- **My commits:** `38c242cf13c39d6d04118dcb61bcf8ce54040b60` (F-B) and
  `205ca156f3164d5b78125f0bfb5f7bab48da8ec2` (F-C).
- **One amend, disclosed, and it is the last one.** The F-C commit was originally
  `5e02607c0a35b9757c426e73dd51b813ebe4bf48`; after my E2E runs I re-derived a figure in it and
  found it off by two (§4), so I amended it to `205ca15` and then updated every hash in this file.
  **My E2E evidence in §3.2 and §3.3 was executed at `5e02607`, not at `205ca15`, and I say so there
  rather than restating it as the handback HEAD.** The two trees differ by exactly one sentence in
  `.claude/skills/e2e/SKILL.md` — **MEASURED**,
  `git diff --stat 5e02607 205ca15 -- tests/ src/ playwright.config.ts` is empty, so nothing in the
  test graph moved and the runs transfer.
- **One root control commit landed inside my window**, between my BASE re-derivation and my first
  commit: `6cf6850285bfd0d1946a0dd4191489d9f9da1fee` "docs: route P20B rev 08 in HANDOFF", touching
  only `specs/007-human-scratch-completion/HANDOFF.md`. My commits are parented on it. I state this
  rather than presenting an unbroken BASE→HEAD chain that I did not have.
- **Range for review:** the original package BASE `c15be1289bad2c9743f8d7169e2048dc65f5c0ac` through
  `205ca15`.

**Reading convention.** Every claim below is tagged **MEASURED** (I ran the command in this session
and its output is reproduced here) or **INFERRED** (read from a file or log without a discriminating
execution of my own). Every claim that rests on a log names its path. Per the dispatch's method note
I re-derived every figure I was given rather than copying it, including the campaign figures in §2.

---

## 0. Bottom line, stated first

| Finding                                                    | Status                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **F-A** — rev 07 evidence lacks the campaign for `c515173` | **REMEDIATED HERE** — §2 carries the re-derived campaign and a five-item retraction |
| **F-B** — the step 9 persistence assertion cannot fail     | **FIXED**, with a two-directional control printed from the real DOM (§3)            |
| **F-C** — no `.claude` guidance records the 15 s `expect`  | **FIXED** (§4)                                                                      |
| The 10-consecutive-green bar                               | **STILL NOT MET.** It was not met at rev 07 and nothing here changes that (§2.3)    |
| The residual settlement failure class                      | **NOT MINE, NOT ADDRESSED, NOT CLOSED** (§6)                                        |

**Nothing in this revision closes the residual settlement failure class, and no measurement in this
file should be read as bearing on it.** My F-B change makes one lost allocation report at the
persistence assertion rather than four lines later at a settlement assertion. That is
**localisation, not a fix.**

---

## 1. Summary of the change

Two files. **No product code.** `git diff --stat c515173 205ca15 -- src/` is empty — **MEASURED**.

| File                                  | Change                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `tests/e2e/people-settlement.spec.ts` | step 9 asserts `Explicit: 50%.` instead of the substring `50%`, plus a why-comment     |
| `.claude/skills/e2e/SKILL.md`         | a new `## Timeouts` section recording the repo-wide 15 s `expect` default and its cost |

**MEASURED — the three files the rev 07 review examined are byte-identical to the reviewed
`c515173`, as the dispatch requires:**

```
$ git diff --stat c515173 205ca15 -- playwright.config.ts tests/e2e/helpers/nav.ts tests/e2e/helpers/settlement.ts src/
(empty)
```

---

## 2. F-A — the rev 07 evidence retracted, and the `c515173` campaign supplied

`evidence/P20B/implementation-08.md` is immutable and already persisted at commit `0e08862`. **I did
not edit it.** This section is the remediation: the retraction it cannot carry, and the campaign it
does not contain.

### 2.1 Retraction of the five defects in `implementation-08.md`

Each was MEASURED by `p20b-reviewer-07` and re-verified by root. I re-verified each against the
committed file myself before writing this retraction — **MEASURED**,
`git show 0e08862:specs/007-human-scratch-completion/evidence/P20B/implementation-08.md`.

1. **`PLACEHOLDER-CAMPAIGN` at line 170.** That token stands where the validation campaign for the
   handback commit should be. **RETRACTED: `implementation-08.md` §4 contains no campaign.** The
   campaign is supplied in §2.2 below.
2. **No occurrence of `0a6703e11a28`, `65a6ba3389ea` or `p20b07-c2` anywhere in the file.** The
   validated tree's digest, its `files=` hash and its log path are all absent. **RETRACTED: the
   artifact never identifies the tree it validated.** All three are named in §2.2.
3. **`implementation-08.md` cross-references its own `§4.2b` at lines 247 and 588, and that section
   does not exist** — its `### 4` headings run
   `4.0, 4.1, 4.1b, 4.1a, 4.2, 4.3, 4.3a, 4.3c, 4.3e, 4.3f, 4.3d, 4.5`, with no `4.2b`. **RETRACTED:
   both references are dangling.** Where they point, read §2.2 of this file instead.
4. **Line 247 names `FINAL tree 5bdd30322604 files=e53e6e7e0bd5`, while line 236 of the same file
   discards that campaign.** **RETRACTED, and this is the most misleading of the five:
   `5bdd30322604` is NOT the validated tree.** The validated tree is
   `head=c515173 digest=0a6703e11a28 files=65a6ba3389ea`, and `implementation-08.md` never names it.
5. **Line 649 attributes the static checks to `6061ef7`.** The rev 07 handback commit is `c515173`.
   **RETRACTED as to the commit label.** I do not retract the static results themselves: the rev 07
   reviewer independently re-ran them at `c515173` and reproduced them (`reviews/P20B-review-07.md`
   §1), and I reproduced them again at my own HEAD in §5.

**What is NOT retracted.** The rev 07 reviewer found "no place where that evidence over-claims — its
error is omission, not overstatement", and I am not widening that. In particular
`implementation-08.md` §4.3c (the implementer refuting its own substring hypothesis) and §4.3f (the
implementer's own regression, disclosed) stand, and the rev 07 reviewer reproduced both
independently. **The defect is that the artifact does not contain its own campaign, not that it
reports one falsely.**

### 2.2 The validation campaign for `c515173` — re-derived by me

**Source: `/tmp/p20b07-c2/` — that directory and no other.** `/tmp/p20b07-campaign`, `-campaign2`
and `-final` are superseded trees and I read none of them. **MEASURED**,
`/tmp/p20b07-c2/summary.log` is the only one of those four whose log ends `CAMPAIGN_COMPLETE`.

I did not re-run this campaign. The dispatch does not require it, the tree is unchanged by any rev
07 work, and re-running it would produce evidence for a different execution rather than for the
commit under review. **Every figure below I computed myself from the ten raw run logs
`/tmp/p20b07-c2/run1.log` … `run10.log`; none is copied from `PROGRESS.md`, from the review, or from
`summary.log`'s own pre-computed lines.**

**Tree identity — MEASURED. One digest triple, and only one, across all twenty START/END lines:**

```
$ grep -oE 'head=[0-9a-f]+ digest=[0-9a-f]+ files=[0-9a-f]+' /tmp/p20b07-c2/summary.log | sort -u
head=c515173 digest=0a6703e11a28 files=65a6ba3389ea
$ grep -cE '=== RUN [0-9]+ (START|END)' /tmp/p20b07-c2/summary.log
20
```

`digest=` is `{ git rev-parse HEAD; git diff -- . ':!next-env.d.ts' | md5sum; } | md5sum`; `files=`
is `md5sum playwright.config.ts tests/e2e/helpers/nav.ts tests/e2e/helpers/settlement.ts | md5sum`
(**MEASURED**, read from `/tmp/p20b07-c2/run.sh`). The `next-env.d.ts` exclusion is sound: Next
rewrites that generated file on every dev-server start and Playwright's `webServer` starts one every
run. The `files=` column is independent of the exclusion, so a real edit to any of the three files
under test still moves it.

**Per-run failures — MEASURED, counting only Playwright's numbered failure blocks**
(`grep -cE '^  [0-9]+\) \[chromium\]' run<N>.log`). A bare grep for the spec path also matches
passing `✓` lines and inflates the table; I used the numbered-block form the dispatch specifies.

| run           | 1   | 2   | 3   | 4       | 5       | 6   | 7   | 8   | 9   | 10  | **total** |
| ------------- | --- | --- | --- | ------- | ------- | --- | --- | --- | --- | --- | --------- |
| **failed**    | 1   | 1   | 1   | **0**   | **0**   | 2   | 2   | 2   | 1   | 1   | **11**    |
| **passed**    | 194 | 194 | 194 | **195** | **195** | 193 | 193 | 193 | 194 | 194 |           |
| artifact dirs | 1   | 1   | 1   | 0       | 0       | 2   | 2   | 2   | 1   | 1   | 11        |

**195 distinct tests per run** (**MEASURED**, `grep -cE '^  (✓|✘|-)' run1.log` → 195), so **1,950
executions**. The `artifact dirs` row is an independent corroboration rather than a restatement: it
counts directories under `/tmp/p20b07-c2/artifacts-run<N>/`, copied out by the driver after each
run, and it matches the failure count in every one of the ten runs. `summary.log` is therefore
confirmed by the filesystem, not only by itself.

**Per-site inventory — MEASURED, all eleven blocks:**

| site                            | count |
| ------------------------------- | ----- |
| `people-settlement.spec.ts:596` | 4     |
| `people-settlement.spec.ts:166` | 3     |
| `people-settlement.spec.ts:281` | 2     |
| `people-settlement.spec.ts:525` | 1     |
| `transactions.spec.ts:572`      | 1     |

**Failing step names — MEASURED, read from the numbered failure headers:**

| site   | run(s)   | step / test name                                                                     |
| ------ | -------- | ------------------------------------------------------------------------------------ |
| `:596` | 6,7,8,10 | a deleted Person keeps their historical balance under a stable deleted label         |
| `:166` | 1,3,8    | canonical example D: joint owners split the third person's share $18 and $12         |
| `:281` | 6        | **11. restore paid, enter Bob −20% and verify the reversal**                         |
| `:281` | 7        | **6. verify Bob owes Me $50 on People**                                              |
| `:525` | 2        | editing an existing transaction's allocation updates settlement without rewriting it |
| `:572` | 9        | `transactions.spec.ts` — clear an excluding filter and focus the canonical row       |

**A line-number caveat a future reader will otherwise trip on.** Those line numbers are for the tree
at `c515173`. My F-B change adds three lines at `people-settlement.spec.ts:346`, so every site below
that point shifts by +3 at my HEAD: **the campaign's `:596` is `:599` in my own runs in §3.3.** The
tests are the same tests.

### 2.3 What the campaign establishes, and what it does not

**The 10-consecutive-green bar was NOT met.** 11 failures over 10 runs — **1.10 failures per run**,
with **two green runs** (4 and 5) and eight non-green. That was true of rev 07 and it is still true;
this revision does not change it and does not claim to.

**I am not presenting 1.10 against rev 06's pre-fix 1.29 and 1.60 as an improvement, and neither
should anyone reading this.** One campaign does not establish a trend, and rev 07 was right to
refuse the claim. The rev 07 reviewer supplied the control that settles it rather than arguing it
(`reviews/P20B-review-07.md` §3.2–3.3, **INFERRED** — I read its numbers, I did not re-run its
campaign): its own four runs on the **byte-identical tree** `digest=0a6703e11a28` produced **2.25**
failures per run against root's 1.10. **The between-campaign spread on one fixed tree is larger than
the entire pre-fix/post-fix gap**, so no rate comparison in this goal supports a conclusion in
either direction.

---

## 3. F-B — the step 9 assertion, fixed and controlled

### 3.1 The change

`tests/e2e/people-settlement.spec.ts`, step 9 _"reload and verify allocations and settlement
persist"_, at the lines the review cites:

```ts
// `Explicit:` is the only clause in the cell that reflects stored state. A bare "50%"
// is also satisfied by the derived `Owner remainder: 50%.` that exists precisely
// because Bob's allocation is missing, so it cannot fail on the loss this step names.
await expect(reloaded.getByRole("button", { name: "Edit Bob allocation" })).toContainText(
    "Explicit: 50%."
);
```

This matches the barrier `setAllocation` was hardened to in `c515173`
(`tests/e2e/helpers/settlement.ts:204-206`), so the suite now reads stored allocation state one way
rather than two.

### 3.2 The two-directional control — MEASURED, printed from the real DOM

**I printed the cell rather than reasoning about it.** Reasoning about this exact cell is what
produced the defect, and it is what killed rev 07's substring hypothesis.

**Method.** A probe spec in a disposable worktree (`/tmp/mf-p20b08`, `git worktree add --detach` at
my then-HEAD `5e02607` (see the amend note above), untracked `.env.local` copied in, dependencies
installed freshly — never `cp -a node_modules`). It rebuilds steps 1–5 of the mandatory journey
twice against a real vault in a real browser, lands Me's 50 both times, and lands or **drops** Bob's
write (`Escape` instead of `Enter`, so the allocation is genuinely absent rather than the assertion
doctored). It then reloads the page, prints the cell's `textContent`, and grades **both** the old
assertion and the new one against the same state, so neither outcome depends on my description of
it. The probe **is never committed**; it was moved out of the worktree before the runs in §3.3 and
preserved at `/tmp/p20b08-fb-probe.spec.ts.artifact`. Full log: `/tmp/p20b08-probe.log`.

**MEASURED — verbatim probe output, both directions:**

```
[PROBE ABSENT]  cell textContent: "—Explicit: not stored. Effective: 0%. Owner remainder: 50%."
[PROBE ABSENT]  old "50%"            -> PASS
[PROBE ABSENT]  new "Explicit: 50%." -> FAIL

[PROBE PRESENT] cell textContent: "50%Explicit: 50%. Effective: 50%. Owner remainder: 0%."
[PROBE PRESENT] old "50%"            -> PASS
[PROBE PRESENT] new "Explicit: 50%." -> PASS

2 passed (19.0s)
```

**Both halves of the finding are confirmed against the product.**

- **The defect is real.** On a vault where Bob's allocation was **never persisted**, the old
  assertion **passes** — matching the `Owner remainder: 50%` that exists _because_ the write is
  missing. The step whose declared purpose is to prove the allocation survived a page load could not
  fail on its absence.
- **The fix discriminates.** The new assertion **fails** on exactly that state and **passes** once
  the write lands.

The ABSENT string reproduces the rev 07 review's §6 F-B measurement **verbatim**, independently.

**Why `Effective` could not have been used instead — INFERRED, from
`src/lib/domain/allocation.ts:259` (`ownerRemainder = 100 − explicitTotal`), and corroborated by the
two printed strings above.** In the ABSENT state Bob's `Effective` reads `0%` and in the PRESENT
state `50%`, so for _Bob_ it happens to discriminate; but the field is ambiguous by construction — a
person holding an explicit 50 and a person holding nothing while absorbing a 50% owner remainder
both render `Effective: 50%`. I did not build an assertion on a field whose discrimination is an
accident of which person the test happens to read.

### 3.3 Stability of the journey under my change — MEASURED, and it reports failures

Two runs from the same worktree at `5e02607` (the pre-amend tree; identical under `tests/` and
`src/` to the handback HEAD `205ca15`), `--retries=0`, `env -u CI`, `--workers=4`, no `CI` env, no
`--debug`/`--ui`/`--headed`/`show`. Tree under test was my HEAD with the probe removed
(`git status --porcelain` showed only ` M next-env.d.ts`, the known generated-file churn).

| run                                                  | executions | failed | log                        |
| ---------------------------------------------------- | ---------- | ------ | -------------------------- |
| whole `people-settlement.spec.ts`, `--repeat-each=3` | 57         | **5**  | `/tmp/p20b08-repeat3.log`  |
| `-g "mandatory journey"`, `--repeat-each=6`          | 6          | **3**  | `/tmp/p20b08-journey6.log` |

**All eight failures are the residual settlement class and none is at my changed line — MEASURED,
and this is the load-bearing check on my own work:**

```
$ grep -E '^\s+at helpers/settlement.ts' /tmp/p20b08-repeat3.log | sort | uniq -c
      5        at helpers/settlement.ts:412          <- expectObligation, the currency-section wait

$ grep -n 'Explicit: 50%' /tmp/p20b08-repeat3.log
(no match — my assertion never appears in a failure)
```

Sites in the whole-spec run: `:599`, `:281` (step 6), `:197`, `:166`, `:145`. Sites in the journey
run: `:281` ×3, at steps **6**, **11** and **6**. Every one is `expectObligation` timing out on
`getByTestId('settlement-currency-section-USD')` at `Timeout: 15000ms` — **MEASURED** from the
preserved artifacts at `/tmp/p20b08-artifacts/*/error-context.md`, where all three recorded timeouts
read `15000ms`, confirming the rev 07 config change is active in my runs too.

**Positive evidence that step 9 itself runs green — MEASURED.** `test.step` runs sequentially and a
failing step aborts the test, so a failure at step 11 proves steps 1–10 passed. Across the nine
`:281` executions in the two runs: **step 9 was reached six times and passed six times; it failed
zero times.** The other three executions failed at step 6 and never reached it.

**What I am NOT claiming.** The journey-only run failed 3 of 6, which is a denser rate than any
full-suite campaign in this goal. Six copies of the heaviest journey running concurrently at
`--workers=4` is a different load profile from a full-suite run, and that is a plausible reason —
but **I did not measure it and I am not asserting it. INFERRED, and flagged as an argument rather
than a result.** Per §2.3 no rate comparison here supports a conclusion in either direction; I
report the runs because they happened, not because they establish anything about the class.

---

## 4. F-C — the 15 s `expect` default recorded in `.claude/skills/e2e/SKILL.md`

`CLAUDE.md` Critical Rules require `.claude/` files to be updated alongside code changes. **MEASURED
at BASE:** `grep -rn 'expect.*timeout\|15_000' .claude/` returned nothing, so
`playwright.config.ts:67`'s repo-wide 15 s `expect` timeout — where Playwright's default is 5 s —
was invisible to any agent reading the guidance.

I added a `## Timeouts` section to `.claude/skills/e2e/SKILL.md` recording all three things the
review asked for: the 15 s default; that an explicit per-assertion timeout still overrides it, so
the deliberately-short probes are unaffected; and the cost to untimed absence assertions, which now
burn 15 s instead of 5 s when they genuinely fail, with two in one test exhausting the 30 s budget
and reporting a test timeout instead of the assertion's own error. It closes with the actionable
consequence: give a contentious absence assertion an explicit shorter timeout, or raise the budget
with `test.setTimeout()`.

**A correction the re-derivation produced — MEASURED, and I am writing the corrected figure into the
guidance rather than the one I was handed.** The dispatch and `reviews/P20B-review-07.md` §6 F-C
both state that **115** `toHaveCount(0)` absence assertions carry no explicit timeout. There are 115
such assertions, but **two of them do carry one**, so the count that carries none is **113**:

```
$ grep -rn 'toHaveCount(0)' tests/e2e/ | wc -l      -> 115
$ grep -rn 'toHaveCount(0,' tests/e2e/              -> 2
    tests/e2e/passkey.spec.ts:448
    tests/e2e/realtime-security.spec.ts:156
```

The SKILL note therefore reads "113 of the 115". **The "12 deliberately-short probes" figure is
confirmed exactly** — 12 explicit timeouts under 5 s exist under `tests/e2e/` (one 1000 ms, one 2000
ms, ten 3000 ms). Neither correction changes the argument or the severity; I record it because this
is durable guidance and the figure will be re-read long after the review is archived.

The precedent the review cites is live in this package — `f2b1a9f` updated
`.claude/skills/crypto/SKILL.md` alongside its code.

---

## 5. Validation of my own tree — MEASURED, at HEAD `205ca15`

All run in the primary checkout with **no campaign holding the CPU** (load average 0.38 at start),
per the recorded hazard that `duplicates.test.ts`'s "performance scales linearly" is a wall-clock
ratio assertion that trips under load. My E2E runs were started only after these completed.

**Which tree these ran on, stated precisely.** Typecheck, lint, `pnpm test` and `pnpm build`
executed before the F-C amend, on a tree byte-identical to `205ca15` everywhere those tools look —
the amend changed one sentence of `.claude/skills/e2e/SKILL.md` and nothing else (**MEASURED**,
`git diff --stat 5e02607 205ca15 -- tests/ src/ playwright.config.ts` is empty). The one check that
_does_ read markdown, `pnpm format:check`, **I re-ran at `205ca15`**: still 28 files, all under
`specs/`, with `.claude/skills/e2e/SKILL.md` and `tests/e2e/people-settlement.spec.ts` both clean.

| Check                         | Command                           | Exit  | Result                                                                         |
| ----------------------------- | --------------------------------- | ----- | ------------------------------------------------------------------------------ |
| Typecheck                     | `pnpm typecheck`                  | **0** | `tsc --noEmit`, clean                                                          |
| Lint                          | `pnpm lint`                       | **0** | **0 errors, 1 warning** — the pre-existing P03 upstream one                    |
| Format — my two files         | `pnpm exec oxfmt --check <paths>` | **0** | "All matched files use the correct format."                                    |
| Format — repo                 | `pnpm format:check`               | **1** | **28 files, every one under `specs/`; 0 under `src/`, `tests/` or `.claude/`** |
| Unit / property / integration | `pnpm test`                       | **0** | **129 files, 2481 passed, 2 skipped**                                          |
| Production build              | `pnpm build`                      | **0** | compiled, tree clean afterwards                                                |

Logs: `/tmp/p20b08-typecheck.log`, `/tmp/p20b08-lint.log`, `/tmp/p20b08-unit.log`,
`/tmp/p20b08-build.log`.

The 2481 figure reproduces the rev 07 evidence's and the rev 07 reviewer's count exactly. The two
skips are the `P16A_BENCHMARK`/`P16B_BENCHMARK` env-gated benchmarks. The `format:check` failure is
the known pre-existing `oxfmt`-sweeps-`specs/**` issue (28 files where the rev 07 reviewer measured
26 — root has committed spec files since; expected drift, not a new defect). The single lint warning
is React Compiler declining to memoize a `useVirtualizer` component (`TransactionTable.tsx:459`,
`react-hooks/incompatible-library`), the tracked P03 upstream interaction, unchanged by this work.

---

## 6. Scope — what is NOT mine and what I did not touch

**The residual settlement failure class and F-2 are out of scope and deliberately unowned**
(`Q-P20B-26`). I did not chase them, did not widen scope to them, and **no measurement in this file
closes or bears on them.** The eight failures in §3.3 are in that class and are reported because
they occurred, not as a result about it. Root is measuring the mechanism separately.

**My F-B change is localisation, not a fix.** A lost allocation will now report at the persistence
assertion in step 9 rather than at a settlement assertion four lines later. That is a better
diagnostic, not a smaller number of failures, and I make no claim that it reduces the failure rate.

I changed **no product code**; `git diff --stat c515173 205ca15 -- src/` is empty. I did not edit
`playwright.config.ts`, `tests/e2e/helpers/nav.ts`, `tests/e2e/helpers/settlement.ts`,
`implementation-08.md`, any review file, any ledger, QUESTIONS, FINAL-AUDIT, the scratch file, any
task contract, or any agent configuration.

---

## 7. Port, process and checkout hygiene

- **`:3000` was free before I claimed it** (`ss -ltn`, MEASURED) and is free again at handback.
  Playwright's own `webServer` started and stopped it; I never had to kill a server.
- **The human's `:3001` (pid 818182, cwd = the primary checkout) was never touched** — verified by
  `ss -ltn` and `readlink /proc/<pid>/cwd` before and after. **No bare `pkill -f` was run at all.**
- **No destructive database command.** No `pnpm db:reset`, no migration, no schema command.
- **No bare `pnpm format`.** Every format run was `--check`, and the one that wrote was `oxfmt`
  scoped to my own two files, so `specs/**` and the frozen `specs/human-scratch.md` were not
  reflowed.
- **Shared checkout respected.** No `git stash`, no `git checkout --`, no `git add -A`. Both commits
  named their single file as an explicit pathspec. Other agents' uncommitted work in the checkout
  was untouched.
- **Scratch lives in `/tmp`, never inside the repo.** Worktree `/tmp/mf-p20b08`; the probe spec was
  written only there and never into the primary checkout.
- **I wrote exactly three files:** `tests/e2e/people-settlement.spec.ts`,
  `.claude/skills/e2e/SKILL.md`, and this evidence file. **I did not commit this evidence file** —
  root persists it with the verdict per `PROCESS.md:58`.

---

## 8. Implementer checkpoint — what I did not do, stated rather than omitted

- **I did not re-run the `c515173` campaign.** The dispatch does not require it and the tree is
  unchanged by that work; §2.2 is a re-derivation from the preserved logs, and I say so in every
  claim. If a reviewer wants the campaign re-executed, it has not been.
- **I did not run a full-suite campaign at my own HEAD.** The dispatch explicitly does not require
  one, and I could not have used it for the thing that matters here anyway (§2.3). My E2E evidence
  is the two runs in §3.3 and the probe in §3.2.
- **I did not run a manual `playwright-cli` product matrix.** My change is one test assertion and
  one markdown file; no product code, no changed control, no changed rendering. The rev 07 reviewer
  ran that matrix at `c515173` and my HEAD leaves `src/` byte-identical to it. I state this rather
  than implying a coverage I do not have.
- **I did not measure the residual class mechanism** (§6), deliberately.
- **`Effective`'s ambiguity is INFERRED**, from `allocation.ts:259` plus the two printed strings — I
  did not construct the third vault state that would demonstrate it directly, because I did not need
  to: the fix does not depend on it.

---

## 9. Proposed questions

### Q-PROPOSAL-P20B-08-1 — Should the remaining derived-value substring assertions in the settlement specs be swept?

- **Raised by/package/revision:** `p20b-implementer-08` / P20B / 08
- **Context and evidence:** F-B was one assertion reading a _derived_ figure (`Owner remainder`) at
  the one call site whose declared purpose is to prove _stored_ state survived a reload. §3.2
  measures that the old form passes on a vault where the write is absent. `setAllocation` was
  hardened in `c515173` and this call site in `38c242c`, but I fixed **only** the site the review
  named — I did not sweep the specs for others, because the dispatch scoped me to F-B and a sweep is
  not a one-line change.
- **Why existing authority does not decide it:** `.claude/skills/e2e/SKILL.md` says "assert
  behaviour, not text", which argues _against_ asserting the `Explicit:` copy; the countervailing
  fact is that `Explicit:` is the only field in that cell reflecting stored state, and
  `tests/unit/transactions/allocation-grid.test.tsx` asserts the same template so a copy change
  breaks both together. No rule decides how far to carry that trade-off.
- **Options considered:** (a) sweep every allocation-cell assertion in the settlement specs in a
  future revision; (b) leave the remaining sites and fix them as failures localise them; (c) expose
  a dedicated test id for the stored value so no assertion reads copy at all.
- **Reversible default selected to continue:** **(b)** — I fixed the site the review measured and
  did not widen scope.
- **Decision-hierarchy basis:** 4 (smallest reversible step), then 2 (repository convention).
- **Impact and risk:** low. The risk of leaving them is more misattributed failures of the kind that
  routed this class to P20B in the first place.
- **Reversal or migration path:** a grep-driven sweep in a later revision; no migration.
- **Human review still useful after completion:** no.

### Q-PROPOSAL-P20B-08-2 — Should a spec's own line numbers be recorded alongside a campaign's failure inventory?

- **Raised by/package/revision:** `p20b-implementer-08` / P20B / 08
- **Context and evidence:** every campaign in this goal identifies failures by
  `people-settlement.spec.ts:<line>`. My three-line comment at line 346 shifted every site below it
  by +3, so the campaign's `:596` is `:599` at my HEAD (§2.2). A future reader comparing the rev 07
  inventory against a rev 08 run would see two different-looking sites that are the same test. The
  test **names** are stable and were recorded; the line numbers are not.
- **Why existing authority does not decide it:** `PROCESS.md:153-159` requires evidence to record
  "commands/results" but does not say how a failure site must be identified across revisions.
- **Options considered:** (a) require the failing test _name_ alongside the line in every inventory;
  (b) require the spec file's hash in the campaign header so a shift is detectable; (c) leave it and
  rely on readers noticing.
- **Reversible default selected to continue:** **(a)** — I recorded step and test names beside every
  line number in §2.2, and flagged the +3 shift explicitly.
- **Decision-hierarchy basis:** 2 (repository convention), then 4.
- **Impact and risk:** low; it costs one column in a table and prevents a false "the failures moved"
  reading.
- **Reversal or migration path:** drop the column.
- **Human review still useful after completion:** no.
