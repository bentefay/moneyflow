# P28 / UR-007 — Independent Review, Revision 01

- **Reviewer:** `p28-reviewer-01` (distinct fresh context; did not author any part of this package)
- **Requirement:** UR-007, frozen at `specs/010-user-reported-refinements-2/spec.md` lines 40-54
- **Commits reviewed:** `9aaba60` (fix), `a24bcf0` (E2E tests), `9061288` (evidence), plus `d514d47`
  (test hardening, landed after dispatch — see §0.2)
- **Verdict:** **FAIL**

---

## Verdict summary

The package correctly identifies and fixes a genuine data-corruption bug, and the bulk of its work
is sound. I independently confirmed the corruption, the fix, the fallback gating, the round-trip
behaviour, the forward-bias fix, the rejection cases, and the legitimacy of all nine changed
assertions. I also independently agree with root's locale-signal ruling.

It fails on one defect the package itself introduced:

**`formatTransactionDate` renders the literal string `"NaN"` as the date for every locale whose
numbering system is not Latin.** This is a regression against base, in the exact function the
requirement is about. A second, related defect breaks the round-trip for non-Gregorian calendars
(`th-TH`, 43-year shift, and this one does reach storage).

Neither is caught by any test in the package, because all five locales the tests cover are `latn`
and Gregorian.

---

## 0. Preconditions

### 0.1 Frozen source verified

`spec.md` lines 40-54 are the UR-007 section, matching the dispatch's quotation and
`tasks/ur-007.md`. The dispatch's citation is correct.

One dispatch inaccuracy, immaterial to the verdict: the component paths are
`src/components/features/transactions/...`, not `src/components/transactions/...`. The `features/`
segment was dropped. The implementer's evidence flags the same correction.

### 0.2 The tree moved during review — BASE precondition not met

The dispatch set `BASE == HEAD == d6577179` and permitted "a later docs-only advance ... verify the
src/tests diff from `d657717` is empty first". It is not empty.

```
$ git rev-parse HEAD
d514d4720531d51444313e01014ff0a99369b460

$ git log -1 --format='%ci %s' d514d47
2026-08-02 15:48:47 +1000 test: pin the locale parser fallback gate and exact ja-JP ordering

$ git diff --stat d657717 d514d47 -- src tests
 tests/unit/domain/date-format.test.ts | 12 ++++++++----
 tests/unit/domain/date-locale.test.ts | 33 +++++++++++++++++++++++++++++++++
 2 files changed, 41 insertions(+), 4 deletions(-)
```

`d514d47` is a genuine ancestor of `main`, not a dangling amend — checked with
`git merge-base --is-ancestor` (exit 0) and `git branch --contains` (`* main`). Its parent is
exactly `d657717`, so it landed **after** dispatch. When this review began, those same two files
were sitting uncommitted in the shared checkout with mtimes 15:43/15:44, i.e. after the `9061288`
evidence commit at 15:41.

The change is additive and test-only: it pins the numeric-gate cases and replaces the loose ja-JP
alternation regex with exact assertions. It strengthens coverage; it does not weaken it. It is
included in this review.

**Process finding (MEDIUM):** the package was handed to review while the implementer was still
committing to `main` and still running E2E campaigns. Two campaigns from `/tmp/mf-p28` ran during
this review (PIDs 2572528 and 2588190). Per the tree-drift rule, the campaign recorded in the
evidence is evidence for the `a24bcf0` tree only; `d514d47` changed tests, so it does not cover
HEAD.

---

## 1. Findings

### F-1 — HIGH / Bug / regression — `src/lib/utils/date-format.ts:170`

`formatTransactionDate` renders **`"NaN"`** in place of the day and month for every locale whose
resolved numbering system is not `latn`.

```ts
part.type === "day" || part.type === "month" ? String(Number(part.value)) : part.value;
```

`Intl` emits the day and month in the locale's own numerals. `Number("۵")` is `NaN`, and
`String(NaN)` is `"NaN"`.

Verified by importing the **real product module** at HEAD (not a reimplementation):

```
fa-IR  2026-08-03  compact="NaN/NaN"      parse -> null
fa-IR  2025-06-15  compact="۰۴/NaN/NaN"   parse -> null
```

Direct probe of the same expression across numbering systems:

```
bn-BD   ns=beng     -> "NaN/NaN"
my-MM   ns=mymr     -> "NaN/NaN"
ne-NP   ns=deva     -> "NaN-NaN"
ar-SA   ns=arab     -> "NaN‏/NaN"
ar-EG   ns=arab     -> "NaN‏/NaN"
ps-AF   ns=arabext  -> "NaN/NaN"
```

**This is a regression introduced by this package.** Running base `c9be708`'s implementation of the
same function side by side:

```
BASE (pre-fix):  fa-IR 2026-08-03 -> "۵/۱۲"      (a real date)
HEAD:            fa-IR 2026-08-03 -> "NaN/NaN"   (gibberish)
```

Base used `toLocaleString` plus a regex strip, which left non-Latin digits untouched. The rewrite
that correctly fixed the ja-JP positional-strip defect introduced this one.

Affects the transaction table date cell and `ImportTable.tsx:339`, which shares the helper.

**Scope of harm, stated precisely:** this is a display break, not data corruption. `parseLocaleDate`
returns `null` for these inputs, so nothing wrong is written to the vault. It is invisible to the
principal (`en-US`) and to all five locales under test. It is rated HIGH because it is a visible
regression to gibberish in the precise function the requirement governs, and `spec.md:46` says "the
browser's resolved locale" with no restriction to Latin script.

**Fix:** `String(Number(x))` is the wrong primitive. The intent is "drop a leading zero", which must
be done within the locale's own numeral system — or avoided entirely by asking `Intl` for the
unpadded form directly and not post-processing its digits. Add a test locale with a non-Latin
numbering system.

### F-2 — MEDIUM / Bug — `src/lib/utils/date-format.ts:210-245`

`parseLocaleDate` builds a `date-fns` (Gregorian) format string from an `Intl` pattern that may
describe a **non-Gregorian** calendar. Nothing pins `calendar: "gregory"`.

`th-TH` resolves to the Buddhist calendar:

```
th-TH  2026-08-03  editing="03/08/69"  parse -> 2069-08-03    (43-year shift)
th-TH  2025-06-15  editing="15/06/68"  parse -> 2068-06-15
```

The displayed year is BE 2569; parsed back as CE 2069. Unlike F-1, **this one does write to the
vault** through the date cell, so it is a genuine (if narrow) corruption path, and it directly
violates `spec.md:51-52` — the value cannot be typed back in the form it was shown.

**Fix:** pass `calendar: "gregory"` to both `localeDatePattern` and `formatPlainDateParts`. Forcing
it makes `th-TH` render `3/8/26` and round-trip cleanly.

### F-3 — MEDIUM / Evidence accuracy — `evidence/P28/implementation-01.md` §5

States "the worktree has been removed and the main checkout is clean". Both were false as committed:
`/tmp/mf-p28` was live and ran two further campaigns during this review, and the main checkout had
two uncommitted test files at the time.

---

## 2. Per-criterion findings

### 2.1 Corruption fixed at source — PASS

chrono no longer governs the numeric parse path. The `chrono-node` import is gone from
`InlineEditableDate.tsx`; the cell calls `parseLocaleDate` in `handleBlur` and `handleInputChange`.
A locale-derived `date-fns` format drives parsing against an explicit reference anchor.

### 2.2 Fallback genuinely unreachable — PASS

This was the dispatch's sharpest question: if any string the locale parser rejects could reach
chrono, the ambiguity returns.

`isNumericDateInput` gates the fallback on **input shape**, not on the locale parser having failed —
which is the correct design. Any string of digits and separators is refused entry to
`naturalLanguageDate` regardless of why it failed.

Verified against the real module, using day-first strings under `en-US` — the cases that would be
silently rescued in the wrong field order if the gate were absent:

```
parseLocaleDate("15/6/25",  "en-US") -> null
parseLocaleDate("31/12/99", "en-US") -> null
parseLocaleDate("13/1/26",  "en-US") -> null
parseLocaleDate("15/1",     "en-US") -> null
```

Natural language still resolves: `tomorrow` -> `2026-08-03`, `next tuesday` -> `2026-08-04`,
`25 December 2023` -> `2023-12-25`, `15 June 2025` -> `2025-06-15`.

### 2.3 Round-trip — PASS for Latin/Gregorian locales, FAIL for `th-TH` (F-2), FAIL for non-Latin (F-1)

Both directions, compact and editing forms, all clean for `en-AU`, `en-GB`, `en-US`, `de-DE`,
`ja-JP` — the four required by the dispatch plus `en-GB`. Also verified `en-CA`, `ko-KR`, `hu-HU`,
`pl-PL`, `nl-NL`, including the trailing-separator forms that are easy to get wrong (`de-DE "3.8."`,
`ko-KR "8. 3."`).

**Forward-bias case fixed.** The dispatch specifically called this out:

```
parseLocaleDate("15/1", "en-GB", ref=2026-08-02) -> 2026-01-15   (chrono gave January 2027)
parseLocaleDate("1/1",  "en-GB", ref=2026-08-02) -> 2026-01-01
```

Same-year display forms round-trip to the year they were rendered from.

### 2.4 Rejection — PASS

```
"32/1/26"    -> null
"15/13/25"   -> null
"29/2/25"    -> null   (2025 is not a leap year)
"not a date" -> null
""           -> null
"   "        -> null
```

Nothing silently becomes something.

### 2.5 The other three defects — PASS

- **Two-digit year while editing** (`spec.md:50`): `formatDateFull` and its `year: "numeric"` are
  gone; `formatDateForEditing` uses `year: "2-digit"`. Covered in unit, component and E2E tests,
  including a `not.toMatch(/\d{4}/)` guard.
- **`ja-JP` leading-zero strip**: fixed by stripping on field identity rather than position.
  `formatTransactionDate("2001-01-05", ref, "ja-JP")` now gives `01/1/5`, not `1/1/5`. `d514d47`
  replaced the loose alternation regex that let this through with exact assertions.
- **`DateRangeFilter.tsx` `toISOString` day-shift**: fixed via `date-fns`
  `format(date, "yyyy-MM-dd")`. Four tests pin the boundary at 09:00 Brisbane. I agree with root's
  ruling that this is in scope on `spec.md:53-54`.

### 2.6 The nine changed assertions — PASS, all nine legitimate

Audited every one by diffing base `c9be708` against HEAD.

All nine are the single `year <= 2000 -> DD/MM/YYYY` branch, which `spec.md:50` reverses by
requiring two digits in every different-year presentation with no exception below 2000. The dates
themselves are retained, so the 2000 boundary stays covered. The justification is honest and the P25
precedent applies.

Coverage is not weakened:

| metric        | base `c9be708` | HEAD `d514d47` |
| ------------- | -------------- | -------------- |
| `it()` blocks | 18             | 18             |
| `expect()`    | 41             | 43             |

Net **+2** assertions. The other nine original cases are untouched. The one further change in
`d514d47` — the ja-JP alternation regex replaced by three exact assertions — is a strict
strengthening, and is exactly the kind of loose assertion that let defect 1.4 hide.

### 2.7 New tests fail against unmodified code — PARTIALLY VERIFIED

Verified by construction rather than by executing the suites, because the machine was never quiet
enough for a trustworthy run (§3). Running base `c9be708`'s `formatTransactionDate` directly gives
`ja-JP 2001-01-05 -> "1/1/5"`, against the new test's `"01/1/5"` — that assertion demonstrably fails
against unmodified code. The chrono transposition and the `toISOString` shift are likewise
mechanically implied by the base code I read. I did not independently re-run the full pre-fix
suites; the implementer's recorded failure counts are plausible and consistent with the base code,
but are not independently confirmed here.

### 2.8 Type safety and secret safety — PASS

No `as`, `any`, or `!` added in product code across all three changed files. The single
`e.target as Node` at `DateRangeFilter.tsx:155` is pre-existing at base and untouched.

No key material, seed phrase, recovery material, `SUPABASE_JWT_SECRET` value, presence key, invite
fragment or vault plaintext in the diff or the evidence. All test dates are synthetic.

### 2.9 Evidence honesty — PASS on the required disclosure, one inaccuracy

§2 states plainly and without softening that the principal's Chrome resolves `navigator.language` to
`en-US`, and therefore **the reported symptom will not change on their current machine** unless they
set their browser language to `en-AU`. It labels Observed vs Inferred throughout, and correctly
marks as Inferred the claim it could not check. This meets the dispatch's item 9.

The §5 worktree claim is inaccurate — F-3.

---

## 3. The six checks — NOT RUN

**I did not run the six checks or the E2E campaign, and I make no claim about their outcome.**

The dispatch required the campaign run with nothing else heavy on the machine (`Q-P27-02`), and that
`playwright.config.ts` pinning `:3000` with `reuseExistingServer: false` means exactly one campaign
runs repo-wide. Throughout this review the port was held by the implementer's own campaigns:

```
$ readlink /proc/2572615/cwd        -> /tmp/mf-p28
$ readlink /proc/2588328/cwd        -> /tmp/mf-p28
   2572528  Sun Aug  2 15:49:02 2026  timeout 3000 pnpm exec playwright test --retries=0 --reporter=line
   2588190  Sun Aug  2 15:53:37 2026  timeout 3000 pnpm exec playwright test --retries=0 --reporter=line
```

Load average rose from 6.15 to 9.16 during the review. Starting a campaign under that load, or
against a port already serving another campaign, would corrupt both runs and produce a result that
is unprovable either way — precisely the failure `Q-P27-02` exists to prevent. The human's dev
server on :3001 (818156/818182) was never touched.

Because F-1 and F-2 require product changes, the tree must change before any campaign is meaningful.
Spending ~13 minutes of full-suite runs on a tree that is already known to need a fix would be
wasted. **The six checks and the 3-run campaign must be run against the corrected tree**, and the
implementer's recorded campaign does not carry forward: it ran on `a24bcf0`, and `d514d47` has since
changed the tests.

All findings above rest on static analysis and on direct execution of the product module in
isolation, which is cheap and load-insensitive. None depends on a suite run.

---

## 4. The requirements question — root's ruling UPHELD

Root asked me to judge independently whether UR-007 should follow UR-004's currency treatment
(signal = time zone) rather than the browser's resolved locale, and to overturn if I disagreed.

**I independently reach the same conclusion as root. No overturn.** The frozen text decides it:

- `spec.md:46` says "the browser's **resolved locale** ordering and separators". That is a direct
  naming of the signal.
- `spec.md:47`'s worked example is "for an Australian-**English viewer**". `en-AU` is a locale, not
  a location. A viewer, not a place.
- Time zone enters the requirement only at `:53-54`, and only to **forbid** date shifts. It is never
  offered as a source for field ordering.

UR-004's reasoning does not transfer. Currency is a property of where you transact, so location is
the right signal. Date field order is a property of the language you read, so locale is. That the
two conflict on this particular machine is a fact about the machine, not a defect in either ruling.

I note the implementer reached this conclusion independently before receiving root's ruling, and
raised it rather than deciding silently. That is the correct handling of a scope question.

**Consequence, restated so it is not lost:** on the principal's current machine the compact date
will still render month-first, because their Chrome is `en-US`. The frozen text is satisfied; the
reported symptom is not resolved on that machine without a browser language change. Root should
carry this forward to the principal explicitly.

---

## 5. Required actions

1. **F-1 (HIGH):** fix the `NaN` rendering at `date-format.ts:170`. Add coverage for a non-Latin
   numbering system.
2. **F-2 (MEDIUM):** pin `calendar: "gregory"` in the pattern and format helpers. Add a `th-TH`
   round-trip case.
3. **F-3 (MEDIUM):** correct the evidence's §5 worktree claim.
4. Re-run all six checks and the full 3-run `--retries=0` campaign against the corrected tree, on a
   quiet machine, with the per-run digest re-verified before the first and after the last run.
5. Confirm the tree is final before the next review is dispatched.

## 6. Q-proposals for P21 carry-forward

- **Q-P28-01 — A rewritten formatter can regress an entire input class the tests never name.**
  Rewriting `formatTransactionDate` onto `Intl.formatToParts` was correct for all five locales under
  test and produced `"NaN"` for every non-Latin numbering system. Every shipped test passed;
  typecheck and lint were clean. When a package rewrites a formatting or parsing primitive, review
  must import the real module and sweep inputs **off** the tested path — non-Latin numbering
  systems, non-Gregorian calendars, RTL marks — and diff behaviour against the base implementation
  to separate regression from pre-existing defect.

- **Q-P28-02 — Do not dispatch review while the implementer is still working.** This package was
  handed off while its implementer was still committing to `main` and still running E2E campaigns on
  the single shared port. The reviewer cannot run the campaign it is required to run, and the tree
  it is asked to review is not the tree that will ship. A handoff should assert: tree final, nothing
  uncommitted, port released.
