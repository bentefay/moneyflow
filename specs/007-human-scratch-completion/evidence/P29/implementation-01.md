# P29 / UR-008 — Implementation Evidence, Revision 01

- **Requirement:** UR-008, frozen at `specs/010-user-reported-refinements-2/spec.md` lines 56-86
- **Base:** `4c77a2dd6b61a9ab5e58c032d0b0242e579c75f7`
- **Commits:** `fcd736f` product + unit tests + E2E spec, plus this evidence
- **Worktree:** `.claude/worktrees/p29-ur008`, branch `worktree-p29-ur008`

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
`autoDetectColumnMappings` plus `detectDateFormat`/`detectNumberFormat`. I changed the hook to stop
calling the first two and left all four functions in place, since removing dead exports is outside
this package's scope.

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

---

## 5. Gate results

| gate           | result                                                           |
| -------------- | ---------------------------------------------------------------- |
| `typecheck`    | **PASS**                                                         |
| `lint`         | **PASS**, 0 errors                                               |
| `format:check` | **17** pre-existing frozen `specs/**` files, **none a P29 file** |
| `test`         | **PASS** — 2314 passed, 2 skipped, 121 files                     |
| `test:e2e`     | see §6                                                           |

`lint` reports one pre-existing warning, `react-hooks/incompatible-library` in
`TransactionTable.tsx:426`, a file this package does not touch.

**A load-dependent result, disclosed.** My first `pnpm test` failed `duplicates.test.ts:749` with
ratio `4.098` against a `< 4` bound, at load average **9.27**. Re-run in a quiet window it passes.
That is the known wall-clock flake, not a defect — recorded because a result obtained under
uncontrolled load is unprovable either way.

`playwright test --list` reports **177** tests in 23 files: the expected 175 at BASE plus my 2, both
listed under `import.spec.ts`.

---

## 6. E2E campaign

_Filled in below after the port was granted._

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
