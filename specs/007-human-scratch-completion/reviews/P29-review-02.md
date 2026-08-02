# P29 / UR-008 — Independent Review, Revision 02

- **Verdict: FAIL** — one blocking finding, **F-4**, which is the rev 01 F-1 failure mode surviving
  in a narrower input class. Everything rev 02 was dispatched to fix — F-1, F-2, F-3 — is genuinely
  fixed, and I verified each by measurement rather than by reading the evidence.
- **Reviewer:** `p29-reviewer-02`, distinct from `p29-implementer-01` and from `p29-reviewer-01`. I
  authored none of this code and edited no product file.
- **Requirement:** UR-008, frozen at `specs/010-user-reported-refinements-2/spec.md` lines 56-86.
- **Reviewed:** BASE `74b37f9` .. HEAD **`ee3cce7`**, with a third reference point at the package's
  original BASE `4c77a2d`. Sections 0-8 were written against `43836b0`; the coordinator subsequently
  retargeted the review to the handback tree `ee3cce7`. **Measured:** the two are byte-identical in
  `src/` and `tests/` — same digest `0e58fc4984aed2234afdb99df70705df` — so every measurement below
  holds unchanged. See the **Addendum** for the retarget and two further lines of testing.
- **My worktrees:** `/tmp/mf-p29r2-base` (74b37f9), `/tmp/mf-p29r2-head` (43836b0),
  `/tmp/mf-p29r2-orig` (4c77a2d), `/tmp/mf-p29r2b` (ee3cce7) and `/tmp/mf-p29r2b-orig` (4c77a2d),
  all outside the repo.

Statements are labelled **Measured** (I ran it and read the output) or **Inferred**.

---

## 0. Preconditions, and one correction to the dispatch

> **Resolved.** The coordinator confirmed this and retargeted the review to `ee3cce7`. This section
> is left as originally written; see the Addendum.

**The dispatch says the worktree `/tmp/mf-p29` is "clean, at that commit" `43836b0`. It is not at
that commit. Measured:** `/tmp/mf-p29` HEAD is `ee3cce7`, one commit ahead —
`docs: record P29 rev 02 campaign results and the credit correction`.

I checked whether this matters before reporting it, and **it does not affect the reviewed code**.
**Measured:** `git diff 43836b0 ee3cce7 -- src tests` is empty; the only changed path is
`specs/007-human-scratch-completion/evidence/P29/implementation-01.md`. So `ee3cce7` is an
evidence-only commit and the product tree under review is exactly `43836b0`. I reviewed `43836b0` in
my own worktree regardless. Recording it because a coordinator verifying "HEAD still equals assigned
HEAD" against `/tmp/mf-p29` will get a mismatch and should know it is benign.

**Ancestry, measured.** `git merge-base --is-ancestor 74b37f9 43836b0` succeeds and
`git merge-base --is-ancestor 43836b0 HEAD` succeeds. This is not the dangling-amend trap.

**Tree digest reproduced independently. Measured:** md5 over every tracked `src/`+`tests/`
`.ts`/`.tsx` file excluding `next-env.d.ts` at `43836b0` is `0e58fc4984aed2234afdb99df70705df` —
**byte-identical to the digest in the evidence and to both `/tmp/p29r2-digest-{pre,post}.txt`**. The
rev 02 E2E campaign is therefore evidence for exactly the tree I reviewed. My worktree
`git status --porcelain` is empty.

---

## 1. Gates

Run in `/tmp/mf-p29r2-head`, my own worktree, with `.env.local` copied in.

| gate           | result                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| `typecheck`    | **PASS** — exit 0                                                        |
| `lint`         | **PASS** — 0 errors, 1 pre-existing warning                              |
| `test`         | **PASS** on the targeted set — 310 passed across 11 files                |
| `test:e2e`     | **NOT RUN BY ME** — port held by `p28-reviewer-03` per dispatch. See §6. |
| `format:check` | not run — see the note below                                             |

The one lint warning is `react-hooks/incompatible-library` at `TransactionTable.tsx:426`, a file
this package does not touch. **Measured**, matching rev 01's finding exactly.

**I ran targeted test files rather than the full suite**, as the dispatch directed, because another
campaign is live. The files I ran are `tests/unit/import/**` plus
`tests/unit/components/mapping-tab-auto-detect.test.tsx` — every file rev 02 touches, plus the whole
import module around them. **I did not re-run the full 2382-test suite, and I am not certifying
it.** The implementer reports it green at this tree and rev 01 independently reproduced the
arithmetic; I did not re-derive that.

**I did not run `format:check`.** Bare `pnpm format` reflows frozen `specs/**`, and `format:check`
on this tree is known to report the same pre-existing frozen-spec set. Rev 01 measured 17, none a
P29 file. I did not re-measure; **Inferred** that this is unchanged, since rev 02 touches no
`specs/**` file except the evidence.

---

## 2. What rev 02 was dispatched to fix — all three verified FIXED

### F-1 — FIXED, and the fix is real at the value level

I did not take the evidence's numbers on trust. I copied the new test file into a **BASE `74b37f9`**
worktree and ran it against old code.

**Measured at BASE, through the real `useImportState.loadFile`:**

```
imports the Amount, not a check number sitting to its left
  → expected [ 100100, 100200, 100300 ] to deeply equal [ -550, -7525, 250000 ]
imports the Amount, not a running balance sitting to its left
  → expected [ 100000, 92475, 342475 ] to deeply equal [ -550, -7525, 250000 ]
imports the Amount when every value is positive and only the header separates them
  → expected [ 100000, 92475, 342475 ] to deeply equal [ 550, 7525, 250000 ]
imports the Amount from a HEADERLESS file with a check-number column
  → expected [ 100100, 100200, 100300 ] to deeply equal [ -550, -7525, 250000 ]

Tests  4 failed | 2 passed (6)
```

**These are the implementer's reported figures exactly** — `100100, 100200, 100300` for the check
numbers and `100000, 92475, 342475` for the balances, against the correct `-550, -7525, 250000`. At
HEAD all 6 pass. The defect was real, the fix is real, and **the test fails at BASE for the right
reason: wrong money, not an absent key or an unresolved import.**

The five new `ur-008-csv-parity.test.ts` cases also bite: **measured at BASE, 5 failed | 21
passed**, each `expected undefined to be 'amount'`. The new `MappingTab` case fails at BASE too.

**The all-positive case is genuinely handled and genuinely pinned.** The dispatch asked me to
confirm this specifically. `ur-008-amount-column.test.tsx:110-122` builds
`Date,Description,Balance,Amount` with the minus signs stripped, so the two numeric columns are
identical in sign profile, minor units and magnitude class. **Measured:** it fails at BASE with the
balances and passes at HEAD with `[550, 7525, 250000]`. Only the header can separate them, which is
the implementer's stated reason for consulting headers, and the test is the proof of it rather than
an assertion about it.

**The headerless path still resolves from values alone. Measured**, with no header evidence at all:
a headerless file whose second column is check numbers resolves the amount correctly, and my own
independent probe of the real reference shape resolves `{0:date, 1:amount, 2:description}` with
`dd/MM/yyyy` and `hasHeaders: false`.

**On the coordinator's ruling about headers — I applied it and did not re-litigate it.** I checked
the two things the dispatch asked instead. First, the headerless path resolves from values alone,
confirmed above. Second, synthesised names are not fed in as real headers: `use-import-state.ts:373`
passes `fileHasHeaders ? headers : []` and `MappingTab.tsx:123` passes
`hasRealHeaders ? availableHeaders : []`, with `hasRealHeaders` plumbed from
`session.config.formatting.hasHeaders` at `ImportPanel.tsx:416`. The guard is correctly written.

**A blindness note on that guard, measured rather than reasoned.** I mutated
`use-import-state.ts:371-374` to pass `headers` unconditionally — i.e. to feed synthesised
`"Column N"` names in as if real — and re-ran every affected test file. **All 310 still passed.** No
test pins the guard. I then established why, which changes the reading: `"Column 1"`..`"Column N"`
match none of `AMOUNT_HEADER_PATTERN`, `NON_AMOUNT_HEADER_PATTERN` or `SECONDARY_ROLE_PATTERNS`, so
feeding them is currently inert and cannot change an answer. **The guard is therefore correct, cheap
and defensively right, but not load-bearing today and not pinned by any test.** I am recording this
as an observation, not a finding — the code is right; it is the future edit that adds a pattern
matching `"Column"` that would go uncaught. I restored the mutation and confirmed the tree clean.

### F-2 — FIXED

**Measured**, `Date,Check No,Merchant,Memo,Amount,Balance` at HEAD resolves to
`{0:date, 1:checkNumber, 2:description, 3:memo, 4:amount, 5:balance}`. The secondary roles are back,
recovered from headers only, additive over the core roles, and a headerless file gains none —
`ur-008-csv-parity.test.ts` pins both directions. `secondaryRolesFromHeaders` at `detection.ts:422`
never reassigns a column already holding a core role and claims each role once. **Measured**, a file
with `Description` and `Payee` headers maps `1:description, 2:merchant` without collision.

**I re-verified the blast-radius claim rather than accepting it. Measured:** `columnMap.get` is
called only for `"date"`, `"amount"` and `"description"` at `use-import-state.ts:686,701,725`, so no
imported value ever depended on the dropped roles. And `processCSVImport`, which does read them, is
reached only via `processImport` — **measured**, `grep` for `processImport` across `src/` returns no
product caller, only the definition and the barrel re-export. The evidence's characterisation of F-2
as a UX regression rather than corruption is accurate.

### F-3 — FIXED

Evidence §1.4.1 now states the headered row as a BASE-versus-HEAD comparison and explicitly records
that the load path had _stopped_ producing `3:balance`, which is the silence rev 01 objected to.
§1.4.3 adds the four-arrangement table. The correction is honest and goes further than asked.

**The credit correction at evidence §1.4.3 is accurate and I verified it.** The implementer states
that the parity test at `:436-474` reaches a value-level assertion by deriving `amountIndex` from
detection, that it was not written for this defect, and that the five fixtures authored first at rev
02 all asserted `expect(mappings["N"])` and would have been blind. **Measured:** the parity test
does derive `amountIndex` at `:442-444` and compare parsed values against `processOFXImport`, so the
claim about it is true. Volunteering that the property was satisfied incidentally rather than by
design, when the simpler true sentence was available, is the kind of disclosure that makes the rest
of the evidence trustworthy.

---

## 3. FINDING

### F-4 — HIGH — Bug / Regression — when a header disowns every numeric column, the detector overrides it and imports a balance or check number AS MONEY, with zero errors

**File:** `src/lib/import/detection.ts:328-329`

```ts
const preferred = evidence.filter((entry) => entry.headerSays !== "not-amount");
const ranked = preferred.length > 0 ? preferred : evidence;
```

`NON_AMOUNT_HEADER_PATTERN` at `:261` exists to say _this column is not the money_. When **every**
numeric candidate is disowned by it, `preferred` is empty and `ranked` falls back to `evidence` —
the disowned columns are used anyway. The header said "not the amount" and the code overrides it, in
the one case where the header is unambiguous.

**Measured through the real `useImportState.loadFile` in three worktrees.** The `orig` column is the
package's own original BASE `4c77a2d`, before any P29 work:

| file                                | orig `4c77a2d`                      | HEAD `43836b0`                                     |
| ----------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `Date,Description,Balance`          | `2:balance`, 0 valid, 2 errors      | `2:amount`, **amounts `100000, 92475`, 0 errors**  |
| `Date,Description,Running Balance`  | `2:balance`, 0 valid, 2 errors      | `2:amount`, **amounts `100000, 92475`, 0 errors**  |
| `Date,Description,Balance,Check No` | `2:balance,3:checkNumber`, 2 errors | `2:amount`, **amounts `100000, 92475`, 0 errors**  |
| `Date,Description,Check No`         | `2:checkNumber`, 0 valid, 2 errors  | `2:amount`, **amounts `100100, 100200`, 0 errors** |
| `Date,Description,Ref`              | `{0:date,1:description}`, 2 errors  | `2:amount`, **amounts `100100, 100200`, 0 errors** |

Confirmed at the helper level too. **Measured**, `detectColumnMappingsFromValues` with headers
`["Date","Description","Check No"]` returns `{"0":"date","1":"description","2":"amount"}`; same for
`Ref`; same for `Balance`.

**This is the sentence rev 01 blocked on, verbatim: a check number or a running balance imported as
a transaction amount and reported as valid.** It is narrower — it needs a file whose only
amount-parsing columns are all explicitly named `Balance`/`Check No`/`Ref` — but within that class
it is deterministic, not occasional, and it is a **regression against `4c77a2d`**, which produced a
visible error instead. That is the same "silently-wrong money replacing a visible failure" shape the
evidence itself names at §1.4.2 as the worse failure mode.

There is no correct amount in these files, so the only defensible answers are "leave the amount
unmapped and report errors" — which is what `4c77a2d` did and what the frozen text's error-honesty
clause supports — or "import wrong money silently". HEAD chose the second.

**Why the suite does not catch it, and this is the package's own theme again.** Every new amount
fixture contains a genuine `Amount`/`Debit` column, so `preferred` is never empty and the fallback
branch at `:329` is never exercised. **For each of the six assertions in
`ur-008-amount-column.test.tsx` I asked whether it would still pass with the defect present: all six
would.** The fixtures do not vary along the axis this branch discriminates on — precisely the
`Q-P28-03` shape the implementer correctly diagnosed for the mapping-shaped assertions, recurring
one level down in the same helper.

**Fix.** When every qualifying column is `headerSays === "not-amount"`, return `null` rather than
falling back to `evidence`, so the amount is left unmapped and the rows report as errors instead of
importing a balance. Concretely, replace the fallback at `:329` with an early
`if (preferred.length === 0) return null;`. Add a fixture with `Date,Description,Balance` and one
with `Date,Description,Check No`, asserting **through `useImportState.loadFile`** that no amount is
imported and `errorCount` equals the row count — asserting the imported outcome, not the mapping,
for the same reason rev 02 already established.

I did not apply this change; I never edit product code.

---

## 4. What I verified and found CORRECT

Each item below I reproduced; none is accepted from the evidence.

**Every other clause of UR-008. Measured** by direct call at HEAD:

| clause                                           | measurement                                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| leading `+` parses positive                      | `parseNumber("+69.00")` = 69, equal to `parseNumber("69.00")`; `+1,234.56` = 1234.56                |
| existing sign/symbol/separator handling retained | `-69.00` = -69, `(69.00)` = -69, `$1,234.56` = 1234.56                                              |
| malformed plus forms still rejected              | `"+"`, `"++1.00"`, `"+abc"`, `"+-5"` all NaN                                                        |
| quoted field containing the delimiter            | `2024-01-15,"PAYMENT RECEIVED, THANK YOU",-5.50` parses as **3 fields**, columns do not shift       |
| `collapseWhitespace` default true                | `DEFAULT_FORMATTING_SETTINGS.collapseWhitespace` = `true`; `schema.ts:247` sources that constant    |
| detection runs on load without user action       | headerless load yields mappings with no click; the E2E test at `import.spec.ts:1721` never clicks   |
| day-first `30/06/2026` with no header            | `inferDateFormat` = `dd/MM/yyyy`; ambiguous-only column = `MM/dd/yyyy` per the documented tie-break |
| six summary labels                               | `ImportSummary.tsx:97-130` renders all six with qualifiers intact                                   |
| the partition is honest                          | measured below                                                                                      |
| "Define old as" below the radio group            | `DuplicatesTab.tsx` — RadioGroup closes at `:360`, the cutoff block opens at `:363`                 |
| every reported error genuinely unparseable       | measured below                                                                                      |

**The partition sums, measured on a mixed import rather than reasoned about.** A 6-row file with one
valid pair, one duplicate, one old-new, one old-duplicate and one unparseable row, loaded through
the real hook with existing transactions and `ignore-all`:

```
{"totalRows":6,"validCount":3,"errorCount":1,"duplicateCount":1,"oldNewCount":0,"oldDuplicateCount":1}
sum of the five outcome counts = 6, totalRows = 6
```

The five counts partition the rows exactly, and old-new is named separately from old-duplicate. The
one row reported as an error is `Broken Row` carrying `NOTANUMBER` — **genuinely unparseable, not a
supported amount or quoting form.** `summarizePreview` at `types.ts:371-398` counts with one
exhaustive `switch` over a single field, so a row cannot be double-counted or missed by
construction.

**The reference case works end to end. Measured, read-only, on the principal's real
`~/Downloads/CSVData.csv`** — no row content was printed, copied or committed, only aggregates:

| tree           | result                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| orig `4c77a2d` | mappings `{}`, `dateFormat yyyy-MM-dd`, `hasHeaders true`, **621 rows, 0 valid, 621 errors**                    |
| HEAD `43836b0` | mappings `{0:date,1:amount,2:description}`, `dd/MM/yyyy`, `hasHeaders false`, **622 rows, 622 valid, 0 errors** |

622 of 622, zero errors, exactly as the frozen text requires, and **15 positive amounts** — matching
the 15 leading-`+` rows the frozen text names at `spec.md:85`. The `621` at orig is also the
`hasHeaders` row loss the evidence describes at §1.6, visible here as a real off-by-one.

**The headerless reference shape, on a synthetic file carrying every clause at once. Measured:**
`dd/MM/yyyy` dates, quoted fields, a leading-`+` row, a description containing a comma, runs of
repeated spaces and a trailing empty column all resolve together —
`amounts [-4500, 6900, -3307, -1200, -123456]`, descriptions collapsed to single spaces, the
comma-bearing description intact as one field, dates correct, 5 valid, 0 errors.

**Type safety. Measured**, scanning every added line of the rev 02 product diff for `as`, `any` and
`!`: **none**. The diff adds no type escape hatch.

**Secret safety — verified independently against the real file, not accepted.** I extracted every
date and amount literal added by the rev 02 diff and tested each against all 622 real rows.

- Collisions are `30/06/2026`, `+69.00`, `-5.50`/`5.50`, `-75.25`/`75.25` and `000.00`.
  **Measured:** `30/06/2026` and `+69.00` are **published verbatim in the frozen spec** at
  `spec.md:76` and `spec.md:63`, so reusing them discloses nothing new; the rest are generic
  magnitudes.
- Every added description string — `Coffee Shop`, `Grocery Store`, `Direct Deposit`, `Acme Co`,
  `Beta Ltd`, `Gamma`, `COFFEE SHOP` — **appears zero times in the real file. Measured.**
- `PAYMENT RECEIVED` and `BAKERY` do occur in the real file, but **measured**, both were already
  present in tests at BASE `74b37f9` and are not introduced by rev 02; `PAYMENT RECEIVED, THANK YOU`
  is itself published at `spec.md:67`.
- **Measured:** no real `(date, amount)` pair from a fixture co-occurs in the real file —
  `30/06/2026,"-33.07"`, `-33.07` and `-45.00` all return zero matches.
- No key material, seed phrase, recovery material, `SUPABASE_JWT_SECRET` value, presence key, invite
  fragment or vault plaintext appears in the diff, the evidence or the campaign logs. **Measured**,
  the keyword hits in the E2E logs are Playwright _test titles_ (`identity.spec.ts`,
  `passkey.spec.ts`) and the single hit in the evidence is its own negative assertion. **No leak.**

**The E2E campaign is evidence for the reviewed tree.** I did not run it, but I checked what I could
without the port. **Measured:** all three logs at `/tmp/p29r2-e2e-run{1,2,3}.log` end `177 passed`
at 4.2m / 4.1m / 4.3m, each contributes 18 `import.spec.ts` tests, and both new tests appear **by
name** in the run log rather than being inferred from the total — closing the `Q-P27-01` silent-skip
shape. The pre- and post-campaign digests are identical to each other **and to the digest I computed
myself**, so the tree did not drift mid-campaign.

---

## 5. Requirement-by-requirement

| frozen requirement (lines 62-86)                | verdict                                                                                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| leading `+` parses positive, other forms kept   | **MET**                                                                                                                                        |
| quoted field with delimiter stays one field     | **MET**                                                                                                                                        |
| `collapseWhitespace` default true, all types    | **MET**                                                                                                                                        |
| detection runs automatically, no header row     | **MET**                                                                                                                                        |
| detection identifies columns from VALUES        | **PARTIAL — F-4**: correct wherever a genuine amount column exists, including all-positive; wrong when the header disowns every numeric column |
| date format from values, day-first, no header   | **MET**                                                                                                                                        |
| summary splits old-new from old-duplicate       | **MET** — six labels, partition measured to sum exactly                                                                                        |
| every reported error genuinely unparseable      | **MET** — and the inverse now holds too, except in the F-4 class, where unparseable-as-money rows are reported valid                           |
| CSV and OFX of the same data import identically | **MET** — 622/622, 0 errors, on the real reference file                                                                                        |

---

## 6. E2E — NOT RUN BY ME

I did not take port `:3000` and did not run the suite, per the dispatch; `p28-reviewer-03` holds it.
Stating that plainly rather than reporting a partial result as a pass.

**I do not believe a fresh campaign is required to act on this review.** The verdict is FAIL on a
product defect in `detection.ts`, the fix will change that file, and a campaign run now would be
evidence for a tree about to change — the same reasoning root applied at rev 01. The rev 03 campaign
should run against the corrected tree. I verified what the port does not gate: the three rev 02 logs
are internally consistent, both new tests executed by name, and the campaign digest matches the tree
I reviewed.

**Neither E2E test would catch F-4** — both use fixtures with a genuine amount column.

---

## 7. Q-proposals

### Q-PROPOSAL-P29-02-01 — a "prefer X, else fall back to all" filter re-admits exactly what it excluded

- **Raised by/package/revision:** `p29-reviewer-02`, P29, revision 02
- **Context and evidence:** `detection.ts:328-329`. `preferred.length > 0 ? preferred : evidence` is
  a common and usually harmless idiom, but where the filter encodes a _safety_ exclusion rather than
  a preference, the fallback silently re-admits the excluded candidates in the one case where the
  exclusion was unambiguous. Measured: a header naming every numeric column
  `Balance`/`Check No`/`Ref` results in one of them being imported as money with zero errors.
- **Why existing authority does not decide it:** the frozen text requires columns be identified from
  values and does not say what to do when no column is the amount. Repository convention has no rule
  for exclusion-versus-preference filters.
- **Options considered:** (a) return null when every candidate is excluded; (b) keep the fallback
  and surface a warning; (c) leave as is.
- **Reversible default selected to continue:** none applied — I do not edit product code. F-4
  recommends (a) as the smallest change consistent with the implementer's own stated design.
- **Decision-hierarchy basis:** 3 — preservation of user data; importing a balance as a transaction
  amount corrupts a ledger silently.
- **Impact and risk:** low blast radius, one branch in one helper, covered by a new fixture.
- **Reversal or migration path:** revert one conditional; no persisted state involved.
- **Human review still useful after completion:** no.

### Q-PROPOSAL-P29-02-02 — the blindness check must be applied to each BRANCH, not each assertion

- **Raised by/package/revision:** `p29-reviewer-02`, P29, revision 02
- **Context and evidence:** rev 02 correctly fixed the rev 01 blindness by asserting imported
  amounts instead of mappings. The new tests are genuinely discriminating — measured, four fail at
  BASE with wrong money. But **all six would still pass with F-4 present**, because every fixture
  contains a genuine amount column and the defective branch is never entered. Fixing the assertion
  _shape_ did not by itself produce branch coverage of the selection logic.
- **Why existing authority does not decide it:** `Q-P28-03` and the rev 01 addendum address
  assertion shape; neither prompts for whether the fixture set reaches every branch the selector can
  take.
- **Options considered:** (a) make "for each branch of a selector, name the fixture that enters it"
  a standing implementer and reviewer obligation for classification code; (b) rely on the existing
  assertion-shape prompt.
- **Reversible default selected to continue:** recorded as a proposal; I applied nothing.
- **Decision-hierarchy basis:** 2 — repository convention for classification code.
- **Impact and risk:** process only.
- **Reversal or migration path:** n/a.
- **Human review still useful after completion:** no.

### Q-PROPOSAL-P29-02-03 — a correct guard that is currently inert is untestable and will silently decay

- **Raised by/package/revision:** `p29-reviewer-02`, P29, revision 02
- **Context and evidence:** the `fileHasHeaders ? headers : []` guard at `use-import-state.ts:373`
  and its `MappingTab` counterpart are correct and were the right thing to write. Measured: removing
  the guard entirely leaves all 310 affected tests green, because `"Column N"` matches none of the
  three header pattern sets. The guard cannot be pinned by a behavioural test today.
- **Why existing authority does not decide it:** repository convention requires tests for behaviour,
  and this guard currently has none to exhibit.
- **Options considered:** (a) accept it as documented defensive code; (b) add a unit test asserting
  synthesised names produce the same result as no headers, which pins the _intent_ even while inert;
  (c) remove the guard as dead.
- **Reversible default selected to continue:** (a) — the guard is right and removing it would be
  wrong the moment a pattern matching `"Column"` is added. Recorded so the inertness is known.
- **Decision-hierarchy basis:** 4 — smallest reversible implementation.
- **Impact and risk:** none today; the risk is a future pattern addition.
- **Reversal or migration path:** n/a.
- **Human review still useful after completion:** no.

---

## 8. Verdict

**FAIL.**

Blocking: **F-4**.

I want to be explicit about proportion, because this package is close and the work is good. Rev 02
did what it was dispatched to do. F-1 is genuinely fixed and I proved it at the value level in a
BASE worktree, hitting the implementer's reported numbers exactly. F-2 is restored. F-3's evidence
correction goes further than asked, and the volunteered credit correction — that the value-level
property was satisfied incidentally by an older test and not by the five fixtures first written — is
the kind of disclosure that makes the rest of the evidence credible. The all-positive case, which
the dispatch singled out, is handled and pinned by a test that fails at BASE. The reference file
imports 622 of 622 with zero errors. Secret safety holds, and I re-derived it against the real data
rather than accepting the argument.

F-4 is one conditional in one helper. I am blocking on it because it produces the exact outcome rev
01 blocked on — a check number or a running balance imported as a transaction amount, every row
marked valid, zero errors — and because it is a regression against `4c77a2d`, which reported honest
errors for those files. In an application whose entire subject is money, replacing a visible failure
with plausible wrong data is the failure mode this package has twice correctly identified as the
worse one. Passing it now would be inconsistent with why rev 01 failed.

The input class is narrow: it needs a file with no genuine amount column at all. If root judges that
class out of scope for UR-008, that is a defensible call and mine is only a reviewer's reading — but
it should be made explicitly rather than by the fix shipping without it.

No product, test, ledger, marker, scratch, SCOPE, spec or FINAL-AUDIT file was modified by me. My
one product-file mutation was applied in my own worktree, reverted, and the tree verified clean by
`git status --porcelain`. All scratch probe files were deleted. My worktrees `/tmp/mf-p29r2-base`,
`/tmp/mf-p29r2-head` and `/tmp/mf-p29r2-orig` are clean and can be removed.

---

# Addendum — retarget to `ee3cce7`, and two lines of testing the coordinator added

**Verdict unchanged: FAIL, on F-4.** Nothing below changes it, and nothing below adds a second
blocking finding.

## A.0 The retarget is sound

**Measured**, independently of the coordinator's own check: `git diff 43836b0 ee3cce7 -- src tests`
is empty; the sole changed path is `evidence/P29/implementation-01.md`, +27/-11. The md5 digest over
every tracked `src/`+`tests/` `.ts`/`.tsx` file excluding `next-env.d.ts` is
`0e58fc4984aed2234afdb99df70705df` at `ee3cce7` — identical to `43836b0` and to both campaign
digests. `git merge-base --is-ancestor ee3cce7 HEAD` succeeds.

**So sections 0-8 stand verbatim as measurements of `ee3cce7`.** F-4 reproduces there; I re-ran the
probes in a fresh `/tmp/mf-p29r2b` worktree at `ee3cce7`.

**On the evidence I assessed:** I read the evidence from the main checkout, which was already at
`ee3cce7`. So §2's assessment of the credit correction was made against the newer text, not the
older one. I re-read the delta to confirm: it adds the credit correction, corrects the rev 01/rev 02
commit and BASE list, updates the test count `2316 -> 2382`, and replaces the rev 01 campaign table
with the rev 02 one while explicitly retaining the superseded rev 01 result. **All of it is accurate
against my own measurements**, including the `0e58fc49` digest and the three run durations.

## A.1 The denylist — the implementer's judgement is CORRECT, with one boundary it did not name

The coordinator asked me to test the claim that falling through `NON_AMOUNT_HEADER_PATTERN` to the
signs/minor-units ranking is sound. **I tested it and the claim holds in the case the implementer
was defending, and fails in an adjacent one it did not identify.**

**Measured**, ten headers the denylist does not contain — `Running Total`, `Closing Bal`, `Ledger`,
`Statement Balance`, `Cheque Number`, `Doc No`, `Transaction ID`, `Account No`, `Units`, `Rate` —
each placed on a numeric column beside a genuine `Amount` column, driven through the real
`loadFile`:

- with **signed** amounts: **all 10 correct**, `[-550, -7525, 250000]`, 0 errors;
- with **all-positive** amounts: **all 10 correct**, `[550, 7525, 250000]`, 0 errors.

The reason is structural rather than lucky, and it is worth stating because it is the real strength
of the design: `bestAmountColumn` at `detection.ts:324-325` settles outright when
`AMOUNT_HEADER_PATTERN` names **exactly one** column. That is an **allowlist** hit, and it fires
before the denylist matters at all. **So the denylist's incompleteness is irrelevant whenever the
amount column is itself conventionally named** — which is the overwhelmingly common real case. The
implementer's judgement that the fallback is acceptable is **correct, and better founded than its
own explanation suggests.**

**The boundary it did not name. Measured**, when the amount column is _also_ unrecognised — headers
like `Movement`, `Posting`, `Txn`, `Withdrawal`, `Deposit` — so neither pattern fires:

| arrangement                                 | result                                                               |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `Running Total` + `Txn`, **signed** amounts | correct, `[-550, -7525, 250000]`, 0 errors                           |
| `Running Total` + `Txn`, **all positive**   | **WRONG — imports `[100000, 92475, 342475]`, the balance, 0 errors** |
| `Txn` + `Running Total`, **all positive**   | correct, `[550, 7525, 250000]` — leftmost happens to be right        |

Same for `Closing Bal`, `Ledger`, `Account No`, `Doc No`. Signs rescue the signed case; when every
value is positive, signs and minor units are equal and **position decides**, so the answer is right
or wrong purely by column order.

**I am NOT raising this as a separate finding, and I want to be precise about why.** This is not a
regression introduced by the fallback — it is the residue of the case the coordinator's own ruling
identifies as having _no correct answer available_. Two all-positive numeric columns, neither named,
are identical by value **and** by header. No rule can separate them. `4c77a2d` "handled" it only by
mapping no amount at all and reporting every row as an error, which is a different behaviour, not a
better detection.

**It is materially different from F-4 in exactly one respect, and that respect is the whole point:**
in F-4 the header _does_ carry the answer — it says `Balance`, `Check No`, `Ref` — and the code
overrides it. Here the header carries nothing. Overriding available evidence is a defect; guessing
when there is no evidence is a design limit. **F-4 stands as the only block.**

Worth recording for the fix, though: **if F-4 is fixed as I recommend (`return null` when every
candidate is disowned), the all-positive-unknown-header case above is the nearest neighbour that
will still guess.** Whoever implements it should decide deliberately whether that is acceptable, and
say so, rather than discovering it later.

## A.2 `CLASSIFICATION_THRESHOLD` — no test notices ANY value across its meaningful range

The coordinator asked what breaks at 0.75 or 0.85 and whether any test would notice. **Measured**,
by editing the constant in my own worktree and re-running every affected test file — all 11 files,
310 tests:

| threshold | result     |
| --------- | ---------- |
| 0.40      | 310 passed |
| 0.50      | 310 passed |
| 0.60      | 310 passed |
| 0.75      | 310 passed |
| 0.85      | 310 passed |
| 0.95      | 310 passed |
| 0.99      | 310 passed |
| 1.00      | 310 passed |

**No test distinguishes 0.4 from 1.0.** The constant is entirely unpinned. Every fixture in the
suite has columns that are either ~100% clean or ~0% matching, so the threshold never sits between
two candidates and the value is invisible to the suite. Rev 01's reviewer accepted 0.8 on a sweep of
`inferDateFormat` and was right that the decision is not close to the boundary for realistic input —
but "not close to the boundary" is exactly why no test can see it.

**What actually breaks, measured** on 20-row files with a controlled proportion of unparseable
values, which is the evidence the constant deserves:

| bad rows | match rate | amount column      | date column        | `inferDateFormat` |
| -------- | ---------- | ------------------ | ------------------ | ----------------- |
| 0-4 / 20 | 1.00-0.80  | resolved correctly | resolved correctly | `yyyy-MM-dd`      |
| 5 / 20   | 0.75       | **unmapped**       | **unmapped**       | **`null`**        |
| 6 / 20   | 0.70       | unmapped           | unmapped           | `null`            |

**The degradation is a cliff at exactly 0.8, and it fails SAFE in both directions.** Below the
threshold the role is left unmapped and the rows report as errors — it never degrades to _a wrong
column_. That is the property that matters for money, and it is why I am not raising the threshold
as a finding: the constant is under-tested, not wrong, and a mis-set threshold costs the user a
manual mapping rather than corrupting a ledger.

Raising it to 0.85 would reject a file with 3 bad rows in 20; lowering it to 0.75 would accept one
with 4. Neither is obviously better, which is what makes 0.8 defensible as the implementer said.

**Recommendation, non-blocking:** add one test pinning the cliff — a fixture just above and just
below the threshold, asserting the role resolves in one and is absent in the other. That converts an
unpinned constant into a documented contract and would fail loudly if someone later "tunes" it. I
did not treat its absence as blocking because the failure mode is safe.

## A.3 On the header-evidence ruling — I agree with it, on the frozen text

The coordinator offered to re-rule. **I do not think it needs re-ruling, and I reached that reading
independently before being told it was a ruling.**

The frozen text at `spec.md:70-74` requires that detection "runs on a file that has no header row"
and that it "identifies each column from its values". **Measured**, the implementation satisfies
both literally: with no headers passed, the headerless reference shape resolves
`{0:date, 1:amount, 2:description}` from values alone, and the real 622-row file imports 622/622
with zero errors. The text constrains what detection must _achieve without_ a header; it does not
say a header must be discarded when present. Reading a prohibition into it would require the
sentence to say something it does not.

The consequence the implementer identified is real, and I measured it rather than reasoning about
it. **Measured**, a _headerless_ file with an all-positive amount column beside a running balance:

```
balance LEFT of amount  -> imports 100000, 92475, 342475   (the BALANCE)
balance RIGHT of amount -> imports 550, 7525, 250000       (correct)
```

Identical data, opposite answers, decided by column order alone — because with no signs, no minor-
unit difference and no header, **there is genuinely nothing to choose on.** A reviewer rejecting the
ruling would have to accept this outcome for headered files too, and would be trading a case the
implementation gets right for one nothing can get right. The ruling is correct.

## A.4 On the implementer's self-assessment

The coordinator noted the implementer volunteered that its five fixtures would have been blind and
corrected praise downward. **I audited the older parity assertion on its own merits rather than
assuming it was designed for this**, as instructed. `ur-008-csv-parity.test.ts:436-474` derives
`amountIndex` from detection at `:442-444`, parses the values at that index, and compares the result
against `processOFXImport`. **Measured:** it does reach a value-level comparison, and it would catch
a CSV/OFX divergence. But it uses `parseSyntheticCSV()`, a **headerless** fixture with one numeric
column — so it could not have caught F-1 either, and it cannot catch F-4. It is a genuine parity
test, not a disguised column-selection test. **The implementer's downward correction is accurate and
if anything still slightly generous to itself.**

That candour is the reason I have been able to review this package quickly and confidently, and it
should be weighed in the package's favour even though the verdict is FAIL.

## A.5 Scope discipline

I did not run E2E and did not take `:3000`. I did not re-run the full unit suite; the 310 figure is
the 11 affected files. All addendum work ran in `/tmp/mf-p29r2b` and `/tmp/mf-p29r2b-orig`, both
outside the repo. The one product-file mutation — the threshold constant — was reverted with
`git checkout --`, and I verified the tree afterwards: `git status --porcelain` empty, constant back
to `0.8`, digest back to `0e58fc4984aed2234afdb99df70705df`. All scratch files deleted; all five of
my worktrees removed.
