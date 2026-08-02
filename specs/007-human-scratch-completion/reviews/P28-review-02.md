# P28 / UR-007 — Independent Review, Revision 02

- **Reviewer:** `p28-reviewer-02` (distinct fresh context; did not author any part of this package,
  and is not `p28-reviewer-01`)
- **Requirement:** UR-007, frozen at `specs/010-user-reported-refinements-2/spec.md` lines 40-54
- **BASE == HEAD:** `1bba42b24006b7ec4093bcd8709641a5c1f393c0` — confirmed
- **Reviewer worktree:** `/tmp/mf-p28r2` (own; no other `/tmp/mf-*` or `.claude/worktrees/*`
  touched)
- **Verdict:** **FAIL**

---

## Verdict summary

Everything revision 02 set out to fix, it fixed. I independently confirmed all three defects and all
three cures against the real product module, reproduced the 44-test base failure myself, and ran all
six checks plus a clean three-run E2E campaign. Every property revision 01 passed still holds.

It fails on one defect neither revision named, which I found by sweeping inputs off the tested path
as `Q-P28-01` prescribes:

**`parseLocaleDate` derives its candidate parse formats from the `numeric` skeleton, but
`formatDateForEditing` renders the `2-digit` skeleton.** For locales where `Intl` gives those two
skeletons a different field order or different separators, the editing presentation cannot be typed
back — the exact clause at `spec.md:51-52` that revision 02 existed to repair. **Confirmed
end-to-end in a real browser: a `te-IN` viewer shown `15-06-25` who types that string back stores
the wrong date.**

This is not a regression. Base `c9be708` has neither `formatDateForEditing` nor `parseLocaleDate` —
both are new in P28. It is a new capability shipped incomplete, on the requirement's own central
clause.

---

## 0. Preconditions — all verified independently

### 0.1 Frozen source

```
$ sha256sum specs/010-user-reported-refinements-2/spec.md
a137e38848db04c656169c97e4ff5b862feec6ca29d6e6069c81c2c279dc95c5
$ wc -lc specs/010-user-reported-refinements-2/spec.md
  86 4902
```

Matches `SCOPE.json` `SRC-USER-REPORTED-REFINEMENTS-2` exactly (`sha256`, `lineCount: 86`,
`byteCount: 4902`). Lines 40-54 are the UR-007 section verbatim. **The dispatch's citation is
correct** — I checked it against `SCOPE.json` rather than against `tasks/ur-007.md` alone.

### 0.2 Handoff preconditions — verified via `/proc`, not `pgrep`

The dispatch stated it had confirmed these and told me to verify anyway. I did, enumerating
`/proc/<pid>/cmdline` directly so the checking command could not match itself.

| precondition          | observed                                                                          |
| --------------------- | --------------------------------------------------------------------------------- |
| `:3000` unbound       | **confirmed** — `ss -ltn` showed no `:3000` listener                              |
| no campaign anywhere  | **confirmed** — no `playwright`/`vitest` process in any `/proc` entry             |
| implementer worktree  | **confirmed gone** — `/tmp/mf-p28` absent from `git worktree list`                |
| HEAD final            | **confirmed** — `1bba42b`, tree clean apart from `next-env.d.ts`                  |
| human dev server safe | `:3001` PIDs 818156/818182, `cwd=/home/ben-agents/Code/moneyflow` — never touched |

One orphan `next-server (v16.2.6)` (PID 3622053) exists with an unreadable root-owned `cwd`. It
holds no port and did not interfere. Not mine; left alone.

**All handoff preconditions held.** `Q-P28-02` was honoured.

---

## 1. Findings

### F-4 — HIGH / Bug / Requirements — `src/lib/utils/date-format.ts:286-306`

`parseLocaleDate` builds its candidate formats from **one** skeleton:

```ts
const withYear = localeDatePattern(resolvedLocale, {
    day: "numeric",
    month: "numeric",
    year: "2-digit"
});
```

`formatDateForEditing` renders a **different** one (`date-format.ts:250-254`):

```ts
return formatPlainDateParts(date, resolveLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
});
```

`Intl` does not guarantee those two skeletons share a field order or a separator, and for a real
minority of locales they do not. Nothing parses what the editing form emits.

**Observed in Chromium's own ICU**, which is what users actually run — a census over 112 locales
executed inside the running app:

```
CHROMIUM ICU: 4 of 112 locales have parse/edit skeleton skew

it-CH: parse=d"/"m"/"y   edit=d"."m"."y
lv-LV: parse=d"."m"."y"." edit=d"."m"."y
sr-RS: parse=d". "m". "y"." edit=d"."m"."y"."
te-IN: parse=d"/"m"/"y   edit=d"-"m"-"y
```

**Observed end-to-end in the real app** — the decisive evidence. Seed a known date, focus the cell,
read exactly what it displays, type that same string straight back, reload, and read it again:

```
it-CH: seeded 2025-06-15, cell showed "15.06.25",  retyped verbatim -> after reload "15.06.25"  OK
lv-LV: seeded 2025-06-15, cell showed "15.06.25",  retyped verbatim -> after reload "15.06.25"  OK
sr-RS: seeded 2025-06-15, cell showed "15.06.25.", retyped verbatim -> after reload "15.06.25."  OK
te-IN: seeded 2025-06-15, cell showed "15-06-25",  retyped verbatim -> after reload "25-06-15"  *** BROKEN ***
en-AU: seeded 2025-06-15, cell showed "15/06/25",  retyped verbatim -> after reload "15/06/25"  OK
```

**`te-IN` is a live data-corruption path.** The viewer is shown `15-06-25`. They retype precisely
that. `te-IN`'s parse skeleton uses `/`, so the `-`-separated string fails every candidate format,
falls through to the ISO candidate `yyyy-MM-dd`, and `15-06-25` parses as **year 15**… which
`date-fns` resolves and stores such that the cell then redisplays `25-06-15`. The date the user
confirmed is not the date in the vault, and nothing tells them.

`it-CH`, `lv-LV` and `sr-RS` survive in-browser only because Chromium's ICU happens to render their
`numeric` and `2-digit` skeletons with the same separator, unlike Node's. I am reporting the browser
numbers as the blast radius because the browser is where the product runs.

**Under Node's ICU 76.1 (i.e. what `vitest` and every unit test in this package see)** the same
defect is much wider — 52 failing cases across 9 of 114 locales, of which 14 silently store a wrong
date and 38 are rejected outright:

```
ckb-IQ 2026-08-03 editing "٢٦-٠٨-٠٣" -> 0026-08-03      (year corrupted)
mt-MT  2026-08-03 editing "03/08/26"  -> 2026-03-08      (day/month transposed)
te-IN  2026-08-03 editing "03-08-26"  -> 0003-08-26      (year corrupted)
ug-CN  2026-08-03 editing "26-08-03"  -> 2026-03-08      (day/month transposed)
it-CH  2026-08-03 editing "03.08.26"  -> null            (rejected)
lv-LV  2026-08-03 editing "03.08.26"  -> null            (rejected)
sr-RS  2026-08-03 editing "03.08.26." -> null            (rejected)
tg-TJ  2026-08-03 editing "03/08/26"  -> null            (rejected)
yo-NG  2026-08-03 editing "03 08 26"  -> null            (rejected)
```

That the two engines disagree is itself the point: the defect's reach is an ICU-version accident, so
it can widen under a Chromium upgrade without a line of this code changing.

**Not a regression.** Base `c9be708` exports neither function — I confirmed by importing the base
module directly and enumerating its exports:

```
BASE EXPORTS: formatDate, formatDateCompact, formatTransactionDate, parseDate,
              getWeekStartDay, getTodayISO, isValidISODate
```

So there is nothing to regress from. This is a new capability, shipped incomplete, on
`spec.md:51-52` — the requirement's own round-trip clause.

**Why no test caught it:** the round-trip table asserts `parseLocaleDate(formatDateForEditing(...))`
across nine locales, which is the right shape — but all nine are locales where the two skeletons
happen to agree. The table names three axes (non-Latin numerals, non-Gregorian calendar, year-first
order) and does not name this fourth one: _the editing skeleton is not the parsing skeleton_.

**Fix.** Derive the editing skeleton too and add it to `candidateFormats`, ahead of the numeric
ones:

```ts
const editing = localeDatePattern(resolvedLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
});

const candidateFormats = [
    patternToDateFnsFormat(editing, "yy"),
    patternToDateFnsFormat(editing, "yyyy"),
    patternToDateFnsFormat(withYear, "yy")
    // ... existing candidates unchanged
];
```

**I verified this fix rather than merely proposing it.** Applied to a scratch copy of the module and
re-censused: **52 failures → 0**, across all 114 locales and six dates. And it regresses nothing —
every property revision 01 passed still holds under it:

```
OK   en-US 15/6/25 must be null: got null
OK   en-US 31/12/99 must be null: got null
OK   en-US 13/1/26 must be null: got null
OK   en-US 15/1 must be null: got null
OK   en-GB 15/1 -> 2026-01-15: got "2026-01-15"
OK   en-GB 32/1/26 null / 15/13/25 null / 29/2/25 null
OK   en-GB tomorrow: got "2026-08-03"
OK   th-TH 03/08/26: got "2026-08-03"
```

The fix must land with a test that names the axis: assert the round trip for at least `te-IN` and
`sr-RS`, and ideally assert the general property that the editing skeleton is always parseable.

---

## 2. Per-criterion findings

### 2.1 F-1, the NaN regression — PASS

`grep -c 'String(Number(part.value))'` is **0**. The fix strips the locale's own zero digit,
obtained from `Intl.NumberFormat`, via `localeZeroDigit` / `stripLeadingZeroDigit`.

**Confirmed by importing the real product module**, not a reimplementation, across every locale the
dispatch named and more:

```
fa-IR 2026-08-03 compact="۸/۳"    editing="۲۶/۰۸/۰۳" parseC=2026-08-03 parseE=2026-08-03
bn-BD 2026-08-03 compact="৩/৮"    editing="০৩/০৮/২৬" parseC=2026-08-03 parseE=2026-08-03
ar-EG 2026-08-03 compact="٣‏/٨"   editing="٠٣‏/٠٨‏/٢٦" parseC=2026-08-03 parseE=2026-08-03
my-MM 2026-08-03 compact="၃/၈"    editing="၀၃/၀၈/၂၆" parseC=2026-08-03 parseE=2026-08-03
ne-NP 2026-08-03 compact="८-३"    editing="२६/०८/०३" parseC=2026-08-03 parseE=2026-08-03
ps-AF 2026-08-03 compact="۸-۳"    editing="۲۶-۰۸-۰۳" parseC=2026-08-03 parseE=2026-08-03
```

Real dates in each locale's own numerals, and each parses back to the ISO date it came from. Swept
`ar-SA` and `1999-12-31`/`2026-01-05`/`2026-10-09` besides; no `NaN` anywhere.

**Confirmed in a real browser too:** `fa-IR` renders editing `۲۶/۰۸/۰۳`, resting `۸/۳`, survives a
reload, and round-trips.

### 2.2 F-2, the Buddhist calendar — PASS, pinned at both call sites

`grep -c 'calendar: "gregory"'` is **1** — a single `GREGORIAN_IN_UTC` constant. The dispatch asked
me to confirm it reaches **both** `Intl` call sites. It does; I enumerated every one in the module:

| line | call                  | pinned?                                                  |
| ---- | --------------------- | -------------------------------------------------------- |
| 34   | `Intl.DateTimeFormat` | **yes** — `...GREGORIAN_IN_UTC` (`formatPlainDateParts`) |
| 78   | `Intl.DateTimeFormat` | **yes** — `...GREGORIAN_IN_UTC` (`localeDatePattern`)    |
| 204  | `Intl.NumberFormat`   | n/a — numbering system, no calendar                      |
| 216  | `Intl.NumberFormat`   | n/a — numbering system, no calendar                      |

Both `DateTimeFormat` sites are pinned. `th-TH` round-trips cleanly:

```
th-TH 2026-08-03 compact="3/8"    editing="03/08/26" parseC=2026-08-03 parseE=2026-08-03
th-TH 2025-06-15 compact="15/6/25" editing="15/06/25" parseC=2025-06-15 parseE=2025-06-15
th-TH 1999-12-31 compact="31/12/99" editing="31/12/99" parseC=1999-12-31 parseE=1999-12-31
```

Also verified with explicit calendar extensions, which is the sharper test: `th-TH-u-nu-thai`,
`fa-IR-u-ca-persian` and `ar-SA-u-ca-islamic` all round-trip cleanly, so the pin beats an explicitly
requested non-Gregorian calendar and not merely a default one.

**Confirmed in a real browser.** A `th-TH` context typing `03/08/26` and reloading shows `03/08/26`,
never `03/08/69`. I ran that sequence **12 consecutive times: 12/12 correct, 0 occurrences of
`69`.**

> Disclosure, because it bears on how much weight to give this line: my _first_ manual browser run
> returned `03/08/69` and I initially took it for a live F-2 failure. It did not survive scrutiny.
> Re-run under the repo's own worker profile, under a single worker, and 12 times in a row, it never
> recurred, and a probe inside the page confirmed Chromium honours `calendar: "gregory"` for `th-TH`
> (`pinned="03/08/26" cal=gregory` vs `unpinned="03/08/69" cal=buddhist`). The original reading came
> from a scratch spec of mine whose earlier steps left the cell holding a different value; the fault
> was in my probe, not the product. **F-2 is fixed.** I record this because a reviewer's discarded
> result should be visible rather than quietly dropped.

### 2.3 The third defect, non-Latin numeral parsing — PASS, real and correctly fixed

**The defect is real.** `date-fns` parses Latin digits only, so before `toLatinDigits` a viewer
shown `۱۵/۰۶/۲۵` could not type it back. I confirmed this directly: running the HEAD test file
against the `d514d47` product code, the non-Latin round-trip cases fail with
`expected null to be '1999-12-31'` — the parser rejecting the locale's own output.

**The fix is correct.** `toLatinDigits` builds its map from `Intl.NumberFormat(locale).format(0..9)`
and rewrites only characters found in that map, leaving everything else untouched.

**It does not corrupt Latin input** — the dispatch's specific concern. Verified against the real
module:

```
fa-IR "2025-06-15" -> 2025-06-15      th-TH "15/06/25" -> 2025-06-15
bn-BD "15/06/25"   -> 2025-06-15      my-MM "15/06/25" -> 2025-06-15
ne-NP "2025-06-15" -> 2025-06-15      ar-EG "2025-06-15" -> 2025-06-15
```

Latin digits typed under a non-Latin locale still parse, because Latin characters are simply absent
from the substitution map and pass through. A locale whose zero digit _is_ Latin gets an identity
map. I also checked for a subtler hazard the fix would be vulnerable to — `Intl.NumberFormat` and
`Intl.DateTimeFormat` resolving to **different** numbering systems, which would make the map wrong.
Swept 44 locales including forced-numbering-system tags (`en-US-u-nu-arab`, `de-DE-u-nu-deva`,
`ja-JP-u-nu-hanidec`, `en-GB-u-nu-beng`): **zero skew**. The two always agree.

### 2.4 The 44 tests failing at `d514d47` — PASS, reproduced independently

Reproduced in **my own** worktree (`/tmp/mf-p28r2-base`, `git worktree add --detach d514d47`), never
the shared checkout. I placed the HEAD test file over the base product code and verified both by
hash before running:

```
product  9f21fea299ef81edba930d2292943254  == git show d514d47:src/lib/utils/date-format.ts
test     401075ec12bd6624a4d49822fd18f144  == git show 1bba42b:tests/unit/domain/date-locale.test.ts
```

Result:

```
Test Files  1 failed (1)
     Tests  44 failed | 87 passed (131)
```

**Exactly 44 — the implementer's count is accurate.**

**And the assertions genuinely ran** — this is the `Q-P27-01` check, and it passes decisively: 87
tests _passed_ alongside the 44 failures. A vacuous run from an unresolvable import reports zero
tests, not 131. Representative failures, one per defect class:

```
expected 'NaN/NaN' to be '۸/۳'                  (F-1, non-Latin numerals)
expected 'NaN/NaN' to be '৩/৮'
expected '03/08/69' to be '03/08/26'            (F-2, Buddhist calendar)
expected '2069-08-03' to be '2026-08-03'
expected null to be '1999-12-31'                (F-3, Latin-digit-only parsing)
```

All three classes reproduce against old code. The tests are load-bearing.

### 2.5 The locale table 5 → 9 — PASS, no case weakened

The four added locales each genuinely exercise the class claimed for them, verified against `Intl`
rather than assumed:

| locale  | class claimed                      | verified                                           |
| ------- | ---------------------------------- | -------------------------------------------------- |
| `th-TH` | non-Gregorian default calendar     | resolves `buddhist` unpinned; renders `69` at base |
| `fa-IR` | non-Latin numerals + non-Gregorian | resolves `persian` unpinned, numbering `arabext`   |
| `bn-BD` | non-Latin numerals                 | numbering `beng`                                   |
| `ar-EG` | non-Latin numerals + RTL marks     | numbering `arab`, output carries `U+061C`          |

`ar-EG` is the strongest of the four: its output contains an RTL mark, so it exercises a non-digit
character surviving both the numeral substitution and the parse.

**Nothing was weakened or removed.** The entire tests diff from `d514d47` to HEAD removes exactly
**one** line — the five-locale array, replaced by a nine-locale array containing all five originals:

```
-        const locales = ["en-AU", "en-GB", "en-US", "de-DE", "ja-JP"] as const;
```

The `isoDates` array is untouched. Coverage in that file rises strictly:

| metric      | `d514d47` | HEAD `1bba42b` |
| ----------- | --------- | -------------- |
| `it` blocks | 16        | **20**         |
| `expect()`  | 26        | **34**         |

### 2.6 Everything revision 01 passed — PASS, all still hold

Re-verified against the real module at HEAD, after revision 02's changes:

**Nine changed assertions** — unchanged since revision 01 reviewed them; `git diff d514d47..HEAD`
touches `date-format.test.ts` not at all.

**Chrono fallback unreachable** for any string the locale parser accepts:

```
parseLocaleDate("15/6/25",  "en-US") -> null
parseLocaleDate("31/12/99", "en-US") -> null
parseLocaleDate("13/1/26",  "en-US") -> null
parseLocaleDate("15/1",     "en-US") -> null
```

Natural language still resolves: `tomorrow -> 2026-08-03`, `next tuesday -> 2026-08-04`,
`25 December 2023 -> 2023-12-25`, `15 June 2025 -> 2025-06-15`.

**Round trip across ten locales** — clean for every Latin/Gregorian locale revision 01 checked, plus
the new four, plus 30 more I swept. Only the F-4 locales fail, which is the finding above.

**Rejections:** `32/1/26`, `15/13/25`, `29/2/25`, `not a date`, `""`, `"   "` — all `null`.

**Forward bias fixed:** `15/1 -> 2026-01-15`, `1/1 -> 2026-01-01` under `en-GB`.

**ja-JP field-identity strip:** `formatTransactionDate("2001-01-05", ref, "ja-JP")` gives `01/1/5`.

**Two-digit year in editing**, no four-digit leakage, including the new locales: `en-AU "31/12/99"`,
`de-DE "31.12.99"`, `ja-JP "99/12/31"`, `th-TH "31/12/99"`, `fa-IR "۹۹/۱۲/۳۱"`.

**`DateRangeFilter` time-zone fix** intact — `format(date, "yyyy-MM-dd")`, four boundary tests at
09:00 Brisbane still present and passing.

### 2.7 The six checks — ALL RUN, all pass

Run in my own worktree `/tmp/mf-p28r2` at `1bba42b`, `.env.local` copied in for the realtime
integration tests.

| check          | result                                                           |
| -------------- | ---------------------------------------------------------------- |
| `typecheck`    | **PASS** — `tsc --noEmit`, exit 0                                |
| `lint`         | **PASS** — 0 errors (see note)                                   |
| `format:check` | **PASS for P28** — exactly **17** pre-existing frozen `specs/**` |
| `build`        | **PASS** — compiled successfully                                 |
| `test`         | **PASS** — 120 files, **2341 passed / 2 skipped**                |
| `test:e2e`     | **PASS** — 3 × 175, see campaign                                 |

**On the lint hazard.** The dispatch warned that a bare `pnpm lint` reports ~591 errors and ~18,700
warnings, all under `.claude/worktrees/p29-ur008`, and asked me to report the bare number with that
attribution. **I can do better than attribute it — I disproved it as a P28 issue.** My worktree at
`/tmp/mf-p28r2` contains no nested worktree, and a bare `pnpm lint` there reports:

```
✖ 1 problem (0 errors, 1 warning)
```

One pre-existing `react-hooks/incompatible-library` warning in untouched `TransactionTable.tsx`. The
~591 errors do not exist in a clean checkout of this tree; they are entirely an artifact of ESLint
walking another package's worktree. **Root's attribution is correct.** Linting P28's eight changed
files explicitly also exits 0.

**`format:check`** fails on exactly 17 files, all frozen `specs/**` (`DECISIONS.md`,
`DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `SCOPE.json`, seven
`evidence/**`, two `reviews/**`, `human-scratch.md`). **Zero `src/` or `tests/` offenders; none is a
P28 file.** Count and membership match the known-good baseline.

### E2E campaign

Three consecutive **full-suite** runs, `--retries=0`, **never** `CI=true`, in my own worktree:

| run  | digest                             | result                |
| ---- | ---------------------------------- | --------------------- |
| pre  | `709f713d1b4b6e5ee445ea3463f89263` | —                     |
| 1    | `709f713d1b4b6e5ee445ea3463f89263` | **175 passed** (4.6m) |
| 2    | `709f713d1b4b6e5ee445ea3463f89263` | **175 passed** (4.1m) |
| 3    | `709f713d1b4b6e5ee445ea3463f89263` | **175 passed** (4.1m) |
| post | `709f713d1b4b6e5ee445ea3463f89263` | —                     |

Digest is over tracked `src`, `tests`, `package.json`, `pnpm-lock.yaml`, `playwright.config.ts`,
**excluding `next-env.d.ts`**. **Identical before run 1 and after run 3**, so all three runs are
evidence for one tree, and that tree is `1bba42b`.

Zero failures, zero flaky, zero retries. The documented `passkey.spec.ts` flake did not appear.

**Test count 175, confirmed two ways** as the dispatch required: `playwright test --list` reports
`Total: 175 tests in 23 files`, **and** the new tests demonstrably _execute_ rather than being
silently skipped — all five `date-locale.spec.ts` tests appear individually numbered in every one of
the three run logs:

```
[11/175] date-locale.spec.ts:51:9  › a day-first viewer's typed date is stored as the day they meant
[12/175] date-locale.spec.ts:68:9  › a month-first viewer's identical keystrokes mean the other date
[13/175] date-locale.spec.ts:86:9  › the editing presentation carries a two-digit year
[14/175] date-locale.spec.ts:103:9 › a different-year date rests with a two-digit year, ...
[15/175] date-locale.spec.ts:123:9 › natural language entry still works
```

**Load discipline (`Q-P27-02`).** `:3000` observed free via `ss -ltn` immediately before run 1; load
average 2.74 on 32 cores at start. **Neither wall-clock-sensitive assertion failed** —
`duplicates.test.ts:749` passed in the unit run and `transactions.spec.ts:804` passed in all three
E2E runs — so no result here rests on an uncontrolled-load measurement. **I did not run `vitest`
during the E2E campaign**; the unit suite was run to completion beforehand.

Run 3 was killed mid-flight at test 75 by my own tool-call timeout, not by any product failure. I
verified the port was released and no orphan remained, then **restarted run 3 from the beginning**
rather than counting the partial. The digest was re-verified at that restart and was unchanged. The
table above is three complete runs.

**Port released.** I reported completion to root the moment the campaign finished, before writing
this review, so the queued P29 campaign could start. `:3000` is now held by P29's own dev server. I
ran my manual browser checks on port **3210** to avoid contending for it, and stopped that server
afterwards. The human's `:3001` was never touched.

### 2.8 Type safety and secret safety — PASS

Swept every added line across all three product files for the banned constructs. The only `as` in
added product code is:

```ts
} as const satisfies Intl.DateTimeFormatOptions;
```

a literal assertion, explicitly permitted by the dispatch and idiomatic under
`.claude/rules/typescript-style.md` ("Use ... `as const` literals", "Leverage the type system fully
... `satisfies`"). No `any`. No non-null `!`. The one `e.target as Node` in `DateRangeFilter.tsx` is
pre-existing at base and untouched.

The new helpers are pure, take their inputs explicitly, and return new values — consistent with the
repo's functional bias. `toLatinDigits` builds an immutable `Map` per call and uses
`Array.from(...).map(...).join("")` rather than mutation.

**Secret safety:** swept the full `src`/`tests` diff and the evidence document for key material,
seed phrase, recovery material, `SUPABASE_JWT_SECRET` value, presence key, invite fragment and vault
plaintext. **None present.** The only match in the evidence is its own disclosure sentence. All test
dates are synthetic.

### 2.9 Evidence honesty — PASS

**The §5 worktree claim is corrected**, and corrected well. The evidence now carries an explicit
retraction naming the reviewer's finding, stating plainly that the earlier claim "was false when
committed", and — the part that matters — drawing the general lesson: "I have stopped asserting a
cleanliness state as a durable fact — it is a claim with a timestamp." That is a better fix than
deleting the sentence.

**Each superseded campaign is marked as evidence only for its own tree.** §5 states the campaign ran
against `1c4a4cc`, that "revision 01 results are superseded and are not carried forward", and
records the two earlier campaigns explicitly as "**neither is the evidence for this handback**,
because the tree has since changed". This is the discipline the tree-drift rule asks for.

> One immaterial note, not a finding and not affecting the verdict: §5 says the campaign ran against
> `1c4a4cc`, and two docs-only commits (`a853f49`, `b6866e5`) landed after it. I verified
> `git diff 1c4a4cc 1bba42b -- src tests` is **empty**, so the recorded campaign does cover HEAD's
> product and test code. My own campaign is against `1bba42b` directly in any case.

**The en-US consequence is stated plainly and unsoftened.** §2 says, at root's instruction and
without hedging, that implementing UR-007 as frozen "**will not change what the principal sees on
their current machine**", that "their browser genuinely resolves to `en-US`", that this "is not a
partial fix or a deferred one", and that their remedy is to change their browser language. It also
correctly labels as _Inferred_ the one claim it could not observe. This meets the requirement.

I independently confirmed the underlying fact rather than taking it on trust: a default Chromium
context on this host reports `navigator.language = en-US`, while an `en-AU` context reports `en-AU`
— and under `en-AU` the product already renders day-first.

---

## 3. The judgement routed to me — `formatDate` / `formatDateCompact` are OUT of scope

**Decided, not overlooked.** Root asked me to rule from the frozen text whether UR-007 covers
`formatDate` and `formatDateCompact`, which render non-Gregorian years for `th-TH` and `fa-IR`.

**My ruling: they are out of scope. This is not part of the FAIL, and the implementer was right both
to leave them and to record them.**

I verified the implementer's two factual claims rather than accepting them:

**Claim 1 — pre-existing at base.** Confirmed. Both functions are byte-identical between `c9be708`
and `1bba42b`; the diff touches neither. The behaviour is genuinely inherited, not introduced.

**Claim 2 — no product callers, tests only.** Confirmed independently. There are exactly two product
importers of the module in the entire `src` tree:

```
src/components/features/import/ImportTable.tsx:21   imports formatTransactionDate
src/components/features/transactions/cells/InlineEditableDate.tsx:27
                                                    imports formatDateForEditing,
                                                            formatTransactionDate,
                                                            parseLocaleDate
```

Neither imports `formatDate` or `formatDateCompact`. The only importer of either is
`tests/unit/transactions/date-format.test.ts`.

**The ruling follows from the frozen text.** `spec.md:42` governs how dates "are **presented**", and
every clause under "Required behaviour" is about what a viewer is **shown** or what they may **type
back**. A function with no product caller presents nothing to any viewer and accepts nothing from
one. It is unreachable code as far as the requirement is concerned, so no clause of UR-007 binds it.
The observed non-Gregorian rendering is a latent hazard for a _future_ caller, not a present
violation.

Deliberately noting the counter-argument so the record shows it was weighed: one could read "dates
must be presented using the viewer's locale" as binding every date-formatting function in the
codebase pre-emptively. I reject that reading — it would make UR-007 unbounded, pulling in any
future helper regardless of whether it ever reaches a screen, and the frozen text gives no support
for reaching past what is presented.

**Recommendation, not a requirement:** when a caller is next added for either function, pin
`GREGORIAN_IN_UTC` at that point. The constant already exists and is exported-adjacent within the
module, so the fix is one spread operator. Worth a follow-up ticket; not worth widening P28.

---

## 4. Required actions

1. **F-4 (HIGH):** derive the `2-digit` editing skeleton in `parseLocaleDate` and add it to
   `candidateFormats` ahead of the numeric ones. Verified to take the failure census from 52 to 0
   with no regression.
2. **Add a test that names the axis** — _the editing skeleton is not the parsing skeleton_. At
   minimum `te-IN` and `sr-RS` round-trip cases; better, a property asserting that for every locale
   in the table, `parseLocaleDate(formatDateForEditing(iso, l), l) === iso` where the two skeletons
   differ. The existing nine-locale table cannot catch this because all nine agree.
3. **Re-run all six checks and a fresh 3-run `--retries=0` campaign** against the corrected tree,
   with the per-run digest re-verified before the first and after the last.
4. Confirm the tree is final and the port released before the next review is dispatched — the
   handoff discipline this revision got right.

Everything else in this package is sound and needs no further work.

---

## 5. Q-proposals for P21 carry-forward

- **Q-P28-03 — A round-trip test proves nothing unless the two halves use the same skeleton.** This
  package's round-trip table is correctly shaped — it asserts `parse(format(iso)) === iso` rather
  than pinning literals — and still missed F-4 entirely, because all nine locales in it are ones
  where `Intl` renders the `numeric` and `2-digit` skeletons identically. A formatter and its parser
  can be derived from _different_ `Intl` option sets, and a locale table that never contains a
  locale where those diverge cannot detect the divergence. When a package derives a format and a
  parse pattern from separate `Intl` calls, review should compare the two **skeletons** directly
  across a wide locale sweep, not merely round-trip the locales the package chose.

- **Q-P28-04 — Node's ICU is not the browser's ICU, and the gap can hide or inflate a defect.**
  F-4's blast radius is 9 of 114 locales under Node's ICU 76.1 and 4 of 112 under Chromium's. Three
  locales that fail every unit-level check (`it-CH`, `lv-LV`, `sr-RS`) work correctly in the real
  browser, and the defect's reach would change under a Chromium upgrade with no code change at all.
  A package whose behaviour is governed by `Intl` should be verified in **both** engines: `vitest`
  alone will misstate the user-visible impact in either direction, and a browser-only check can miss
  what a future ICU will expose.

- **Q-P28-05 — A reviewer's own probe can manufacture a defect; re-run before reporting it.** My
  first manual browser run appeared to show F-2 unfixed (`th-TH` rendering `03/08/69`). It was an
  artifact of my own scratch spec leaving the cell in an unexpected state, and it vanished under 12
  consecutive clean re-runs plus an in-page `Intl` probe. Had I reported it, the implementer would
  have been sent to re-fix working code — the mirror image of missing a real defect, and just as
  costly. Before reporting any manually-observed failure, re-run it in isolation, re-run it several
  times, and probe the underlying primitive directly to separate a product defect from a harness
  defect. This complements `Q-P28-01`: sweeping off the tested path finds real defects, and also
  produces false ones.
