# P30 rev 07 — independent review 04

**Verdict: PASS**

## Reviewer identity and independence

`p30-reviewer-04`. Distinct from `p30-implementer-01`, `p30-reviewer-01`, `p30-reviewer-02` and
`p30-reviewer-03`. I did not write, advise on, or review any earlier revision of this package. I
wrote no product code, no test code, and no file under `specs/**` other than this artifact. I did
not commit this artifact.

Every figure below was re-derived by me. Nothing is relayed from the dispatch, PROGRESS.md, or the
implementer's evidence. **MEASURED** and **INFERRED** are marked distinctly.

## Range and ancestry

**MEASURED**, at 2026-08-02 15:30:04 UTC:

```
$ git merge-base --is-ancestor 63c7007 HEAD
(exit 0)
$ git rev-parse HEAD
6ed99ff46271775ddd2960bc59e3a4943c11bc72
```

- **BASE:** `b777d3d`
- **Reviewed HEAD (subject):** `63c7007`
- HEAD at review time was `6ed99ff`; it has since moved further (root control commits under
  `specs/**`). `git diff --numstat 63c7007 HEAD -- src tests` was **empty** (MEASURED), so no
  product or test file changed after the subject. The ancestry check is valid only for the instant
  it ran; root must re-verify before accepting.

Subject file digests, held constant across every experiment below (MEASURED):

| File                                                               | md5                                |
| ------------------------------------------------------------------ | ---------------------------------- |
| `src/components/features/transactions/TransactionRuleProposal.tsx` | `334d0bca6b8947ea57b94d17bb60dc47` |
| `tests/e2e/rule-creation-controls.spec.ts`                         | `b9e373b6a83a069fdb9c09c34bbc288c` |
| `tests/unit/components/rule-proposal-auto-apply.test.tsx`          | `4dfc75112a6dbea3e7301579b95301a0` |

Rev 06 component (BASE `b777d3d`), used as the revert oracle: `865c2f0df04ba38bfc66601b1288a806`.

Product diff in scope is `36/61` on `TransactionRuleProposal.tsx` — matches the dispatch (MEASURED).
The range also carries P29's import work (`detection.ts`, `MappingTab.tsx`, `use-import-state.ts`,
`ImportPanel.tsx`), which is a separate merged package and out of P30's scope.

## Correction to the brief: the frozen clause citation

The dispatch cites the binding clause as `specs/011-automations-conformance/spec.md:263-266`. That
file is **61 lines long** (MEASURED: `wc -l` = 61), so `:263-266` cannot point into it. The real
binding text is `specs/human-scratch.md:263-266`, which the 011 spec itself delegates to at its
lines 18-19 and which the component's own comment cites correctly. Verified verbatim (MEASURED):

> The prefix "Updating" implies the change will apply automatically when the row loses focus, or if
> you click the tick button. "Update" implies you have to manually click the tick button.

This is a citation error in the dispatch, not in the code. No finding against the implementer.

## What I verified

### 1. The fix is real and the E2E journeys genuinely discriminate

**MEASURED.** Reviewed tree, `--retries=0`, in a dedicated worktree at `63c7007`:

- `tests/e2e/rule-creation-controls.spec.ts`: **11/11 passed, five consecutive runs** (21-27s each).
- Full E2E suite: **191 passed, 1 failed** — the single failure being a `people-settlement.spec.ts`
  member (canonical example D), i.e. the expected rotation, not P30's.
- `tests/unit/components/rule-proposal-auto-apply.test.tsx`: **5/5, twenty consecutive runs, zero
  failures.**
- `pnpm typecheck`: clean. `pnpm lint`: 0 errors, 1 warning (`react-hooks/incompatible-library` on
  `TransactionTable.tsx:455`) — pre-existing and unrelated to this diff.
- `oxfmt --check` on all three subject files: clean.

The three verdict journeys are capable of failing. **MEASURED** by neutralising the auto-apply
(replacing the `confirm()` call inside the deferred read with a no-op) on an otherwise
byte-identical rev 07 component — all three go red together:

```
✘ choosing Updating all writes nothing until focus leaves the row, then writes on blur
✘ a description alias committed with Enter applies an Updating rule
✘ a tag change applies when the user clicks non-focusable page chrome
```

That is the negative control the package needed: the journeys are not vacuous.

### 2. Revert-the-fix grading, E2E

**MEASURED.** Test file held at `b9e373b6…`; component swapped to rev 06 (`865c2f0d…`). Six runs:

| Journey (by title)                                                    | vs rev 06     |
| --------------------------------------------------------------------- | ------------- |
| `choosing Updating all writes nothing until focus leaves the row…`    | RED 6/6       |
| `a tag change applies when the user clicks non-focusable page chrome` | RED 6/6       |
| `a description alias committed with Enter applies an Updating rule`   | **GREEN 6/6** |

Two of three verdict journeys reliably catch the regression. That is sufficient E2E grading: the fix
cannot be reverted with the suite green.

### 3. `appliedRef` is load-bearing and pinned

**MEASURED.** Deleting the two guard lines from `confirm()` on the rev 07 component, with the unit
file byte-identical:

```
× applies when the edit began with focus in the row and the user then clicks away
  → expected "vi.fn()" to be called 1 times, but got 3 times
× DOES apply once the edit has closed and focus is genuinely outside the row
  → expected "vi.fn()" to be called 1 times, but got 3 times
× writes exactly once no matter how often the listeners re-register
  → expected "vi.fn()" to be called 1 times, but got 8 times
```

3 applies at the blur and 8 after five further renders — reproducing the implementer's numbers
exactly, independently. The guard is load-bearing, and `TransactionRuleProposal.tsx:181` pins it.

### 4. The listener effect's `confirm` dependency

**MEASURED.** The `confirm` dependency at `TransactionRuleProposal.tsx:225` does re-register the
listeners, and each registration re-runs the mount-time `evaluateSoon()` at `:220`. The guard that
makes this safe is `appliedRef`, not the dependency array — confirmed by the mutant above, which is
precisely the burst that appears when the guard is removed. Root's "harmless" claim was reasoning;
the mechanism is real and the guard is what neutralises it. Checked the guard, not the claim.

### 5. Mutation testing of the decision gates

**MEASURED**, each against the byte-identical unit file:

| Mutant                                                      | Result         |
| ----------------------------------------------------------- | -------------- |
| Delete `appliedRef` guard                                   | 3 failed ✅    |
| Remove live `isRowFocusLost()` gate (`:214`)                | 1 failed ✅    |
| Remove `isEditing` gate (`:202`)                            | 2 failed ✅    |
| Remove `isAutomatic` gate (`:202`)                          | **0 failed** ⚠ |
| Read captured `shouldAutoApply` instead of the ref (`:213`) | **0 failed** ⚠ |

The two survivors are discussed under Findings.

### 6. The E2E locator class (`c9e80b8`)

**MEASURED.** `rowsWithDescription` appears **19 times** in the spec: 1 definition (`:136`), 1 in a
comment (`:485`), **17 call sites**, of which 2 pass an explicit description (`:186`, `:285`). That
reproduces the dispatch's corrected count exactly.

I swept by **what each journey mutates**, not by call shape, as instructed. Exactly two journeys
rename a description —
`changing a description alias offers to create a rule that applies to the other rows` (fills
"Coffee" at `:214`) and `a description alias committed with Enter applies an Updating rule` (fills
"Coffee" at `:498`). **Both now index positionally**
(`page.getByTestId("transaction-row").first()/.nth(1)` at `:211`, `:232`, `:493-494`). Every
remaining `rowsWithDescription` call site sits in a journey that mutates tags or allocations only,
never the description its locator filters on. The class is swept.

### 7. Carried open item

`InlineEditableTags`' Escape handler bound to a blurred `CommandInput` — pre-existing, recorded,
ruled out of UR-009 scope. Accepted as carried, not re-litigated. **Not a rev 07 regression.**

### 8. Evidence trail

**MEASURED.** `63c7007` adds exactly six files, `evidence/P30/implementation-01.md` through
`-06.md`, 1454 insertions, no deletions, nothing else swept in. Files `-01.md` through `-07.md` are
all present at HEAD. The retractions land where the dispatch says: `-07.md:53-62` retracts both the
`props.isEditing` mechanism and the portal mechanism by probe output, and `-07.md:114-115` tabulates
the rev 05/06 test-gap history. Read as the path taken, not as current claims.

## Findings

### F-1 — LOW (advisory, not blocking): the discriminating unit test grades the fix only ~50% of the time

**File:** `tests/unit/components/rule-proposal-auto-apply.test.tsx:140`
(`"applies when the edit began with focus in the row and the user then clicks away"`)

**Frozen clause:** `specs/human-scratch.md:263-266` — this is the test that pins the "Updating" half
of the clause against the rev 06 regression.

**MEASURED reproduction.** Unit file held at `4dfc7511…`, component at rev 06 `865c2f0d…`, twenty
consecutive full-file runs:

```
green=10  red=10  of 20
```

Every red run named this one test; the other four never failed. Run in isolation with
`-t "applies when the edit began with focus in the row"`, the same pair is **red 20/20**. So the
test is a correct oracle, but inside its own file it detects the regression only about half the
time.

**Mechanism, MEASURED.** I probed the apply count after each of six successive 10ms flushes, same
gesture, eight runs per revision:

```
REV06: [0,0,1,1,1,1]   (×8, perfectly stable)
REV07: [1,1,1,1,1,1]   (×8, perfectly stable)
```

Rev 06 **does** eventually apply — it needs three deferred flushes where rev 07 needs one. The test
issues a single `advanceTimersByTimeAsync(10)`, and `vi.useFakeTimers({ shouldAdvanceTime: true })`
couples that to the real clock, so whether rev 06's third flush lands inside the window depends on
machine load. Confirmed both directions: adding two extra flushes makes rev 06 pass **8/8**;
removing `shouldAdvanceTime` makes a _different_ test fail deterministically instead.

**This also corrects a claim carried from the implementer's evidence into the dispatch.** Evidence
`-07.md:61-62` states the two rev 06 conditions "are never true at the same instant, so the write
never happens," and the dispatch repeats it as MEASURED. My probe shows the write _does_ happen, two
deferred ticks later. The rev 06 defect is a **latency/ordering** defect, not total inaction. The
fix is still correct and still an improvement — rev 07 decides at the first tick, which is what the
frozen text's blur gesture requires — but the mechanism in the record overstates the failure mode.

**Why LOW and not blocking:**

- Rev 07 itself is **20/20 green** on this file and **[1,1,1,1,1,1]** on the probe — no flake in the
  shipped direction. This is a grading-sensitivity issue, not a product defect and not a flaky test.
- The E2E layer catches the same regression **6/6 deterministically** on two independent journeys
  (§2), so the fix cannot be reverted with the overall suite green.
- The remedy is a one-line hardening (a `waitFor` on the assertion, or an extra flush plus an
  assertion that the write happened at the _first_ tick), which is exactly the kind of change that
  should not be made under review.

**Recommend** routing as a follow-up: make this test assert the _timing_ it actually cares about
rather than relying on a single load-sensitive flush.

### F-2 — LOW (advisory): the manual "Update" half of the clause has no unit coverage

**File:** `tests/unit/components/rule-proposal-auto-apply.test.tsx` (whole file); gate at
`src/components/features/transactions/TransactionRuleProposal.tsx:202`

**Frozen clause:** `specs/human-scratch.md:263-266` —
`"Update" implies you have to manually click the tick button.`

**MEASURED reproduction.** Removing `isAutomatic` from the `shouldAutoApply` conjunction — which
makes the manual `updateAll`/`updateNew` modes auto-apply on blur, a direct violation of the frozen
clause — leaves this file **5/5 green**, and leaves the **entire unit + integration suite** green
(128 files; baseline and mutant both show the same 2 pre-existing `realtime-*` failures and no
others). The mutant survives because the file's mock hard-codes `applyMode: "updatingAll"`, so no
unit case ever exercises a manual mode.

**Mitigated, not open.** The E2E layer does catch it: the same mutant fails **6 of 11** journeys
(MEASURED), including `changing a tag offers to create a rule…` and
`ticking only-if-amount scopes the rule…`. And `applyModeIsAutomatic` itself is directly unit-tested
at `tests/unit/domain/automation/apply-mode.test.ts:22,45,53,66` and
`tests/unit/components/rule-editor-model.test.ts:30-31`. So the clause is covered — just not at the
component-decision layer, which is the layer this file exists to defend.

**Recommend** a follow-up case with `applyMode: "updateAll"` asserting `apply` is NOT called on
blur.

### F-3 — INFORMATIONAL: a fresh worktree cannot run E2E without `.env.local`

**MEASURED.** `.env.local` is untracked, so `git worktree add` does not copy it. Without it, all 11
journeys fail identically inside `createNewIdentity` (`page.waitForURL("**/settings")` timeout at
`tests/e2e/helpers/auth.ts:52`) — an environment failure that impersonates a total product break.
Copying the file in turned the same tree from 0/11 to 11/11.

This is the second instrument-failure class I hit; the first was a stale
`node_modules/.vite/vitest/results.json` carried in by a copied `node_modules`, which reported "5
passed" for a run that had actually failed. Both are worth recording for future reviewers of this
package. Neither is a defect in the reviewed code.

## Expected, not findings

- **`people-settlement.spec.ts` rotation.** One member failed in my full-suite run
  (`canonical example D`). Run in isolation immediately afterwards the same spec was **19/19 clean**
  (MEASURED), which is consistent with the recorded load-dependent rotation and carries no
  information either way. Not P30's, and not counted against this verdict.
- **`6ece9b1` (`chooseApplyMode`) and `adf6b5e` (`aria-expanded`).** Read as retained hygiene on
  their own merits, **not** as the cure for the Enter-commit journey. I did not credit either with
  fixing that journey. `chooseApplyMode` is applied at nine call sites and its `aria-expanded` wait
  is genuinely less ambiguous than a global listbox count, since the row's description input carries
  `aria-haspopup="listbox"` of its own (verified in the spec source).
- **`InlineEditableTags` Escape handler.** Carried, out of scope.

## What I accepted rather than verified

- The **P29 import changes** in the `b777d3d..63c7007` range (`detection.ts` and friends). They are
  a separately reviewed package; I confirmed only that they are outside P30's scope.
- The **historical revision narrative** in evidence `-01.md` through `-06.md`. I confirmed the six
  files are committed unedited and that the retractions land where claimed; I did not re-run the
  experiments of revisions 01-06. I did re-test the one rev 06 claim that mattered to this verdict,
  and it is corrected in F-1.
- The **contrast/zoom/reduced-motion matrix** for the proposal controls. The rev 07 diff changes no
  markup, no styling, no class and no ARIA attribute — it is confined to the auto-apply decision
  logic (`36/61`, all inside one effect and its two derived values). I verified that claim from the
  diff itself rather than re-running the visual matrix, which earlier revisions covered.
- The **campaign digest `4b3b9ee6…` and the 191/191/190 totals** at `f397da1`. I did not reproduce
  the implementer's campaign; I ran my own at the reviewed commit and report only my own numbers.

## Verdict

**PASS.**

The frozen clause at `specs/human-scratch.md:263-266` is satisfied in both directions and the
decision is made at one instant, as the revision claims. The fix cannot be reverted with the suite
green: two E2E journeys catch it 6/6 deterministically, and three mutants of the shipped decision
gates are killed by the unit file. `appliedRef` is confirmed load-bearing and pinned, with the
3-and-8 burst reproduced independently. The locator hazard class is swept by what each journey
mutates, and both renaming journeys index positionally.

The two findings are both LOW and both about **test sensitivity, not product behaviour**: one unit
test grades at ~50% inside its own file where E2E grades at 100%, and the manual-mode half of the
clause is covered at the E2E and domain layers but not at the component layer. Neither weakens the
shipped behaviour, and neither should be fixed under review. I recommend both as follow-ups.

The one substantive correction to the record is in F-1: rev 06 did not "never write" — it wrote two
deferred ticks late. That changes the description of the defect, not the correctness of the cure.

## Proposed questions

### Q-PROPOSAL-P30-07-01 — Grading sensitivity of load-coupled fake-timer tests

- **Raised by/package/revision:** `p30-reviewer-04` / P30 / rev 07
- **Context and evidence:** `rule-proposal-auto-apply.test.tsx:140` catches the rev 06 regression
  20/20 in isolation but only 10/20 inside its own file, because
  `vi.useFakeTimers({ shouldAdvanceTime: true })` couples a single 10ms flush to the real clock.
  Probe: rev 06 applies at flush 3, rev 07 at flush 1.
- **Why existing authority does not decide it:** PROCESS requires `--retries=0` repeats for E2E but
  says nothing about grading unit tests against the reverted fix, which is where this surfaced.
- **Options considered:** (a) assert the write happened at the first flush; (b) `waitFor` with an
  explicit tick budget; (c) drop `shouldAdvanceTime`; (d) leave as is and rely on E2E.
- **Reversible default selected to continue:** leave as is for this revision — E2E grades the same
  regression deterministically, so the fix is not revertible-green.
- **Decision-hierarchy basis:** 2 (repository convention) and 4 (smallest reversible change).
- **Impact and risk:** low; a half-sensitive unit test alongside a fully sensitive E2E pair.
- **Reversal or migration path:** one-line change to the assertion in a later revision.
- **Human review still useful after completion:** yes — whether "revert-the-fix grading must be
  deterministic" should become an explicit PROCESS requirement for unit tests.

### Q-PROPOSAL-P30-07-02 — Component-layer coverage of the manual apply modes

- **Raised by/package/revision:** `p30-reviewer-04` / P30 / rev 07
- **Context and evidence:** removing `isAutomatic` from `TransactionRuleProposal.tsx:202` — making
  manual "Update" modes auto-apply, violating `human-scratch.md:263-266` — leaves the whole
  unit+integration suite green. Caught only at E2E (6/11 journeys) and by the domain predicate's own
  tests.
- **Why existing authority does not decide it:** UR-009's "a clause with no automated test covering
  it is a gap" is satisfied at the E2E and domain layers; whether each layer must independently
  cover both halves is not specified.
- **Options considered:** (a) add an `updateAll` unit case; (b) parameterise the mock over all four
  modes; (c) rely on E2E.
- **Reversible default selected to continue:** rely on E2E for this revision.
- **Decision-hierarchy basis:** 1 (frozen requirement is met in aggregate), 4 (smallest change).
- **Impact and risk:** low while E2E holds; the risk is that a future E2E-only regression removes
  the last guard for the manual half.
- **Reversal or migration path:** add one `it` case with `applyMode: "updateAll"`.
- **Human review still useful after completion:** minor.

## Environment and cleanup

- All E2E ran on port **:3000** with `env -u CI`, never `CI=true`, never
  `--debug`/`--ui`/`--headed`/ `show`. I announced the claim to root before use and announced
  release afterwards; release confirmed with `ss -ltn` showing :3000 free.
- The human's dev server on **:3001** (pid 818182, cwd `/home/ben-agents/Code/moneyflow`) was never
  touched. Verified still running at the end.
- Work was done in a throwaway worktree `/tmp/mf-p30r4` at `63c7007`, restored to
  `git checkout 63c7007 -- src tests` after every mutant. All three subject digests re-verified
  against the table above at the end of the session. **The main checkout's `src/` and `tests/` were
  never modified** — every mutation was confined to the worktree.
