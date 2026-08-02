# P28 / UR-007 — Independent Review, Revision 03

- **Reviewer:** `p28-reviewer-03` (distinct fresh context; did not author any part of this package,
  and is not `p28-reviewer-01` or `p28-reviewer-02`)
- **Requirement:** UR-007, frozen at `specs/010-user-reported-refinements-2/spec.md` lines 40-54
- **BASE == HEAD:** `8c160639fc27ee3b8f908117b8357366bdedf83b` — confirmed
- **Reviewer worktree:** `/tmp/mf-p28r3rev` (own, outside the repo; probe trees
  `/tmp/mf-p28r3-rev02` and `/tmp/mf-p28r3-insuff`)
- **Verdict:** **PASS**, with one MEDIUM finding recorded below. **All six checks run and green.**

---

## Verdict summary

F-4 is fixed at the mechanism, not masked. I re-derived the census from scratch rather than
accepting either prior figure, and the shipped round-trip verification is the only one of the three
candidate designs that gets **both** display forms right. Every property revisions 01 and 02 passed
still holds. Type and secret safety are clean, and the evidence document is honest about its own
supersessions, its trees, and the `en-US` consequence.

Two things the record should carry, because both correct a claim made to me rather than by the
implementer:

1. **The dispatch's account of why reviewer-02's fix was insufficient is correct, and I initially
   challenged it wrongly.** My first probe reproduced reviewer-02's fix and found it reached 0
   failures, which appeared to refute the implementer. That probe was too narrow — it swept only the
   editing form. Reviewer-02's fix breaks the **compact** form instead. Details in §2.2.
2. **`Q-P28-07` is confirmed and the true rev 02 census is larger than review 02 reported** — 66
   failures across 11 locales, not 52 across 9. Review 02 missed `so-SO` and `sr-Latn-RS` entirely.

The MEDIUM finding is a residual subclass of F-4 that the fix does not close. It is real and
reproducible under Node's ICU, and **unreachable in any real browser**, which is why it is MEDIUM
and why it does not block. Details in §1.

**All six checks are run and green, including a 3-run E2E campaign of my own.** See §3. An earlier
revision of this review recorded the campaign as unrun, because three apparent concurrent campaigns
held `:3000`; two of those turned out to be a coordinator monitoring shell misclassified by a
whole-cmdline scan. The port was subsequently handed over and the campaign ran clean.

---

## 0. Preconditions

### 0.1 Frozen source — verified against `SCOPE.json`, not from memory

The dispatch quoted `spec.md` lines 40-54 from `tasks/ur-007.md` and asked me to check it against
`SCOPE.json`. I did.

```
$ awk 'NR>=40 && NR<=54' specs/010-user-reported-refinements-2/spec.md
## UR-007 — Dates display in the browser's locale
...
- Stored values remain unchanged: this is a presentation and parsing concern only. ...
```

`SCOPE.json` `/requirements/28` gives `id = "UR-007"`, `task = "tasks/ur-007.md"` and
`sourceTextLines[0] = "## UR-007 — Dates display in the browser's locale"`. The citation is correct
and the quoted range is the whole requirement, verbatim.

### 0.2 Handoff preconditions — verified via `/proc`, not `pgrep`

Enumerated `/proc/<pid>/cmdline` directly so the checking command could not match itself.

| precondition          | observed                                                                         |
| --------------------- | -------------------------------------------------------------------------------- |
| `:3000` unbound       | **confirmed at handoff** — `ss -ltn` showed no `:3000` listener                  |
| no campaign running   | **confirmed at handoff** — no `playwright`/`vitest` in any `/proc` entry         |
| implementer worktree  | **confirmed gone** — `/tmp/mf-p28r3` absent from disk and `git worktree list`    |
| shared checkout clean | **confirmed** — only untracked `.claude/agent-memory/` and one P08 evidence file |
| HEAD final            | **confirmed** — `git rev-parse HEAD` = `8c16063`, branch `main`                  |
| human dev server safe | `:3001` PIDs 818156/818182, `cwd=/home/ben-agents/Code/moneyflow` — untouched    |

The orphan `next-server (v16.2.6)` PID 3622053 has a root-owned unreadable `cwd` and **holds no
listening port** (`ss -ltnp` shows it against nothing), so it could not contend for `:3000`. Not
mine; left alone.

**All handoff preconditions held at handoff.** They did not hold later, through no fault of the
implementer — see §3.

---

## 1. Finding

### F-5 — MEDIUM / Bug / Requirements — `src/lib/utils/date-format.ts:386-397`

**Not a blocker, and not a regression: byte-identical behaviour at `1bba42b` and at HEAD.** The rev
03 fix narrows F-4 to a residual subclass rather than closing it entirely. I record it because the
package's own through-line is silent write-path corruption, and this is the same class.

**The mechanism.** The round-trip check discriminates two interpretations by re-rendering each and
comparing to what was typed. That works because the `numeric` and `2-digit` skeletons usually differ
in **padding**, so only one re-render reproduces the input. When the day and the month are **both in
10..12**, padding is a no-op — `10` is `10` in either skeleton. For a locale whose two skeletons
also differ in field **order**, both interpretations then re-render to exactly the typed string,
`find` returns the first match, and the first listed candidate is the `numeric` one — the wrong
order.

**Observed at HEAD**, 18 silent-wrong cases over 3 locales and 6 dates:

```
mt-MT   editing field shows "11/10/25"  -> typed back verbatim stores 2025-11-10   *** WRONG ***
mt-MT   editing field shows "11/12/25"  -> typed back verbatim stores 2025-11-12   *** WRONG ***
so-SO   editing field shows "11/10/25"  -> typed back verbatim stores 2025-11-10   *** WRONG ***
ug-CN   editing field shows "25-10-11"  -> typed back verbatim stores 2025-11-10   *** WRONG ***
```

All 18 are **silent** — a wrong value stored with no rejection and no signal to the viewer.

**Why it is MEDIUM and not HIGH: no real browser can reach it.** Per `Q-P28-04` I censused
Chromium's own ICU rather than reasoning from Node's, and the result is decisive:

```
Chrome/149.0.7827.55
locales probed: 117   supported: 86   unsupported: 31
ORDER-FLIPPING between numeric and 2-digit skeletons: 0
unsupported includes: ckb-IQ, mn-MN, mt-MT, so-SO, tg-TJ, ug-CN, yo-NG, ...
```

Two independent reasons the defect cannot be reached in the product:

1. **Zero of the 86 locales Chromium supports order-flip** between the `numeric` and `2-digit`
   skeletons, and order divergence is this defect's precondition.
2. **All three affected locales are among the 31 Chromium does not support at all** — `mt-MT`,
   `so-SO` and `ug-CN` fall back to `en-US`, which does not order-flip either.

The defect exists only under Node's ICU 76.1, i.e. in `vitest`. It is a latent gap that a future ICU
could expose, not a live corruption path.

**The general hazard, which outlives this package: Node's ICU is not the browser's ICU.** Every
locale claim this codebase makes in a unit test inherits that gap, and it cuts both ways — here it
made a defect look live that no user can reach, and in review 02 it made three locales (`it-CH`,
`lv-LV`, `sr-RS`) look broken when the browser handled them correctly. A `vitest`-only census
establishes a Node-side fact, not a product-side one. Where behaviour is governed by `Intl`, census
both engines and treat the **delta** as the finding.

**Fix, if it is ever taken up:** prefer the interpretation whose skeleton matches the form the input
came from, or on an exact-match tie prefer the `EDITING_SKELETON` candidate, since the editing form
is the only one a user can type into (`InlineEditableDate.tsx:191` renders `inputValue` only when
focused). A test naming the class — day and month both in 10..12 under an order-flipping locale —
would pin it.

---

## 2. Per-criterion findings

### 2.1 The census, re-derived from scratch — `Q-P28-07` CONFIRMED

I did not defend or accept either prior figure. I built my own locale set (117 BCP-47 tags, all
confirmed supported by `Intl.DateTimeFormat.supportedLocalesOf`), swept 6 dates, and — per root's
hypothesis — counted **silent-wrong separately from loud-rejection**, because a wrong parse that
fails is visible and a wrong parse that succeeds is not.

Run through `vitest` against the real product module, so `@/` resolves to the shipped code and not a
reimplementation.

| tree                  | editing round trip, 702 cases | silent wrong | rejected | locales |
| --------------------- | ----------------------------- | ------------ | -------- | ------- |
| rev 02 `1bba42b`      | **66 failing**                | **23**       | 43       | **11**  |
| rev 03 HEAD `8c16063` | **0 failing**                 | **0**        | 0        | 0       |

**Review 02's "52 failures across 9 locales" does not hold.** The true figure at that tree is 66
across 11. It missed `so-SO` and `sr-Latn-RS` — both real, both in the same class:

```
so-SO       2026-08-03 editing "03/08/26"  -> 2026-03-08  (*** SILENT WRONG ***)
sr-Latn-RS  2026-08-03 editing "03.08.26." -> null            (REJECTED)
```

Root's hypothesis is the right diagnosis of _why_ a census misleads, and it also explains the
undercount: the split matters more than the total, because 23 of the 66 store a wrong date silently
and those are the ones that corrupt data without telling anyone.

### 2.2 Is F-4 fixed at the mechanism, and can it be defeated? — YES, and only as in §1

The dispatch asked me to judge the shipped design rather than accept it. I compared **three** trees:
rev 02, rev 02 plus reviewer-02's proposed fix applied verbatim (`/tmp/mf-p28r3-insuff`), and HEAD.

**I first thought the implementer was wrong.** Applying reviewer-02's fix exactly as review 02
specifies it — editing candidates **first**, which is what both its code block and its Required
Action 1 say — takes the editing census from 66 to **0**, including `mt-MT` and `ug-CN`. On that
evidence the fix looked sufficient and the implementer's rebuttal looked like a rationalisation.

**That reading was wrong, and the reason is instructive.** The parser serves **two** display forms,
and I had swept only one. `parseLocaleDate` must accept both the compact resting form and the
editing form. Ordering can only privilege one skeleton, so it moves the defect rather than removing
it:

```
                          typed "8/3/26"       typed "03/08/26"
                          (mt-MT resting form) (mt-MT editing form)
rev 02                    2026-08-03  correct   2026-03-08  WRONG
reviewer-02's fix         2026-03-08  WRONG     2026-08-03  correct
HEAD (round-trip verify)  2026-08-03  correct   2026-08-03  correct
```

Confirmed by census over ambiguous dates (day and month both <= 12, different year, 936 cases):

| tree              | compact form               | editing form           |
| ----------------- | -------------------------- | ---------------------- |
| rev 02            | 0 failing                  | 88 failing (40 silent) |
| reviewer-02's fix | **24 failing, ALL silent** | 0 failing              |
| HEAD              | **0 failing**              | **0 failing**          |

Reviewer-02's fix introduces 24 silent-wrong compact cases that rev 02 did not have. **The
implementer's claim is correct and its resolution is the right one**: round-trip verification is
decisive exactly where ordering is arbitrary, and inert everywhere else. `EDITING_SKELETON` shared
between formatter and parser removes the structural cause rather than the symptom.

**Attempts to defeat it.** The one that succeeded is F-5 in §1. Others I tried and could not break:
unpadded input under order-flipping locales resolves per the numeric skeleton, padded input per the
editing skeleton, and ISO still wins where neither matches — all correct at HEAD.

### 2.3 The 5 new tests must fail against `1bba42b` — CONFIRMED

Run in my own probe worktree `/tmp/mf-p28r3-rev02` (`git worktree add 1bba42b`), **never** the
shared checkout, per `Q-P28-06`. I placed the HEAD test file over the rev 02 product code and
verified both by hash before running:

```
product  2dc24ebf67ecd5b0624a397fa5e086f8  == git show 1bba42b:src/lib/utils/date-format.ts
test     a8779adae560e1de831315f37409074e  == git show 8c16063:tests/unit/domain/date-locale.test.ts
```

```
Test Files  1 failed (1)
     Tests  5 failed | 132 passed (137)
```

**All five fail, and the run is not vacuous** — 132 tests passed alongside, where an unresolvable
import would report zero (`Q-P27-01`). Representative failures, one per harm class:

```
expected '2026-03-08' to be '2026-08-03'   (mt-MT, silent transposition)
expected null to be '2026-08-03'           (it-CH / lv-LV, rejected outright)
expected '0003-08-26' to be '2026-08-03'   (te-IN, year corrupted)
```

The tests are load-bearing, and they name the **class** rather than adding locale names — which is
the right lesson from `Q-P28-03`.

### 2.4 Everything revisions 01 and 02 passed — ALL STILL HOLD

A later fix can regress an earlier property; that is how rev 02 failed. I re-verified every property
both prior reviews passed, against the real module at HEAD, in one table-driven probe using the
package's own harness types (`Q-P28-05`). **Zero failures across all of them.**

- **Chrono fallback unreachable** for numeric input: `15/6/25`, `31/12/99`, `13/1/26`, `15/1` under
  `en-US` all `null`.
- **Natural language still resolves:** `tomorrow -> 2026-08-03`, `next tuesday -> 2026-08-04`,
  `25 December 2023 -> 2023-12-25`, `15 June 2025 -> 2025-06-15`.
- **Rejections:** `32/1/26`, `15/13/25`, `29/2/25`, `not a date`, `""`, `"   "` — all `null`.
- **Forward bias fixed:** `15/1 -> 2026-01-15`, `1/1 -> 2026-01-01` under `en-GB`.
- **ja-JP field-identity strip:** `formatTransactionDate("2001-01-05", ref, "ja-JP") === "01/1/5"`.
- **Two-digit editing year, no four-digit leak:** `en-AU`, `de-DE`, `ja-JP`, `th-TH`, `fa-IR`.
- **F-1, no `NaN`** in any non-Latin locale: `fa-IR`, `bn-BD`, `ar-EG`, `my-MM`, `ne-NP`, `ps-AF`,
  `ar-SA` all render real numerals and round-trip.
- **F-2, calendar pinned** including explicitly-requested non-Gregorian calendars:
  `th-TH-u-nu-thai`, `fa-IR-u-ca-persian`, `ar-SA-u-ca-islamic` all round-trip; `th-TH` editing is
  `03/08/26`, never `03/08/69`.
- **F-3, Latin digits still parse** under non-Latin locales.
- **Ten-locale round trip** clean across `en-AU`, `en-GB`, `en-US`, `de-DE`, `ja-JP`, `th-TH`,
  `fa-IR`, `bn-BD`, `ar-EG`, `fr-FR`.
- **`DateRangeFilter` time-zone fix intact** — `format(date, "yyyy-MM-dd")` at
  `filters/DateRangeFilter.tsx:41`, with `tests/unit/transactions/date-range-timezone.test.tsx`
  still present.

### 2.5 Type and secret safety — PASS

Every added product line in `42f20be` swept for the banned constructs. The only `as` occurrences are
**three** `as const satisfies Intl.DateTimeFormatOptions` literal assertions on the new skeleton
constants — the form the dispatch explicitly permits and which `.claude/rules/typescript-style.md`
endorses. **No `any`. No non-null `!`.** The `e.target as Node` in `DateRangeFilter.tsx:155` is
pre-existing and untouched.

The new code is pure and functional in the house style: `parseWithFormat` returns a typed `null`
rather than throwing, candidates are `readonly`, and `flatMap`/`find` replace the previous
early-return loop without mutation. `ParseCandidate` pairing the format with its skeleton is what
makes the round-trip check expressible at all.

**Secret safety:** swept the whole `d514d47..8c16063` `src`/`tests` diff and the evidence document
for key material, seed phrase, recovery material, `SUPABASE_JWT_SECRET` value, presence key, invite
fragment and vault plaintext. **None present.** All test dates are synthetic.

### 2.6 Evidence honesty — PASS

- **§5's rev 02 campaign is marked SUPERSEDED rather than deleted.** It states it ran against
  `1c4a4cc` and is "superseded by the revision 03 campaign", and the two earlier campaigns are kept
  with "**neither is the evidence for this handback**".
- **All four campaigns record which tree each covers.** The rev 03 section names `c2cde1e` and says
  plainly that §5 "is evidence for that tree only".
- **The `en-US` consequence is stated plainly and unsoftened.** The evidence says implementing
  UR-007 as frozen "will not change what the principal sees on their current machine", that their
  browser "genuinely resolves to `en-US`", that this "is not a partial fix or a deferred one", and
  that the remedy is to set the browser language to `en-AU`. No hedging.
- **The rev 03 digest is independently corroborated.** The evidence records
  `f46cbb368fc6d55433473f127772e9db` before run 1 and after run 3. I computed the digest myself over
  tracked `src`, `tests`, `package.json`, `pnpm-lock.yaml`, `playwright.config.ts`, excluding
  `next-env.d.ts`, and got **exactly the same value**. Their campaign does cover this tree.

### 2.7 The load disclosure — a judgement, made from the numbers

The implementer was handed the port at load 0.97 and recorded runs 2 and 3 executing at load 6-7,
rather than quoting only the quiet figure it was given. Root's view is that this strengthens the
result. **I agree, with one qualification.**

It strengthens it because the three recorded load-sensitive assertions —
`tests/unit/import/duplicates.test.ts:749` (wall-clock ratio), `tests/e2e/transactions.spec.ts:804`
(10s budget), `tests/integration/vault-maintenance.test.tsx` (mocked rAF) — are precisely the ones
that fire under contention, and none fired across three runs at load 6-7. Green under contention is
strictly more informative than green when quiet.

The qualification: this cuts one way only. Had a run gone red at load 6-7 it would have been
**unprovable**, not evidence of a defect, and would have had to be discarded and re-run quiet. The
disclosure is worth more than the result it reports — it is what lets a reader draw that distinction
at all, and it is the right precedent.

### 2.8 The six checks

Run in my own worktree `/tmp/mf-p28r3rev` at `8c16063`, `.env.local` copied in, never `CI=true`.

| check          | result                                                           |
| -------------- | ---------------------------------------------------------------- |
| `typecheck`    | **PASS** — `tsc --noEmit`, exit 0                                |
| `lint`         | **PASS** — exit 0, `0 errors`, 1 pre-existing warning            |
| `format:check` | **PASS for P28** — exactly **17** pre-existing frozen `specs/**` |
| `build`        | **PASS** — `✓ Compiled successfully in 5.9s`, exit 0             |
| `test`         | **PASS** — **122 files, 2369 passed / 2 skipped**, exit 0        |
| `test:e2e`     | **PASS** — 3 x **177 passed**, `--retries=0`; campaign in §3     |

The five non-E2E checks were run **to completion before** the campaign launched, deliberately.
Vitest at 32 workers and Playwright at 4 competing for one box is how a green suite turns red for
reasons unrelated to the code, and a fabricated failure costs more to unwind than the serialisation
costs. The digest was identical before the first check and after the last run, so all six cover one
tree.

**On the unit count.** 2369 is correct for this tree. A sibling package reported 2382 in the same
hour; the 13-test gap is entirely P29's unmerged tests (`ur-008-amount-column.test.tsx` +6,
`ur-008-csv-parity.test.ts` +6, `mapping-tab-auto-detect.test.tsx` +1), which do not exist at
`8c16063`. The figure also matches the P28 implementer's recorded number exactly.

**`lint`.** A bare `pnpm lint` in my worktree gives `1 problem (0 errors, 1 warning)` — the
pre-existing `react-hooks/incompatible-library` warning in untouched `TransactionTable.tsx`. The
~591 phantom errors of `Q-P29-01` do not appear, because my worktree is outside the repo and
contains no nested worktree for ESLint to walk.

**`format:check`.** Fails on exactly **17** files, all frozen `specs/**` — `DECISIONS.md`,
`DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `SCOPE.json`, seven
`evidence/**`, two `reviews/**`, and `human-scratch.md`. **Zero `src/` or `tests/` offenders, and
none is a P28 file.** Count and membership match the known-good baseline.

---

## 3. The E2E campaign — run by me, 3 x 177 clean

Three consecutive **full-suite** runs, `--retries=0`, `env -u CI` on every run, in my own worktree
`/tmp/mf-p28r3rev` at `8c16063`. Logs are outside the worktree so they cannot pollute the digest:
`/tmp/p28r3rev-e2e-run{1,2,3}.log`, `/tmp/p28r3rev-campaign.log`,
`/tmp/p28r3rev-digest-{pre,post}.txt`.

| run  | digest                             | load at start       | result                |
| ---- | ---------------------------------- | ------------------- | --------------------- |
| pre  | `f46cbb368fc6d55433473f127772e9db` | —                   | —                     |
| 1    | —                                  | 5.82 7.17 6.91      | **177 passed** (4.5m) |
| 2    | —                                  | **10.35** 8.74 7.62 | **177 passed** (4.2m) |
| 3    | —                                  | 7.87 8.21 7.67      | **177 passed** (4.2m) |
| post | `f46cbb368fc6d55433473f127772e9db` | —                   | —                     |

**Digest identical before run 1 and after run 3**, and identical to the value before the five
non-E2E checks, so all six checks are evidence for one tree — and that tree is `8c16063`. It is also
the digest the P28 implementer recorded for its own campaign, so **two independent campaigns in
different worktrees cover the same tree.**

**Zero failures, zero flaky, zero retries**, verified per run rather than inferred from the totals:
`✘` count 0, `N failed` summary lines 0, `N flaky` 0, `retry #` 0. The documented `passkey.spec.ts`
flake did not appear.

> **A grep of mine that looked alarming and was not.** My first failure sweep matched 38-39 lines
> per run on `✘|failed|flaky|timed out|Error:`. Every one is either `[WebServer]` server-log noise
> (`tRPC failed on realtime.revoke: Request authentication failed` and similar, which the suite
> provokes deliberately) or a **test name containing the word "failed"** —
> `onboarding-vault.spec.ts:63` "failed registration leaves no signing session" and
> `undo-redo.spec.ts:311` "a failed offline undo push retries". A pattern broad enough to catch
> every failure mode also catches tests _about_ failure. I re-counted against Playwright's own
> markers before reporting anything, which is why this is a footnote and not a finding.

**Test count 177, confirmed two ways** as the dispatch required. `playwright test --list` reports
`Total: 177 tests in 23 files`, **and** the five new tests demonstrably _execute_ rather than being
silently skipped — all five appear by name in **all three** run logs, which is the `Q-P27-01` check
(an unresolvable import makes Playwright report zero tests rather than failing):

```
date-locale.spec.ts:51:9   › a day-first viewer's typed date is stored as the day they meant
date-locale.spec.ts:68:9   › a month-first viewer's identical keystrokes mean the other date
date-locale.spec.ts:86:9   › the editing presentation carries a two-digit year
date-locale.spec.ts:103:9  › a different-year date rests with a two-digit year, ...
date-locale.spec.ts:123:9  › natural language entry still works
```

**Load discipline (`Q-P27-02`).** `:3000` verified unbound via `ss -ltn` immediately before run 1,
and every candidate process classified by `/proc/<pid>/cmdline` rather than `pgrep -f`. **None of
the three recorded load-sensitive assertions fired** — `duplicates.test.ts:749` and
`vault-maintenance.test.tsx` passed in the unit run, `transactions.spec.ts:804` passed in all three
E2E runs — so no result here rests on an uncontrolled-load measurement.

**Run 2 executed at load 10.35 and is the strongest single result in the package.** Those three
assertions are precisely the ones that fire under contention; none did, at a load higher than any
the implementer saw. Recorded rather than smoothed over, and the same asymmetry stated in §2.7
applies: had run 2 gone red at load 10.35 it would have been _unprovable_ and I would have discarded
it and re-run quiet, not reported a defect.

> **A process reading of mine that was wrong, recorded as method.** I observed load 11.63 as the
> unit suite started and briefly suspected a competing campaign. I checked `ps` sorted by CPU
> **before** drawing the conclusion, and found the culprit was my own `vitest` at 32 workers on a
> 32-core box — no competing Playwright existed. This is the same class as the coordinator's
> monitor-shell false positive (a watcher whose own script text contained `playwright`, so a
> whole-cmdline scan classified it as a campaign and made me report three concurrent campaigns when
> there was one). The general rule I would draw is not "always check `ps`" but something narrower
> and more portable: **the rigour a process reading deserves is proportional to what the conclusion
> authorises.** Mine authorised nothing — I would have re-run either way — so being wrong cost
> nothing. A reading that authorises a destructive act needs the check first.

**An earlier revision of this review recorded this criterion as unrun**, because three apparent
concurrent campaigns held `:3000` and running under them would have produced a result unprovable in
either direction. Two of the three were a coordinator monitoring shell misclassified by a
whole-cmdline scan; only one campaign was ever real. The port was handed over once it genuinely
released, and this section replaces that gap with results. The prior text is preserved in git
history rather than silently overwritten.

---

## 4. The judgement routed to me — `mn-MN` is OUT of scope

**Decided, not overlooked.** Root asked me to rule from the frozen text whether UR-007 reaches
`mn-MN`, whose compact month renders in Roman numerals (`VIII/3`) that `date-fns` cannot parse.

**My ruling: UR-007 does not reach it. This is not part of the verdict, and the implementer was
right to report rather than fix it.**

I verified the implementer's factual claims rather than accepting them.

**Claim 1 — pre-existing and unchanged by rev 03.** Confirmed. Identical output at `1bba42b` and
`8c16063`:

```
2026-08-03  compact="VIII/3" -> null    editing="26.08.03" -> 2026-08-03  OK
2026-01-05  compact="I/5"    -> null    editing="26.01.05" -> 2026-01-05  OK
2025-06-15  compact="25.6.15" -> 2025-06-15   editing="25.06.15" -> 2025-06-15  OK
```

**Claim 2 — no value is unenterable.** Confirmed, and I found the precise mechanism, which is
narrower than "mn-MN is broken". Roman numerals appear **only** in the year-less same-year skeleton:

```
mn-MN  day+month only    : "VIII/03"   <- Roman, same-year resting form only
mn-MN  day+month+year    : "26.08.03"  <- numeric
mn-MN  editing           : "26.08.03"  <- numeric
```

So only the same-year **resting display** is affected. Different-year resting dates and the editing
form are numeric and round-trip cleanly.

**The ruling follows from the frozen text.** `spec.md:51-52` requires that "date entry accepts what
the same locale displays, so a value can be typed back in the form it was shown". The form a user is
ever _shown in an input_ is the editing form: `InlineEditableDate.tsx:191` renders `inputValue` —
the editing presentation — only while focused, and the compact form only while not. A user cannot
type into the compact form, because focusing the cell replaces it. For `mn-MN` the editing form
round-trips correctly, so **the clause is satisfied**: every value can be typed back in the form it
was shown.

Noting the counter-argument so the record shows it was weighed: one could read the clause as binding
_any_ rendered form, including a read-only one. I reject that — the clause is explicitly about what
can be "typed back", which presupposes an input, and the compact form is not one. `spec.md:46`
separately requires the display to use "the locale's ordering and separators", and `VIII/3` is
genuinely `mn-MN`'s own rendering, so the display clause is satisfied too.

**Recommendation, not a requirement:** if `mn-MN` is ever a supported locale in practice, the
same-year compact form would be worth rendering from a numeric skeleton. Worth a follow-up; not
worth widening P28, which is under a narrow-revision instruction.

---

## 5. Required actions

**None. P28 revision 03 is ready to integrate.** All six checks are run and green, including a 3-run
`--retries=0` campaign of my own on the same tree the implementer's campaign covered.

F-5 (§1) is MEDIUM, browser-unreachable, and not a regression — a follow-up ticket, not a
revision 04. Worth pinning with a test that names the class (day and month both in 10..12 under an
order-flipping locale) whenever it is picked up.

---

## 6. Q-proposals for P21 carry-forward

- **Q-P28-08 — A parser serving two display forms cannot be fixed by ordering its candidates.**
  Review 02 proposed adding the editing skeleton "ahead of the numeric ones", and verified it took
  the census to 0. It does — for the editing form. It simultaneously introduces 24 silent-wrong
  compact cases, because where two candidates both parse the same digits, ordering privileges one
  form at the other's expense. I reproduced both directions before believing either. When a fix is a
  _precedence_ change over candidates that serve more than one caller, the census must be re-run for
  **every** form the code serves, not the one the defect was reported against — and a reviewer
  proposing such a fix should verify it the same way before asserting "N failures → 0".

- **Q-P28-09 — Count silent-wrong separately from rejected, and check the locale list, not just the
  total.** Review 02 reported "52 failures across 9 locales"; the true figure at that tree is 66
  across 11, and the two it missed (`so-SO`, `sr-Latn-RS`) are ordinary members of the same class,
  not exotica. A census is a claim about a population, and a total conceals both which members
  failed and how. The split matters most: 23 of the 66 store a wrong value silently, and those are
  the only ones that corrupt data without telling the user. Report population, total, split, and the
  member list — a reader can then tell an undercount from a disagreement.

- **Q-P28-10 — A discriminator that works by re-rendering has a blind spot exactly where its
  discriminating feature is absent.** The shipped fix distinguishes two parses by re-rendering each
  and matching the input, which works because the two skeletons differ in zero-padding. For inputs
  where padding is a no-op — day and month both in 10..12 — the discriminator returns two exact
  matches and silently takes the first. When reviewing any "prefer the candidate that round-trips"
  design, ask what the round trip is _keying on_, then construct the input class where that key is
  constant. That class is where the fix is still broken, and it will not appear in a census built
  from arbitrary dates.
