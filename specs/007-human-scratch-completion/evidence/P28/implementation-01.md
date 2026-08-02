# P28 / UR-007 — Implementation Evidence, Revision 01

- **Requirement:** UR-007, frozen at `specs/010-user-reported-refinements-2/spec.md` lines 40-54
- **Base:** `c9be708e9b48c3bf06eae61bfda5067f2819e536`
- **Commits:** `9aaba60` product + unit tests, `a24bcf0` E2E spec, `d514d47` fallback-gate and ja-JP
  test hardening, plus this evidence

Statements below are labelled: **Observed** means I ran it and read the output; **Inferred** means I
reasoned to it and did not confirm it directly.

---

## 0. Frozen source verification

The dispatch cited `spec.md` lines 40-54 and asked me to verify rather than trust it.

**Observed.** `sha256sum specs/010-user-reported-refinements-2/spec.md` yields
`a137e38848db04c656169c97e4ff5b862feec6ca29d6e6069c81c2c279dc95c5`, and `wc -l -c` yields 86 lines /
4902 bytes. All three match `SCOPE.json`'s `SRC-USER-REPORTED-REFINEMENTS-2` entry exactly. Lines
40-54 are the UR-007 section verbatim, matching `sourceTextLines`. The citation is correct.

One path correction to the dispatch: `InlineEditableDate.tsx` lives at
`src/components/features/transactions/cells/`, not `src/components/transactions/`. Line numbers
46-53 and 118 were accurate.

---

## 1. The investigation, and what actually reproduced

The dispatch's central instruction was to establish what reproduces before writing product code, and
to report plainly if the package turned out smaller than the report implied.

**Root's reading of `formatTransactionDate` was accurate in every particular** — it resolved
`locale ?? navigator.language` with an `en-GB` fallback, used `toLocaleString` for order and
separator rather than a hardcoded pattern, and already gave an `en-AU` viewer day-first output. The
headline framing of the report ("all dates display in US format") was **wrong about the display
code**.

It was not, however, wrong that something was broken. Four defects reproduced, and the most serious
one was not a display bug at all.

### 1.1 Date entry parsed in US order — a data-corruption path

`InlineEditableDate.tsx:13` imported `parseDate` from `chrono-node`'s default export, which is the
US-ordered `en` parser.

**Observed**, running chrono directly:

| input        | `chrono.en.casual` | `chrono.en.GB` |
| ------------ | ------------------ | -------------- |
| `03/08/2026` | **8 March 2026**   | 3 August 2026  |
| `3/8`        | **8 March 2026**   | 3 August 2026  |

So a day-first viewer typing back the `03/08` the cell had **just displayed to them** saved the
eighth of March. This writes a wrong date into the vault rather than merely showing one oddly, and
it is invisible whenever the day is 12 or lower. This is the defect the principal most likely hit.

**Observed** end to end, which is the strongest evidence in this package. Reverting only the product
code in an isolated worktree and re-running the new E2E spec against an `en-AU` browser context:

```
Expected: "03/08/26"
Received: "08/03/2026"
```

### 1.2 Year-less entry carried a forward-date bias

Separate from ordering. **Observed** with reference 2 Aug 2026: `chrono.en.GB.parseDate("15/1")`
returns **15 January 2027**. The same-year display form therefore did not round-trip to the date it
was rendered from, under any locale. `spec.md:51-52` is violated twice over.

### 1.3 Editing rendered a four-digit year

`formatDateFull` used `year: "numeric"`. `spec.md:50` requires two digits. **Observed**: pre-fix E2E
gave `15/06/2025` where `15/06/25` is required. Root's candidate 1, confirmed.

### 1.4 A leading-zero year was corrupted in year-first locales

`stripLeadingZerosExceptYear` assumed the year was the **third** numeric part. **Observed** via
vitest against unmodified code: `formatTransactionDate("2001-01-05", ref, "ja-JP")` returned `1/1/5`
— the leading `01` year was read as a day and stripped. Not in the dispatch's list; found by reading
the helper. No existing test caught it, because the `ja-JP` case at `date-format.test.ts:120-125`
asserts a loose regex.

### 1.5 A real time-zone shift in range filtering

`DateRangeFilter.tsx:35` did `date.toISOString().split("T")[0]` on a local-midnight `Date`.
`toISOString` converts to UTC first, so the boundary lands a day early for every viewer east of
Greenwich.

**Observed** under `TZ=Australia/Brisbane`, with the clock pinned to 09:00 on 2 Aug 2026: the range
end was emitted as `2026-08-01`. Squarely inside `spec.md:53-54` ("no displayed value shifts because
of a time zone"). Outside the dispatch's surface list; found by grepping the date surfaces.

---

## 2. The locale signal — reported, not silently decided

The dispatch flagged this as the subtle one and told me to establish it empirically and to say so
rather than quietly picking a signal. **I did not decide it myself; I raised it with root before
writing product code.**

**Observed.** Launching Chromium via the repo's own `@playwright/test` on this host:

| context           | `navigator.language` | resolved locale | time zone            |
| ----------------- | -------------------- | --------------- | -------------------- |
| default           | **`en-US`**          | `en-US`         | `Australia/Brisbane` |
| `locale: "en-AU"` | `en-AU`              | `en-AU`         | `Australia/Brisbane` |

Corroborated by `LANG=en_US.UTF-8`, `timedatectl` reporting `Australia/Brisbane (AEST, +1000)`, and
Chrome's own `Preferences` carrying `intl.selected_languages: "en-US,en"`. This is exactly UR-004's
environment.

**The consequence, stated plainly:** the principal's browser resolves to `en-US`, so
`formatTransactionDate` was rendering month-first for them _correctly per its own contract_.
UR-007's frozen text at `spec.md:46` says "the browser's **resolved locale**", and its worked
example is "for an **Australian-English viewer**" — a statement about `en-AU`, a locale, not about a
viewer sitting in Australia.

**This package implements the frozen text literally: locale is the signal.** I raised the question
with root before writing product code rather than choosing a signal myself, and **root ruled (A),
literal frozen text, locale only.** Root's reasoning, recorded here because it is the load-bearing
justification for this package's shape: UR-004 `spec.md:78-79` makes currency follow the **time
zone** because money is about _where you are_, while UR-007 `spec.md:46-47` makes date order follow
the **resolved locale** because `03/08` is a _writing convention_, not a geographic fact. The two
requirements are not in conflict — they answer different questions, so UR-004's precedent does not
generalise to this one. UR-007 mentions time zone exactly once, at `:53-54`, and only to forbid
displayed values shifting because of one.

**The consequence, stated plainly and without softening, at root's explicit instruction:**
implementing UR-007 exactly as frozen **will not change what the principal sees on their current
machine.** Their browser genuinely resolves to `en-US`, so the compact date will still render
month-first for them. This is not a partial fix or a deferred one — the display code is behaving
correctly under the requirement as written. **Their remedy is to set their browser language to
`en-AU`, at which point the code already works.** Root is reporting that to the principal directly.

What this package _does_ change for them regardless of browser language is the data-corruption bug
in §1.1: dates they type are no longer silently transposed before being written to the vault.

**Inferred, not observed:** that the principal would still describe the display as wrong after this
change. I cannot observe their browser configuration, only this host's default.

---

## 3. What changed

`src/lib/utils/date-format.ts`

- `formatTransactionDate` rewritten onto `Intl.DateTimeFormat.formatToParts`. Day/month padding is
  now stripped **by field identity rather than by position**, which is what fixes 1.4. The
  `year <= 2000` four-digit branch is gone: every different-year presentation is two digits.
- New `formatDateForEditing` — the editing presentation, two-digit day, month and year, in the
  locale's own order.
- New `parseLocaleDate` — derives the locale's field order and separator from `Intl`, builds a
  date-fns format from it, and tries year-bearing, four-digit-year, year-less and ISO forms in turn.
  The locale form therefore always wins over natural language.
- Formatting anchors at UTC midnight and formats with `timeZone: "UTC"`, so a calendar date never
  routes through an instant whose civil date depends on the host zone.

The parser follows the repo's existing idiom at `csv.ts:254` (date-fns with an explicit reference
date) rather than adding a dependency. Natural language is retained as a fallback, but numeric input
can never reach it — `isNumericDateInput` gates it, so `3/8` cannot be silently re-read US-first.

`InlineEditableDate.tsx` — uses the two new helpers; the local `formatDateFull` and the chrono
import are gone. `DateRangeFilter.tsx` — `formatDate` uses `date-fns` `format` instead of
`toISOString`.

Repo hard rules: no `as`, no `any`, no `!` in the product code added. **Observed** via `pnpm lint`
and `pnpm typecheck`, both clean.

---

## 4. Tests, and proof they fail without the change

The dispatch required that a new test be proved to fail against unmodified code.

**New:** `tests/unit/domain/date-locale.test.ts` (84 cases),
`tests/unit/transactions/date-cell-locale-entry.test.tsx` (11),
`tests/unit/transactions/date-range-timezone.test.tsx` (4), `tests/e2e/date-locale.spec.ts` (5).

Round-trip coverage is table-driven across `en-AU`, `en-GB`, `en-US`, `de-DE` and `ja-JP`, asserting
that both the compact and editing forms parse back to the ISO date they were rendered from.
Time-zone coverage drives month and year boundaries under five zones spanning UTC-11 to UTC+14.

**Observed failures against unmodified code**, each reverted and restored:

| suite                       | result before fix                                              |
| --------------------------- | -------------------------------------------------------------- |
| `date-locale.test.ts`       | 6 behavioural failures incl. `expected '1/1/5' to be '01/1/5'` |
| `date-cell-locale-entry`    | 6 failed / 5 passed, incl. the day/month transposition         |
| `date-range-timezone`       | 4 failed, all `expected '2026-08-01' to be '2026-08-02'`       |
| `date-locale.spec.ts` (E2E) | 4 failed, incl. `Expected "03/08/26" / Received "08/03/2026"`  |

### The fallback gate, and a first attempt that proved nothing

Root required that the natural-language fallback be unreachable for any string the locale parser
accepts, or the removed ambiguity returns. My first test for this asserted that `3/8` under `en-AU`
yields 3 August and that `32/1/26` is rejected.

**Observed: those assertions passed with the gate deleted.** They were worthless. Numeric input the
locale parser _accepts_ never reaches the fallback either way, and `32/1/26` is rejected by chrono
too, so neither case distinguishes the gate from its absence.

Probing the real module for the case that does, I found the actual hole. It is not the one I had
guessed:

| input      | locale  | with gate | gate removed     |
| ---------- | ------- | --------- | ---------------- |
| `15/6/25`  | `en-US` | `null`    | **`2025-06-15`** |
| `31/12/99` | `en-US` | `null`    | **`1999-12-31`** |

Under `en-US` the order is month-first, so a leading `15` or `31` is not a month and the string is
not a date that viewer could have been shown. Without the gate the day-first fallback silently
rescues it in a _different field order_ — the precise ambiguity root warned about, reintroduced
through the back door. The rewritten test asserts these cases and **fails with the gate removed**
(`expected '2025-06-15' to be null`), which the first version did not.

The `ja-JP` assertion at `date-format.test.ts` was likewise tightened from a two-way alternation
regex to exact expectations, and **verified to fail against the true pre-fix helper** at `c9be708`
with `expected '1/1/5' to be '01/1/5'`. An earlier attempt to verify this via `git stash` was a
no-op, because the helper was already committed and so nothing was stashed; checking out the base
revision explicitly was required to get a real result.

### Existing tests changed, and why

Nine assertions in `tests/unit/domain/date-format.test.ts` changed. **Every one is the same thing:**
they encoded the `year <= 2000` → `DD/MM/YYYY` branch. `spec.md:50` requires two digits in every
different-year presentation and grants no exception below 2000, so this requirement **reverses**
that contract, exactly as P25 reversed the locale-primary currency tests. The dates themselves were
retained so the 2000 boundary stays covered, and a comment in the file records the reversal. The
other 9 of the original 18 cases are untouched and still pass.

---

## 5. Six checks

Run against `d514d47`, the final commit.

| check          | result                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typecheck`    | **PASS** — clean                                                                                                                                        |
| `lint`         | **PASS** — 0 errors, 1 pre-existing warning in untouched `TransactionTable.tsx`                                                                         |
| `format:check` | **PASS for P28** — fails on exactly **17** pre-existing frozen `specs/**` files; **observed** zero `src/` or `tests/` offenders, and none is a P28 file |
| `build`        | **PASS** — compiled successfully                                                                                                                        |
| `test`         | **PASS** — 120 files, 2294 passed / 2 skipped                                                                                                           |
| `test:e2e`     | **PASS** — see campaign below                                                                                                                           |

### E2E campaign

Test count **170 at base → 175**, `playwright test --list` confirming all 5 new tests are
discovered. Per `Q-P27-01`, I checked that the new spec **executes** rather than being silently
skipped: all five appear individually numbered in each run log (`[1/175]`-style), and the total
moved from 170 to 175.

The tree changed after the fallback-gate hardening, so the earlier campaign was discarded rather
than carried forward — a repeated-run campaign is evidence only for the tree it ran on. The campaign
below was restarted from run 1 against `d514d47`. Three consecutive **full-suite** runs,
`--retries=0`, **never** `CI=true`:

| run  | digest                             | result                |
| ---- | ---------------------------------- | --------------------- |
| pre  | `637849fd1d3509b36c5d7afd1a65cf36` | —                     |
| 1    | `637849fd1d3509b36c5d7afd1a65cf36` | **175 passed** (4.4m) |
| 2    | `637849fd1d3509b36c5d7afd1a65cf36` | **175 passed** (4.1m) |
| 3    | `637849fd1d3509b36c5d7afd1a65cf36` | **175 passed** (4.2m) |
| post | `637849fd1d3509b36c5d7afd1a65cf36` | —                     |

Digest is a content hash over tracked `src`, `tests`, `package.json`, `pnpm-lock.yaml` and
`playwright.config.ts`, **excluding `next-env.d.ts`** which `next dev` rewrites on every start.
Identical before run 1 and after run 3, so all three runs are evidence for one tree. Zero flaky,
zero retries; **observed** by grepping each log for failure markers and finding none outside test
titles.

(The superseded campaign against `a24bcf0`, digest `0a3f572cbb9a93f96d95a7bb96144a97`, was also 3 x
175 passed. It is recorded here for completeness but is **not** the evidence for this handback.)

**Load discipline** (`Q-P27-02`): port 3000 was **observed** free via `ss -ltnp` immediately before
each campaign started, and load was 2.3-2.7 across 32 cores. The human's dev server on :3001
(PID 818182) was never touched. Because that server holds Next 16's distDir-scoped dev lock on the
main checkout, the campaign ran in an isolated worktree at `/tmp/mf-p28` with `.env.local` copied
in; the worktree has been removed and the main checkout is clean. Both `pnpm test` runs were
deliberately deferred until load fell below 2.5, since `duplicates.test.ts:749` is a wall-clock
ratio assertion; both passed in a quiet window.

---

## 6. Scope assessment

The dispatch asked for a plain answer on whether the package is smaller than the report implies.

**It is not simply "hardcoded US format", and it is not smaller — it is materially different.** Root
was right that the display helper was already locale-aware, and had this been dispatched as a "make
dates locale-aware" fix, the working display code would have been churned for nothing. But the
entry-parsing bug underneath the report is **more serious** than the display issue would have been,
because it silently writes wrong dates into the vault, and it was invisible to the entire existing
test suite.

Surfaces checked and deliberately **not** changed: `AccessMembersSection.tsx:31`,
`InviteLinkGenerator.tsx:161` and `TemplateTab.tsx:69` all pass `undefined` as the locale, which
already defers to the browser. `ImportTable.tsx:339` shares `formatTransactionDate` and inherits the
fixes. People and accounts render no bare dates.

**Secret-safety:** no key material, seed phrase, recovery material, JWT secret, presence key, invite
fragment or vault plaintext appears in the code, tests or this document. All test dates are
synthetic.
