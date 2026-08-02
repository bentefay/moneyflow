# P29 / UR-008 — Implementation Evidence, Revision 01

- **Requirement:** UR-008, frozen at `specs/010-user-reported-refinements-2/spec.md` lines 56-86
- **Base:** `4c77a2dd6b61a9ab5e58c032d0b0242e579c75f7`
- **Rev 02 BASE:** `74b37f9a4c490c4b31560a83c131b6f7e55965c7`
- **Rev 03 BASE:** `ee3cce75ba474b226a2416a4be0be784ddf9bd7a`
- **Rev 03 commits:** `05bada5` no-amount-column fix, plus a follow-up correcting this line
- **Rev 02 commits:** `b7cc398` amount-column fix, `43836b0` value-level tests, `ee3cce7` evidence
- **Rev 01 commits:** `fcd736f`, `077d5dd`, `f98d3a5`, `23d0d80`, `3b76490` (rebased by root)
- **Worktree:** `/tmp/mf-p29`, branch `worktree-p29-ur008`

Statements below are labelled: **Observed** means I ran it and read the output; **Inferred** means I
reasoned to it and did not confirm it directly.

---

## 0. Frozen source verification

The dispatch cited `spec.md` lines 56-86 and told me to verify against `SCOPE.json` rather than
trust the citation.

**Observed.** `sha256sum` of `specs/010-user-reported-refinements-2/spec.md` is
`a137e38848db04c656169c97e4ff5b862feec6ca29d6e6069c81c2c279dc95c5`; `wc -l -c` gives 86 lines and
4902 bytes. All three match the `SRC-USER-REPORTED-REFINEMENTS-2` entry in `SCOPE.json` exactly.
Lines 56-86 are the UR-008 section verbatim and match the `sourceTextLines` array of the `UR-008`
requirement entry. **The citation is correct.**

---

## 1. Verification of the dispatch's four mechanism claims

The dispatch stated four root causes and instructed me to reproduce each before designing. Two
survived, two did not. All probes below ran against **unmodified BASE code**.

### 1.1 CONFIRMED — the leading-plus defect, with a naming correction

**Observed**, calling the real module at BASE:

| call                     | result  |
| ------------------------ | ------- |
| `parseNumber("+69.00")`  | **NaN** |
| `parseNumber("-69.00")`  | -69     |
| `parseNumber("(69.00)")` | -69     |

The mechanism is exactly as described: currency symbols are stripped, parentheses handled, a leading
`-` handled, and then `isWellFormedMagnitude` rejects the surviving `+`.

**Correction:** the function is named **`parseNumber`** (`src/lib/import/csv.ts:164-209`), not
`parseAmount`. A `parseAmount` exists, but at
`src/components/features/automations/rule-editor-model.ts:160`, and is unrelated to import parsing.
The line ranges cited for the parentheses and minus branches were accurate.

### 1.2 CONFIRMED — `collapseWhitespace`, plus a second site the dispatch missed

**Observed.** `DEFAULT_FORMATTING_SETTINGS.collapseWhitespace` was `false` at `types.ts:154`, as
stated.

**Not in the dispatch:** `src/lib/crdt/schema.ts:242` independently restated `defaultValue: false`
for the persisted import-template schema. Changing only `types.ts` would have left any saved
template reintroducing the old default. The schema now reads `DEFAULT_FORMATTING_SETTINGS`, which
also matches how that file already sources `DEFAULT_DUPLICATE_DETECTION_SETTINGS` and
`DEFAULT_FILTER_SETTINGS`.

### 1.3 DISPROVED — "nothing runs detection on load"

The dispatch stated both detectors are "invoked ONLY from a click" and that "nothing runs them on
load", presenting the absent auto-run and the wrong result as two distinct complaints.

**Observed.** `src/hooks/use-import-state.ts` calls `autoDetectColumnMappings(headers)` and
`detectFormatting(...)` inside `loadFile`, on the no-template CSV path. Detection **did** run
unprompted at BASE.

What it could not do is succeed. **Observed** at BASE, on a headerless file:

```
detectHeaders(headerless file) = false
headers                        = ["Column 1","Column 2","Column 3","Column 4"]
autoDetectColumnMappings(...)  = {}
```

`parseRawRows` synthesises positional names, and no synthesised name contains "date" or "amount".

**This collapses the dispatch's items 1 and 2 into ONE cause**, and it also explains item 3, below.

### 1.4 DISPROVED — the cited date-detection file is dead code, and there are three implementations

The dispatch located the single-sample heuristic at `FormattingStep.tsx:90-99` and said there are
"TWO detection implementations".

**Observed**, grepping for the component names across `src/` and `tests/`: `ColumnMappingStep` and
`FormattingStep` are **never mounted anywhere**. The only references are `index.ts` re-exports, two
`import type` uses of the `ColumnMapping`/`ImportFormatting` types by `processor.ts` and tests, and
the hook's import of the `autoDetectColumnMappings` **helper**. The `FormattingStep.tsx:90-99`
heuristic the dispatch cites is unreachable.

There are **three** header/sample implementations, not two:

| implementation             | location                    | reachable?                       |
| -------------------------- | --------------------------- | -------------------------------- |
| `autoDetectColumnMappings` | `ColumnMappingStep.tsx:248` | **LIVE** — called by the hook    |
| `detectDateFormat`         | `tabs/FormattingTab.tsx:85` | **LIVE** — called by the hook    |
| `autoDetectMappings`       | `tabs/MappingTab.tsx:63`    | live only behind a button click  |
| `autoDetect` (date)        | `FormattingStep.tsx:90`     | **dead** — component never mount |

**Answering the dispatch's "establish which is live before changing either":** the live pair is
`autoDetectColumnMappings` plus `detectDateFormat`/`detectNumberFormat`.

**I did not delete the dead implementations.** `ColumnMappingStep.tsx` and `FormattingStep.tsx` are
unmounted, but their helper exports and types are consumed by `processor.ts` and by existing tests,
so removal has its own blast radius and is a separable concern. **Recommendation for the coordinator
to charter, not a change I made:** the dead `FormattingStep` date heuristic and the now-unused
`autoDetectColumnMappings` are removable once a package owns the consequent churn. Leaving them is
deliberate — the risk the dispatch warned about is fixing a dead copy and leaving the live one
broken, and the live path is what I changed.

### 1.4.1 The button-driven path DID diverge, and it was a live defect

The dispatch cautioned that once the load path became value-driven, the third implementation —
`MappingTab.autoDetectMappings`, behind the Auto-detect button — might disagree with it, and that
two routines answering differently for the same file would be a new defect.

**Observed.** They diverged, and in the harmful direction:

| file         | on load, rev 01 as written        | Auto-detect button, rev 01 as written       |
| ------------ | --------------------------------- | ------------------------------------------- |
| headerless   | `{0:date,1:amount,2:description}` | **`{}`**                                    |
| with headers | `{0:date,1:description,2:amount}` | `{0:date,1:description,2:amount,3:balance}` |

**Corrected in rev 02 (review finding F-3).** The headered row as first written recorded the
button's `3:balance` but said nothing about the fact that **the LOAD path had stopped producing it
too**, relative to BASE. That was silent exactly where a regression lived: rev 01's value-driven
detector emitted only date/amount/description, so `balance`, `merchant`, `memo` and `checkNumber`
were dropped for every headered file. The row above is not false, but reading it as a
button-versus-load comparison obscured a loss both paths shared. That regression is F-2, fixed in
rev 02 and described in §1.4.3.

On a headerless file the button returned `{}` and `onMappingsChange` overwrites wholesale, so
**clicking Auto-detect would have WIPED the mappings the load had just got right.** That is worse
than the original bug: before, the button was useless; after my load-path fix and without this, it
would have been destructive. It also matches the principal's complaint that clicking Auto-detect did
not work.

`MappingTab` now calls `detectColumnMappingsFromValues` over the same data rows as the load path, so
the two cannot disagree. Its `sampleRows` prop became `dataRows` — the button needs the whole column
for the same reason the load does, and a 5-row sample would have reintroduced sampling through the
back door.

`tests/unit/components/mapping-tab-auto-detect.test.tsx` renders the real component and clicks the
real button. **Observed at BASE:** `expected "vi.fn()" to be called with arguments: [ Array(1) ]` —
BASE calls back with `{}`.

### 1.4.3 REV 02 — my detector bound the AMOUNT role by POSITION, and imported the wrong column as money

Review finding F-1, upheld. **This is the defect §1.4.2 below warns about, committed by the very
code that section describes** — I wrote the general lesson and then shipped an instance of it.

**Reproduced independently before fixing.** Running rev 01's detector at the rev 02 BASE `74b37f9`,
**observed**:

| file                               | column bound to `amount` | values imported as money       |
| ---------------------------------- | ------------------------ | ------------------------------ |
| `Date,Check No,Description,Amount` | col 1, **"Check No"**    | `1001`, `1002`, `1003`         |
| `Date,Description,Balance,Amount`  | col 2, **"Balance"**     | `1000.00`, `924.75`, `3424.75` |

Every row reports `status: valid` and `errorCount: 0`. **Silently wrong money, presented as
success** — and a REGRESSION, since the header-name detector rev 01 replaced handled both correctly.

**Mechanism, confirmed and deterministic — not a tie-break accident.** `bestColumn` ranked with
`entry.rate > best.rate`, which is strictly greater, so an equal-scoring later column never
displaces an earlier one: **the leftmost qualifying column always won.** A check number and a real
amount column both score 1.0 against `looksLikeAmount`, so the wrong column won every time, on every
run.

**TWO comments of mine were actively misleading, and both are fixed.**

_The first, at `detection.ts:243-245`_, claimed a protection the code did not provide: "columns that
read as amounts are set aside first, so a trailing balance column does not win the role". That
set-aside fed only the DESCRIPTION selection; **nothing whatsoever protected the amount role.**

_The second, at `bestColumn`'s docstring `:201-202`_, was found by the reviewer and is **the more
consequential of the two**: "Ties fall to the leftmost column, which matches the order a bank export
conventionally puts its columns in." That is **the assumption F-1 falsifies, written as a
justification**. It reads as a considered decision rather than an oversight, so it is the more
likely of the two to have stopped a reader — or a reviewer — from looking further. It is also
factually wrong for exactly the cases that matter: a check number and a running balance are
_conventionally_ placed left of or adjacent to the amount, which is precisely why they won.

Both are now rewritten to describe what the code does and to name the case it cannot handle.
`bestColumn`'s docstring states outright that leftmost-ties are inadequate for the amount role and
points to `bestAmountColumn`. Prose asserting a property the code does not enforce is worse than no
comment, because it suppresses the question — it suppressed mine.

#### The fix, and why it is not just a better tie-break

The amount column is now chosen on **evidence that distinguishes money from a number that merely
looks like one**, ranked in this order:

1. **A header naming or disowning the column** (`Amount`/`Debit`/`Credit` versus
   `Balance`/`Check No`/`Ref`). Strongest when present.
2. **Signs** — `-5.50` or `(5.50)` is money; a check number is never signed.
3. **Minor units** — `-5.50` is money; `1001` is an identifier.

Position now breaks only a tie where columns are equal on all three, i.e. where there is genuinely
nothing else to go on.

**Why headers are consulted at all, given the requirement says "identifies each column from its
values".** Two columns of the shape `Balance` and an all-positive `Amount` are **identical by
value** — same sign profile, same minor units, same magnitude class. No values-only rule can
separate them, so a values-only detector must get one of them wrong. Re-reading the frozen text at
`spec.md:70-74`: it requires detection to run automatically, to identify columns from values, and to
work **on a file that has no header row**. It nowhere requires that a header be _ignored when the
file has one_. Rev 01 discarded that evidence, which was my error. Headers are therefore used only
to break ties the values cannot, and are passed **only when the file genuinely has them** — the
parser synthesises `"Column 1", "Column 2", …` for a headerless file, and feeding those in would be
noise.

**The headerless case still works from values alone. Observed:** a headerless file whose second
column is check numbers and whose fourth is amounts resolves to `{0:date, 2:description, 3:amount}`
— correct, with no header evidence available, because the amount carries signs and minor units and
the check number carries neither.

#### F-2 — the secondary roles, restored

Rev 01's detector emitted only `date`, `amount` and `description`, silently dropping `merchant`,
`memo`, `checkNumber` and `balance` for headered files. **Verified the reviewer's blast-radius
finding rather than accepting it:** the live preview path reads only `date`, `amount` and
`description` (`use-import-state.ts:686,701,725`), and `processCSVImport` — which does read the
others — is **called from no product code**, only from tests that pass mappings explicitly. So no
imported value changed. It was a UX regression, not corruption.

Fixed rather than argued away, because the roles are visible and settable in the mapping UI and
losing them silently degrades it. These roles have **no distinguishing value shape** — a memo is
just text, a check number just digits — so a header name is the only possible evidence, and they are
recovered from headers or not at all. They are additive: a column already holding a core role is
never reassigned, and a headerless file gains none. **Observed:**
`Date,Check No,Merchant,Memo,Amount,Balance` →
`{0:date, 1:checkNumber, 2:description, 3:memo, 4:amount, 5:balance}`.

### 1.4.4 REV 03 — the fix for F-1 overrode the header exactly where it was unambiguous

Review finding F-4, upheld. **This is the third time in this package that §1.4.2's failure mode has
described something the package then shipped, and the second time my own fix introduced it.**

`bestAmountColumn` ranked candidates preferring those a header does not disown, then fell back:

```ts
const preferred = evidence.filter((entry) => entry.headerSays !== "not-amount");
const ranked = preferred.length > 0 ? preferred : evidence; // <- the defect
```

`NON_AMOUNT_HEADER_PATTERN` exists to say _this column is not the money_. When **every** qualifying
column is disowned, `preferred` is empty and the fallback used the disowned columns anyway — the
code overrode the header precisely where the header was unambiguous.

**Reproduced through the real `loadFile` before fixing. Observed at `ee3cce7`:**

| file                        | mappings                              | imported         | errors |
| --------------------------- | ------------------------------------- | ---------------- | ------ |
| `Date,Description,Balance`  | `{0:date,1:description,2:**amount**}` | `100000, 92475`  | **0**  |
| `Date,Description,Check No` | `{0:date,1:description,2:**amount**}` | `100100, 100200` | **0**  |
| `Date,Description,Ref`      | `{0:date,1:description,2:**amount**}` | `100100, 100200` | **0**  |

Running balances and check numbers imported as transaction amounts, every row valid.

**A REGRESSION against this package's original BASE `4c77a2d`, which I verified directly** rather
than inferring from the review. Running the same three files through `4c77a2d`'s `loadFile`:

```
Balance only   map={0:date, 1:description, 2:balance}      valid=0  errors=2
Check No only  map={0:date, 1:description, 2:checkNumber}  valid=0  errors=2
Ref only       map={0:date, 1:description}                 valid=0  errors=2
```

The original produced **visible errors**; rev 02 produced silent wrong money.

**The fix**, as specified by the review and endorsed by the coordinator: when every qualifying
column is disowned, **return `null`**. There is no correct amount in such a file, so the only
defensible outcomes are "leave it unmapped and let the rows surface as errors" or "import wrong
money silently" — and `spec.md:80-81` requires that every row reported as an error be genuinely
unparseable, which a row with no amount at all is.

**Verified the fix restores the original behaviour rather than merely satisfying the new test.**
After the change, the same three files produce mappings, valid counts and error counts **identical
to `4c77a2d`'s**, including `Ref` leaving column 2 entirely unmapped.

Note the fix is **not** to extend the denylist. My rev 02 self-assessment called
`NON_AMOUNT_HEADER_PATTERN` the weakest surface because a denylist is incomplete by construction —
that was right about the class of risk and wrong about the instance. The bug was not a missing
entry; it was **overriding the denylist when it fired**. Extending the list would not have touched
it.

#### The blindness recurred one level down, inside the helper written to fix it

All **six** assertions in `ur-008-amount-column.test.tsx` — the value-level tests I added in rev 02
precisely to escape mapping-shaped blindness — **would still pass with F-4 present.** Every fixture
contains a genuine `Amount` column, so `preferred` is never empty and the fallback branch is never
reached. Confirmed by inspection: the only headers those fixtures use are
`Date,Check No,Description,Amount`, `Date,Description,Balance,Amount` and
`Date,Description,Amount,Balance`.

I diagnosed the mapping-shaped version of this as the `Q-P28-03` family and then reproduced it one
level down. The generalisation I had been carrying — "assert values, not the selection" — was too
narrow. The correct form is: **a fixture set must vary along every axis the code branches on, and a
branch you ADD is a new axis that no existing fixture covers.** Adding the `preferred.length > 0`
fallback created an axis, and I added no fixture that reached it.

Rev 03 adds four fixtures with **no amount column at all**, asserting through `loadFile` that no
amount is imported and `errorCount` equals the row count. **Observed at `ee3cce7`:** all four fail —
three with `expected 2 to be +0` on the valid count, one with
`expected [ 'date', 'description', 'amount' ] to not include 'amount'`.

#### Why rev 01's suite did not catch F-1 — the assertion was BLIND, not merely unlucky

My first reading was that the fixture was unlucky: `ur-008-csv-parity.test.ts` pinned
`Date,Description,Amount,Balance`, the one arrangement where the correct column is already leftmost
among the numeric ones, so the buggy rule and the correct rule agree.

**The reviewer's addendum showed that understates it, and it is right.** The assertion compares
COLUMN MAPPINGS, and at BASE the same three rows in two arrangements produce the _same mapping_:

```
Date,Description,Amount,Balance  ->  {"0":"date","1":"description","2":"amount"}
Date,Description,Balance,Amount  ->  {"0":"date","1":"description","2":"amount"}
```

Index 2 is the **Amount** in the first file and the **Balance** in the second. A mapping-shaped
assertion **cannot distinguish the correct answer from the defective one at all** — so a new fixture
carrying the same assertion shape would have been blind in exactly the same way, and I would have
shipped a second green suite over the same defect.

**Rev 02's tests therefore assert the IMPORTED AMOUNTS, driven through the real
`useImportState.loadFile`, not the mapping.** Only the values separate `-550, -7525, 250000` from
`100100, 100200, 100300`. `tests/unit/import/ur-008-amount-column.test.tsx` holds them.

**Observed at BASE `74b37f9`**, which is the proof that the tests bite:

| fixture                                     | BASE imported            | expected              |
| ------------------------------------------- | ------------------------ | --------------------- |
| check number left of amount                 | `100100, 100200, 100300` | `-550, -7525, 250000` |
| running balance left of amount              | `100000, 92475, 342475`  | `-550, -7525, 250000` |
| all-positive, header the only discriminator | `100000, 92475, 342475`  | `550, 7525, 250000`   |
| headerless, check number left of amount     | `100100, 100200, 100300` | `-550, -7525, 250000` |

Four of the six fail at BASE with **wrong money**, not with an absent key. The two that pass are the
arrangement where the naive rule happens to agree, kept deliberately so both orders are pinned, and
the error-count assertion — which passes at BASE precisely because **a wrong-column import also
reports zero errors**, which is what makes the defect dangerous rather than visible.

The general lesson, and the one I would apply again: **when code selects among candidates, assert
the OUTCOME the selection feeds, not the selection itself** — and build the fixture so the correct
candidate sits in a losing position. An assertion over the selection can be invariant across exactly
the arrangements the defect distinguishes. This is the `Q-P28-03` family.

**A credit correction I want on the record.** The parity test at `:436-474` does reach a value-level
assertion by a different route — it derives `amountIndex` from detection, parses the values there,
and compares against `processOFXImport` — and it would have caught a divergence. **I did not write
it that way deliberately for this defect, and it is not what protected the tests I wrote for it.**
The five fixtures I authored in the first pass at rev 02 all asserted `expect(mappings["N"])`, and
every one of them would have been blind exactly as the addendum warned. The property was satisfied
incidentally by an older test; my new tests satisfied nothing until I replaced their assertion
shape. Recording this because "the property was already satisfied" would be a true sentence that
gives a false impression of the care taken.

### 1.4.2 Two places where fixing the reported bug would have made things WORSE

This deserves stating as a finding rather than being buried among the changes, because a reviewer
reading "detection now works" cannot see what was avoided.

**Both defects are latent at BASE and only become harmful once detection starts succeeding.** Each
one converts a visible, obvious failure into a plausible-looking wrong result, which is the worse
failure mode: "nothing imports" gets reported, "everything imports, slightly wrong" does not.

|                                   | at BASE                                     | after a detection-only fix          | what the user would see                                                    |
| --------------------------------- | ------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| **`hasHeaders` discarded** (§1.6) | harmless — nothing parses anyway            | **first data row silently dropped** | 621 of 622 rows import, looks like success                                 |
| **Auto-detect button** (§1.4.1)   | useless — returns `{}` on a headerless file | **wipes correct mappings on click** | a working preview destroyed by clicking the button that is meant to fix it |

Neither is a defect I introduced, and neither is visible in the principal's report. Both would have
been **introduced into user-visible behaviour by my own fix** had I stopped at the reported symptom.
The general lesson, which I would apply again: when a fix unblocks a code path that was previously
inert, everything downstream of that path is newly reachable and must be re-examined, because it has
never actually run.

### 1.5 The date detector never received a sample — settling "establish which occurred"

The dispatch asked me to establish whether date detection ran and guessed wrong, or never ran.

**Observed.** `detectDateFormat(["30/06/2026"])` returns `"dd/MM/yyyy"` — correct. So the detector
was never the problem on this file. With `columnMappings` empty, `detectFormatting`'s
`sampleColumn(..., "date")` returns `[]`, and `detectDateFormat([])` returns `null`, leaving the
`yyyy-MM-dd` default untouched.

**It ran, and received nothing.** The dispatch's own measurement (240 of 622 rows ambiguous) is
arithmetically right — I re-measured independently and got 240 with a leading field ≤12 and 382
above 12 — but it is **not** what the principal hit. The single-sample heuristic is a genuine latent
defect, and the frozen text independently requires whole-column inference, so it is fixed
regardless.

### 1.6 A FIFTH defect, not in the dispatch: `hasHeaders` was computed and discarded

**Observed.** `parseRawRows` computed `detectHeaders(content, separator)`, used it to choose between
real and synthesised header names, and then **returned only `{rows, headers, separator}`**. Nothing
propagated the boolean, so `config.formatting.hasHeaders` kept its `true` default even for a file
detected as headerless — and every downstream consumer slices `rawRows.slice(1)` on that flag.

A headerless file therefore **silently lost its first data row**.

**Inferred**, and labelled as such: this never surfaced in the principal's report because it
compounds with §1.3 — with no column mappings nothing parsed anyway, so one missing row was
invisible. It would have surfaced the moment detection began working, i.e. **my own fix would have
introduced a visible off-by-one had I not caught it.** `parseRawRows` now returns `hasHeaders` and
the session's formatting is initialised from it.

---

## 2. The principal's file, independently re-measured

Read-only. **No content was copied into any fixture, test or this document.**

**Observed:** 622 rows, 4 fields on every row, comma-separated, no header row. Column 0 is
`dd/MM/yyyy` on 622/622 rows. Column 1 is numeric on 622/622, with **15 leading `+`** and 607
leading `-`. **10** descriptions contain a comma. Every dispatch figure confirmed.

Two facts the dispatch did not mention:

- **Column 3 is empty on all 622 rows.** Value-driven detection must not award the description role
  to it; the test `does not mistake an empty trailing column for the description` pins that.
- **611 of 622 descriptions contain a run of consecutive spaces**, which makes the
  `collapseWhitespace` default materially load-bearing for this file rather than cosmetic.

### End-to-end parse, real file, read-only

**Observed**, running the full detect-then-parse pipeline over the real 622 rows:

| tree               | date errors | amount errors |
| ------------------ | ----------- | ------------- |
| BASE `parseNumber` | 0           | **15**        |
| with the fix       | 0           | **0**         |

The 15 matches the principal's reported error count exactly, and detection independently produced
`{0:date, 1:amount, 2:description}` and `dd/MM/yyyy` on a file with no header.

---

## 3. What changed

| file                            | change                                                              |
| ------------------------------- | ------------------------------------------------------------------- |
| `lib/import/csv.ts`             | `parseNumber` accepts a leading `+`                                 |
| `lib/import/detection.ts` (new) | value-driven column detection; whole-column date inference          |
| `lib/import/types.ts`           | `collapseWhitespace` default; 5-case status; `summarizePreview`     |
| `lib/crdt/schema.ts`            | template default sources `DEFAULT_FORMATTING_SETTINGS`              |
| `hooks/use-import-state.ts`     | value-driven load path; whole-column dates; `hasHeaders` propagated |
| `import/ImportSummary.tsx`      | the six specified labels                                            |
| `import/ImportTable.tsx`        | follows the 5-case status                                           |
| `import/ImportPanel.tsx`        | passes the combined old count through                               |
| `import/tabs/DuplicatesTab.tsx` | cutoff block moved below the radio group                            |
| `import/tabs/MappingTab.tsx`    | Auto-detect button runs the same value-driven detection             |

### 3.1 The partition is structural, not arithmetic

`PreviewTransactionStatus` gains `old-new` and `old-duplicate` in place of `filtered`, and
`summarizePreview` counts with **one exhaustive `switch` over that single field**. Each row
contributes to exactly one branch, so the five outcome counts sum to `totalRows` by construction
rather than by an invariant someone must remember. Adding a status without a matching count is a
compile error.

The six labels are rendered exactly as specified, with the parenthetical qualifiers retained:
`Total Rows` / `Valid` / `Errors` / `Duplicates (will be marked)` / `Old New (excluded)` /
`Old Duplicates (excluded)`.

### 3.2 The documented tie-break

`inferDateFormat` decides day-first when any value's leading field exceeds 12, month-first when any
second field does, and otherwise falls to a **fixed month-first tie-break** — the reading BASE
produced for such columns. It is deliberately **not** locale-derived: a bank file means the same
thing wherever it is opened, so the reading must not change with who opens it. This is the
"documented tie-break rather than a silent guess" the dispatch asked for.

### 3.3 The DuplicatesTab reorder is provably a pure move

**Observed.** Sorting the file's lines before and after the change yields **byte-identical** output
(`diff` reports nothing). Only order changed — no control, label, handler or `aria` relationship was
altered, and DOM order still matches visual order.

---

## 4. Tests

`tests/unit/import/ur-008-csv-parity.test.ts`, 20 tests, plus 2 E2E tests in
`tests/e2e/import.spec.ts`.

### 4.1 Fixture sizing, justified

**12 rows.** The dispatch required a deliberate choice. The first **eleven** dates have a leading
field ≤12, so each reads equally well as `MM/dd/yyyy`; only the twelfth, `30/06/2026`, settles the
column. A five-row fixture cannot distinguish whole-column inference from sampling, because a
detector reading the opening rows sees only ambiguous values and still lands on a format. 622 rows
would prove nothing more and cost E2E time. The test asserts the ambiguity of the prefix explicitly
rather than relying on the reader to trust the claim, and a companion test reverses the column so
the result cannot depend on where the disambiguating value sits.

### 4.2 Proof the tests fail at BASE

Run naively against a BASE `git archive` tree, the new spec reported **"0 test"** — the file failed
to resolve `@/lib/import/detection` and was **silently skipped**, the `Q-P27-01` shape. That result
proves nothing per-assertion, and is recorded here because a bare "it failed at BASE" from an
unresolved import is not evidence.

I therefore rebound the new-module imports to the BASE implementations they replace, so every
assertion ran against **old code**. **Observed: 13 of 20 fail at BASE.**

| assertion                             | BASE failure                                      |
| ------------------------------------- | ------------------------------------------------- |
| leading plus parses                   | `expected NaN to be 69`                           |
| plus equivalent to unsigned           | `expected NaN to be 69`                           |
| `collapseWhitespace` default          | `expected false to be true`                       |
| headerless column detection           | `expected {} to deeply equal {0:date,1:amount,…}` |
| detection independent of column order | `expected {} to deeply equal {…}`                 |
| headered file still detected          | `expected {} to deeply equal {…}`                 |
| no guessing when unrecognisable       | `expected {} to deeply equal {0:description}`     |
| **whole-column day-first inference**  | **`expected 'MM/dd/yyyy' to be 'dd/MM/yyyy'`**    |
| CSV/OFX parity, zero errors           | fails                                             |
| old-new named separately              | shape mismatch                                    |
| partition across all outcome mixes    | `expected 1 to be 2`                              |
| reported baseline partitions          | shape mismatch                                    |
| confusing run splits into two reasons | `expected +0 to be 500`                           |

The bolded row is the principal's exact reported date defect, reproduced as a failing assertion. The
7 that pass at BASE are regression guards for behaviour that was already correct.

The `MappingTab` component test was proved separately, since it needs the BASE component's
`sampleRows` prop shape: **observed at BASE**,
`expected "vi.fn()" to be called with arguments: [ Array(1) ]` — BASE calls back with `{}`.

### 4.3 A test I wrote that proved nothing, and how it was caught

My first attempt at pinning the button-versus-load agreement asserted:

```ts
const onLoad = detectColumnMappingsFromValues(rows);
const onButtonClick = detectColumnMappingsFromValues(rows);
expect(onButtonClick).toEqual(onLoad);
```

Both sides call the same function. It passes for any implementation of the button, including one
that returns `{}`, because **the button is never invoked** — it tests my assumption about the wiring
rather than the wiring. It went green immediately, which is what prompted me to re-read it.

The replacement renders the real `MappingTab` and clicks the real Auto-detect button through
`fireEvent`, so it fails if the button is ever pointed back at a header-name implementation. It uses
`fireEvent` rather than `@testing-library/user-event`, which is not a dependency of this repo and
which I did not add merely to make a test more convenient; `fireEvent` is the idiom already used in
`tests/unit/components/balance-summary.test.tsx`.

Recorded because a green test that cannot fail is worse than no test: it discharges the obligation
to check without doing the checking.

---

## 5. Gate results

| gate           | result                                                            |
| -------------- | ----------------------------------------------------------------- |
| `typecheck`    | **PASS**                                                          |
| `lint`         | **PASS**, 0 errors                                                |
| `format:check` | **17** pre-existing frozen `specs/**` files, **none a P29 file**  |
| `test`         | **PASS** — 2386 passed, 2 skipped, 123 files                      |
| `test:e2e`     | **PASS** — 3 consecutive full-suite runs, 177 passed each, see §6 |

The `lint` figure above is the **bare `pnpm lint` from the repo root**, not a filtered run over my
own files. **Observed:** `pnpm lint; echo $?` prints `EXIT CODE: 0`, with one pre-existing warning,
`react-hooks/incompatible-library` at `TransactionTable.tsx:426`, in a file this package does not
touch.

That required relocating my worktree, see §5.1.

### 5.1 The worktree had to move out of the repo

I originally placed the worktree at `.claude/worktrees/p29-ur008`, inside the repository. ESLint
walks that path — `.git/info/exclude` hides it from git, but not from ESLint — so it linted every
working copy twice.

**Observed** with the worktree in place: `pnpm lint` reported **591 errors and 18,773 warnings**
across 219 files. Attributing them by path: **217 files were the worktree**, and the remaining 2
entries were both the single pre-existing `TransactionTable.tsx` warning. So every error belonged to
ESLint re-linting my own working copy, none to a defect in anyone's code.

`git worktree move` failed with `Invalid cross-device link`, since `/tmp` is a separate filesystem.
I committed the work first, removed the worktree, and re-created it at `/tmp/mf-p29` from the same
branch — which is where every other package in this goal keeps its worktree.

**Verified the move was lossless:** the tree digest is `d038f2a2f38295c7f4234185a8cbb04d` both
before and after, computed over all `src/` and `tests/` `.ts`/`.tsx` files excluding
`next-env.d.ts`. Identical, so nothing changed in transit.

I did **not** edit the shared lint config to suppress this. The tooling choice was mine and the fix
belongs in my tooling.

**Two load-dependent results, disclosed rather than re-rolled silently.**

`duplicates.test.ts:749` compares wall-clock ratios against a `< 4` bound. **Observed:** ratio
`4.098` at load average 9.27; ratio `4.671` while another package's E2E campaign held the machine;
PASS in quiet windows and PASS in isolation.

`vault-maintenance.test.tsx` "sanitizes generic action and edit callbacks" failed once with
`expected undefined to be 'before'`. It drives a mocked `requestAnimationFrame` through a frame
host, so it is frame-timing dependent under contention. **Observed:** PASS in isolation and PASS in
both subsequent full-suite runs. Neither file is in this package's file set.

**Final state, observed:** two consecutive full-suite runs at **2316 passed, 2 skipped, 122 files, 0
failed**, both at load average ~10 — so the passes are not a quiet-window artefact.

`playwright test --list` reports **177** tests in 23 files: the expected 175 at BASE plus my 2.
**Re-verified after the `MappingTab` change**, since that landed after the first count — still 177,
and both new tests appear by name:

```
import.spec.ts:1721 › Import Panel › headerless CSV auto-detects columns and dates and imports with no errors
import.spec.ts:1800 › Import Panel › re-import names old-new and old-duplicate separately and still partitions
```

The count was unchanged because the `MappingTab` fix is covered by a unit test, not an E2E — checked
rather than assumed.

---

## 6. E2E campaign

Three consecutive FULL-SUITE runs, `--retries=0`, launched with `env -u CI`. `CI=true` is never used
for a campaign: `playwright.config.ts:56,60` gives 1 worker and 2 retries under CI, which inverts
the profile the campaign is meant to exercise.

**Port discipline.** The single `:3000` is sequenced by the coordinator. I confirmed it free
immediately before starting by reading `/proc/<pid>/cmdline` for every candidate rather than
`pgrep -f`, which matches the checking command itself. **Observed:** `:3000` unbound, no Playwright
process anywhere, load average 2.95. An orphaned `next-server (v16.2.6)` (PID 3622053, unreadable
cwd) was present; **observed** to bind no listening port and not to be mine, so it was left alone.
The human's dev server on `:3001` was never touched.

### Results — REV 02, at `43836b0`

| run | result         | duration | load at start | tree digest |
| --- | -------------- | -------- | ------------- | ----------- |
| 1   | **177 passed** | 4.2m     | 4.07          | `0e58fc49`  |
| 2   | **177 passed** | 4.1m     | 5.38          | `0e58fc49`  |
| 3   | **177 passed** | 4.3m     | 5.95          | `0e58fc49`  |

**Zero failures across all three runs.** A scan of all three logs for `N failed`, `✘`,
`Error: expect` and `timed out` returns nothing, and none of the three recorded load-sensitive
assertions fired.

Logs at `/tmp/p29r2-e2e-run{1,2,3}.log`, digests at `/tmp/p29r2-digest-{pre,post}.txt`.

The rev 01 campaign, superseded by the above, ran 3×177 clean at digest `8443fde8`.

### Tree stability

Digest `0e58fc4984aed2234afdb99df70705df`, over every `src/` and `tests/` `.ts`/`.tsx` file
**excluding `next-env.d.ts`**, verified before run 1 and again after run 3. **Identical**, so this
campaign is evidence for exactly the tree that ran.

`next dev` rewrote `next-env.d.ts` during the campaign, which is why it is excluded — it is a
regenerated artefact, and including it would show drift on every multi-run campaign. It was restored
with `git checkout --` afterwards, leaving the tree clean at `43836b0`.

### The new tests executed, rather than being counted

`Q-P27-01`: an unresolvable import makes Playwright report "No tests found" and **silently skip a
whole spec file**, so a green total can conceal a missing spec. Presence was therefore verified by
name in the run log, not inferred from the total:

```
[52/177] import.spec.ts:1721 › headerless CSV auto-detects columns and dates and imports with no errors
[53/177] import.spec.ts:1800 › re-import names old-new and old-duplicate separately and still partitions
```

**Observed** in all three logs, with `import.spec.ts` contributing **18** executed tests per run.
`playwright test --list` reported 177 immediately before the campaign, matching what executed.

---

## 7. Secret safety

**Observed.** I diffed my fixtures against all 622 rows of the real file. No real description
appears except `PAYMENT RECEIVED, THANK YOU`, and no real amount except `+69.00` — **both of which
are published verbatim in the frozen spec itself**, at lines 67 and 63. Three amounts I invented
coincidentally collided with real values; I replaced them with values verified absent from the real
file. No real date, no real row, and nothing linkable to the principal appears in any fixture, test
or this document. No key material, seed phrase, recovery material, `SUPABASE_JWT_SECRET`, presence
key, invite fragment or vault plaintext appears anywhere.

---

## 8. Process incidents, disclosed unprompted

**8.1 Edits landed in the shared main checkout.** In a worktree session, Bash resolves to the
worktree but `Edit`/`Write` do **not** rewrite repo-root absolute paths. My first product edits went
to the shared `/home/ben-agents/Code/moneyflow` checkout. The only symptom was a test reporting
"Failed to resolve import" for a file I had just written, which reads like a path-alias problem
rather than a wrong-tree problem. I captured the work with `git diff`, applied it in the worktree,
copied the untracked file, then `git checkout --` and `rm` in main. **Observed afterwards:** main's
`git status` shows only other agents' pre-existing entries and its HEAD is unmoved. Nothing was
committed to main and no other agent's work was touched.

**8.2 A probe tree perturbed the shared pnpm store.** I symlinked `node_modules` into a throwaway
`git archive` tree; pnpm subsequently refused to run in the worktree, wanting to purge the modules
directory. `CI=true pnpm install --frozen-lockfile` restored it, and every gate above was run after
that restoration.

Both are recorded because the coordinator relies on my tree being clean, and neither was requested.
