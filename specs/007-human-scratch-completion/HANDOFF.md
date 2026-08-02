# P30 rev 07 review dispatch — ACTIVE

**Reviewer:** `p30-reviewer-04` — MUST be distinct from `p30-implementer-01`, `p30-reviewer-01`,
`p30-reviewer-02`, `p30-reviewer-03`.

**BASE:** `b777d3d` (rev 06 reviewed HEAD).

**SUBJECT:** `63c7007`, on `main`. VERIFIED by root at dispatch time: it is an ancestor of HEAD and
`main` contains it. Re-verify with `git merge-base --is-ancestor 63c7007 HEAD` before reading a line
of diff — an ancestry check is valid only for the instant it ran.

**Requirement:** UR-009 / `specs/011-automations-conformance/spec.md`, frozen clause `:263-266`.

## Scope

Product: `src/components/features/transactions/TransactionRuleProposal.tsx` only (+36/−61). Tests:
`tests/e2e/rule-creation-controls.spec.ts`,
`tests/unit/components/rule-proposal-auto-apply.test.tsx`.

## Identify tests by TITLE, never line number

Line numbers for these three moved three times inside one revision (`:359`→`:375`→`:379`). Both the
implementer and root quoted stale ones. Use:

- `"choosing Updating all writes nothing until focus leaves the row…"` — the page-chrome-adjacent
  journey
- `"a description alias committed with Enter applies an Updating rule"` — the Enter-commit journey
- `"a tag change applies when the user clicks non-focusable page chrome"` — the page-chrome journey

## What rev 07 claims

The rev 06 defect was MEASURED: the wake-up (`setFocusSeenOutside`, deferred in a `setTimeout`) and
the decision (a live `isRowFocusLost()` re-read) were never true at the same instant, so the apply
never fired. Rev 07 removes the split — the whole decision happens inside the deferred read, with
`shouldAutoApplyRef` so the callback reads current rather than captured state.

FINAL campaign at `f397da1`: **all 11 journeys PASS in all three runs**, digest
`4b3b9ee6ef213d4a2275e1e043b340ee` identical across seven on-disk samples, totals 191/191/190 of 192.
Every failure in every run was a `people-settlement` rotation member; no other spec failed once.
An earlier campaign at `10a1c19` had the two verdict journeys green 3/3 against 3/3 failures at
rev 06.

**What this campaign does NOT certify**, stated by the implementer and repeated here: it ran on main
at `f397da1` with P29 merged — **not** the final integrated tree, since P33's merge is gated on its
own review.

## Press hardest on these

1. **Initial conditions of every new test case.** The strongest finding of this package came from
   the implementer: a suite with correct both-direction assertions was still green against a
   known-broken revision because every case started with focus already outside the row — a state the
   user cannot reach. Ask of each case: _what state does this begin in, and can a user reach it?_
2. **Grade the tests by reverting the fix.** Hold the test file byte-identical at a stated md5, swap
   the component across revisions, and require red at rev 06. Green against rev 06 is the tell.
3. **`appliedRef`.** Deleting it MEASURED 3 applies at the blur and 8 after five further renders.
   Confirm it is still load-bearing and still pinned.
4. **The listener effect's `confirm` dependency** re-registers listeners and re-fires the mount-time
   evaluation. Root claimed this was "harmless" from reasoning; the implementer measured it instead.
   Check the guard, not the claim.
5. **Carried open item, NOT a rev 07 regression:** `InlineEditableTags`' Escape handler is bound to
   a `CommandInput` that has lost focus by the time Escape arrives. Pre-existing, recorded, ruled
   out of UR-009 scope.
6. **Locator re-resolution in the E2E helpers (`c9e80b8`).** `rowsWithDescription` filters on
   `input[value="${description}"]`. The Enter-commit journey RENAMES that description, Playwright
   re-resolves locators on every use, and React writes the edited value to the `value` ATTRIBUTE —
   so the locator silently re-pointed at a different row that the rule was concurrently rewriting.
   MEASURED by probe; six campaign runs across three trees failed identically before this was found.
   Ask whether the implementer swept the class. Its first count of 16 was wrong twice over — the
   grep pattern `rowsWithDescription(page)` silently excluded every call passing a second argument,
   and the printed list was then miscounted. MEASURED: 19 occurrences, 1 definition, 1 in a comment,
   **17 call sites**, of which 2 take an explicit description. Only two journeys rename a
   description and both now index positionally. Verify by what each journey MUTATES, not by
   pattern-matching call shapes — the pattern is what failed.
7. **Two commits that are NOT the cure but are kept.** `6ece9b1` (`chooseApplyMode` helper) and
   `adf6b5e` (`aria-expanded` instead of a global listbox count) were presented as fixes for the
   Enter-commit failure and were not — the dropdown interception in the log was real and irrelevant.
   Both are retained on their own merits (nine call sites could genuinely be hit). Do NOT read them
   as the fix for that journey. Root endorsed both: the first from provenance, the second from
   admiring its second-order checks. Neither endorsement asked whether the object being fixed was
   the thing that was broken.

## Expected, not findings

- `people-settlement.spec.ts` rotation — many distinct memberships on unchanged trees, five
  mechanisms falsified. **Not P30's.** Two constraints bind how you read it: a fully clean 19/19 run
  has been observed, so **a green settlement result carries no information**; and for 5 of 19 tests
  the ID does not identify the failing assertion — `:281` demonstrably varies within its ID. Read
  the failing STEP NAME from Playwright's failure header, which carries it verbatim; do not
  correlate stack frames to source lines. See the limitation note in PROGRESS.md.

## Evidence trail — check it exists

At handback the implementer found evidence files 01-06 had **never been committed**; `git log --all`
returned nothing for them. They are now in `63c7007`, committed unedited by explicit pathspec, six
files, nothing swept in. **They contain claims later measured wrong** — the rev 03 escape mechanism,
the rev 04 commit boundary, the rev 06 assertion-gap self-diagnosis — and the later files carry the
retractions. Leaving them unedited was deliberate. **Read them as the path, not as current claims**,
and confirm each retraction lands where the implementer says it does.

## Method note

Root has been wrong twice on this component's mechanism today, both times from reasoning rather than
measurement. Ten mechanisms have been falsified in this package; every one died to a measurement. Do
not accept a causal claim in this dispatch as established — MEASURED and INFERRED are marked
distinctly, and anything unmarked should be treated as inferred.
