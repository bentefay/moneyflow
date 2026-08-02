# P29 / UR-008 — Independent Review, Revision 03

- **Verdict: PASS.** No blocking findings. F-4 is genuinely fixed, the fix is correctly scoped, it
  restores the original base's behaviour, and the four new tests discriminate. Two non-blocking
  observations (**F-5**, **F-6**) are recorded below; neither is a defect in this diff and neither
  should gate integration.
- **Reviewer:** `p29-reviewer-03`, distinct from `p29-implementer-01`, `p29-reviewer-01` and
  `p29-reviewer-02`. I authored none of this code and edited no product file. I mutated product
  files transiently for measurement and restored them; the tree is verified clean below.
- **Requirement:** UR-008, frozen at `specs/010-user-reported-refinements-2/spec.md` lines 56-86.
  Not read for edit, not marked.
- **Reviewed:** BASE `ee3cce7` .. HEAD **`c694a94`**, with a third reference point at the package's
  original BASE `4c77a2d`. Sections 0-10 were written against `6a51b53`; root subsequently
  retargeted the review to `c694a94`. **MEASURED:** the two are byte-identical in `src/` and
  `tests/` — same digest `8da3122b2626fca290e04a080b3b26de` — so every measurement below holds
  unchanged. See the **Addendum** for the retarget and an audit of the 11 appended evidence lines,
  which raises **F-7**.

Every statement below is labelled **MEASURED** (I ran it and read the output) or **INFERRED**.

---

## 0. Preconditions, and one correction to the dispatch

**Ancestry re-verified myself, as instructed. MEASURED:**
`git merge-base --is-ancestor ee3cce7 HEAD` returned 0 and `git rev-parse HEAD` returned
`6a51b53434a877a62ac05648aa35551b5ba816c6` at the start of review. The dispatch was accurate on both
counts.

**Correction 1 — the worktree was not clean at dispatch. MEASURED:** `git status --porcelain` showed
` M specs/007-human-scratch-completion/evidence/P29/implementation-01.md`. `git diff` on that path
produced **empty output** — an mtime-only stat difference, not a content difference. **INFERRED:** a
concurrent process touched the file. No effect on the review.

**Correction 2 — HEAD moved during my review, and the dispatch should know.** **MEASURED:** at the
end of my measurement pass `git rev-parse HEAD` returned `c694a94`, one commit ahead of the assigned
`6a51b53`:

```
c694a94 docs: record the external load source and the load-sensitive assertion check
 .../evidence/P29/implementation-01.md | 11 +++++++++++
```

**I checked whether this invalidates anything before reporting it, and it does not. MEASURED:**
`git diff --stat 6a51b53 c694a94 -- src/ tests/` is **empty**, and the recursive tree digest over
`src/` and `tests/` is byte-identical at both commits — `8da3122b2626fca290e04a080b3b26de`.
`git merge-base --is-ancestor ee3cce7 c694a94` still returns 0. Only evidence prose was appended.

**Every measurement below therefore holds for both `6a51b53` and `c694a94`.** Root must decide which
hash it records as the reviewed HEAD; per the goal's own prior experience with amended-away commits,
I state plainly that **I measured the product/test content that is common to both**, and that
content is what I am passing. If root's contract requires the reviewed HEAD to be the literal
current HEAD, the correct record is `c694a94`; the product review is unaffected either way.

**Correction 3 — the dispatch instructs me to commit, and `PROCESS.md` says reviewers never
commit.** **MEASURED:** `PROCESS.md` states "The reviewer never commits. Root verifies
`git rev-parse HEAD` still equals assigned HEAD before accepting the verdict." The dispatch
explicitly instructs me to commit this artifact with an exact pathspec. **I followed the dispatch**,
since it is the more specific and more recent instruction and the goal has evidently been operating
that way. Flagging it so root can reconcile the two documents, and noting that my commit _changes
HEAD_, which interacts directly with the verification step PROCESS.md describes.

---

## 1. The F-4 fix works — MEASURED, by printing values rather than asserting expectations

The fix is at `src/lib/import/detection.ts:337`:

```ts
if (preferred.length === 0) return null;
```

replacing the `const ranked = preferred.length > 0 ? preferred : evidence;` fallback.

**I heeded the dispatch's warning and printed the actual mapping rather than asserting an
expectation.** A scratch probe calling `detectColumnMappingsFromValues` through the real `parseCSV`
at HEAD produced:

| file                                | MEASURED mapping at HEAD `6a51b53`                               |
| ----------------------------------- | ---------------------------------------------------------------- |
| `Date,Description,Balance`          | `{"0":"date","1":"description","2":"balance"}`                   |
| `Date,Description,Check No`         | `{"0":"date","1":"description","2":"checkNumber"}`               |
| `Date,Description,Ref`              | `{"0":"date","1":"description"}`                                 |
| `Date,Description,Running Balance`  | `{"0":"date","1":"description","2":"balance"}`                   |
| `Date,Description,Balance,Check No` | `{"0":"date","1":"description","2":"balance","3":"checkNumber"}` |

**No `amount` is bound in any of them.** The dispatch's warning was correct and worth heeding: the
right answer is `2:balance` / `2:checkNumber`, **not** the absence of a key — the column keeps the
secondary role its header actually names, via `secondaryRolesFromHeaders` at `detection.ts:441`. Had
I asserted absence I would have produced a false FAIL.

**The fix does not over-fire — MEASURED.** I probed the boundary specifically, because a
`return null` guard that fires too eagerly would break the common case:

| file                                            | MEASURED mapping at HEAD                                    |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `Date,Description,Balance,Amount`               | `2:balance`, **`3:amount`** — amount still bound            |
| `Date,Description,Balance,Foo` (unnamed amount) | `2:balance`, **`3:amount`** — still bound from values       |
| `Date,Description,Balance` with signed values   | `2:balance` — disowned even when values look like money     |
| headerless `2024-01-15,Coffee,1000.00`          | `2:amount` — no header evidence, values decide, as required |
| `Date,Description, BALANCE ` (spaced/upper)     | `2:balance` — case and whitespace tolerant                  |

The guard fires only when **every** qualifying column is disowned, which is exactly its stated
contract. The headerless row is the one that matters against `spec.md:70-74`: detection still works
with no header row, so the fix does not regress the frozen requirement.

---

## 2. The fix restores prior behaviour rather than merely satisfying a new test — MEASURED

The implementer claims parity with the package's **original** BASE `4c77a2d`. I checked this
independently rather than accepting the claim.

**MEASURED:** `4c77a2d` has **no `src/lib/import/detection.ts`** — `git ls-tree` confirms the file
did not exist. Detection lived in `autoDetectMappings` inside
`src/components/features/import/tabs/MappingTab.tsx:63-149`, a pure header-substring matcher. I read
that function at `4c77a2d` and transcribed it faithfully into a scratch probe, then ran it
side-by-side with HEAD's `detectColumnMappingsFromValues` on the same parsed files:

| file                                | orig `4c77a2d`                                   | HEAD `6a51b53` | identical |
| ----------------------------------- | ------------------------------------------------ | -------------- | --------- |
| `Date,Description,Balance`          | `{0:date,1:description,2:balance}`               | same           | **yes**   |
| `Date,Description,Running Balance`  | `{0:date,1:description,2:balance}`               | same           | **yes**   |
| `Date,Description,Check No`         | `{0:date,1:description,2:checkNumber}`           | same           | **yes**   |
| `Date,Description,Ref`              | `{0:date,1:description}`                         | same           | **yes**   |
| `Date,Description,Balance,Check No` | `{0:date,1:description,2:balance,3:checkNumber}` | same           | **yes**   |

**All five identical.** This corroborates rev 02's F-4 table from the opposite direction — that
table recorded what `4c77a2d` produced; I reconstructed the original algorithm and confirm HEAD now
agrees with it on every file in the class. **INFERRED:** the regression rev 02 identified is closed,
and closed by restoring the prior semantics rather than by special-casing the new tests.

---

## 3. The 4 new tests fail at BASE, for the right reason — MEASURED

**Method.** Rather than a second 1.1G `pnpm install` under load 13, I substituted BASE's
`detection.ts` into the HEAD worktree — `git show ee3cce7:src/lib/import/detection.ts` — and ran the
rev 03 test file unchanged. This is the same discriminating experiment: the test file is at HEAD,
the product code under test is at BASE, and imports resolve normally.

**MEASURED — exactly 4 failed, 9 passed of 13:**

```
FAIL > does not import a running balance as the amount
FAIL > does not import a check number as the amount
      AssertionError: expected 2 to be +0        (validCount)
FAIL > does not import a reference number as the amount
      AssertionError: expected 2 to be +0        (validCount)
FAIL > leaves the amount unmapped rather than binding a disowned column
      AssertionError: expected [ 'date', 'description', 'amount' ] to not include 'amount'
```

**The failure reason is the correct one on every count** — a wrongly-bound `amount` column and rows
counted valid where they should be errors. **Not** an unresolved import, not a missing symbol, not a
harness error. The fourth failure names the defect literally: the mapping array contains `'amount'`
at BASE and must not.

**Tree restored and verified. MEASURED:** `git checkout -- src/lib/import/detection.ts`, then
`git diff --quiet` on the **whole tree** returned clean and `md5sum src/lib/import/detection.ts` =
`bf95f16afaacf25c6128acfc89a11d4d`, matching the pre-mutation value.

---

## 4. The blindness test applied to rev 03's own new tests

This is the package's recurring theme and the dispatch was right to press it. Rev 02 shipped six
value-level assertions that would all have passed with F-4 present. **For each of rev 03's four new
F-4 assertions I asked: would this still pass if the defect were present?** Section 3 answers it by
direct measurement: **all four fail at BASE.** They are not blind.

**But I pushed further, because "fails at BASE" only proves they catch _this_ defect.** The stronger
question is whether they are pinned to the observable outcome or to an implementation artifact.

- The first three assert `validCount` and `errorCount` **through the real
  `useImportState.loadFile`**, not the mapping. **INFERRED:** these are outcome-level and survive a
  refactor of how the mapping is represented.
- The fourth asserts the mapping shape, including `mappings["2"]).toBe("balance")`. **INFERRED:**
  this one is implementation-coupled — but deliberately so, and it is the assertion that pins the
  _distinction the dispatch warned me about_: unmapped-and-still-labelled-balance versus absent. It
  earns its place.
- **MEASURED gap, non-blocking:** the three outcome tests assert `validCount`/`errorCount` but do
  not assert that `previewTransactions` carries no imported money. At BASE the amounts were
  `100000, 92475`; the tests catch that today only via the counts. **INFERRED:** if a future change
  made rows error _and_ still populated an amount, these would pass. This is F-6 below — a hardening
  suggestion, not a defect, since no such path exists now.

---

## 5. The placeholder fence — I disagree with the premise, and it favours the implementer

The dispatch, the code comment at `detection.ts:251-258` and the test comment all state that this
test **cannot currently fail**, and root ruled it should be pinned as an inert-by-coincidence fence.
**I tested that claim rather than accepting it, and it is wrong in the implementer's favour: the
fence is live.**

**MEASURED, part 1 — the comment's factual claims are exactly right.** Evaluating every pattern in
the file against `["Column 1".."Column 4"]`: `AMOUNT_HEADER_PATTERN`, `NON_AMOUNT_HEADER_PATTERN`
and all four `SECONDARY_ROLE_PATTERNS` match **none** of them. The named-unsafe shapes behave as
documented: `/col/i` and `/\bcolumn\b/i` match all four; `/\bcol\b/i` and `/\bno\b/i` match none.
Every specific claim in that comment is accurate.

**MEASURED, part 2 — the fence actually fires.** I widened `NON_AMOUNT_HEADER_PATTERN` to
`/\bcolumn\b|\bbalance\b|.../i` — precisely the widening the comment warns about — and re-ran:

```
FAIL > synthesised placeholder headers are not evidence
      > resolves a headerless file identically with placeholders and with none
Tests  1 failed | 12 passed (13)
```

**So the test is not merely a fence that "cannot currently fail". It is a fence that demonstrably
does fail the moment a pattern is widened to match a placeholder** — which is the exact regression
it was written to catch. It is unfalsifiable only against the _current_ pattern set, which is the
ordinary condition of every regression test.

**My judgement: keep it, and the "cannot currently fail" framing in the code comment and evidence
understates it.** Root's ruling to pin rather than remove was correct, and correct for a stronger
reason than root gave. The only change I would suggest is prose: the comment's shouted "THIS TEST
CANNOT CURRENTLY FAIL" invites a future reader to delete it as dead weight — the very outcome the
comment is trying to prevent — when the accurate statement is "this test fails if any header pattern
is widened to match a placeholder name; verified by mutation." **Non-blocking; recorded as F-5.**

**Tree restored. MEASURED:** `git diff --quiet` clean, `md5sum` back to
`bf95f16afaacf25c6128acfc89a11d4d`.

---

## 6. The threshold cliff tests discriminate — MEASURED, mutation re-run

I re-ran the implementer's mutation independently rather than trusting the evidence.

| `CLASSIFICATION_THRESHOLD` | MEASURED result                                                 |
| -------------------------- | --------------------------------------------------------------- |
| `0.8` (shipped)            | 13 passed                                                       |
| `0.5`                      | **1 failed** — "leaves the amount unmapped at 5 bad rows of 20" |
| `0.95`                     | **1 failed** — "still binds the amount at 4 bad rows of 20"     |

**Both directions discriminate**, and each mutation fails the assertion on the correct side of the
cliff. The constant at `detection.ts:65` is now a pinned decision rather than an unexamined number,
which was rev 02's complaint.

**Restored and verified on the WHOLE tree, as the dispatch specifically required. MEASURED:**
`git diff --quiet` returned clean; `md5sum src/lib/import/detection.ts` =
`bf95f16afaacf25c6128acfc89a11d4d`; `git status --porcelain` showed only my own scratch probe, since
deleted.

---

## 7. The three points the implementer asked me to press hardest

**7.1 — The header-evidence ruling. I accept it, and I would have reached it independently.**
**MEASURED:** `spec.md:70-74` requires that column detection "runs on a file that has no header row"
and that detection "identifies each column from its values". It says nothing requiring headers to be
discarded when present. **INFERRED:** the ruling is a correct reading, not a convenient one. I also
confirm the consequence root identified is real: a running balance and an all-positive amount column
are identical by value, so with headers discarded the all-positive case has no available correct
answer. My §1 measurement of the headerless file confirms the no-header path still works, which is
the clause that is actually frozen. **No finding.**

**7.2 — `NON_AMOUNT_HEADER_PATTERN` is a hand-written denylist. Rev 03's characterisation is
correct, and I verified it rather than accepting it.** **MEASURED:** the allowlist hit at
`detection.ts:334-335` (`named.length === 1` returns outright) fires before the denylist is
consulted, so whenever the amount column is conventionally named the denylist's completeness is
irrelevant. My §1 probe confirms `Date,Description,Balance,Amount` binds `3:amount` regardless. The
rev 03 finding — that F-4 was the code _overriding_ the denylist, not the denylist being incomplete
— is **MEASURED-correct**: removing the override fixed the whole class without adding one pattern.

**7.3 — The nearest-neighbour design limit. I re-litigated it, as invited, and I uphold the
non-fix.** I probed the residual class directly:

**MEASURED**, through the real `useImportState.loadFile`:

| header          | HEAD `6a51b53`                      | BASE `ee3cce7`                      |
| --------------- | ----------------------------------- | ----------------------------------- |
| `Reference`     | `100100, 100200`, 2 valid, 0 errors | `100100, 100200`, 2 valid, 0 errors |
| `Serial No`     | `100100, 100200`, 2 valid, 0 errors | `100100, 100200`, 2 valid, 0 errors |
| `Closing Bal`   | `100000, 92475`, 2 valid, 0 errors  | `100000, 92475`, 2 valid, 0 errors  |
| `Ref` (control) | `0, 0`, **0 valid, 2 errors**       | `100100, 100200`, 2 valid, 0 errors |

**This is the decisive comparison and it exonerates rev 03.** `Reference`, `Serial No` and
`Closing Bal` behave **identically at BASE and at HEAD** — they are pre-existing denylist
incompleteness, unchanged by this diff. The `Ref` control shows rev 03 strictly improving: wrong
money silently imported at BASE becomes an honest error at HEAD. **Rev 03 fixes cases and regresses
none.**

I note for the record that `\bref\b` matches `Ref`, `Ref No`, `REF`, `Ref Number` and
`Transaction Ref` but **not** `Reference` (MEASURED), and `\bbalance\b` does not match `Closing Bal`
or `Bal`. **INFERRED:** these are plausible real-world bank headers. But the implementer's governing
distinction — _overriding available evidence is a defect; guessing with none is a design limit_ — is
sound, and more importantly **these cases are outside this diff's blast radius**: unchanged by it,
present before it, and not what F-4 was about. Raising them as a block would be manufacturing a
finding. **Recorded as F-6, non-blocking**, with the honest note that the cheapest mitigation is a
denylist entry, which the implementer already identifies as the right response to a real user
report.

---

## 8. Static checks and hygiene — MEASURED

| check                                          | result                                                                                                                                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                               | **clean** — `tsc --noEmit`, no output                                                                                                                                                                                      |
| `pnpm lint`                                    | 0 errors, 1 warning — `TransactionTable.tsx:426` React Compiler / TanStack Virtual, **pre-existing and untouched by this diff**                                                                                            |
| `oxfmt --check` on the two reviewed files only | **"All matched files use the correct format"** — bare `pnpm format` not run                                                                                                                                                |
| `pnpm vitest run tests/unit/import/`           | **314 passed** (10 files)                                                                                                                                                                                                  |
| `pnpm vitest run tests/unit`                   | **2059 passed, 2 skipped** (97 files)                                                                                                                                                                                      |
| `pnpm vitest run tests/integration`            | **330 passed** (26 files)                                                                                                                                                                                                  |
| `ur-008-csv-parity.test.ts`                    | **26 passed** — the reference-case clause still holds                                                                                                                                                                      |
| `as` / `any` / `!` in the reviewed diff        | **none** — grep over added lines in `src/` and `tests/` returned nothing                                                                                                                                                   |
| fixtures synthetic                             | **yes** — `Coffee Shop`, `Grocery Store`, `Direct Deposit`, `BAKERY`, dates `2024-01-15`/`01-16`/`01-17` and `01/07/2026`. No principal data.                                                                              |
| secret safety                                  | **clean** — the only match in the evidence is its own negative attestation at line 828 naming the categories it excludes. No key material, seed phrase or `SUPABASE_JWT_SECRET` value in the evidence or in this artifact. |

**E2E: NOT RUN, as instructed.** `p31-implementer-01` holds port :3000. **I do not believe an E2E
run is required for this revision**: the diff is one guard in one pure helper plus unit tests, and
both E2E import fixtures carry a genuine `Amount` column, so — **INFERRED** from rev 02's §345
finding, which I did not re-verify — neither could exercise the disowned-only branch either way.

**Load discipline. MEASURED:** load average was 13.32 at start with a live `vitest` campaign, so I
ran every suite at `--maxWorkers=2` to `4` rather than the default 32, and skipped `pnpm build`
entirely as unnecessary for a pure-helper change already covered by `typecheck`. Nothing else was
skipped for load.

**Scratch deleted. MEASURED:** `tests/unit/import/zz-r3-probe.test.tsx` removed;
`git status --porcelain` shows no untracked files under `tests/`; `git diff --quiet` clean over the
whole tree before writing this artifact.

---

## 9. Findings

### F-5 — LOW — Documentation — the "cannot currently fail" framing understates a fence I proved live

**File:** `src/lib/import/detection.ts:251-258` and
`tests/unit/import/ur-008-amount-column.test.tsx`, the
`synthesised placeholder headers are not evidence` block.

**MEASURED:** widening `NON_AMOUNT_HEADER_PATTERN` to include `\bcolumn\b` makes that test **fail**.
The test is a working regression fence, not an inert one. The shouted comment "THIS TEST CANNOT
CURRENTLY FAIL, AND THAT IS DELIBERATE" is intended to stop a future reader deleting it, but it
supplies that reader with the exact argument for deletion.

**What must change:** nothing blocking. If touched later, replace the framing with the measured fact
— the test fails if any header pattern is widened to match a placeholder name, verified by mutation.
**I am not requiring this change and it must not gate integration.**

### F-6 — LOW — Design limit, pre-existing — unrecognised numeric headers still import as money, and the new tests pin counts rather than amounts

**File:** `src/lib/import/detection.ts:272-273`; `ur-008-amount-column.test.tsx`, the
`a file with no amount column imports no amounts` block.

**MEASURED:** `Reference`, `Serial No` and `Closing Bal` each import as `amount` with 0 errors —
**identically at BASE `ee3cce7` and HEAD `6a51b53`**, so this is not introduced or worsened by this
diff, and `Ref` is strictly improved by it. Separately, the three outcome-level tests assert
`validCount`/`errorCount` but not that `previewTransactions` is free of imported amounts.

**What must change:** nothing in this revision. Recorded so the class is not lost: a future revision
touching this area could add `\breference\b`, `\bserial\b` and a `\bbal\b` alias, and could add an
amount-level assertion alongside the count assertions. **Explicitly non-blocking** — outside this
diff's scope, and blocking on it would be manufacturing a finding.

### Findings that would block: **none.**

---

## 10. Clause sweep against the frozen UR-008 text

Verified for this revision's blast radius. Clauses marked _(rev 02)_ were established by the prior
reviewer and I confirmed only that the relevant suite still passes rather than re-deriving them.

| clause (`spec.md:60-86`)                               | status                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| leading `+` parses as positive                         | _(rev 02)_ — `ur-008-csv-parity.test.ts` 26 passed                                                                                         |
| quoted field containing the delimiter                  | _(rev 02)_ — same suite                                                                                                                    |
| collapse repeated whitespace by default                | _(rev 02)_ — same suite                                                                                                                    |
| detection runs automatically, and on a headerless file | **MEASURED at HEAD** — headerless file maps `2:amount` from values                                                                         |
| detection identifies each column from its values       | **MEASURED — now MET including the F-4 class**; rev 02's PARTIAL closed                                                                    |
| date format detected from values, day-first, no header | _(rev 02)_ — suite passes                                                                                                                  |
| summary distinguishes old / duplicate / both           | _(rev 02)_ — suite passes                                                                                                                  |
| every reported error genuinely unparseable             | **MEASURED — MET, and the inverse now holds in the F-4 class**: a file with no amount column reports errors instead of importing a balance |
| reference 622-transaction case                         | _(rev 02)_ — parity suite passes                                                                                                           |

---

## 11. Verdict

**PASS.**

F-4 is fixed, and fixed correctly: the guard fires exactly when every qualifying column is disowned,
does not over-fire on files that still contain a genuine amount, and preserves the headerless path
the frozen requirement actually mandates. The fix restores the original base `4c77a2d`'s behaviour
on all five files in the class — verified independently by reconstructing that base's algorithm, not
by trusting the evidence. The four new tests fail at BASE for the right reason. The threshold tests
discriminate in both directions under mutation. The placeholder fence is live, which is better than
claimed.

The evidence document is honest about its limits: it names the design limit as a decision rather
than burying it, and the one claim I set out to falsify — the inert fence — turned out to understate
the implementer's own work rather than overstate it. My two findings are both non-blocking and
neither originates in this diff.

**Questions recorded as Q-proposals, no pause taken:**

- **Q-P29-03-01:** `PROCESS.md` says "The reviewer never commits"; this dispatch instructs the
  reviewer to commit its artifact. Which governs? My commit changes HEAD, which interacts with the
  PROCESS step requiring root to verify HEAD still equals the assigned HEAD. _Safest reversible
  reading taken:_ followed the dispatch, committed only the review artifact by exact pathspec, and
  flagged the conflict here.
- **Q-P29-03-02:** should the reviewed HEAD of record be `6a51b53` or `c694a94`? Product and test
  content are byte-identical (`8da3122b2626fca290e04a080b3b26de`); only evidence prose differs.
  _Safest reversible reading taken:_ reported both, stated my measurements cover the content common
  to them, and left the choice to root. **Resolved by root: the target is `c694a94`.** See the
  Addendum.

---

## Addendum — retarget to `c694a94`, and an audit of the 11 appended evidence lines

Root retargeted this review from `6a51b53` to `c694a94` and asked me to audit the honesty of the
labelling in the appended lines. **The verdict is unchanged: PASS.** The audit produced one finding,
**F-7**, which is **non-blocking for the code** but is a **factual error in the evidence** that root
should correct before integration, because root is the party the error is attributed to.

### A.1 Ancestry re-verified against the corrected target — MEASURED

Re-run at the moment of retarget, not relied upon from earlier: `git merge-base --is-ancestor`
returns 0 for **all three** of `ee3cce7`, `6a51b53` and `c694a94` against current HEAD. Current HEAD
is `3613263`, which is my own review-artifact commit. `git diff --stat c694a94 HEAD -- src tests` is
**empty**, and the recursive `src/`+`tests/` digest at `c694a94` is
`8da3122b2626fca290e04a080b3b26de` — identical to the value I measured at `6a51b53`, and identical
at `6e4bf32`, the commit the E2E campaign actually ran against.

**Every measurement in sections 1-10 therefore applies to `c694a94` unchanged.** The reviewed target
of record is **`c694a94`**.

### A.2 The labelling is honest — MEASURED

The appended block is at `implementation-01.md:760-770`. Checked against the question root asked:

- **Attribution is explicit and correct.** Both paragraphs open "**The coordinator traced…**" and
  "**The coordinator also checked…**", and the block closes "Recorded as the coordinator's
  measurement, not mine." Nothing root measured is claimed by the implementer.
- **Nothing the implementer measured is upgraded.** The pre-existing text at `:751-757` still says
  only that load 21.20 came from "another process… nothing of mine was running" — which is what the
  implementer could establish — and the external-source attribution is confined to the new
  root-attributed paragraph. The pre-existing "if anything stronger" assertion at `:756-757` now has
  a stated reason after it rather than standing alone, which was the implementer's stated purpose.
- **The file's own convention is `**Observed**`/`**Inferred**`; the appended block uses neither.**
  **INFERRED:** attributing to a named third party is a stronger and clearer provenance marker than
  `**Observed**` would be here, since `**Observed**` throughout this file means "observed by the
  implementer". This is a defensible choice, not a lapse. No finding.

**On the honesty bar root set:** I agree it is high and I agree it is met on attribution. The
implementer disclosed a campaign-invalidating load condition unprompted and against its own
interest. That is not in question.

### F-7 — MEDIUM — Evidence factual error — two of the three named "load-sensitive assertions" cannot appear in an E2E campaign log, so the strongest new claim is unsupported as written

**File:** `specs/007-human-scratch-completion/evidence/P29/implementation-01.md:764-770`, and the
pre-existing clause at `:749-750`.

The appended claim is that all three recorded load-sensitive assertions were checked "across all
three logs" and none fired, and it draws the conclusion that "run 3 put them under load 21 and they
held."

**MEASURED — two of the three are Vitest tests and the campaign was Playwright-only:**

- `playwright.config.ts:53` sets `testDir: "./tests/e2e"`.
- `duplicates.test.ts` lives at `tests/unit/import/duplicates.test.ts`; `vault-maintenance.test.tsx`
  lives at `tests/integration/`. Neither is under `tests/e2e/`, and neither exists as an E2E spec.
- Grepping the three campaign logs `/tmp/p29r3-e2e-run{1,2,3}.log`: `duplicates.test.ts` appears **0
  times** in each; `vault-maintenance` appears **0 times** in each.

So the two assertions that historically _did_ flake — the `ratio < 4` bound at
`duplicates.test.ts:749-750` and the frame-timing test in `vault-maintenance.test.tsx`, both
disclosed at `implementation-01.md:702-709` — **were never executed during the three E2E runs at
all.** Their absence from the logs is not evidence that they held under load 21; it is evidence that
they were not run.

**The third one does check out. MEASURED:** `transactions.spec.ts:804` falls inside the test
`virtualized large list preserves position, focus, editing, filtering and navigation`
(`tests/e2e/transactions.spec.ts:725`), and that test appears exactly once in each of the three logs
and passed in all three, including run 3 at load 21.20. Its assertion at `:804` is a genuine
wall-clock bound, `expect(expansionDurationMs).toBeLessThan(10_000)`. **That one claim is sound and
is real evidence of load resilience.**

**Why this matters, stated proportionately.** The campaign result itself is not in doubt:
**MEASURED**, all three logs end `177 passed` and contain no `failed`. The unit campaign logs
`/tmp/p29r3{,b,-final}-unit.log` independently show `123 files, 2386-2389 passed, 2 skipped`, and my
own runs at §8 reproduce a green unit and integration suite at the reviewed tree. **Nothing here
suggests the code is wrong, and F-7 does not touch the F-4 fix.** What is wrong is the _inference_
the appended paragraph draws — it presents the strongest available argument for why this campaign
beats a quiet-box campaign, and two-thirds of that argument rests on files that did not run.

**Note also the pre-existing clause at `:749-750`** — "none of the three recorded load-sensitive
assertions fired" — carries the same defect and predates the append; it is not something root
introduced.

**What must change.** Root owns this text, since it is recorded as root's measurement. Narrow the
claim to what the logs support: `transactions.spec.ts:804` ran under load 21.20 and its 10-second
wall-clock bound held. State that `duplicates.test.ts:749` and `vault-maintenance.test.tsx` are
Vitest tests outside `testDir` and so were not exercised by the E2E campaign — their resilience is
attested separately by the unit campaign at `:711-712`, at load ~10, not load 21. The conclusion
"stronger than a quiet-box pass" survives on the E2E assertion alone; it just cannot lean on all
three.

**This does not gate the code.** If root prefers to integrate and correct the evidence in the same
control commit, that is a reasonable call — my PASS on the product is not contingent on it. I am
raising it because root asked me to audit exactly this passage, and because an inference attributed
to root should not go into the ledger with two of its three supports absent.

### A.3 The lint note — MEASURED, no action taken

Root warned that `.p30-review-scratch/` causes `pnpm lint` to report 2 errors in vendored
`animate-ui` files. **MEASURED:** that directory does **not** exist in `/tmp/mf-p29`, so my §8 lint
run was unaffected and stands as reported — 0 errors, 1 pre-existing React Compiler warning at
`TransactionTable.tsx:426`. I did not chase or touch the two errors.
