# P29 / UR-008 — Independent Review, Revision 01

- **Verdict: FAIL** — one HIGH regression that imports wrong monetary amounts, plus two MEDIUM
  findings. Everything else in the package verified and is genuinely good work.
- **Reviewer:** `p29-reviewer-01`, distinct from `p29-implementer-01`. I authored none of this code.
- **Requirement:** UR-008, frozen at `specs/010-user-reported-refinements-2/spec.md` lines 56-86
- **Reviewed:** BASE `4c77a2dd6b61a9ab5e58c032d0b0242e579c75f7` .. HEAD
  `7ce8c51c00db8d9177a0a092c5e26c08fe07285c`
- **My worktrees:** `/tmp/mf-p29rev` (HEAD) and `/tmp/mf-p29rev-base` (BASE), both OUTSIDE the repo

Statements are labelled **Observed** (I ran it and read the output) or **Inferred**.

---

## 0. Preconditions, verified myself

The dispatch said it had confirmed these and told me to check anyway.

**Observed.** `git rev-parse HEAD` = `7ce8c51c00db8d9177a0a092c5e26c08fe07285c`.
`git merge-base --is-ancestor 4c77a2d HEAD` succeeds — the base is a real ancestor, **not** the
dangling-amend trap. The shared checkout carried no product or test drift: `git status --porcelain`
showed only `.claude/agent-memory/**` and one P08 evidence file.

**Observed**, scanning `/proc/<pid>/cmdline` for every PID rather than `pgrep -f`: at 17:24 `:3000`
was unbound. The only `next-server` on a port was the human's on `:3001` (PIDs 818156/818182,
`readlink /proc/818156/cwd` = `/home/ben-agents/Code/moneyflow`) — never touched. Orphan
`next-server` PID 3622053 has an unreadable cwd and binds nothing.

**Frozen source citation verified against `SCOPE.json`, not accepted.** The `UR-008` entry carries
`sourceSelector.lineRange` = `"56-86"`, and its `sourceTextLines` array matches `spec.md` lines
56-86 verbatim. Line 56 is the `## UR-008` heading. **The dispatch's citation is correct.**

---

## 1. Verification gates

Run in `/tmp/mf-p29rev`, my own worktree, with `.env.local` copied in.

| gate           | result                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| `typecheck`    | **PASS** — exit 0                                                       |
| `lint`         | **PASS** — 0 errors, 1 pre-existing warning                             |
| `format:check` | **17** files, all pre-existing frozen `specs/**`, **none a P29 file**   |
| `test`         | **PASS** — 2363 passed, 2 skipped, 122 files                            |
| `test:e2e`     | **NOT RUN BY ME** — port unavailable, see §6. `--list` verified at 177. |

The single lint warning is `react-hooks/incompatible-library` at `TransactionTable.tsx:426`, a file
this package does not touch. The 17 format failures are `specs/**` markdown and `human-scratch.md`,
matching the known pre-existing set — **Observed**, none is a P29 file.

**A numeric discrepancy in the evidence that I checked and found HONEST.** Evidence §5 reports
`2316 passed`; I measured `2363`. **Observed:** BASE `4c77a2d` runs `2294 passed | 2 skipped`, and
P29 adds exactly 22 tests (20 in `ur-008-csv-parity.test.ts`, 2 in
`mapping-tab-auto-detect.test.tsx`) — `2294 + 22 = 2316`, the implementer's figure exactly. My extra
47 come from `tests/unit/domain/date-locale.test.ts`, which P28 rev 02/03 commit `42f20be` grew
after P29's evidence was written. **The implementer's number is accurate for the tree it ran on.**
Recorded because a reviewer meeting a count mismatch should not report it as a discrepancy without
doing this arithmetic.

---

## 2. FINDINGS

### F-1 — HIGH — Bug / Requirements — value-driven detection binds `amount` to the WRONG COLUMN on headered files that BASE got right

**File:** `src/lib/import/detection.ts:204-254` (`bestColumn` / `detectColumnMappingsFromValues`)

`bestColumn` returns the column with the highest match rate and **breaks ties leftmost**. A check
number and a running balance both read as amounts, so on a real bank export either can outrank the
genuine Amount column purely by sitting further left. The comment at `:244-248` says amount-like
columns are "set aside first" — but that guard protects only the **description** role. Nothing
protects the **amount** role, which is the one that carries the money.

**A/B through the REAL `useImportState.loadFile`, identical probe in two worktrees. Observed:**

CSV `Date,Check No,Description,Amount` / `2024-01-15,1001,Coffee Shop,-5.50` …

```
BASE mappings {"0":"date","1":"checkNumber","2":"description","3":"amount"}
BASE amounts  -550, -7525, 250000                                    CORRECT
HEAD mappings {"0":"date","1":"amount","2":"description"}
HEAD amounts  100100, 100200, 100300     <-- the CHECK NUMBER imported as the amount
```

CSV `Date,Description,Balance,Amount` / `2024-01-15,Coffee Shop,1000.00,-5.50` …

```
BASE mappings {"0":"date","1":"description","2":"balance","3":"amount"}
BASE amounts  -550, -7525, 250000                                    CORRECT
HEAD mappings {"0":"date","1":"description","2":"amount"}
HEAD amounts  100000, 92475, 342475      <-- the RUNNING BALANCE imported as the amount
```

Every row still reads `status: "valid"`, `errorCount: 0`. **This is silently-wrong financial data
presented as success** — precisely the failure mode evidence §1.4.2 correctly identifies as the
worse one. It is a regression: BASE's header-name matching handled both files correctly.

**Why the suite is green — and it is worse than "the fixture happens to pass".** The only headered
fixture, `ur-008-csv-parity.test.ts:251`, is `Date,Description,Amount,Balance` — the one arrangement
where the correct column is already leftmost among the numeric ones. **Observed**, running the same
three rows in both arrangements:

```
Amount leftmost  (the shipped fixture): {"0":"date","1":"description","2":"amount"}
Balance leftmost (same data reordered): {"0":"date","1":"description","2":"amount"}
```

**The two arrangements return the IDENTICAL mapping.** In the shipped fixture index 2 is the Amount;
in the reordered one index 2 is the Balance. The assertion at `:262` compares mappings, so it cannot
distinguish the correct answer from the defective one — the fixture does not vary along the axis the
code branches over. This is the `Q-P28-03` shape in a new domain: a well-formed table that is
constant where the code is conditional. **A fixture whose correct amount column is NOT the leftmost
numeric one is mandatory in the fix, and it must assert the imported AMOUNTS, not the mapping.**

**The selection is deterministic, not an occasional tie-break accident. Observed:** 200 repetitions
of `detectColumnMappingsFromValues` on the check-number rows produced **1 distinct result**. The
reducer at `:215` uses `entry.rate > best.rate` — strictly greater — so on a tie the first entry
survives and the leftmost wins every time. A check-number column and a real amount column both score
1.0 against `looksLikeAmount`, so the wrong column wins on every import of such a file, not
sporadically.

**Two comments assert a protection the code does not provide**, which is why this survived review by
reading:

- `:243-245` — "Columns that read as amounts are set aside first, so a trailing balance column does
  not win the role". True of the DESCRIPTION role only: `remaining` feeds nothing else. Nothing
  guards the amount role against a second numeric column.
- `:201-202` — `bestColumn`'s own docstring: "Ties fall to the leftmost column, which matches the
  order a bank export conventionally puts its columns in". This is precisely the assumption F-1
  falsifies — a check number and a running balance are both conventionally placed left of, or
  adjacent to, the amount.

This also means the frozen requirement is not met as written for these files. The frozen text says
"a column whose values parse as amounts once currency symbols and signs are accounted for is the
amount" — with two such columns, choosing by position is not choosing by values.

**Fix.** Make the amount role discriminate between competing numeric columns rather than taking the
leftmost. Concretely: prefer a column that is not monotonically non-decreasing/non-increasing (a
running balance trends; transaction amounts do not), and/or prefer one containing negative or
explicitly-signed values, and deprioritise integer-only columns with no decimal part (check
numbers). Whatever rule is chosen, add fixtures for `Date,Check No,Description,Amount` and
`Date,Description,Balance,Amount` asserting the imported AMOUNTS, not just the mapping — and assert
through `useImportState.loadFile` so the assertion covers the path the user hits.

### F-2 — MEDIUM — Requirements / Bug — `merchant`, `memo`, `checkNumber` and `balance` mappings are silently dropped on headered files

**File:** `src/lib/import/detection.ts:229-260`

`detectColumnMappingsFromValues` returns at most three keys. The load path at
`use-import-state.ts:365` now uses it as the sole source of `columnMappings`, so on a headered file
these four roles — which `autoDetectColumnMappings` populated at BASE and which
`MappingTab.TARGET_FIELDS` still offers — arrive unmapped.

**Observed**, headers `Date,Description,Merchant,Memo,Amount`: BASE
`{0:date,1:description,2:merchant,3:memo,4:amount}`; HEAD `{0:date,1:description,4:amount}`.

I verified the blast radius before rating this: **Observed**, `columnMap.get` is called only for
`"date"`, `"amount"` and `"description"` (`use-import-state.ts:677,692,716`), so no imported field
changes value. It is MEDIUM rather than HIGH for that reason — the user loses pre-filled mappings in
the Columns tab and must set them by hand, a UX regression against BASE rather than data corruption.

**Fix.** Either keep the header-name result as a fallback for the roles value-driven detection does
not decide (merging value-driven answers over it, so the headerless case is unaffected), or state
explicitly in the evidence that these four roles are deliberately no longer auto-mapped and why.

### F-3 — MEDIUM — Evidence — §1.4.1's table records the button's headered answer but not the load path's

**File:** `specs/007-human-scratch-completion/evidence/P29/implementation-01.md:120-124`

The table gives the headered row as load `{0:date,1:description,2:amount}` versus button
`{…,3:balance}`. That correctly captures the divergence being fixed, but reading it, a coordinator
would take the load-path column as the desired answer. It does not record that the load path had
just **stopped** producing `3:balance` relative to BASE, nor that with the columns in a different
order the same mechanism binds `amount` to the wrong column (F-1). The evidence is not false; it is
silent at exactly the point where the regression lives.

**Fix.** When rev 02 records the F-1 fix, state the headered-file behaviour as a BASE-vs-HEAD
comparison across at least the four column arrangements, not just the one the fixture uses.

---

## 3. What I verified and found CORRECT

Everything below was checked against the frozen text and reproduced, not accepted.

**All five defects genuinely fixed.** Reproduced at BASE in `/tmp/mf-p29rev-base` and confirmed at
HEAD:

| defect                      | BASE (Observed)                                           | HEAD (Observed)                             |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| leading `+`                 | `parseNumber("+69.00")` = NaN                             | 69                                          |
| `collapseWhitespace`        | `false` at `types.ts:154` and `schema.ts:242`             | `true`, schema now sources the one constant |
| headerless column detection | `{}`                                                      | `{0:date,1:amount,2:description}`           |
| `hasHeaders` discarded      | headerless file yields **2 of 3 rows**, 0 valid, 2 errors | **3 of 3 rows**, 3 valid, 0 errors          |
| Auto-detect button          | calls back with `{}` — would WIPE correct mappings        | same value-driven answer                    |

**The two averted regressions are real, and I reproduced both rather than accepting the
description.** The `hasHeaders` one is the sharper proof: **Observed** at BASE, loading the 3-row
headerless fixture through the real hook gives `rowcount=2`, `hasHeaders=true`. The first data row
is gone. At BASE that is masked because nothing parses at all (`0 valid, 2 errors`); after a
detection-only fix it would have shipped as "n-1 of n rows import, looks like success". The claim is
accurate and the framing in §1.4.2 is warranted, not self-congratulation. Likewise the button:
**Observed** at BASE via the real rendered component, `onMappingsChange` is called once with `{}`.

**The six labels, exactly as the principal specified.** `ImportSummary.tsx:96-133` renders
`Total Rows` / `Valid` / `Errors` / `Duplicates (will be marked)` / `Old New (excluded)` /
`Old Duplicates (excluded)`. Qualifiers intact and inside the label rather than a `detail` line, so
`readStatCard`'s `exact: true` can distinguish `Duplicates (will be marked)` from
`Old Duplicates (excluded)`.

**The partition is structural, and I proved it by mutation rather than by reading.** Added a sixth
`PreviewTransactionStatus` case with no matching count and ran `pnpm typecheck`. **Observed:**
`types.ts(375,5): error TS2740` and `types.ts(376,9): error TS2345` — the reducer stops returning
`ImportSummaryStats`; `ImportTable.tsx(69,47): error TS2366` also fires. **Omitting a count is a
compile error, exactly as claimed.** Restored the file and confirmed `git diff` clean.

I also checked the widening's blast radius: **Observed**, `PreviewTransactionStatus` appears nowhere
in `src/lib/crdt/schema.ts` and is never persisted — it is preview-UI state only, so the 4-to-5 case
change carries no migration risk. `grep` for `"filtered"` and `filteredCount` finds no orphan: the
one surviving `filteredCount` is `DuplicatesTab`'s optional display prop, fed the combined old count
at `ImportPanel.tsx:459`. The implementer's nomination of this as the widest blast radius was a fair
call, and it is clean.

**An empty column cannot win the description role.** The dispatch said column 4, the task file said
column 3. **Observed**, re-measuring `~/Downloads/CSVData.csv` myself: 622 rows, all width 4, and
the empty column is index **3** — the task file is right, the dispatch's "column 4" is the 1-based
restatement. Either way `bestColumn` scores it 0 against a `>= 0.8` threshold, so it cannot win.
**Observed:** `{0:date,1:amount,2:description}`, `mappings["3"]` undefined. I re-measured every
other figure independently too: 15 leading-`+` rows, 10 comma-containing descriptions, 611
descriptions with a run of 2+ spaces, 240 dates with first field ≤12 and 382 above, first row
`30/06/2026`. **All match.**

**`inferDateFormat` uses the whole column; a 5-row sample could not pass it.** **Observed** at BASE
with the sampling detector rebound in: the 12-value fixture returns `MM/dd/yyyy` — wrong. At HEAD it
returns `dd/MM/yyyy`, and still does when the column is reversed so the disambiguating value sits
first. The fixture sizing is justified: the first eleven values all have a leading field ≤12, so any
opening-rows sample is uniformly ambiguous, and only the twelfth settles it.

I swept `inferDateFormat` well past its tests. **Observed:** conflicting evidence
(`["30/06/2026","06/30/2026"]`) returns `null` rather than guessing; 20% unparseable still resolves,
50% returns `null`; invalid days (`32/06/2026`) return `null`; ISO, dotted, dashed and single-digit
layouts all resolve. No off-path input produced a wrong non-null answer. Same for `parseNumber`
across 24 sign/symbol/separator permutations — `"+"`, `"++1.00"`, `"+abc"`, `"+-5"`, `"+1e3"`,
`"+69,00"` all correctly NaN; `"(+69.00)"` = -69 is defensible.

**Judging the three things the implementer flagged.**

- **`CLASSIFICATION_THRESHOLD = 0.8`.** I accept it. The implementer was right that it is the
  least-forced number here, and my sweep is what makes me comfortable: a column of free text scores
  near 0 and a real date column near 1.0, so the decision is not close to the boundary for realistic
  input, and 0.8 tolerates a malformed row without costing the mapping. **Observed:** 20% bad still
  resolves, 50% does not. Note this constant is **not** implicated in F-1 — that is the tie-break,
  not the threshold.
- **The fixed month-first tie-break, deliberately not locale-derived.** Correct, and correctly
  reasoned. A bank file must mean the same thing wherever it is opened; deriving from the viewer's
  locale would make the same file import differently for two members of one vault, which in a shared
  encrypted vault would produce divergent data with no visible cause. It is documented at
  `detection.ts:142-147`, tested at `:309`, and preserves BASE's reading. Right call.
- **The `PreviewTransactionStatus` widening.** Verified above — exhaustive, unpersisted, no orphans.

**Every new test fails at BASE, reproduced in MY OWN tree, never the shared checkout.** I rebound
the new-module imports to their BASE counterparts so assertions ran against old code. **Observed: 13
of 20 fail**, including `expected NaN to be 69`, `expected false to be true`,
`expected {} to deeply equal {…}`, and the principal's own date defect as
`expected 'MM/dd/yyyy' to be 'dd/MM/yyyy'`. The `MappingTab` test proved separately:
`expected "vi.fn()" to be called with arguments: [ Array(1) ]`. **This matches the implementer's
report exactly.** The disclosed silent-skip is real and the disclosure is the right call — I hit the
same pnpm-refuses-a-symlinked-`node_modules` wall the evidence describes in §8.2 and worked around
it by invoking vitest directly.

**The `DuplicatesTab` reorder is a pure move.** I did not take the claim on trust: **Observed**,
`sort` of the BASE file and `sort` of the HEAD file `diff` to nothing. Only order changed. The
cutoff block now follows the RadioGroup in DOM order, so tab order and reading order match the
visual order.

**Type safety.** **Observed**, scanning all ten changed product files for `as`, `any` and `!`: no
new occurrences. The two `as` casts in `DuplicatesTab.tsx:144,151` are pre-existing and untouched by
the move — `git diff` confirms neither line changed.

**Secret safety — the reasoning is sound and I verified it independently.** I diffed every fixture
and the evidence file against all 622 real rows myself.

- The only real description appearing anywhere is `PAYMENT RECEIVED, THANK YOU`, and the only real
  amounts are `+69.00`/`-69.00` and generic values. **Observed:** `PAYMENT RECEIVED, THANK YOU`
  appears at `spec.md:67` and `+69.00` at `spec.md:63` — **both are published verbatim in the frozen
  spec, which is committed**. The argument holds: they were already in the repository before this
  package, so reusing them discloses nothing new, and the frozen text names them as the exact forms
  that must parse. I accept it.
- `30/06/2026` likewise appears at `spec.md:76`.
- The remaining collisions are values too generic to identify anyone: `-5.50` (18 pre-existing
  occurrences in BASE tests), `-50.00` (8), `-75.25` (1), and two dates used only as ambiguity
  examples. None is a real row — I checked that no real (date, amount, description) triple appears
  together anywhere.
- No key material, seed phrase, recovery material, `SUPABASE_JWT_SECRET`, presence key, invite
  fragment or vault plaintext appears in any changed file.

**Evidence honesty.** Each disclosure checked:

| disclosure                                      | verdict                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| edits landed in the shared checkout             | **Accurate** — main's tree carries no P29 drift and HEAD is where it should be                                         |
| pnpm store perturbation                         | **Accurate** — I reproduced the same refusal with a symlinked `node_modules`                                           |
| tautological test comparing fn to itself        | **Accurate** — the replacement renders the real component and clicks the real button; it fails at BASE, so it can fail |
| silent-skip made the naive BASE proof worthless | **Accurate** — the `Q-P27-01` shape, and the rebinding workaround is sound                                             |
| worktree lint problem and relocation            | **Accurate in mechanism** — I placed mine at `/tmp` for this reason and got 0 errors                                   |
| three load-sensitive assertions                 | **Accurate** — correctly identified and correctly not re-rolled silently                                               |

Labelling is used properly throughout: `Observed` claims are ones I could reproduce, and the one
`Inferred` claim (§1.6, why the row loss never surfaced) is genuinely an inference and is marked as
one. **I found no dishonest or overstated claim in the evidence.** F-3 is a gap in coverage, not a
misstatement.

**Leaving the dead implementations in place: I judge this CORRECT.** **Observed**,
`grep -rn '<ColumnMappingStep\|<FormattingStep'` over `src/` and `tests/` returns nothing — both
components are unmounted, confirming the dispatch's own correction. Their helper exports are still
consumed, so deletion has real churn, and doing it inside this package would have mixed a cleanup
with a data-correctness fix. Recording it as a charter recommendation is the right disposition.
**Caveat:** `autoDetectColumnMappings` should not be deleted until F-2 is settled, since restoring
the dropped roles may want it.

---

## 4. The dispatch's two disproved claims — corrections verified

Both corrections are right, and I re-derived them rather than accepting them.

- **"Nothing runs detection on load" is FALSE.** **Observed** at BASE through the real hook: loading
  a headerless CSV yields `mappings={}` with `hasHeaders=true` — detection ran and returned nothing.
  It cannot succeed because `parseRawRows` synthesises `["Column 1".."Column 4"]`.
- **`FormattingStep.tsx` is dead code and there are THREE implementations.** Confirmed above. The
  live single-sample heuristic is `detectDateFormat` at `tabs/FormattingTab.tsx:85-119`;
  **Observed**, the `firstPart > 12` logic sits at `:97`, `:104` and `:114`.

The reshaping matters: it is what makes the reported date failure "the detector received an empty
array", not "the detector guessed wrong". **Observed:** `detectDateFormat(["30/06/2026"])` returns
`"dd/MM/yyyy"` correctly at BASE, so the 240-of-622 measurement is a real latent defect but not the
reported cause. The implementer got this right.

---

## 5. Requirement-by-requirement

| frozen requirement (lines 62-86)                | verdict                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| leading `+` parses positive, other forms kept   | **MET** — swept 24 permutations                                                                                                |
| quoted field with delimiter stays one field     | **MET** — columns do not shift                                                                                                 |
| `collapseWhitespace` default true, all types    | **MET** — both `types.ts` and `schema.ts`                                                                                      |
| detection runs automatically, no header row     | **MET**                                                                                                                        |
| detection identifies columns from VALUES        | **PARTIAL — F-1/F-2**: headerless correct; headered can bind `amount` to a balance or check number                             |
| date format from values, day-first, no header   | **MET** — whole column, not a sample                                                                                           |
| summary splits old-new from old-duplicate       | **MET** — six labels, structural partition                                                                                     |
| every reported error genuinely unparseable      | **MET** for the reported file; but F-1 creates the inverse defect — rows that parse to the WRONG amount and are reported valid |
| CSV and OFX of the same data import identically | **MET** for the reported headerless shape                                                                                      |

---

## 6. E2E — NOT RUN BY ME, and why

I did not run the campaign. Stating that plainly rather than reporting a partial result as a pass.

**This was a sanctioned decision, not an omission.** I raised the question to root before taking the
port, and root ruled **(b): FAIL now, without the campaign**, explicitly overriding its own
dispatch's "RUN ALL SIX CHECKS" — the same call it made for `p28-reviewer-01`, on the reasoning that
three runs is ~13 minutes of evidence for a tree nobody will ship once a product fix is known to be
required. Our messages crossed: I had independently reached the same recommendation and sent it
before the ruling arrived. The rev 02 campaign runs against the corrected tree.

**Observed.** At 17:24 `:3000` was free. At **17:33:03** a P28 rev 03 campaign took it — PID 2948622
`timeout 3000 pnpm exec playwright test --retries=0 --reporter=line`, cwd `/tmp/mf-p28r3`, with its
dev server PID 2948727 on `:3000`. `playwright.config.ts` pins `:3000` with
`reuseExistingServer: false`, so exactly one campaign can run repo-wide.

My own `pnpm test` unit run finished at **17:26:48**, six minutes before their campaign began, so
neither run perturbed the other. `Q-P27-02` respected: I ran nothing heavy once their campaign was
live.

**What I did verify without the port. Observed:** `playwright test --list` reports **Total: 177
tests in 23 files**, and both new tests appear by name —
`import.spec.ts:1721:9 › headerless CSV auto-detects columns and dates and imports with no errors`
and
`import.spec.ts:1800:9 › re-import names old-new and old-duplicate separately and still partitions`.
This matches the implementer's count and rules out the `Q-P27-01` silent-skip shape at list time.
Tree digest over all `src`/`tests` `.ts`/`.tsx` excluding `next-env.d.ts`:
`745e0aca5eed2d4772252fe09da18546`.

**I would not have accepted a campaign on this tree anyway.** The verdict is FAIL on F-1, the fix
touches `src/lib/import/detection.ts`, and a campaign run now would be evidence for a tree about to
change. The right sequencing is: fix F-1 and F-2, then I run three consecutive full-suite
`--retries=0` runs with a per-run digest against the corrected tree in rev 02.

**Reading the two E2E tests rather than running them:** both are well built. `readStatCard` locates
by label with `exact: true` and reads the sibling value from the parent rather than by position, so
it does not depend on the grid reflow — and `exact` is genuinely load-bearing, since
`Duplicates (will be marked)` is a substring of nothing but `Old Duplicates (excluded)` contains
`Duplicates`. Both tests assert the partition arithmetic rather than only the labels, and the first
deliberately never clicks Auto-detect, which is what makes it a test of detection-on-load.
`createTestFile` uses a UUID suffix, avoiding the known cross-worker clock-collision class.
**Neither test would catch F-1**, since both use the headerless fixture.

---

## 7. Q-proposals

- **Q-P29-04 — a replacement heuristic must be A/B'd over the input class the OLD one handled.**
  When a package swaps one detection strategy for another rather than extending it, the new tests
  are written from the reported failure and are structurally silent about what the old strategy
  already got right. F-1 was invisible to a green 2363-test suite and would have been invisible to a
  green E2E campaign. The check that finds it is: drive the REAL entry point over a sweep of inputs
  in both a BASE and a HEAD worktree and diff the results. Recommend this become a standing reviewer
  obligation for any "now value-driven / now locale-driven / now inferred" change.
- **Q-P29-05 — a "set X aside first" guard usually protects one role only.** `detection.ts:246-248`
  excludes amount-like columns from the description role and reads, in review, as though it protects
  the mapping generally. It does not protect the amount role from other numeric columns. Worth a
  standing prompt: for each role a classifier assigns, ask what competes for THAT role.

---

## 8. Verdict

**FAIL.**

Blocking: **F-1**. Also fix **F-2** and address **F-3** in the rev 02 evidence.

I want to be clear about proportion, because the package is otherwise strong: the five fixes are
real, the two averted regressions are genuine and I reproduced both, the partition is structurally
enforced rather than asserted, the whole-column date inference is correct and well justified, the
fixture sizing is reasoned, the tie-break decision is right, the disclosures are accurate and
unprompted, and the secret-safety argument holds. F-1 is a single tie-break in one helper. But it
imports a check number or a running balance as a transaction amount and reports it as valid, in an
application whose entire subject is money, so it blocks.

No product, test, ledger, marker, scratch, SCOPE, spec or FINAL-AUDIT file was modified by me. My
worktrees `/tmp/mf-p29rev` and `/tmp/mf-p29rev-base` are clean; all probe files were removed after
each run.
